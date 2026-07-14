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

    const { isGuruLocked } = await import('@/lib/db');
    if (await isGuruLocked(username)) {
      return NextResponse.json({ error: 'Akun Anda sedang dikunci (Read-Only)' }, { status: 403 });
    }

    const { id } = await params;
    const { nama, bobot, isGroup, subKolom, hitungMetode, defaultNilai } = await request.json();

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
      bobot: Number(bobot),
      isGroup: !!isGroup,
      defaultNilai: defaultNilai !== undefined && defaultNilai !== null && defaultNilai !== "" ? Number(defaultNilai) : null
    };
    
    if (newColumn.isGroup && Array.isArray(subKolom)) {
      // Simpan hitungMetode agar metode perhitungan (rata-rata / persentase) terjaga
      newColumn.hitungMetode = hitungMetode || 'rata-rata';
      newColumn.subKolom = subKolom.map((sub, i) => ({
        id: `${columnId}-sub-${Date.now()}-${i}`,
        nama: sub.nama.trim(),
        bobot: sub.bobot !== undefined && sub.bobot !== null ? Number(sub.bobot) : null,
        defaultNilai: sub.defaultNilai !== undefined && sub.defaultNilai !== null && sub.defaultNilai !== "" ? Number(sub.defaultNilai) : null
      }));
    }

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

      const updatePromises = kelas.siswa.map(siswa => {
        let updatedNilai = { ...(siswa.nilai || {}) };
        if (newColumn.isGroup && newColumn.subKolom) {
          newColumn.subKolom.forEach(sub => {
            updatedNilai[sub.id] = sub.defaultNilai !== undefined && sub.defaultNilai !== null ? sub.defaultNilai : null;
          });
        } else {
          updatedNilai[columnId] = newColumn.defaultNilai !== undefined && newColumn.defaultNilai !== null ? newColumn.defaultNilai : null;
        }

        return sb.from('siswa')
          .update({ nilai: updatedNilai })
          .eq('kelas_id', id)
          .eq('nisn', siswa.nisn);
      });
      await Promise.all(updatePromises);
    }

    // Log teacher activity
    const { logAktivitasGuru } = await import('@/lib/db');
    await logAktivitasGuru(
      username,
      'TAMBAH_KOLOM',
      `Menambahkan kolom nilai "${nama.trim()}" (Bobot: ${bobot}%) di kelas "${kelas.nama}"`
    );

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

    const { isGuruLocked } = await import('@/lib/db');
    if (await isGuruLocked(username)) {
      return NextResponse.json({ error: 'Akun Anda sedang dikunci (Read-Only)' }, { status: 403 });
    }

    const { id } = await params;
    const { kolomNilai, skemaPenilaian } = await request.json();

    if (!Array.isArray(kolomNilai)) {
      return NextResponse.json({ error: 'Data kolom nilai tidak valid' }, { status: 400 });
    }

    const kelas = await getKelasById(id, username);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    }

    // Pastikan bobot berupa angka
    const cleanedKolom = kolomNilai.map(col => {
      const cleanCol = {
        id: col.id,
        nama: col.nama.trim(),
        bobot: Number(col.bobot),
        isGroup: !!col.isGroup,
        defaultNilai: col.defaultNilai !== undefined && col.defaultNilai !== null && col.defaultNilai !== "" ? Number(col.defaultNilai) : null
      };
      if (cleanCol.isGroup) {
        // Simpan hitungMetode agar metode perhitungan (rata-rata / persentase) terjaga
        cleanCol.hitungMetode = col.hitungMetode || 'rata-rata';
        if (Array.isArray(col.subKolom)) {
          cleanCol.subKolom = col.subKolom.map(sub => ({
            id: sub.id || `${cleanCol.id}-sub-${Date.now()}-${Math.random().toString(36).substr(2,4)}`,
            nama: sub.nama.trim(),
            bobot: sub.bobot !== undefined && sub.bobot !== null ? Number(sub.bobot) : null,
            defaultNilai: sub.defaultNilai !== undefined && sub.defaultNilai !== null && sub.defaultNilai !== "" ? Number(sub.defaultNilai) : null
          }));
        }
      }
      return cleanCol;
    });

    await updateKelas(id, { kolomNilai: cleanedKolom, skemaPenilaian }, username);

    // Inisialisasi nilai null untuk semua sub-kolom baru
    if (kelas.siswa && kelas.siswa.length > 0) {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );

      const updatePromises = [];
      for (const siswa of kelas.siswa) {
        let updatedNilai = { ...(siswa.nilai || {}) };
        let changed = false;

        cleanedKolom.forEach(col => {
          if (col.isGroup && col.subKolom) {
            col.subKolom.forEach(sub => {
              if (updatedNilai[sub.id] === undefined) {
                updatedNilai[sub.id] = sub.defaultNilai !== undefined && sub.defaultNilai !== null ? sub.defaultNilai : null;
                changed = true;
              }
            });
          } else {
            if (updatedNilai[col.id] === undefined) {
              updatedNilai[col.id] = col.defaultNilai !== undefined && col.defaultNilai !== null ? col.defaultNilai : null;
              changed = true;
            }
          }
        });

        if (changed) {
          updatePromises.push(
            sb.from('siswa')
              .update({ nilai: updatedNilai })
              .eq('kelas_id', id)
              .eq('nisn', siswa.nisn)
          );
        }
      }
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }
    }

    // Log teacher activity
    const { logAktivitasGuru } = await import('@/lib/db');
    await logAktivitasGuru(
      username,
      'EDIT_KOLOM',
      `Memperbarui bobot/aspek penilaian di kelas "${kelas.nama}"`
    );

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

    const { isGuruLocked } = await import('@/lib/db');
    if (await isGuruLocked(username)) {
      return NextResponse.json({ error: 'Akun Anda sedang dikunci (Read-Only)' }, { status: 403 });
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
    const deletedCol = kelas.kolomNilai.find(col => col.id === kolomId);
    kelas.kolomNilai = kelas.kolomNilai.filter(col => col.id !== kolomId);

    if (kelas.kolomNilai.length === initialColumnsLength || !deletedCol) {
      return NextResponse.json({ error: 'Kolom tidak ditemukan' }, { status: 404 });
    }

    // Hapus data nilai kolom ini dari setiap siswa
    kelas.siswa.forEach(siswa => {
      if (siswa.nilai) {
        if (deletedCol.isGroup && deletedCol.subKolom) {
          deletedCol.subKolom.forEach(sub => {
            delete siswa.nilai[sub.id];
          });
        } else {
          delete siswa.nilai[kolomId];
        }
      }
    });

    await updateKelas(id, {
      kolomNilai: kelas.kolomNilai,
      siswa: kelas.siswa
    }, username);

    // Log teacher activity
    const { logAktivitasGuru } = await import('@/lib/db');
    await logAktivitasGuru(
      username,
      'HAPUS_KOLOM',
      `Menghapus kolom nilai "${deletedCol.nama}" di kelas "${kelas.nama}"`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE kolom API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
