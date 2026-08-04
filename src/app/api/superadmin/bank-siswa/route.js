import { NextResponse } from 'next/server';
import { getBankSiswa, upsertBankSiswa, deleteBankSiswa } from '@/lib/db';
import { cookies } from 'next/headers';

async function checkSuperadminAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('superadmin_session');
  return session && session.value === 'authenticated';
}

export async function GET(request) {
  try {
    if (!await checkSuperadminAuth()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sekolahId = searchParams.get('sekolah_id');
    const tahunPelajaran = searchParams.get('tahun_pelajaran');

    const data = await getBankSiswa(sekolahId || null, tahunPelajaran || null);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching bank siswa:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!await checkSuperadminAuth()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data } = await request.json();
    
    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Data harus berupa array' }, { status: 400 });
    }

    // Prepare data
    const formattedData = data.map(item => ({
      nisn: String(item.nisn).trim(),
      nama: String(item.nama).trim(),
      tingkatan: String(item.tingkatan).trim(),
      rombel: String(item.rombel).trim(),
      tanggal_lahir: item.tanggal_lahir ? new Date(item.tanggal_lahir).toISOString().split('T')[0] : null,
      sekolah_id: item.sekolah_id,
      tahun_pelajaran: item.tahun_pelajaran
    }));

    const result = await upsertBankSiswa(formattedData);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: result.data?.length || 0 });
  } catch (error) {
    console.error('Error importing bank siswa:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    if (!await checkSuperadminAuth()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID tidak ditemukan' }, { status: 400 });
    }

    const success = await deleteBankSiswa(id);
    if (!success) {
      return NextResponse.json({ error: 'Gagal menghapus data' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bank siswa:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
