import { NextResponse } from 'next/server';
import { getKelasById, addSiswaToKelas } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`join:${ip}`, { limit: 15, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan. Silakan coba lagi sebentar.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { kodeKelas, nisn, nama, tanggalLahir } = body;

    if (!kodeKelas || !nisn || !nama || !tanggalLahir) {
      return NextResponse.json(
        { error: "Mohon lengkapi Kode Kelas, NISN, Nama, dan Tanggal Lahir." },
        { status: 400 }
      );
    }

    const cleanKode = kodeKelas.trim();
    
    // Cek apakah kelas dengan kode tersebut ada
    // getKelasById dengan guruUsername null agar bisa diakses publik
    const kelas = await getKelasById(cleanKode, null);
    if (!kelas) {
      return NextResponse.json(
        { error: "Kode Kelas tidak valid atau kelas tidak ditemukan." },
        { status: 404 }
      );
    }
    if (kelas.archived) {
      return NextResponse.json(
        { error: "Kelas ini sudah diarsipkan dan tidak menerima pendaftaran baru." },
        { status: 403 }
      );
    }

    const siswaBaru = {
      nisn: nisn.trim(),
      nama: nama.trim(),
      tanggalLahir: tanggalLahir.trim(),
      nilai: {},
      catatan: ""
    };

    const newStudent = await addSiswaToKelas(cleanKode, siswaBaru, null);
    
    if (!newStudent) {
      return NextResponse.json(
        { error: "Gagal mendaftar ke kelas. Mungkin terjadi kesalahan sistem." },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil bergabung ke kelas ${kelas.nama}!`,
      kelas: {
        nama: kelas.nama,
        mataPelajaran: kelas.mataPelajaran
      }
    });

  } catch (error) {
    console.error("Error in /api/kelas/join:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan server internal." },
      { status: 500 }
    );
  }
}
