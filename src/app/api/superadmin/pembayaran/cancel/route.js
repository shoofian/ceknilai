import { NextResponse } from 'next/server';
import { checkSuperadminAuth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const SUPERADMIN_USERNAMES = ['superadmin', 'shoofian'];



export async function POST(request) {
  try {
    const superadmin = await checkSuperadminAuth();
    if (!superadmin) {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Superadmin.' }, { status: 403 });
    }

    const { logId, targetUsername } = await request.json();

    if (!logId || !targetUsername) {
      return NextResponse.json({ error: 'Data logId dan targetUsername wajib diisi' }, { status: 400 });
    }

    // 1. Fetch the PAYMENT_APPROVED log
    const { data: approvedLogs, error: fetchErr } = await supabase
      .from('log_aktivitas_guru')
      .select('*')
      .eq('id', logId)
      .eq('guru_username', targetUsername)
      .eq('aksi', 'PAYMENT_APPROVED')
      .limit(1);

    if (fetchErr || !approvedLogs || approvedLogs.length === 0) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan atau belum disetujui.' }, { status: 404 });
    }

    const log = approvedLogs[0];
    const detail = log.detail || '';

    // 2. Parse referral info if any
    const referralMatch = detail.match(/REFERRAL:([a-z0-9_]+)/);
    const referrerCode = referralMatch ? referralMatch[1] : null;

    // 3. Lock the teacher account
    const { error: lockErr } = await supabase
      .from('guru')
      .update({ 
        is_locked: true, 
        lock_message: 'Pembayaran dibatalkan/ditolak oleh Superadmin. Silakan hubungi admin.' 
      })
      .eq('username', targetUsername);

    if (lockErr) {
      console.error('Error locking guru account during cancellation:', lockErr);
      return NextResponse.json({ error: 'Gagal memperbarui status akun guru.' }, { status: 500 });
    }

    // 4. Revert PAYMENT_APPROVED log back to PAYMENT_PENDING
    const { error: updateLogErr } = await supabase
      .from('log_aktivitas_guru')
      .update({ aksi: 'PAYMENT_PENDING' })
      .eq('id', logId);

    if (updateLogErr) {
      console.error('Error reverting log status:', updateLogErr);
      return NextResponse.json({ error: 'Gagal merubah status riwayat transaksi.' }, { status: 500 });
    }

    // 5. Delete referral points logs credited during approval of this transaction
    // A. Referee points (paying teacher)
    const { error: delRefereePointsErr } = await supabase
      .from('log_aktivitas_guru')
      .delete()
      .eq('guru_username', targetUsername)
      .eq('aksi', 'REFERRAL_POINTS')
      .like('detail', '%First Payment Referral%');

    if (delRefereePointsErr) {
      console.error('Error deleting referee points:', delRefereePointsErr);
    }

    // B. Referrer points (if referral code was used)
    if (referrerCode) {
      const { error: delReferrerPointsErr } = await supabase
        .from('log_aktivitas_guru')
        .delete()
        .eq('guru_username', referrerCode)
        .eq('aksi', 'REFERRAL_POINTS')
        .like('detail', `%Referral klaim oleh @${targetUsername}%`);

      if (delReferrerPointsErr) {
        console.error('Error deleting referrer points:', delReferrerPointsErr);
      }
    }

    // 6. Record a new action log about this cancellation
    const { error: cancelLogErr } = await supabase
      .from('log_aktivitas_guru')
      .insert({
        guru_username: targetUsername,
        aksi: 'PAYMENT_CANCELLED',
        detail: `BATAL_VERIFIKASI | Pembayaran paket dibatalkan oleh Superadmin @${superadmin}`
      });

    if (cancelLogErr) {
      console.error('Error recording cancellation log:', cancelLogErr);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil membatalkan transaksi. Akun @${targetUsername} kembali dikunci dan poin referral ditarik kembali.` 
    });
  } catch (error) {
    console.error('Error in cancel payment API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
