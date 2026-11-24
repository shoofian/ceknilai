import { NextResponse } from 'next/server';
import { supabase, getGuru, isGuruLocked } from '@/lib/db';
import { checkAuth, checkSuperadminAuth } from '@/lib/auth';

async function getAllowedNisnsForWali(guru, tahunAjaran, isSuperadmin) {
  if (isSuperadmin) return null; // null = unrestricted
  if (!guru?.sekolah_id) return new Set();

  let query = supabase
    .from('bank_siswa')
    .select('nisn')
    .eq('sekolah_id', guru.sekolah_id);

  if (tahunAjaran) {
    query = query.eq('tahun_ajaran', tahunAjaran);
  }
  if (!guru.is_admin_sekolah && guru.walikelas_tingkatan && guru.walikelas_rombel_nama) {
    query = query
      .eq('tingkatan', Number(guru.walikelas_tingkatan))
      .ilike('rombel', guru.walikelas_rombel_nama.trim());
  }

  const { data: bankRows } = await query;
  const allowed = new Set((bankRows || []).map(r => String(r.nisn).trim()));

  // Also include siswa in classes belonging to this school & matching rombel/tingkatan
  let kelasQuery = supabase
    .from('kelas')
    .select('id, guru!inner(sekolah_id)')
    .eq('guru.sekolah_id', guru.sekolah_id);

  if (!guru.is_admin_sekolah && guru.walikelas_tingkatan && guru.walikelas_rombel_nama) {
    kelasQuery = kelasQuery
      .eq('tingkatan', Number(guru.walikelas_tingkatan))
      .ilike('rombel_nama', guru.walikelas_rombel_nama.trim());
  }

  const { data: kelasRows } = await kelasQuery;
  const kelasIds = (kelasRows || []).map(k => k.id);
  if (kelasIds.length > 0) {
    const { data: siswaRows } = await supabase
      .from('siswa')
      .select('nisn')
      .in('kelas_id', kelasIds)
      .is('deleted_at', null);
    (siswaRows || []).forEach(s => allowed.add(String(s.nisn).trim()));
  }

  return allowed;
}

export async function POST(req) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (await isGuruLocked(username)) {
      return NextResponse.json({ error: 'Akun Anda sedang dikunci (Read-Only)' }, { status: 403 });
    }

    const guru = await getGuru(username);
    const isSuperadmin = await checkSuperadminAuth();
    if (!isSuperadmin && (!guru?.sekolah_id || (!guru.is_admin_sekolah && (!guru.walikelas_tingkatan || !guru.walikelas_rombel_nama)))) {
      return NextResponse.json({ error: 'Akses ditolak. Hanya wali kelas atau admin sekolah yang dapat mengisi catatan.' }, { status: 403 });
    }

    const { nisn, tahun_ajaran, semester, catatan } = await req.json();

    if (!nisn || !tahun_ajaran || !semester) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const allowedNisns = await getAllowedNisnsForWali(guru, tahun_ajaran, isSuperadmin);
    if (allowedNisns !== null && !allowedNisns.has(String(nisn).trim())) {
      return NextResponse.json({ error: 'Akses ditolak. Siswa bukan bagian dari kelas wali Anda.' }, { status: 403 });
    }

    // Upsert catatan wali kelas
    const { error: upsertError } = await supabase
      .from('catatan_walikelas')
      .upsert(
        { nisn, tahun_ajaran, semester, catatan, updated_at: new Date().toISOString() },
        { onConflict: 'nisn,tahun_ajaran,semester' }
      );

    if (upsertError) {
      console.error('Error upserting catatan wali kelas:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Catatan wali kelas berhasil disimpan' }, { status: 200 });
    
  } catch (err) {
    console.error('Unexpected error in POST /api/walikelas/catatan:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guru = await getGuru(username);
    const isSuperadmin = await checkSuperadminAuth();
    if (!isSuperadmin && (!guru?.sekolah_id || (!guru.is_admin_sekolah && (!guru.walikelas_tingkatan || !guru.walikelas_rombel_nama)))) {
      return NextResponse.json({ error: 'Akses ditolak. Hanya wali kelas atau admin sekolah yang dapat melihat catatan.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const nisn = searchParams.get('nisn');
    const tahun_ajaran = searchParams.get('tahun_ajaran');
    const semester = searchParams.get('semester');

    if (!tahun_ajaran || !semester) {
      return NextResponse.json({ error: 'Missing tahun_ajaran or semester' }, { status: 400 });
    }

    const allowedNisns = await getAllowedNisnsForWali(guru, tahun_ajaran, isSuperadmin);

    if (!nisn) {
      if (allowedNisns !== null && allowedNisns.size === 0) {
        return NextResponse.json({ data: [] }, { status: 200 });
      }
      let query = supabase
        .from('catatan_walikelas')
        .select('nisn, catatan')
        .eq('tahun_ajaran', tahun_ajaran)
        .eq('semester', semester);
      if (allowedNisns !== null) {
        query = query.in('nisn', Array.from(allowedNisns));
      }
      const { data, error } = await query;
            
      if (error) {
        console.error('Error fetching bulk catatan wali kelas:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ data: data || [] }, { status: 200 });
    }

    if (allowedNisns !== null && !allowedNisns.has(String(nisn).trim())) {
      return NextResponse.json({ error: 'Akses ditolak. Siswa bukan bagian dari kelas wali Anda.' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('catatan_walikelas')
      .select('catatan')
      .eq('nisn', nisn)
      .eq('tahun_ajaran', tahun_ajaran)
      .eq('semester', semester)
      .maybeSingle();

    if (error) {
      console.error('Error fetching catatan wali kelas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ catatan: data?.catatan || '' }, { status: 200 });
    
  } catch (err) {
    console.error('Unexpected error in GET /api/walikelas/catatan:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
