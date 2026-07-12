import { NextResponse } from 'next/server';
import { getKelas, createKelas } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('guru_session');
  return session && session.value ? session.value : null;
}

export async function GET(request) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const archivedParam = searchParams.get('archived');
    
    const allKelas = await getKelas(true, username); // Ambil semua milik guru ini
    
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
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { nama, mataPelajaran, tahunAjaran, semester, tingkatan, kolomNilai, siswa, skemaPenilaian } = await request.json();
    if (!nama) {
      return NextResponse.json({ error: 'Nama kelas harus diisi' }, { status: 400 });
    }
    if (!mataPelajaran) {
      return NextResponse.json({ error: 'Mata pelajaran harus diisi' }, { status: 400 });
    }

    try {
      const newKelas = await createKelas({
        nama,
        mataPelajaran,
        tahunAjaran: tahunAjaran || '2025/2026',
        semester: semester || 'Ganjil',
        tingkatan,
        kolomNilai: kolomNilai || [],
        siswa: siswa || [],
        skemaPenilaian
      }, username);

      // Log teacher activity
      const { logAktivitasGuru } = await import('@/lib/db');
      await logAktivitasGuru(
        username,
        'BUAT_KELAS',
        `Membuat kelas "${nama}" (${mataPelajaran}, TA: ${tahunAjaran || '2025/2026'}, Sem: ${semester || 'Ganjil'})`
      );

      return NextResponse.json({ success: true, kelas: newKelas });
    } catch (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST kelas API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
