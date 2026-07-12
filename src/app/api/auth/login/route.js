import { NextResponse } from 'next/server';
import { getGuru } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    const guru = await getGuru(username);
    
    if (username.trim().toLowerCase() === guru.username.toLowerCase() && password === guru.password) {
      const cookieStore = await cookies();
      cookieStore.set('guru_session', guru.username, {
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
