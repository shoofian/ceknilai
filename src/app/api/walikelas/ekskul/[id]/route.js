import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { getGuru } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

export async function DELETE(request, { params }) {
  try {
    const username = await checkAuth();
    if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const guru = await getGuru(username);
    if (!guru || !guru.walikelas_tingkatan) {
      return NextResponse.json({ error: 'Bukan wali kelas' }, { status: 403 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from('nilai_ekskul')
      .delete()
      .eq('id', id)
      .eq('sekolah_id', guru.sekolah_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/walikelas/ekskul/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
