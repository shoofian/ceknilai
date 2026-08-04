import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { getGuru, getBankSiswa, isGuruLocked } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    if (await isGuruLocked(username)) {
      return NextResponse.json({ error: 'Akun Anda sedang dikunci (Read-Only)' }, { status: 403 });
    }

    const guru = await getGuru(username);
    if (!guru || !guru.sekolah_id) {
      return NextResponse.json({ error: 'Sekolah ID tidak ditemukan untuk guru ini' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const tahunPelajaran = searchParams.get('tahun_pelajaran');

    if (!tahunPelajaran) {
      return NextResponse.json({ error: 'Parameter tahun_pelajaran diperlukan' }, { status: 400 });
    }

    const students = await getBankSiswa(guru.sekolah_id, tahunPelajaran);

    return NextResponse.json(students);
  } catch (error) {
    console.error('Error in GET /api/kelas/bank-data:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal server' }, { status: 500 });
  }
}
