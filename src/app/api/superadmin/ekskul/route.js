import { NextResponse } from 'next/server';
import { checkAdminSekolahAuth } from '@/lib/auth';
import { getGuru } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

import { getEkskulData } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sekolahId = searchParams.get('sekolah_id');
    const type = searchParams.get('type');

    if (type !== 'public') {
      const auth = await checkAdminSekolahAuth(sekolahId);
      if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // if type=public, we don't strictly require superadmin/admin auth here, but we pass sekolahId
    const data = await getEkskulData(sekolahId || null);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching ekskul:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
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
      .insert([
        { 
          sekolah_id: sekolah_id,
          nama_ekskul,
          pembina: pembina || ''
        }
      ])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Error in POST /api/superadmin/ekskul:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
