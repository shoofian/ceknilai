import { NextResponse } from 'next/server';
import { getGuru, getBankRombels } from '@/lib/db';
import { checkAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const guru = await getGuru(username);

    if (!guru || !guru.sekolah_id) {
      return NextResponse.json({ error: 'Sekolah ID tidak ditemukan untuk guru ini' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const tahunPelajaran = searchParams.get('tahun_pelajaran');

    if (!tahunPelajaran) {
      return NextResponse.json({ error: 'Tahun pelajaran diperlukan' }, { status: 400 });
    }

    const rombels = await getBankRombels(guru.sekolah_id, tahunPelajaran);

    return NextResponse.json(rombels);
  } catch (error) {
    console.error('Error fetching bank rombels for guru:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
