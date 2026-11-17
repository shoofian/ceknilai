import * as webpush from 'web-push';
import { supabase } from './db';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@ceknilai.id';

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch (err) {
    console.error('Failed to configure web-push VAPID details:', err);
  }
}

/**
 * Menyimpan / memperbarui langganan Push Subscription siswa
 */
export async function savePushSubscription({ nisn, subscription, userAgent = '' }) {
  if (!supabase || !subscription?.endpoint) return { success: false, error: 'Invalid subscription' };

  try {
    const { endpoint, keys } = subscription;
    const p256dh = keys?.p256dh || '';
    const auth = keys?.auth || '';

    // Cek apakah endpoint sudah ada
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', endpoint)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await supabase
        .from('push_subscriptions')
        .update({
          nisn,
          p256dh,
          auth,
          user_agent: userAgent,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateErr) throw updateErr;
      return { success: true, updated: true };
    } else {
      const { error: insertErr } = await supabase
        .from('push_subscriptions')
        .insert({
          nisn,
          endpoint,
          p256dh,
          auth,
          user_agent: userAgent
        });

      if (insertErr) throw insertErr;
      return { success: true, created: true };
    }
  } catch (err) {
    console.error('Error saving push subscription:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Menambahkan atau memperpanjang antrean notifikasi nilai siswa (Debounce 5 menit)
 * @param {Object} params
 * @param {string} params.nisn
 * @param {string} params.kelasId
 * @param {string} params.namaKelas
 * @param {string} params.mataPelajaran
 * @param {string} params.namaSiswa
 * @param {Array<string>} params.kolomDiubah - Daftar nama kolom nilai yang baru saja diinput/diubah
 */
export async function enqueueGradeNotification({
  nisn,
  kelasId,
  namaKelas = '',
  mataPelajaran = '',
  namaSiswa = '',
  kolomDiubah = []
}) {
  if (!supabase || !nisn || !kelasId || !kolomDiubah.length) return false;

  try {
    // 5 menit dari sekarang
    const delayMinutes = 5;
    const kirimPada = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

    // Cek apakah siswa ini sudah memiliki antrean pending di kelas ini
    const { data: existingQueue } = await supabase
      .from('antrean_notifikasi_nilai')
      .select('id, kolom_diubah')
      .eq('nisn', nisn)
      .eq('kelas_id', kelasId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingQueue) {
      // Gabungkan daftar kolom tanpa duplikasi
      const prevKolom = Array.isArray(existingQueue.kolom_diubah) ? existingQueue.kolom_diubah : [];
      const mergedKolom = Array.from(new Set([...prevKolom, ...kolomDiubah]));

      const { error: updateErr } = await supabase
        .from('antrean_notifikasi_nilai')
        .update({
          nama_kelas: namaKelas,
          mata_pelajaran: mataPelajaran,
          nama_siswa: namaSiswa,
          kolom_diubah: mergedKolom,
          kirim_pada: kirimPada, // Reset timer 5 menit lagi
          updated_at: new Date().toISOString()
        })
        .eq('id', existingQueue.id);

      if (updateErr) {
        console.error('Error updating notification queue:', updateErr);
        return false;
      }
      return true;
    } else {
      // Buat antrean baru
      const { error: insertErr } = await supabase
        .from('antrean_notifikasi_nilai')
        .insert({
          nisn,
          kelas_id: kelasId,
          nama_kelas: namaKelas,
          mata_pelajaran: mataPelajaran,
          nama_siswa: namaSiswa,
          kolom_diubah: kolomDiubah,
          kirim_pada: kirimPada,
          status: 'pending'
        });

      if (insertErr) {
        console.error('Error inserting notification queue:', insertErr);
        return false;
      }
      return true;
    }
  } catch (err) {
    console.error('Unexpected error in enqueueGradeNotification:', err);
    return false;
  }
}

/**
 * Memproses dan mengirim notifikasi yang masa tunggunya (5 menit) sudah tercapai
 */
export async function processPendingNotifications() {
  if (!supabase) return { processed: 0, sent: 0, error: 'Database not configured' };

  try {
    const nowIso = new Date().toISOString();

    // Ambil antrean pending yang kirim_pada <= sekarang
    const { data: readyItems, error: fetchErr } = await supabase
      .from('antrean_notifikasi_nilai')
      .select('*')
      .eq('status', 'pending')
      .lte('kirim_pada', nowIso)
      .limit(500);

    if (fetchErr) {
      console.error('Error fetching ready notification queue:', fetchErr);
      return { processed: 0, sent: 0, error: fetchErr.message };
    }

    if (!readyItems || readyItems.length === 0) {
      return { processed: 0, sent: 0, message: 'Tidak ada antrean siap kirim' };
    }

    let sentTotal = 0;

    for (const item of readyItems) {
      // Ambil langganan push untuk NISN ini
      const { data: subscriptions, error: subErr } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('nisn', item.nisn);

      if (subErr || !subscriptions || subscriptions.length === 0) {
        // Siswa belum subscribe push di HP-nya
        await supabase
          .from('antrean_notifikasi_nilai')
          .update({
            status: 'no_subscription',
            error_message: 'Siswa belum mengaktifkan notifikasi di HP',
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);
        continue;
      }

      // Susun pesan notifikasi
      const kolomList = Array.isArray(item.kolom_diubah) ? item.kolom_diubah.join(', ') : 'Tugas';
      const mapelOrKelas = item.mata_pelajaran ? `${item.mata_pelajaran} (${item.nama_kelas || ''})` : (item.nama_kelas || 'Kelas');
      
      const payload = JSON.stringify({
        title: `📊 Nilai Baru: ${mapelOrKelas}`,
        body: `Halo ${item.nama_siswa || ''}! Nilai ${kolomList} Anda telah selesai diinput oleh guru.`,
        url: `/?nisn=${encodeURIComponent(item.nisn)}`
      });

      let sentCountForItem = 0;
      const expiredSubIds = [];

      for (const sub of subscriptions) {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          await webpush.sendNotification(pushSubscription, payload);
          sentCountForItem++;
        } catch (pushErr) {
          console.error(`Gagal kirim Web Push ke endpoint (${sub.endpoint.slice(0, 30)}...):`, pushErr.statusCode || pushErr.message);
          // Jika 410 (Gone) atau 404, langganan sudah kedaluwarsa di browser pengguna
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            expiredSubIds.push(sub.id);
          }
        }
      }

      // Bersihkan subscription kedaluwarsa jika ada
      if (expiredSubIds.length > 0) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .in('id', expiredSubIds);
      }

      // Update status antrean
      await supabase
        .from('antrean_notifikasi_nilai')
        .update({
          status: sentCountForItem > 0 ? 'sent' : 'failed',
          error_message: sentCountForItem > 0 ? null : 'Semua endpoint push gagal dihubungi',
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      sentTotal += sentCountForItem;
    }

    return { processed: readyItems.length, sent: sentTotal };
  } catch (err) {
    console.error('Error in processPendingNotifications:', err);
    return { processed: 0, sent: 0, error: err.message };
  }
}
