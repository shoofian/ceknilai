import { NextResponse } from 'next/server';
import { getGuru } from '@/lib/db';
import { checkAuth } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json(
        { loggedIn: false, error: 'Belum masuk' },
        { status: 401 }
      );
    }
    
    const guru = await getGuru(username);
    
    // Keamanan: Validasi bahwa data guru yang diambil cocok dengan username sesi
    if (!guru || !guru.username || guru.username.toLowerCase() !== username.toLowerCase()) {
      return NextResponse.json(
        { loggedIn: false, error: 'Sesi tidak valid' },
        { status: 401 }
      );
    }
    
    const { password: _, ...guruData } = guru;
    const isExpired = guruData.premium_until ? new Date() > new Date(guruData.premium_until) : false;
    if (isExpired && !guruData.is_locked) {
      guruData.is_locked = true;
      guruData.lock_message = "Masa aktif premium Anda telah berakhir. Silakan lakukan aktivasi/perpanjangan paket di menu Masa Aktif.";
    }
    return NextResponse.json({ loggedIn: true, user: guruData });
  } catch (error) {
    console.error('Error in session API:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
