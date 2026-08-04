import { NextResponse } from 'next/server';
import { checkSuperadminAuth } from '@/lib/auth';
import { logAktivitasGuru } from '@/lib/db';

const SUPERADMIN_USERNAMES = ['superadmin', 'shoofian'];



export async function POST(request) {
  try {
    const superadmin = await checkSuperadminAuth();
    if (!superadmin) {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Superadmin.' }, { status: 403 });
    }

    const { targetUsername, points, description } = await request.json();

    if (!targetUsername || !points || !description) {
      return NextResponse.json({ error: 'Semua kolom wajib diisi' }, { status: 400 });
    }

    const ptsNum = parseInt(points, 10);
    if (isNaN(ptsNum)) {
      return NextResponse.json({ error: 'Jumlah poin harus berupa angka' }, { status: 400 });
    }

    const format = ptsNum >= 0 ? `+${ptsNum}` : `${ptsNum}`;
    const detailString = `POINTS:${format} | Penyesuaian Manual: ${description} (Oleh Admin)`;

    // Write log to target teacher's log activity
    const result = await logAktivitasGuru(targetUsername, 'REFERRAL_POINTS', detailString);
    if (!result) {
      return NextResponse.json({ error: 'Gagal mencatat transaksi poin' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Poin sebanyak ${format} berhasil disimpan ke akun @${targetUsername}` });
  } catch (error) {
    console.error('Error in superadmin points API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
