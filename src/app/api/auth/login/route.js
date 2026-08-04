import { NextResponse } from 'next/server';
import { getGuru } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    const guru = await getGuru(username);
    
    if (!guru) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    let isPasswordValid = false;
    const bcrypt = await import('bcryptjs');

    // 1. Coba verifikasi dengan bcrypt (jika sudah dihash)
    if (guru.password.startsWith('$2a$') || guru.password.startsWith('$2b$')) {
      isPasswordValid = bcrypt.compareSync(password, guru.password);
    } 
    // 2. Fallback: Cek plain-text (untuk akun lama) dan lakukan Transparent Migration
    else if (password === guru.password) {
      isPasswordValid = true;
      const { migrateGuruPassword } = await import('@/lib/db');
      await migrateGuruPassword(guru.username, password); // Enkripsi dan simpan otomatis
    }

    if (username.trim().toLowerCase() === guru.username.toLowerCase() && isPasswordValid) {
      const cookieStore = await cookies();
      const { signToken } = await import('@/lib/auth');
      const token = await signToken({ username: guru.username });

      cookieStore.set('guru_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 1 hari
        path: '/',
      });
      
      // Log teacher activity
      const { logAktivitasGuru } = await import('@/lib/db');
      await logAktivitasGuru(guru.username, 'LOGIN', 'Melakukan login ke sistem');

      const { password: _, ...guruData } = guru;
      return NextResponse.json({ success: true, user: guruData });
    }
    
    return NextResponse.json(
      { error: 'Username atau password salah' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Error in login API:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
