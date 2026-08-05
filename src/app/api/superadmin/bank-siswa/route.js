import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { getGuru, getBankSiswa, upsertBankSiswa, deleteBankSiswa, resetBankData } from '@/lib/db';

async function getSuperadminUser() {
  const username = await checkAuth();
  if (!username) return null;
  const guru = await getGuru(username);
  if (!guru || guru.role !== 'superadmin') return null;
  return guru;
}

export async function GET(request) {
  try {
    const guru = await getSuperadminUser();
    if (!guru) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sekolahId = searchParams.get('sekolah_id');
    const tahunPelajaran = searchParams.get('tahun_pelajaran');

    // Use provided sekolahId (if any), since superadmin is global
    const data = await getBankSiswa(sekolahId || null, tahunPelajaran || null);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching bank siswa:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const guru = await getSuperadminUser();
    if (!guru) {
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
    const guru = await getSuperadminUser();
    if (!guru) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'reset') {
      const sekolahId = searchParams.get('sekolah_id');
      const tahunPelajaran = searchParams.get('tahun_pelajaran');
      if (!sekolahId || !tahunPelajaran) {
        return NextResponse.json({ error: 'sekolah_id dan tahun_pelajaran diperlukan untuk reset' }, { status: 400 });
      }
      const success = await resetBankData(sekolahId, tahunPelajaran);
      if (!success) {
        return NextResponse.json({ error: 'Gagal mereset data' }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'Bank data berhasil direset' });
    }

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
