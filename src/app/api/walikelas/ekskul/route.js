import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { getGuru } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

export async function GET(request) {
  try {
    const username = await checkAuth();
    if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const guru = await getGuru(username);
    if (!guru || !guru.walikelas_tingkatan) {
      return NextResponse.json({ error: 'Bukan wali kelas' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const nisn = searchParams.get('nisn');
    const tahun_ajaran = searchParams.get('tahun_ajaran') || guru.tahun_ajaran || '2025/2026';
    const semester = searchParams.get('semester') || 'Ganjil';

    let query = supabase
      .from('nilai_ekskul')
      .select(`
        *,
        master_ekskul (nama_ekskul, pembina)
      `)
      .eq('sekolah_id', guru.sekolah_id)
      .eq('tahun_ajaran', tahun_ajaran)
      .eq('semester', semester);
      
    if (nisn) {
      query = query.eq('nisn', nisn);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /api/walikelas/ekskul:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const username = await checkAuth();
    if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const guru = await getGuru(username);
    if (!guru || !guru.walikelas_tingkatan) {
      return NextResponse.json({ error: 'Bukan wali kelas' }, { status: 403 });
    }

    const body = await request.json();
    const { nisn, ekskul_id, predikat, keterangan, tahun_ajaran, semester } = body;

    if (!nisn || !ekskul_id || !predikat) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const targetTahunAjaran = tahun_ajaran || guru.tahun_ajaran || '2025/2026';
    const targetSemester = semester || 'Ganjil';

    const { data: existing, error: findError } = await supabase
      .from('nilai_ekskul')
      .select('id')
      .eq('nisn', nisn)
      .eq('ekskul_id', ekskul_id)
      .eq('tahun_ajaran', targetTahunAjaran)
      .eq('semester', targetSemester)
      .maybeSingle();

    if (findError) throw findError;

    let resultData;
    if (existing) {
      const { data, error } = await supabase
        .from('nilai_ekskul')
        .update({ predikat, keterangan: keterangan || '' })
        .eq('id', existing.id)
        .select();
      if (error) throw error;
      resultData = data;
    } else {
      const { data, error } = await supabase
        .from('nilai_ekskul')
        .insert({
          sekolah_id: guru.sekolah_id,
          tahun_ajaran: targetTahunAjaran,
          semester: targetSemester,
          nisn,
          ekskul_id,
          predikat,
          keterangan: keterangan || ''
        })
        .select();
      if (error) throw error;
      resultData = data;
    }

    return NextResponse.json({ success: true, data: resultData[0] });
  } catch (error) {
    console.error('Error in POST /api/walikelas/ekskul:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
