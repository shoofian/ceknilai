import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
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

export async function GET(request) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const guru = await getGuru(username);
    if (!guru || !guru.walikelas_tingkatan || !guru.walikelas_rombel_nama) {
      return NextResponse.json({ error: 'Anda bukan wali kelas' }, { status: 403 });
    }

    if (!supabase) {
      return NextResponse.json({ siswa: [] });
    }

    // Gunakan fungsi yang sama dengan halaman Wali Kelas agar data presisi
    const { getLegerData } = await import('@/lib/db');
    // Ambil data ganjil atau genap, siswa akan muncul jika terdaftar di salah satu mapel.
    let leger = await getLegerData(
      guru.sekolah_id, 
      guru.walikelas_tingkatan, 
      guru.walikelas_rombel_nama, 
      guru.tahun_ajaran || '2025/2026', 
      "Ganjil"
    );

    if (!leger || !leger.siswa || leger.siswa.length === 0) {
      leger = await getLegerData(
        guru.sekolah_id, 
        guru.walikelas_tingkatan, 
        guru.walikelas_rombel_nama, 
        guru.tahun_ajaran || '2025/2026', 
        "Genap"
      );
    }

    if (!leger || !leger.siswa || leger.siswa.length === 0) {
      return NextResponse.json({ siswa: [] });
    }

    const students = leger.siswa;

    // 2. Ambil status biodata siswa secara lengkap
    const nisnList = students.map(s => s.nisn);
    const { data: biodataList, error: errBiodata } = await supabase
      .from('biodata_siswa')
      .select('*')
      .in('nisn', nisnList);

    const biodataMap = new Map();
    if (!errBiodata && biodataList) {
      biodataList.forEach(b => biodataMap.set(b.nisn, b));
    }

    // 3. Siapkan response
    const siswa = students.map(s => ({
      nisn: s.nisn,
      nama: s.nama,
      status_pengisian: biodataMap.has(s.nisn) ? 'Selesai' : 'Belum Selesai',
      biodata_detail: biodataMap.get(s.nisn) || null
    }));

    // Urutkan berdasarkan nama
    siswa.sort((a, b) => a.nama.localeCompare(b.nama));

    return NextResponse.json({ siswa });
  } catch (error) {
    console.error('Error in GET erapor/siswa:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal server' }, { status: 500 });
  }
}
