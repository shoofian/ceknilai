import { NextResponse } from 'next/server';
import { getKelasById, updateSiswaInKelas, deleteSiswaFromKelas } from '@/lib/db';
import { cookies } from 'next/headers';

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('guru_session');
  return session && session.value === 'true';
}

export async function PATCH(request, { params }) {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { id, nisn } = await params;
    const updates = await request.json();
    
    // Dapatkan data kelas terlebih dahulu untuk mengambil data siswa lama
    const kelas = await getKelasById(id);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    }

    const siswaLama = kelas.siswa.find(s => s.nisn === nisn);
    if (!siswaLama) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
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
      nama: updates.nama !== undefined ? updates.nama.trim() : siswaLama.nama,
      tanggalLahir: updates.tanggalLahir !== undefined ? updates.tanggalLahir : siswaLama.tanggalLahir,
      nilai: mergedNilai,
      catatan: updates.catatan !== undefined ? updates.catatan.trim() : (siswaLama.catatan || "")
    };

    const updated = await updateSiswaInKelas(id, nisn, siswaUpdate);
    return NextResponse.json({ success: true, siswa: updated });
  } catch (error) {
    console.error('Error in PATCH siswa individual API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { id, nisn } = await params;
    const success = await deleteSiswaFromKelas(id, nisn);
    
    if (!success) {
      return NextResponse.json({ error: 'Siswa atau kelas tidak ditemukan' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE siswa individual API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
