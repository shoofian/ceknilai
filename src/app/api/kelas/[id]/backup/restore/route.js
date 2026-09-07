import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { getKelasBackupById, getKelasById, updateKelas } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { id } = await params;
    const { backupId } = await request.json();
    
    if (!backupId) {
      return NextResponse.json({ error: 'ID Backup tidak disertakan' }, { status: 400 });
    }

    // Check if class exists and belongs to user
    const kelas = await getKelasById(id, username);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan atau akses ditolak' }, { status: 404 });
    }

    const backup = await getKelasBackupById(backupId);
    if (!backup || backup.kelas_id !== id) {
      return NextResponse.json({ error: 'Backup tidak ditemukan' }, { status: 404 });
    }

    // The snapshot contains the full class state, including students and kolom_nilai.
    // For restoration, we only overwrite the `siswa` array from the snapshot back to the class.
    // (We also restore the original kolomNilai if desired, but we can do it by updating the `siswa` array on `kelas` which gets saved as JSON if we treat `siswa` as a JSON column or upsert the `siswa` table).
    // Wait, in this application, updateKelas(id, { siswa: [] }) upserts students based on NISN. 
    // Wait, `updateKelas` uses `.upsert` for students, but it doesn't delete the missing ones.
    // BUT we have soft deletes now. Wait, restoring from backup requires undeleting students!
    
    // To restore students properly, we might just update the class's `siswa` state entirely.
    // Let's implement full restoration in `db.js` instead.
    
    const { restoreKelasFromSnapshot } = await import('@/lib/db');
    
    const success = await restoreKelasFromSnapshot(id, backup.snapshot);

    if (!success) {
       return NextResponse.json({ error: 'Gagal memulihkan backup' }, { status: 500 });
    }

    const { logAktivitasGuru } = await import('@/lib/db');
    await logAktivitasGuru(username, 'RESTORE_KELAS', `Memulihkan kelas "${kelas.nama}" dari backup: ${backup.keterangan}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error restoring backup:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
