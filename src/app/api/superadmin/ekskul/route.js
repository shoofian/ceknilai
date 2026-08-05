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

    const { data, error } = await supabase
      .from('master_ekskul')
      .select('*')
      .eq('sekolah_id', guru.sekolah_id)
      .order('nama_ekskul', { ascending: true });

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
    const { nama_ekskul, pembina } = body;

    if (!nama_ekskul) {
      return NextResponse.json({ error: 'Nama ekskul wajib diisi' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('master_ekskul')
      .insert([
        { 
          sekolah_id: guru.sekolah_id,
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
