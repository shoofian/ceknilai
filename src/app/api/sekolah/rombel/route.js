import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { getGuru } from '@/lib/db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json([]);
    }
    
    const guru = await getGuru(username);
    if (!guru || !guru.sekolah_id) {
      return NextResponse.json([]);
    }
    
    const { data, error } = await supabase
      .from('kelas')
      .select('tingkatan, rombel_nama, guru:guru_username(sekolah_id)')
      .not('rombel_nama', 'is', null);
      
    if (error) {
      console.error('Error fetching rombels:', error);
      return NextResponse.json([]);
    }
    
    // Filter by school in memory
    const schoolRombels = (data || [])
      .filter(k => k.guru && k.guru.sekolah_id === guru.sekolah_id)
      .map(k => ({
        tingkatan: k.tingkatan,
        rombelNama: k.rombel_nama
      }));
      
    // Deduplicate
    const uniqueMap = {};
    schoolRombels.forEach(r => {
      const key = `${r.tingkatan}-${r.rombelNama}`;
      uniqueMap[key] = r;
    });
    
    const uniqueList = Object.values(uniqueMap).sort((a, b) => {
      if (a.tingkatan !== b.tingkatan) {
        return a.tingkatan - b.tingkatan;
      }
      return a.rombelNama.localeCompare(b.rombelNama);
    });
    
    return NextResponse.json(uniqueList);
  } catch (err) {
    console.error(err);
    return NextResponse.json([]);
  }
}
