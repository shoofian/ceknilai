import { NextResponse } from 'next/server';
import { checkAuth, checkSuperadminAuth } from '@/lib/auth';
import { getGuru, isGuruLocked } from '@/lib/db';
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

    if (await isGuruLocked(username)) {
      return NextResponse.json({ error: 'Akun Anda sedang dikunci (Read-Only)' }, { status: 403 });
    }

    const guru = await getGuru(username);
    const isSuperadmin = await checkSuperadminAuth();
    const isWaliOrAdmin = !!(guru?.is_admin_sekolah || (guru?.walikelas_tingkatan && guru?.walikelas_rombel_nama));
    if (!isSuperadmin && !isWaliOrAdmin) {
      return NextResponse.json({ error: 'Akses ditolak. Hanya wali kelas atau admin sekolah yang dapat mengimpor biodata.' }, { status: 403 });
    }

    const { biodataList } = await request.json();
    if (!biodataList || !Array.isArray(biodataList) || biodataList.length === 0) {
      return NextResponse.json({ error: 'Data biodata tidak valid atau kosong' }, { status: 400 });
    }

    if (!supabase) {
      console.warn("Supabase tidak dikonfigurasi, menggunakan simulasi (mock) untuk upload.");
      return NextResponse.json({ success: true, count: biodataList.length });
    }

    let listToUpsert = biodataList;
    if (!isSuperadmin && guru?.sekolah_id) {
      const [{ data: bankRows }, { data: kelasRows }] = await Promise.all([
        supabase.from('bank_siswa').select('nisn').eq('sekolah_id', guru.sekolah_id),
        supabase.from('kelas').select('id, guru!inner(sekolah_id)').eq('guru.sekolah_id', guru.sekolah_id)
      ]);
      const allowedNisns = new Set((bankRows || []).map(r => String(r.nisn).trim()));
      const kelasIds = (kelasRows || []).map(k => k.id);
      if (kelasIds.length > 0) {
        const { data: siswaRows } = await supabase
          .from('siswa')
          .select('nisn')
          .in('kelas_id', kelasIds)
          .is('deleted_at', null);
        (siswaRows || []).forEach(s => allowedNisns.add(String(s.nisn).trim()));
      }
      if (allowedNisns.size > 0) {
        listToUpsert = biodataList.filter(b => allowedNisns.has(String(b.nisn || '').trim()));
        if (listToUpsert.length === 0) {
          return NextResponse.json({ error: 'Tidak ada NISN yang cocok dengan siswa di sekolah Anda.' }, { status: 403 });
        }
      }
    }

    // Melakukan upsert data. Karena kita menggunakan NISN sebagai PRIMARY KEY di tabel biodata_siswa.
    // Jika NISN sudah ada, data akan diperbarui (update), jika belum maka akan dibuat (insert).
    const { data, error } = await supabase
      .from('biodata_siswa')
      .upsert(listToUpsert, { onConflict: 'nisn' });

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
