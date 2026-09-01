import { NextResponse } from 'next/server';
import { checkSuperadminAuth } from '@/lib/auth';
import { logAktivitasGuru, getGuru } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

export async function POST(request) {
  try {
    const superadmin = await checkSuperadminAuth();
    if (!superadmin) {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Superadmin.' }, { status: 403 });
    }

    const body = await request.json();
    const { username, paket, referralCode } = body;

    if (!username || !paket) {
      return NextResponse.json({ error: 'Username dan paket harus diisi' }, { status: 400 });
    }

    const pointsToAward = paket.toLowerCase() === 'tahunan' ? 100 : 10;
    const daysToAdd = paket.toLowerCase() === 'tahunan' ? 365 : 30;

    const guruObj = await getGuru(username);
    if (!guruObj) {
      return NextResponse.json({ error: 'Data guru tidak ditemukan.' }, { status: 404 });
    }

    const currentPremiumUntil = guruObj.premium_until ? new Date(guruObj.premium_until) : null;
    const now = new Date();
    let newPremiumUntil;

    if (!currentPremiumUntil || now > currentPremiumUntil) {
      newPremiumUntil = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    } else {
      newPremiumUntil = new Date(currentPremiumUntil.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    }

    const { error: unlockError } = await supabase
      .from('guru')
      .update({ 
        is_locked: false, 
        lock_message: '', 
        premium_until: newPremiumUntil.toISOString() 
      })
      .eq('username', username);

    if (unlockError) {
      return NextResponse.json({ error: 'Gagal mengaktifkan akun guru.' }, { status: 500 });
    }

    // Buat log PAYMENT_APPROVED manual
    let detailMsg = `PAKET:${paket.toUpperCase()} | BUKTI:Konfirmasi Manual via WA`;
    if (referralCode) {
      detailMsg += ` | REFERRAL:${referralCode}`;
    }

    await logAktivitasGuru(username, 'PAYMENT_APPROVED', detailMsg);

    // Credit referral points
    let pointsCredited = false;
    if (referralCode) {
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
          await logAktivitasGuru(
            username,
            'REFERRAL_POINTS',
            `POINTS:+${pointsToAward} | First Payment Referral diklaim menggunakan kode @${referrer.username}`
          );
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
      message: `Akun @${username} berhasil diaktifkan secara manual.${pointsCredited ? ` Poin referral +${pointsToAward} dikreditkan.` : ''}`,
    });
  } catch (error) {
    console.error('Error in POST manual payment API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
