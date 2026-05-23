import { NextResponse } from 'next/server';
import { pencarianSiswa } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const nisn = searchParams.get('nisn');
    const tanggalLahir = searchParams.get('tanggalLahir');

    if (!nisn || !tanggalLahir) {
      return NextResponse.json(
        { error: 'NISN dan Tanggal Lahir harus diisi' },
        { status: 400 }
      );
    }

    const hasil = await pencarianSiswa(nisn, tanggalLahir);
    return NextResponse.json({ success: true, hasil });
  } catch (error) {
    console.error('Error in GET pencarian API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { nisn, tanggalLahir } = await request.json();

    if (!nisn || !tanggalLahir) {
      return NextResponse.json(
        { error: 'NISN dan Tanggal Lahir harus diisi' },
        { status: 400 }
      );
    }

    const hasil = await pencarianSiswa(nisn, tanggalLahir);
    return NextResponse.json({ success: true, hasil });
  } catch (error) {
    console.error('Error in POST pencarian API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
