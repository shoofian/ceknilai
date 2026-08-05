import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

export async function POST(request) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { biodataList } = await request.json();
    if (!biodataList || !Array.isArray(biodataList) || biodataList.length === 0) {
      return NextResponse.json({ error: 'Data biodata tidak valid atau kosong' }, { status: 400 });
    }

    if (!supabase) {
      console.warn("Supabase tidak dikonfigurasi, menggunakan simulasi (mock) untuk upload.");
      return NextResponse.json({ success: true, count: biodataList.length });
    }

    // Melakukan upsert data. Karena kita menggunakan NISN sebagai PRIMARY KEY di tabel biodata_siswa.
    // Jika NISN sudah ada, data akan diperbarui (update), jika belum maka akan dibuat (insert).
    const { data, error } = await supabase
      .from('biodata_siswa')
      .upsert(biodataList, { onConflict: 'nisn' });

    if (error) {
      console.error('Error saat bulk-import biodata:', error);
      // Jika error 42P01 berarti tabel biodata_siswa belum dibuat
      if (error.code === '42P01') {
         return NextResponse.json({ error: 'Tabel biodata_siswa belum ada di database. Silakan jalankan script SQL terlebih dahulu.' }, { status: 500 });
      }
      return NextResponse.json({ error: 'Gagal menyimpan ke database Supabase.' }, { status: 500 });
    }

    // Catat ke log aktivitas guru
    try {
      const { logAktivitasGuru } = await import('@/lib/db');
      await logAktivitasGuru(username, 'IMPOR_DAPODIK', `Berhasil mengimpor biodata ${biodataList.length} siswa dari Dapodik`);
    } catch (logErr) {
      console.warn('Gagal mencatat log aktivitas:', logErr);
    }

    return NextResponse.json({
      success: true,
      count: biodataList.length,
      message: `Berhasil mengimpor ${biodataList.length} biodata siswa.`
    });
  } catch (error) {
    console.error('Error in POST biodata bulk-import API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal pada server' }, { status: 500 });
  }
}
