import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

export const dynamic = 'force-dynamic';

function normalizeQuery(q) {
  if (!q) return "";
  let clean = q.trim();
  clean = clean.replace(/\bsman\b/gi, "SMA Negeri");
  clean = clean.replace(/\bsmkn\b/gi, "SMK Negeri");
  clean = clean.replace(/\bsmpn\b/gi, "SMP Negeri");
  clean = clean.replace(/\bsdn\b/gi, "SD Negeri");
  return clean;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('query') || "";
    
    let query = supabase.from('sekolah').select('*').order('nama', { ascending: true });
    
    if (q) {
      const normalized = normalizeQuery(q);
      query = query.or(`nama.ilike.%${normalized}%,npsn.ilike.%${q}%`);
    } else {
      query = query.limit(100);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error searching sekolah:', error);
      // Return empty list if table not migrated yet to prevent frontend crashes
      return NextResponse.json([]);
    }
    
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Unexpected error in sekolah search API:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
