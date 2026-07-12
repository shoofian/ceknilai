import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('guru_session');
    if (session && session.value) {
      const { logAktivitasGuru } = await import('@/lib/db');
      await logAktivitasGuru(session.value, 'LOGOUT', 'Melakukan logout dari sistem');
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
