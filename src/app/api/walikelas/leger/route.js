import { NextResponse } from 'next/server';
import { getGuru, getLegerData } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('guru_session');
    
    if (!session || !session.value) {
      return NextResponse.json({ error: 'Belum login' }, { status: 401 });
    }
    
    const guru = await getGuru(session.value);
    if (!guru || !guru.username) {
      return NextResponse.json({ error: 'Sesi tidak valid' }, { status: 401 });
    }
    
    if (!guru.walikelas_rombel) {
      return NextResponse.json({ error: 'Akses ditolak. Akun Anda bukan Wali Kelas.' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const tahunAjaran = searchParams.get('tahun_ajaran');
    const semester = searchParams.get('semester');
    
    if (!tahunAjaran || !semester) {
      return NextResponse.json({ error: 'Parameter tahun_ajaran dan semester wajib diisi' }, { status: 400 });
    }
    
    const leger = await getLegerData(
      guru.sekolah_id,
      guru.walikelas_rombel,
      tahunAjaran,
      semester
    );
    
    return NextResponse.json(leger);
  } catch (error) {
    console.error('Error in walikelas leger API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
