import { NextResponse } from 'next/server';
import { getGuru, updateGuru } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('guru_session');
  return session && !!session.value;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('guru_session');
    if (!session || !session.value) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const guru = await getGuru(session.value);
    const { password: _, ...guruData } = guru;
    return NextResponse.json(guruData);
  } catch (error) {
    console.error('Error in GET profil API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('guru_session');
    if (!session || !session.value) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { isGuruLocked } = await import('@/lib/db');
    if (await isGuruLocked(session.value)) {
      return NextResponse.json({ error: 'Akun Anda sedang dikunci (Read-Only)' }, { status: 403 });
    }

    const { nama, username, email, oldPassword, newPassword, sekolah_id, walikelas_tingkatan, walikelas_rombel_nama } = await request.json();

    if (!nama || !username || !email) {
      return NextResponse.json({ error: 'Nama, username, dan email harus diisi' }, { status: 400 });
    }

    const currentGuru = await getGuru(session.value);

    const updatedProfile = {
      nama: nama.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim(),
      sekolah_id: sekolah_id || null,
      walikelas_tingkatan: walikelas_tingkatan !== undefined ? (walikelas_tingkatan !== null ? Number(walikelas_tingkatan) : null) : undefined,
      walikelas_rombel_nama: walikelas_rombel_nama !== undefined ? (walikelas_rombel_nama ? walikelas_rombel_nama.trim() : null) : undefined
    };

    // Jika ingin mengganti password
    if (newPassword) {
      if (!oldPassword) {
        return NextResponse.json({ error: 'Password lama harus diisi untuk mengubah password' }, { status: 400 });
      }
      if (oldPassword !== currentGuru.password) {
        return NextResponse.json({ error: 'Password lama salah' }, { status: 400 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 });
      }
      updatedProfile.password = newPassword;
    }

    const updated = await updateGuru(session.value, updatedProfile);
    if (!updated) {
      return NextResponse.json({ error: 'Gagal memperbarui profil atau username sudah digunakan' }, { status: 400 });
    }

    // Sync session cookie if username changed
    if (updated.username.toLowerCase() !== session.value.toLowerCase()) {
      cookieStore.set('guru_session', updated.username, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 1 hari
        path: '/',
      });
    }

    // Log teacher activity
    const { logAktivitasGuru } = await import('@/lib/db');
    if (newPassword) {
      await logAktivitasGuru(session.value, 'UBAH_PASSWORD', 'Memperbarui kata sandi akun');
    } else {
      await logAktivitasGuru(session.value, 'EDIT_PROFIL', 'Memperbarui informasi profil akun');
    }

    const { password: _, ...guruData } = updated;
    return NextResponse.json({ success: true, user: guruData });
  } catch (error) {
    console.error('Error in POST profil API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
