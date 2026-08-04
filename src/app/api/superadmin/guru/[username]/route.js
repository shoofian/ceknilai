import { NextResponse } from 'next/server';
import { checkSuperadminAuth } from '@/lib/auth';
import { updateGuruByAdmin, deleteGuruByAdmin, logAktivitasGuru, getGuru } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const SUPERADMIN_USERNAMES = ['superadmin', 'shoofian'];



export async function PATCH(request, { params }) {
  try {
    const superadmin = await checkSuperadminAuth();
    if (!superadmin) {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Superadmin.' }, { status: 403 });
    }

    const { username } = await params;
    const body = await request.json();
    const { nama, email, password, is_locked, lock_message, sekolah_id, walikelas_tingkatan, walikelas_rombel_nama, tahun_ajaran } = body;

    if (!nama || !email) {
      return NextResponse.json({ error: 'Nama dan email harus diisi' }, { status: 400 });
    }

    if (password && password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    try {
      const updatedGuru = await updateGuruByAdmin(username, { nama, email, password, is_locked, lock_message, sekolah_id, walikelas_tingkatan, walikelas_rombel_nama, tahun_ajaran });
      const { password: _, ...sanitized } = updatedGuru;
      return NextResponse.json({ success: true, user: sanitized });
    } catch (dbError) {
      return NextResponse.json({ error: dbError.message || 'Gagal memperbarui akun guru' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in PATCH superadmin guru API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

// POST /api/superadmin/guru/[username] — Approve payment: unlock account + credit referral points
export async function POST(request, { params }) {
  try {
    const superadmin = await checkSuperadminAuth();
    if (!superadmin) {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Superadmin.' }, { status: 403 });
    }

    const { username } = await params;

    // 1. Find the latest PAYMENT_PENDING log for this teacher
    const { data: pendingLogs, error: logError } = await supabase
      .from('log_aktivitas_guru')
      .select('*')
      .eq('guru_username', username)
      .eq('aksi', 'PAYMENT_PENDING')
      .order('created_at', { ascending: false })
      .limit(1);

    if (logError || !pendingLogs || pendingLogs.length === 0) {
      return NextResponse.json({ error: 'Tidak ditemukan pengajuan pembayaran yang menunggu verifikasi.' }, { status: 404 });
    }

    const pendingLog = pendingLogs[0];
    const detail = pendingLog.detail || '';

    // Parse paket from detail: "PAKET:TAHUNAN | BUKTI:... | REFERRAL:username"
    const paketMatch = detail.match(/PAKET:(BULANAN|TAHUNAN)/);
    const referralMatch = detail.match(/REFERRAL:([a-z0-9_]+)/);
    const paket = paketMatch ? paketMatch[1].toLowerCase() : null;
    const referralCode = referralMatch ? referralMatch[1] : null;
    const pointsToAward = paket === 'tahunan' ? 100 : 10;

    // 2. Unlock the teacher account
    const { error: unlockError } = await supabase
      .from('guru')
      .update({ is_locked: false, lock_message: '' })
      .eq('username', username);

    if (unlockError) {
      return NextResponse.json({ error: 'Gagal mengaktifkan akun guru.' }, { status: 500 });
    }

    // 3. Mark pending log as approved
    await supabase
      .from('log_aktivitas_guru')
      .update({ aksi: 'PAYMENT_APPROVED' })
      .eq('id', pendingLog.id);

    // 4. Credit referral points to both teachers (if referral code was queued)
    let pointsCredited = false;
    if (referralCode) {
      // Check if referee already received referral points before (guard against double-credit)
      const { data: existingPoints } = await supabase
        .from('log_aktivitas_guru')
        .select('id')
        .eq('guru_username', username)
        .eq('aksi', 'REFERRAL_POINTS')
        .like('detail', '%First Payment%')
        .limit(1);

      if (!existingPoints || existingPoints.length === 0) {
        const referrer = await getGuru(referralCode);
        if (referrer && referrer.username) {
          // Credit to referee (the paying teacher)
          await logAktivitasGuru(
            username,
            'REFERRAL_POINTS',
            `POINTS:+${pointsToAward} | First Payment Referral diklaim menggunakan kode @${referrer.username}`
          );
          // Credit to referrer
          await logAktivitasGuru(
            referrer.username,
            'REFERRAL_POINTS',
            `POINTS:+${pointsToAward} | Referral klaim oleh @${username} (First Payment)`
          );
          pointsCredited = true;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Akun @${username} berhasil diaktifkan.${pointsCredited ? ` Poin referral +${pointsToAward} dikreditkan ke kedua guru.` : ''}`,
      pointsCredited,
      pointsAwarded: pointsCredited ? pointsToAward : 0
    });
  } catch (error) {
    console.error('Error in POST approve payment API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const superadmin = await checkSuperadminAuth();
    if (!superadmin) {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Superadmin.' }, { status: 403 });
    }

    const { username } = await params;

    // Prevent deleting oneself
    if (username.toLowerCase() === superadmin.toLowerCase()) {
      return NextResponse.json({ error: 'Tidak dapat menghapus akun Anda sendiri' }, { status: 400 });
    }

    try {
      const success = await deleteGuruByAdmin(username);
      return NextResponse.json({ success });
    } catch (dbError) {
      return NextResponse.json({ error: dbError.message || 'Gagal menghapus akun guru' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in DELETE superadmin guru API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
