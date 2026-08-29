import { NextResponse } from 'next/server';
import { checkSuperadminAuth } from '@/lib/auth';
import { logAktivitasGuru } from '@/lib/db';

export async function POST(request) {
  try {
    const superadmin = await checkSuperadminAuth();
    if (!superadmin) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const { category, amount, date, description } = await request.json();
    if (!category || !amount || !description) {
      return NextResponse.json({ error: 'Semua kolom wajib diisi' }, { status: 400 });
    }

    const detailString = KATEGORI: | TANGGAL: | NOMINAL: | KETERANGAN:;
    
    // Using superadmin username to log the operational cost
    const result = await logAktivitasGuru(superadmin, 'BIAYA_OPERASIONAL', detailString);
    if (!result) {
      return NextResponse.json({ error: 'Gagal mencatat pengeluaran operasional' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Biaya operasional berhasil dicatat' });
  } catch (error) {
    console.error('Error in POST finance operasional:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
