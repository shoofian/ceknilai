import { NextResponse } from 'next/server';
import { getGuruByEmail, createGuruByAdmin } from '@/lib/db';
import { cookies } from 'next/headers';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`google:${ip}`, { limit: 20, windowMs: 15 * 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan login Google. Silakan coba lagi sebentar.' },
        { status: 429 }
      );
    }

    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json({ error: 'Kredensial Google diperlukan' }, { status: 400 });
    }

    // Verify token using Google OAuth tokeninfo endpoint
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.error_description || 'Kredensial Google tidak valid' }, { status: 400 });
    }

    const payload = await response.json();
    const { email, name, email_verified, aud } = payload;

    const expectedClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (expectedClientId && aud !== expectedClientId) {
      return NextResponse.json({ error: 'Token Google tidak ditujukan untuk aplikasi ini' }, { status: 401 });
    }

    if (email_verified !== true && email_verified !== 'true') {
      return NextResponse.json({ error: 'Email Google belum terverifikasi' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email Google tidak ditemukan' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // Find existing teacher by email
    let guru = await getGuruByEmail(cleanEmail);

    if (!guru) {
      // Teacher doesn't exist, register them automatically!
      // Generate username from email (e.g. budi.santoso@gmail.com -> budi.santoso)
      let baseUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9._]/g, '');
      if (baseUsername.length < 3) baseUsername = 'guru_' + baseUsername;
      
      let finalUsername = baseUsername;
      let counter = 1;
      const { getGuru } = await import('@/lib/db');
      
      // Ensure username is unique
      while (true) {
        const existing = await getGuru(finalUsername);
        if (!existing || existing.username.toLowerCase() !== finalUsername.toLowerCase()) {
          break;
        }
        finalUsername = `${baseUsername}${counter}`;
        counter++;
      }

      // Generate a random password for OAuth accounts (not used directly since they login via Google)
      const randomPassword = 'google_' + Math.random().toString(36).substring(2, 15);

      const trialUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      guru = await createGuruByAdmin({
        nama: name || 'Guru CekNilai',
        email: cleanEmail,
        username: finalUsername,
        password: randomPassword,
        premium_until: trialUntil
      });

      if (!guru) {
        return NextResponse.json({ error: 'Gagal membuat akun guru dari Google' }, { status: 500 });
      }

      // Log teacher registration activity
      const { logAktivitasGuru } = await import('@/lib/db');
      await logAktivitasGuru(finalUsername, 'REGISTER_GOOGLE', 'Mendaftarkan akun baru melalui Google');
    }

    // Log teacher login activity
    const { logAktivitasGuru } = await import('@/lib/db');
    await logAktivitasGuru(guru.username, 'LOGIN_GOOGLE', 'Melakukan login menggunakan Google');

    // Set session cookie
    const { signToken } = await import('@/lib/auth');
    const token = await signToken({ username: guru.username });
    
    const cookieStore = await cookies();
    cookieStore.set('guru_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 hari
      path: '/',
    });

    const { password: _, ...guruData } = guru;
    return NextResponse.json({ success: true, user: guruData });
  } catch (error) {
    console.error('Error in Google Login API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
