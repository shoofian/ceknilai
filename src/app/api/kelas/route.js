import { NextResponse } from 'next/server';
import { getKelas, createKelas } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Helper untuk mengecek autentikasi guru
async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('guru_session');
  return session && !!session.value;
}

export async function GET(request) {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const archivedParam = searchParams.get('archived');
    
    const allKelas = await getKelas(true); // Ambil semua
    
    if (archivedParam === 'true') {
      return NextResponse.json(allKelas.filter(k => k.archived));
    } else if (archivedParam === 'all') {
      return NextResponse.json(allKelas);
    } else {
      return NextResponse.json(allKelas.filter(k => !k.archived));
    }
  } catch (error) {
    console.error('Error in GET kelas API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { nama, tahunAjaran } = await request.json();
    if (!nama) {
      return NextResponse.json({ error: 'Nama kelas harus diisi' }, { status: 400 });
    }

    const newKelas = await createKelas({
      nama,
      tahunAjaran: tahunAjaran || '2025/2026',
      kolomNilai: [],
      siswa: []
    });

    return NextResponse.json({ success: true, kelas: newKelas });
  } catch (error) {
    console.error('Error in POST kelas API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
