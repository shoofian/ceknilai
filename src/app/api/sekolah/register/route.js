import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

export const dynamic = 'force-dynamic';

function normalizeSchoolName(name) {
  if (!name) return "";
  let clean = name.trim();
  clean = clean.replace(/\bsman\b/gi, "SMA Negeri");
  clean = clean.replace(/\bsmkn\b/gi, "SMK Negeri");
  clean = clean.replace(/\bsmpn\b/gi, "SMP Negeri");
  clean = clean.replace(/\bsdn\b/gi, "SD Negeri");
  return clean;
}

export async function POST(request) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan. Silakan login terlebih dahulu.' }, { status: 401 });
    }

    const ip = getClientIp(request);
    const rl = checkRateLimit(`sekolah-reg:${ip}`, { limit: 5, windowMs: 60 * 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan pendaftaran sekolah.' }, { status: 429 });
    }

    const { nama, npsn } = await request.json();
    
    if (!nama || !npsn) {
      return NextResponse.json({ error: 'Nama sekolah dan NPSN wajib diisi' }, { status: 400 });
    }
    
    const cleanNpsn = npsn.trim();
    if (!/^\d{8}$/.test(cleanNpsn)) {
      return NextResponse.json({ error: 'NPSN harus berupa 8 digit angka' }, { status: 400 });
    }
    
    const cleanNama = normalizeSchoolName(nama);
    const id = `SCH-${cleanNpsn}`;
    
    const { data, error } = await supabase
      .from('sekolah')
      .insert({
        id,
        nama: cleanNama,
        npsn: cleanNpsn
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error registering sekolah:', error);
      if (error.code === '23505') { // Duplicate key
        return NextResponse.json({ error: 'Sekolah dengan NPSN tersebut sudah terdaftar' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message || 'Gagal mendaftarkan sekolah' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, sekolah: data });
  } catch (err) {
    console.error('Unexpected error in sekolah register API:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
