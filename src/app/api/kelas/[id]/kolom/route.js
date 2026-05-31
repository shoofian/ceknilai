import { NextResponse } from 'next/server';
import { getKelasById, updateKelas } from '@/lib/db';
import { cookies } from 'next/headers';

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('guru_session');
  return session && session.value ? session.value : null;
}

export async function POST(request, { params }) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { id } = await params;
    const { nama, bobot } = await request.json();

    if (!nama || bobot === undefined) {
      return NextResponse.json(
        { error: 'Nama kolom dan bobot persentase harus diisi' },
        { status: 400 }
      );
    }

    const kelas = await getKelasById(id, username);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    }

    const columnId = 'col-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const newColumn = {
      id: columnId,
      nama: nama.trim(),
      bobot: Number(bobot)
    };

    // Tambah kolom ke daftar
    kelas.kolomNilai.push(newColumn);

    // Tambah kolom ke daftar — simpan hanya kolomNilai, jangan sentuh siswa via updateKelas
    await updateKelas(id, {
      kolomNilai: kelas.kolomNilai
    }, username);

    // Inisialisasi nilai null untuk semua siswa di kolom baru ini secara langsung (aman, tanpa delete)
    if (kelas.siswa && kelas.siswa.length > 0) {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );

      for (const siswa of kelas.siswa) {
        const updatedNilai = { ...(siswa.nilai || {}), [columnId]: null };
        await sb.from('siswa')
          .update({ nilai: updatedNilai })
          .eq('kelas_id', id)
          .eq('nisn', siswa.nisn);
      }
    }

    return NextResponse.json({ success: true, kolom: newColumn });
  } catch (error) {
    console.error('Error in POST kolom API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { id } = await params;
    const { kolomNilai } = await request.json();

    if (!Array.isArray(kolomNilai)) {
      return NextResponse.json({ error: 'Data kolom nilai tidak valid' }, { status: 400 });
    }

    const kelas = await getKelasById(id, username);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    }

    // Pastikan bobot berupa angka
    const cleanedKolom = kolomNilai.map(col => ({
      id: col.id,
      nama: col.nama.trim(),
      bobot: Number(col.bobot)
    }));

    await updateKelas(id, { kolomNilai: cleanedKolom }, username);
    return NextResponse.json({ success: true, kolomNilai: cleanedKolom });
  } catch (error) {
    console.error('Error in PATCH kolom API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const kolomId = searchParams.get('id');

    if (!kolomId) {
      return NextResponse.json({ error: 'ID kolom harus ditentukan' }, { status: 400 });
    }

    const kelas = await getKelasById(id, username);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    }

    // Filter keluar kolom yang dihapus
    const initialColumnsLength = kelas.kolomNilai.length;
    kelas.kolomNilai = kelas.kolomNilai.filter(col => col.id !== kolomId);

    if (kelas.kolomNilai.length === initialColumnsLength) {
      return NextResponse.json({ error: 'Kolom tidak ditemukan' }, { status: 404 });
    }

    // Hapus data nilai kolom ini dari setiap siswa
    kelas.siswa.forEach(siswa => {
      if (siswa.nilai) {
        delete siswa.nilai[kolomId];
      }
    });

    await updateKelas(id, {
      kolomNilai: kelas.kolomNilai,
      siswa: kelas.siswa
    }, username);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE kolom API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
