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

    // 1. Ambil data siswa dari bank_siswa
    const { data: bankSiswaList, error: errBank } = await supabase
      .from('bank_siswa')
      .select('*')
      .eq('sekolah_id', guru.sekolah_id)
      .eq('tahun_pelajaran', guru.tahun_ajaran || '2025/2026')
      .eq('tingkatan', guru.walikelas_tingkatan)
      .eq('rombel', guru.walikelas_rombel_nama)
      .order('nama', { ascending: true });

    if (errBank) {
      console.error('Error fetching bank_siswa for erapor:', errBank);
      return NextResponse.json({ error: 'Gagal mengambil data siswa' }, { status: 500 });
    }

    if (!bankSiswaList || bankSiswaList.length === 0) {
      return NextResponse.json({ siswa: [] });
    }

    // 2. Ambil status biodata siswa untuk menandai 'Selesai' atau 'Belum Selesai'
    const nisnList = bankSiswaList.map(s => s.nisn);
    const { data: biodataList, error: errBiodata } = await supabase
      .from('biodata_siswa')
      .select('nisn')
      .in('nisn', nisnList);

    const biodataMap = new Set();
    if (!errBiodata && biodataList) {
      biodataList.forEach(b => biodataMap.add(b.nisn));
    }

    // 3. Gabungkan data
    const siswa = bankSiswaList.map(s => ({
      id: s.id, // ID bank siswa
      nisn: s.nisn,
      nama: s.nama,
      status_pengisian: biodataMap.has(s.nisn) ? 'Selesai' : 'Belum Selesai'
    }));

    return NextResponse.json({ siswa });
  } catch (error) {
    console.error('Error in GET erapor/siswa:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal server' }, { status: 500 });
  }
}
