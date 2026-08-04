import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getKelasById, getGuru, getBankSiswa, updateKelas } from '@/lib/db';

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('guru_session');
  return session && session.value ? session.value : null;
}

export async function POST(request) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { kelasId, action = 'commit', previewData } = await request.json();
    if (!kelasId) {
      return NextResponse.json({ error: 'ID Kelas tidak ditemukan' }, { status: 400 });
    }

    const kelas = await getKelasById(kelasId, username);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan atau Anda tidak memiliki akses' }, { status: 404 });
    }

    const guruData = await getGuru(username);
    if (!guruData || !guruData.sekolah_id) {
      return NextResponse.json({ error: 'Gagal mendapatkan data sekolah guru.' }, { status: 400 });
    }

    // Gunakan original_sekolah_id jika ada, fallback ke sekolah guru saat ini
    const targetSekolahId = kelas.skemaPenilaian?.original_sekolah_id || guruData.sekolah_id;

    if (action === 'preview') {
      const bankSiswa = await getBankSiswa(targetSekolahId, kelas.tahun_ajaran || '2024/2025');
      
      const filteredBankSiswa = bankSiswa.filter(
        s => String(s.tingkatan) === String(kelas.tingkatan) && 
             String(s.rombel).toLowerCase() === String(kelas.rombel_nama).toLowerCase()
      );

      const existingSiswa = kelas.siswa || [];
      const existingNisns = new Map(existingSiswa.map(s => [String(s.nisn), s]));
      const bankNisns = new Map(filteredBankSiswa.map(s => [String(s.nisn), s]));
      
      const added = [];
      const updated = [];
      
      bankNisns.forEach((bankS, nisn) => {
        if (!existingNisns.has(nisn)) {
          added.push({ nisn, nama: bankS.nama });
        } else {
          const exS = existingNisns.get(nisn);
          if (exS.nama !== bankS.nama) {
            updated.push({ nisn, namaLama: exS.nama, namaBaru: bankS.nama, nilai: exS.nilai, tanggalLahir: exS.tanggalLahir, catatan: exS.catatan });
          }
        }
      });
      
      const removed = [];
      existingNisns.forEach((exS, nisn) => {
        if (!bankNisns.has(nisn)) {
          removed.push({ nisn, nama: exS.nama });
        }
      });

      if (added.length === 0 && updated.length === 0 && removed.length === 0) {
        return NextResponse.json({ message: 'Data kelas sudah tersinkronisasi 100% dengan Bank Data.' });
      }

      return NextResponse.json({ preview: true, added, updated, removed });
    }

    if (action === 'commit' && previewData) {
      const { added = [], updated = [], removed = [] } = previewData;
      const existingSiswa = kelas.siswa || [];
      const existingMap = new Map(existingSiswa.map(s => [String(s.nisn), s]));
      
      // Update data existing with new names
      updated.forEach(u => {
        if (existingMap.has(u.nisn)) {
          existingMap.get(u.nisn).nama = u.namaBaru;
        }
      });

      // Remove deleted students (this will delete their grades as well in DB if handled via deleteSiswaFromKelas)
      const { deleteSiswaFromKelas } = await import('@/lib/db');
      for (const r of removed) {
        await deleteSiswaFromKelas(kelasId, r.nisn, username);
        existingMap.delete(r.nisn);
      }
      
      // Combine updated existing and added students
      const finalSiswa = Array.from(existingMap.values()).concat(added);
      
      const result = await updateKelas(kelasId, { siswa: finalSiswa }, username);
      
      if (!result) {
        return NextResponse.json({ error: 'Gagal menyimpan pembaruan sinkronisasi.' }, { status: 500 });
      }

      const { logAktivitasGuru } = await import('@/lib/db');
      await logAktivitasGuru(
        username,
        'EDIT_KELAS',
        `Sinkronisasi 2-Arah Bank Data: ${added.length} ditambah, ${removed.length} dihapus, ${updated.length} diubah namanya.`
      );

      return NextResponse.json({ success: true, kelas: result });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error syncing with bank data:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal server' }, { status: 500 });
  }
}
