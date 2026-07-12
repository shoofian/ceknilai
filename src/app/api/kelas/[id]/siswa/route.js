import { NextResponse } from 'next/server';
import { getKelasById, addSiswaToKelas } from '@/lib/db';
import { cookies } from 'next/headers';

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('guru_session');
  return session && session.value ? session.value : null;
}

export async function POST(request, { params }) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { id } = await params;
    const { nisn, nama, tanggalLahir, nilai } = await request.json();

    if (!nisn || !nama || !tanggalLahir) {
      return NextResponse.json(
        { error: 'NISN, Nama, dan Tanggal Lahir harus diisi' },
        { status: 400 }
      );
    }

    // Validasi format tanggal YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(tanggalLahir)) {
      return NextResponse.json(
        { error: 'Format tanggal lahir harus YYYY-MM-DD (contoh: 2010-05-20)' },
        { status: 400 }
      );
    }

    try {
      const kelas = await getKelasById(id, username);
      if (!kelas) {
        return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
      }

      const addedSiswa = await addSiswaToKelas(id, {
        nisn: nisn.trim(),
        nama: nama.trim(),
        tanggalLahir,
        nilai: nilai || {}
      }, username);
      
      if (!addedSiswa) {
        return NextResponse.json({ error: 'Gagal menambahkan siswa' }, { status: 400 });
      }

      // Log teacher activity
      const { logAktivitasGuru } = await import('@/lib/db');
      await logAktivitasGuru(
        username,
        'TAMBAH_SISWA',
        `Menambahkan siswa "${nama.trim()}" (NISN: ${nisn.trim()}) ke kelas "${kelas.nama}"`
      );

      return NextResponse.json({ success: true, siswa: addedSiswa });
    } catch (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST siswa API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
