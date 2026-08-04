import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { getKelasById, updateSiswaInKelas, deleteSiswaFromKelas } from '@/lib/db';



export async function PATCH(request, { params }) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { isGuruLocked } = await import('@/lib/db');
    if (await isGuruLocked(username)) {
      return NextResponse.json({ error: 'Akun Anda sedang dikunci (Read-Only)' }, { status: 403 });
    }

    const { id, nisn } = await params;
    const updates = await request.json();
    
    // Dapatkan data kelas terlebih dahulu untuk mengambil data siswa lama
    const kelas = await getKelasById(id, username);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    }

    const siswaLama = kelas.siswa.find(s => s.nisn === nisn);
    if (!siswaLama) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
    }

    // Validasi NISN baru jika diubah
    const cleanNewNisn = updates.nisn !== undefined ? updates.nisn.toString().trim() : null;
    const targetNisn = cleanNewNisn || nisn;

    let targetKelas = null;
    if (updates.kelasIdBaru && updates.kelasIdBaru !== id) {
      targetKelas = await getKelasById(updates.kelasIdBaru, username);
      if (!targetKelas) {
        return NextResponse.json({ error: 'Kelas tujuan tidak ditemukan atau tidak diizinkan' }, { status: 403 });
      }
      
      const existsInTarget = targetKelas.siswa.some(s => s.nisn === targetNisn);
      if (existsInTarget) {
        return NextResponse.json({ error: 'Siswa dengan NISN tersebut sudah terdaftar di kelas tujuan' }, { status: 400 });
      }
    } else if (cleanNewNisn && cleanNewNisn !== nisn) {
      const exists = kelas.siswa.some(s => s.nisn === cleanNewNisn);
      if (exists) {
        return NextResponse.json({ error: 'NISN baru sudah digunakan oleh siswa lain di kelas ini' }, { status: 400 });
      }
    }

    // Lakukan merge untuk nilai agar tidak menimpa nilai yang lain
    let mergedNilai = { ...siswaLama.nilai };
    if (updates.nilai) {
      mergedNilai = {
        ...mergedNilai,
        ...updates.nilai
      };
    }

    const siswaUpdate = {
      kelasIdBaru: updates.kelasIdBaru || undefined,
      nisn: targetNisn,
      nama: updates.nama !== undefined ? updates.nama.trim() : siswaLama.nama,
      tanggalLahir: updates.tanggalLahir !== undefined ? updates.tanggalLahir : siswaLama.tanggalLahir,
      nilai: mergedNilai,
      catatan: updates.catatan !== undefined ? updates.catatan.trim() : (siswaLama.catatan || "")
    };

    const updated = await updateSiswaInKelas(id, nisn, siswaUpdate, username);
    if (!updated) {
      return NextResponse.json({ error: 'Gagal memperbarui siswa' }, { status: 400 });
    }

    // Log teacher activity (hanya jika bukan update nilai/catatan saja)
    const updateKeys = Object.keys(updates);
    const isOnlyNilaiCatatan = updateKeys.length > 0 && updateKeys.every(key => ['nilai', 'catatan'].includes(key));

    const { logAktivitasGuru, logAktivitasNilai } = await import('@/lib/db');
    if (!isOnlyNilaiCatatan) {
      let logDetail = `Memperbarui data siswa "${siswaLama.nama}" (NISN: ${nisn}) di kelas "${kelas.nama}"`;
      if (targetKelas) {
        logDetail = `Memindahkan siswa "${siswaLama.nama}" (NISN: ${targetNisn}) dari kelas "${kelas.nama}" ke kelas "${targetKelas.nama}"`;
      } else if (cleanNewNisn && cleanNewNisn !== nisn) {
        logDetail = `Memperbarui data siswa "${siswaLama.nama}" (NISN lama: ${nisn}, NISN baru: ${cleanNewNisn}) di kelas "${kelas.nama}"`;
      }
      await logAktivitasGuru(
        username,
        'EDIT_SISWA',
        logDetail
      );
    } else {
      // Aggregate logs for grades/attendance input
      await logAktivitasNilai(username, kelas.nama, siswaLama.nama, nisn);
    }

    return NextResponse.json({ success: true, siswa: updated });
  } catch (error) {
    console.error('Error in PATCH siswa individual API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { isGuruLocked } = await import('@/lib/db');
    if (await isGuruLocked(username)) {
      return NextResponse.json({ error: 'Akun Anda sedang dikunci (Read-Only)' }, { status: 403 });
    }

    const { id, nisn } = await params;
    const kelas = await getKelasById(id, username);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    }

    const siswaLama = kelas.siswa.find(s => s.nisn === nisn);
    if (!siswaLama) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
    }

    const success = await deleteSiswaFromKelas(id, nisn, username);
    
    if (!success) {
      return NextResponse.json({ error: 'Gagal menghapus siswa' }, { status: 400 });
    }

    // Log teacher activity
    const { logAktivitasGuru } = await import('@/lib/db');
    await logAktivitasGuru(
      username,
      'HAPUS_SISWA',
      `Menghapus siswa "${siswaLama.nama}" (NISN: ${nisn}) dari kelas "${kelas.nama}"`
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE siswa individual API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export const PUT = PATCH;
