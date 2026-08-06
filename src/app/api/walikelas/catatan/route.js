import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Validasi session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nisn, tahun_ajaran, semester, catatan } = await req.json();

    if (!nisn || !tahun_ajaran || !semester) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
    const supabase = createRouteHandlerClient({ cookies });
    
    // Validasi session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const nisn = searchParams.get('nisn');
    const tahun_ajaran = searchParams.get('tahun_ajaran');
    const semester = searchParams.get('semester');

    if (!tahun_ajaran || !semester) {
        return NextResponse.json({ error: 'Missing tahun_ajaran or semester' }, { status: 400 });
    }

    if (!nisn) {
        // Fetch all catatan for the given tahun_ajaran and semester
        const { data, error } = await supabase
            .from('catatan_walikelas')
            .select('nisn, catatan')
            .eq('tahun_ajaran', tahun_ajaran)
            .eq('semester', semester);
            
        if (error) {
            console.error('Error fetching bulk catatan wali kelas:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ data: data || [] }, { status: 200 });
    }

    // Fetch specific nisn
    let query = supabase.from('catatan_walikelas').select('catatan').eq('nisn', nisn).eq('tahun_ajaran', tahun_ajaran).eq('semester', semester);
    const { data, error } = await query.maybeSingle();

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
