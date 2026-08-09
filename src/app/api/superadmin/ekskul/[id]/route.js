import { NextResponse } from 'next/server';
import { checkAdminSekolahAuth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const sekolahId = body.sekolah_id;

    const auth = await checkAdminSekolahAuth(sekolahId);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nama_ekskul, pembina, sekolah_id } = body;

    if (!nama_ekskul || !sekolah_id) {
      return NextResponse.json({ error: 'Nama ekskul dan sekolah_id wajib diisi' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('master_ekskul')
      .update({
        nama_ekskul,
        pembina: pembina || ''
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error) {
    console.error(`Error in PUT /api/superadmin/ekskul/${id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    // We don't get sekolah_id in DELETE body typically, so let's fetch the record first
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { data: record, error: fetchErr } = await supabase.from('master_ekskul').select('sekolah_id').eq('id', id).single();
    if (fetchErr || !record) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }

    const auth = await checkAdminSekolahAuth(record.sekolah_id);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('master_ekskul')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error in DELETE /api/superadmin/ekskul/${params.id}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
