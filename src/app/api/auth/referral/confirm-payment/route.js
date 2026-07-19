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

    // Validate referral code if provided (but don't award points yet — deferred to Superadmin approval)
    let referralError = '';
    let referralValid = false;

    if (referralCode && referralCode.trim() !== '') {
      const cleanCode = referralCode.trim().toLowerCase();

      if (cleanCode === username.toLowerCase()) {
        referralError = 'Anda tidak dapat menggunakan kode referral Anda sendiri.';
      } else {
        // Check if already claimed referral points before (first payment only)
        const { data: existingClaims } = await supabase
          .from('log_aktivitas_guru')
          .select('id')
          .eq('guru_username', username)
          .eq('aksi', 'REFERRAL_POINTS')
          .like('detail', '%First Payment%')
          .limit(1);

        if (existingClaims && existingClaims.length > 0) {
          referralError = 'Poin referral hanya berlaku untuk konfirmasi pembayaran pertama kali.';
        } else {
          // Verify referrer exists
          const referrer = await getGuru(cleanCode);
          if (!referrer || !referrer.username || referrer.username.toLowerCase() !== cleanCode) {
            referralError = `Kode referral "${referralCode}" tidak valid atau tidak terdaftar.`;
          } else {
            referralValid = true;
          }
        }
      }
    }

    // Store payment as PENDING — points will only be credited after Superadmin approves
    const referralInfo = referralValid
      ? ` | REFERRAL:${referralCode.trim().toLowerCase()}`
      : '';
    
    await logAktivitasGuru(
      username,
      'PAYMENT_PENDING',
      `PAKET:${paket.toUpperCase()} | BUKTI:${bukti}${referralInfo}`
    );

    return NextResponse.json({
      success: true,
      message: 'Konfirmasi pembayaran berhasil dikirim. Akun Anda akan diaktifkan setelah diverifikasi oleh admin.',
      referralQueued: referralValid,
      referralError: referralError || null
    });
  } catch (error) {
    console.error('Error in confirm-payment API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
