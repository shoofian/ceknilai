import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkSuperadminAuth } from '@/lib/auth';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function GET() {
  const isSuperadmin = await checkSuperadminAuth();
  if (!isSuperadmin) {
    return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 });
  }
  const { data, error } = await supabase.from('sekolah').select('*').limit(1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data?.[0] ? Object.keys(data[0]) : []);
}
