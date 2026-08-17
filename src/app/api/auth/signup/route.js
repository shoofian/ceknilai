import { NextResponse } from 'next/server';
import { getGuru, createGuruByAdmin } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { nama, email, username, password } = await request.json();

    if (!nama || !email || !username || !password) {
      return NextResponse.json({ error: 'Semua bidang wajib diisi' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check if username already exists
    const existingUsername = await getGuru(cleanUsername);
    if (existingUsername && existingUsername.username.toLowerCase() === cleanUsername) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 400 });
    }

    // Check if email already exists
    const { getGuruByEmail } = await import('@/lib/db');
    const existingEmail = await getGuruByEmail(cleanEmail);
    if (existingEmail) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 });
    }

    const trialUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Create the new teacher
    const newGuru = await createGuruByAdmin({
      nama: nama.trim(),
      email: cleanEmail,
      username: cleanUsername,
      password,
      premium_until: trialUntil
    });

    if (!newGuru) {
      return NextResponse.json({ error: 'Gagal membuat akun guru' }, { status: 500 });
    }

    // Log teacher registration activity
    const { logAktivitasGuru } = await import('@/lib/db');
    await logAktivitasGuru(cleanUsername, 'REGISTER', 'Mendaftarkan akun baru');

    // Automatically log them in by setting cookie
    const cookieStore = await cookies();
    const { signToken } = await import('@/lib/auth');
    const token = await signToken({ username: cleanUsername });

    cookieStore.set('guru_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 hari
      path: '/',
    });

    return NextResponse.json({ success: true, user: { username: cleanUsername, nama, email: cleanEmail } });
  } catch (error) {
    console.error('Error in signup API:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
