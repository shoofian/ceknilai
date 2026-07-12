import { NextResponse } from 'next/server';
import { getKelasById, updateKelas, deleteKelas } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('guru_session');
  return session && session.value ? session.value : null;
}

export async function GET(request, { params }) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { id } = await params;
    const kelas = await getKelasById(id, username);
    
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    }
    
    return NextResponse.json(kelas);
  } catch (error) {
    console.error('Error in GET kelas by id API:', error);
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
    const fieldsToUpdate = await request.json();
    
    try {
      const updated = await updateKelas(id, fieldsToUpdate, username);
      if (!updated) {
        return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
      }

      // Log teacher activity
      const { logAktivitasGuru } = await import('@/lib/db');
      if (fieldsToUpdate.archived === true) {
        await logAktivitasGuru(username, 'ARSIP_KELAS', `Mengarsipkan kelas "${updated.nama}"`);
      } else if (fieldsToUpdate.archived === false) {
        await logAktivitasGuru(username, 'AKTIFKAN_KELAS', `Mengaktifkan kelas "${updated.nama}"`);
      } else {
        await logAktivitasGuru(username, 'EDIT_KELAS', `Memperbarui kelas "${updated.nama}"`);
      }

      return NextResponse.json({ success: true, kelas: updated });
    } catch (dbError) {
      return NextResponse.json({ error: dbError.message || 'Gagal memperbarui kelas' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in PATCH kelas by id API:', error);
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
    const kelas = await getKelasById(id, username);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    }

    const success = await deleteKelas(id, username);
    
    if (!success) {
      return NextResponse.json({ error: 'Gagal menghapus kelas' }, { status: 400 });
    }

    // Log teacher activity
    const { logAktivitasGuru } = await import('@/lib/db');
    await logAktivitasGuru(username, 'HAPUS_KELAS', `Menghapus kelas "${kelas.nama}"`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE kelas by id API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
