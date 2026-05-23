import { NextResponse } from 'next/server';
import { getGuru } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('guru_session');
    
    if (!session || !session.value) {
      return NextResponse.json(
        { loggedIn: false, error: 'Belum masuk' },
        { status: 401 }
      );
    }
    
    const guru = await getGuru(session.value);
    const { password: _, ...guruData } = guru;
    return NextResponse.json({ loggedIn: true, user: guruData });
  } catch (error) {
    console.error('Error in session API:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
