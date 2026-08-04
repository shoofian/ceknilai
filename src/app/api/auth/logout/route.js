import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const username = await checkAuth();
    if (username) {
      const { logAktivitasGuru } = await import('@/lib/db');
      await logAktivitasGuru(username, 'LOGOUT', 'Melakukan logout dari sistem');
    }
    cookieStore.delete('guru_session');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in logout API:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
