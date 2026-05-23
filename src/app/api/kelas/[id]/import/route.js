import { NextResponse } from 'next/server';
import { getKelasById, updateKelas } from '@/lib/db';
import { cookies } from 'next/headers';

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('guru_session');
  return session && !!session.value;
}

export async function POST(request, { params }) {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { id } = await params;
    const { siswaList } = await request.json();

    if (!Array.isArray(siswaList)) {
      return NextResponse.json({ error: 'Data impor tidak valid' }, { status: 400 });
    }

    const kelas = await getKelasById(id);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    }

    let addedCount = 0;
    let updatedCount = 0;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    // Clone daftar siswa kelas saat ini
    const currentStudents = [...kelas.siswa];

    for (const item of siswaList) {
      const { nisn, nama, tanggalLahir, nilai } = item;
      
      if (!nisn || !nama || !tanggalLahir) continue; // Skip baris tidak lengkap

      const cleanNisn = nisn.toString().trim();
      const cleanNama = nama.toString().trim();
      const cleanTanggal = tanggalLahir.toString().trim();
      
      // Validasi format tanggal
      if (!dateRegex.test(cleanTanggal)) continue;

      // Bersihkan nilai agar sesuai dengan kolomNilai yang ada
      const cleanedNilai = {};
      kelas.kolomNilai.forEach(col => {
        if (nilai && nilai[col.nama] !== undefined && nilai[col.nama] !== null && nilai[col.nama] !== '') {
          cleanedNilai[col.id] = Number(nilai[col.nama]);
        } else if (nilai && nilai[col.id] !== undefined && nilai[col.id] !== null && nilai[col.id] !== '') {
          cleanedNilai[col.id] = Number(nilai[col.id]);
        } else {
          cleanedNilai[col.id] = null;
        }
      });

      const existingIndex = currentStudents.findIndex(s => s.nisn === cleanNisn);

      if (existingIndex !== -1) {
        // Update siswa yang sudah ada
        currentStudents[existingIndex] = {
          ...currentStudents[existingIndex],
          nama: cleanNama,
          tanggalLahir: cleanTanggal,
          // Merge nilai: pertahankan nilai lama jika kolom baru tidak ada di CSV
          nilai: {
            ...currentStudents[existingIndex].nilai,
            ...cleanedNilai
          }
        };
        updatedCount++;
      } else {
        // Tambah siswa baru
        currentStudents.push({
          nisn: cleanNisn,
          nama: cleanNama,
          tanggalLahir: cleanTanggal,
          nilai: cleanedNilai
        });
        addedCount++;
      }
    }

    await updateKelas(id, { siswa: currentStudents });

    return NextResponse.json({
      success: true,
      message: `Impor berhasil: ${addedCount} siswa baru ditambahkan, ${updatedCount} siswa diperbarui.`,
      addedCount,
      updatedCount
    });
  } catch (error) {
    console.error('Error in POST import API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
