import { NextResponse } from 'next/server';
import { checkSuperadminAuth } from '@/lib/auth';
import { getGuru } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

export async function PUT(request, { params }) {
  try {
    const isSuperadmin = await checkSuperadminAuth();
    if (!isSuperadmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { nama_ekskul, pembina } = body;

    const { data, error } = await supabase
      .from('master_ekskul')
      .update({ nama_ekskul, pembina })
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Error in PUT /api/superadmin/ekskul/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const isSuperadmin = await checkSuperadminAuth();
    if (!isSuperadmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await params;

    const { error } = await supabase
      .from('master_ekskul')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/superadmin/ekskul/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
