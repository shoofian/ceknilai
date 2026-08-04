import { NextResponse } from 'next/server';
import { getGuru, getBankRombels } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('guru_session');

    if (!session || !session.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = session.value;
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
