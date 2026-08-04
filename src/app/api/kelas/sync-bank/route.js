import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getKelasById, getGuru, getBankSiswa, updateKelas } from '@/lib/db';

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('guru_session');
  return session && session.value ? session.value : null;
}

export async function POST(request) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { kelasId } = await request.json();
    if (!kelasId) {
      return NextResponse.json({ error: 'ID Kelas tidak ditemukan' }, { status: 400 });
    }

    // Cek kelas dan otorisasi
    const kelas = await getKelasById(kelasId, username);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan atau Anda tidak memiliki akses' }, { status: 404 });
    }

    // Ambil data guru untuk mendapatkan sekolah_id
    const guruData = await getGuru(username);
    if (!guruData || !guruData.sekolah_id) {
      return NextResponse.json({ error: 'Gagal mendapatkan data sekolah guru. Hubungi superadmin untuk mengatur ID Sekolah pada akun Anda.' }, { status: 400 });
    }

    // Tarik dari bank data
    const bankSiswa = await getBankSiswa(guruData.sekolah_id, kelas.tahun_ajaran || '2024/2025');
    
    // Filter berdasarkan tingkatan dan rombel kelas
    const filteredBankSiswa = bankSiswa.filter(
      s => String(s.tingkatan) === String(kelas.tingkatan) && 
           String(s.rombel).toLowerCase() === String(kelas.rombel_nama).toLowerCase()
    );

    if (filteredBankSiswa.length === 0) {
      return NextResponse.json({ message: 'Tidak ada siswa yang cocok di Bank Data untuk tingkatan dan rombel ini.', count: 0 });
    }

    // Bandingkan dengan siswa yang sudah ada di kelas
    const existingSiswa = kelas.siswa || [];
    const existingNisns = new Set(existingSiswa.map(s => String(s.nisn)));
    
    const newStudents = filteredBankSiswa
      .filter(s => !existingNisns.has(String(s.nisn)))
      .map(s => ({ nisn: String(s.nisn), nama: s.nama }));

    if (newStudents.length === 0) {
      return NextResponse.json({ message: 'Semua siswa dari Bank Data sudah ada di kelas ini.', count: 0 });
    }

    // Gabungkan siswa lama dengan siswa baru dari bank data
    const finalSiswa = [...existingSiswa, ...newStudents];

    // Update kelas
    const result = await updateKelas(kelasId, { siswa: finalSiswa }, username);
    
    if (!result) {
      return NextResponse.json({ error: 'Gagal menyimpan pembaruan kelas.' }, { status: 500 });
    }

    // Log teacher activity
    const { logAktivitasGuru } = await import('@/lib/db');
    await logAktivitasGuru(
      username,
      'EDIT_KELAS',
      `Sinkronisasi Bank Data: Menambahkan ${newStudents.length} siswa baru ke kelas "${kelas.nama}"`
    );

    return NextResponse.json({ success: true, count: newStudents.length, addedStudents: newStudents, kelas: result });
  } catch (error) {
    console.error('Error syncing with bank data:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal server' }, { status: 500 });
  }
}
