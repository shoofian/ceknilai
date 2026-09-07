import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { getKelasBackups, createKelasBackup, getKelasById } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { id } = await params;
    
    // Check if class exists and belongs to user
    const kelas = await getKelasById(id, username);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan atau akses ditolak' }, { status: 404 });
    }

    const backups = await getKelasBackups(id);
    return NextResponse.json({ backups });
  } catch (error) {
    console.error('Error fetching backups:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const keterangan = body.keterangan || 'Backup Manual';
    
    // Check if class exists and belongs to user
    const kelas = await getKelasById(id, username);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan atau akses ditolak' }, { status: 404 });
    }

    const backup = await createKelasBackup(id, username, keterangan);
    
    if (!backup) {
       return NextResponse.json({ error: 'Gagal membuat backup' }, { status: 500 });
    }

    const { logAktivitasGuru } = await import('@/lib/db');
    await logAktivitasGuru(username, 'BACKUP_KELAS', `Membuat backup manual untuk kelas "${kelas.nama}"`);

    return NextResponse.json({ success: true, backup });
  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
