import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { getGuru } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// Helper to check superadmin
async function checkSuperadmin() {
  const username = await checkAuth();
  if (!username) return null;
  const guru = await getGuru(username);
  if (!guru || guru.role !== 'superadmin') return null;
  return guru;
}

export async function GET(request) {
  try {
    const guru = await checkSuperadmin();
    if (!guru) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const sekolahId = searchParams.get('sekolah_id');

    let query = supabase
      .from('master_ekskul')
      .select('*')
      .order('nama_ekskul', { ascending: true });

    if (sekolahId) {
      query = query.eq('sekolah_id', sekolahId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/superadmin/ekskul:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const guru = await checkSuperadmin();
    if (!guru) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await request.json();
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
