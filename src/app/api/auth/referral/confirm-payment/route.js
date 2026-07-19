import { NextResponse } from 'next/server';
import { getGuru, logAktivitasGuru } from '@/lib/db';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('guru_session');
    
    if (!session || !session.value) {
      return NextResponse.json({ error: 'Belum masuk' }, { status: 401 });
    }
    
    const guru = await getGuru(session.value);
    if (!guru || !guru.username || guru.username.toLowerCase() !== session.value.toLowerCase()) {
      return NextResponse.json({ error: 'Sesi tidak valid' }, { status: 401 });
    }

    const username = guru.username;
    const { paket, bukti, referralCode } = await request.json();

    if (!paket || !bukti) {
      return NextResponse.json({ error: 'Paket dan bukti pembayaran wajib diisi' }, { status: 400 });
    }

    const isYearly = paket === 'tahunan';
    const pointsToAward = isYearly ? 100 : 10;

    let pointsClaimed = false;
    let claimError = '';

    // Log the payment confirmation itself
    await logAktivitasGuru(username, 'PAYMENT_CONFIRMATION', `Mengajukan konfirmasi pembayaran paket ${paket.toUpperCase()} | Bukti: ${bukti}`);

    // If referral code is provided, try to claim points
    if (referralCode && referralCode.trim() !== '') {
      const cleanCode = referralCode.trim().toLowerCase();

      if (cleanCode === username.toLowerCase()) {
        claimError = 'Anda tidak dapat menggunakan kode referral Anda sendiri.';
      } else {
        // Check if referee has already claimed a first payment referral points before
        const { data: existingClaims } = await supabase
          .from('log_aktivitas_guru')
          .select('id')
          .eq('guru_username', username)
          .eq('aksi', 'REFERRAL_POINTS')
          .like('detail', '%First Payment%')
          .limit(1);

        if (existingClaims && existingClaims.length > 0) {
          claimError = 'Poin referral hanya berlaku untuk konfirmasi pembayaran pertama kali.';
        } else {
          // Check if referrer code is valid (exists in guru database)
          const referrer = await getGuru(cleanCode);
          if (!referrer || !referrer.username || referrer.username.toLowerCase() !== cleanCode) {
            claimError = `Kode referral "${referralCode}" tidak valid atau tidak terdaftar.`;
          } else {
            // Success! Award points to both teachers
            // 1. Award to referee (current user)
            await logAktivitasGuru(
              username,
              'REFERRAL_POINTS',
              `POINTS:+${pointsToAward} | First Payment Referral diklaim menggunakan kode @${referrer.username}`
            );

            // 2. Award to referrer
            await logAktivitasGuru(
              referrer.username,
              'REFERRAL_POINTS',
              `POINTS:+${pointsToAward} | Referral klaim oleh @${username} (First Payment)`
            );

            pointsClaimed = true;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      pointsClaimed,
      pointsAwarded: pointsClaimed ? pointsToAward : 0,
      claimError
    });
  } catch (error) {
    console.error('Error in confirm-payment API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
