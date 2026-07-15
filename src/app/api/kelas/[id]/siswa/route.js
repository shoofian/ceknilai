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

    const { isGuruLocked } = await import('@/lib/db');
    if (await isGuruLocked(username)) {
      return NextResponse.json({ error: 'Akun Anda sedang dikunci (Read-Only)' }, { status: 403 });
    }

    const { id } = await params;
    const { nisn, nama, tanggalLahir, nilai } = await request.json();

    if (!nisn || !nama) {
      return NextResponse.json(
        { error: 'NISN dan Nama harus diisi' },
        { status: 400 }
      );
    }

    // Validasi format tanggal YYYY-MM-DD jika diisi
    if (tanggalLahir && tanggalLahir.trim() !== '') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(tanggalLahir)) {
        return NextResponse.json(
          { error: 'Format tanggal lahir harus YYYY-MM-DD (contoh: 2010-05-20)' },
          { status: 400 }
        );
      }
    }

    try {
      const kelas = await getKelasById(id, username);
      if (!kelas) {
        return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
      }

      const initialNilai = nilai || {};
      if (kelas.kolomNilai && kelas.kolomNilai.length > 0) {
        kelas.kolomNilai.forEach(col => {
          if (col.isGroup && col.subKolom) {
            col.subKolom.forEach(sub => {
              if (initialNilai[sub.id] === undefined || initialNilai[sub.id] === null || initialNilai[sub.id] === "") {
                initialNilai[sub.id] = sub.defaultNilai !== undefined && sub.defaultNilai !== null ? sub.defaultNilai : null;
              }
            });
          } else {
            if (initialNilai[col.id] === undefined || initialNilai[col.id] === null || initialNilai[col.id] === "") {
              initialNilai[col.id] = col.defaultNilai !== undefined && col.defaultNilai !== null ? col.defaultNilai : null;
            }
          }
        });
      }

      const addedSiswa = await addSiswaToKelas(id, {
        nisn: nisn.trim(),
        nama: nama.trim(),
        tanggalLahir,
        nilai: initialNilai
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
