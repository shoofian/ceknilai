import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { getKelas, createKelasBackup } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    // Ambil semua kelas aktif dari guru ini
    const kelasAktif = await getKelas(false, username);
    
    if (!kelasAktif || kelasAktif.length === 0) {
      return NextResponse.json({ error: 'Tidak ada kelas untuk di-backup' }, { status: 404 });
    }

    let successCount = 0;
    let failCount = 0;

    // Lakukan backup massal (bisa secara berurutan atau paralel, kita pilih paralel agar lebih cepat)
    await Promise.all(
      kelasAktif.map(async (kelas) => {
        try {
          const result = await createKelasBackup(kelas.id, username, 'Backup Massal Seluruh Kelas');
          if (result) successCount++;
          else failCount++;
        } catch (e) {
          console.error(`Gagal backup kelas ${kelas.id}:`, e);
          failCount++;
        }
      })
    );

    return NextResponse.json({ 
      success: true, 
      message: `Backup massal selesai. ${successCount} berhasil, ${failCount} gagal.` 
    });

  } catch (error) {
    console.error('Error in bulk backup:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
