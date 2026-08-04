import { NextResponse } from 'next/server';
import { checkSuperadminAuth } from '@/lib/auth';
import { getAllGurus, createGuruByAdmin } from '@/lib/db';

export const dynamic = 'force-dynamic';

const SUPERADMIN_USERNAMES = ['superadmin', 'shoofian'];



export async function GET() {
  try {
    const superadmin = await checkSuperadminAuth();
    if (!superadmin) {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Superadmin.' }, { status: 403 });
    }

    const gurus = await getAllGurus();
    // Remove passwords from response for security (although we could keep them, it's safer to remove them or only show masked)
    const sanitizedGurus = gurus.map(({ password, ...rest }) => rest);
    return NextResponse.json(sanitizedGurus);
  } catch (error) {
    console.error('Error in GET superadmin guru API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const superadmin = await checkSuperadminAuth();
    if (!superadmin) {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Superadmin.' }, { status: 403 });
    }

    const { username, nama, email, password } = await request.json();

    if (!username || !nama || !email || !password) {
      return NextResponse.json({ error: 'Semua kolom (username, nama, email, password) harus diisi' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    try {
      const newGuru = await createGuruByAdmin({ username, nama, email, password });
      const { password: _, ...sanitized } = newGuru;
      return NextResponse.json({ success: true, user: sanitized });
    } catch (dbError) {
      return NextResponse.json({ error: dbError.message || 'Username sudah digunakan' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST superadmin guru API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
