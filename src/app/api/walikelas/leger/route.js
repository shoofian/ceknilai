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
    
    if (!guru.sekolah_id) {
      return NextResponse.json({ error: 'Akses ditolak. Asal sekolah Anda belum diatur. Harap setel sekolah Anda di halaman profil terlebih dahulu.' }, { status: 400 });
    }
    
    const { searchParams } = new URL(request.url);
    const tingkatan = searchParams.get('tingkatan');
    const rombelNama = searchParams.get('rombel_nama');
    const tahunAjaran = searchParams.get('tahun_ajaran');
    const semester = searchParams.get('semester');
    
    if (!tingkatan || !rombelNama || !tahunAjaran || !semester) {
      return NextResponse.json({ error: 'Parameter tingkatan, rombel_nama, tahun_ajaran, dan semester wajib diisi' }, { status: 400 });
    }
    
    const leger = await getLegerData(
      guru.sekolah_id,
      Number(tingkatan),
      rombelNama,
      tahunAjaran,
      semester
    );
    
    return NextResponse.json(leger);
  } catch (error) {
    console.error('Error in walikelas leger API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
