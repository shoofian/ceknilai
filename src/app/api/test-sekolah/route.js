import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function GET() {
  const { data, error } = await supabase.from('sekolah').select('*').limit(1);
  if (error) return NextResponse.json({ error: error.message });
  return NextResponse.json(Object.keys(data[0]));
}
