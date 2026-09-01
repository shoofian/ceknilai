import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { getGuru, updateGuru } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const guru = await getGuru(username);
    if (!guru) {
      return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
    }
    
    const { password: _, ...guruData } = guru;
    
    let isExpired = false;
    if (guruData.premium_until) {
      isExpired = new Date() > new Date(guruData.premium_until);
    } else {
      const globalTrialEnd = new Date('2026-08-31T23:59:59+07:00');
      isExpired = new Date() > globalTrialEnd;
    }

    if (isExpired && !guruData.is_locked) {
      guruData.is_locked = true;
      guruData.lock_message = "Masa aktif premium Anda telah berakhir. Silakan lakukan aktivasi/perpanjangan paket di menu Masa Aktif.";
    }
    return NextResponse.json(guruData);
  } catch (error) {
    console.error('Error in GET profil API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const usernameFromAuth = await checkAuth();
    if (!usernameFromAuth) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { isGuruLocked } = await import('@/lib/db');
    if (await isGuruLocked(usernameFromAuth)) {
      return NextResponse.json({ error: 'Akun Anda sedang dikunci (Read-Only)' }, { status: 403 });
    }

    const { nama, username, email, oldPassword, newPassword, sekolah_id, walikelas_tingkatan, walikelas_rombel_nama, tahun_ajaran } = await request.json();

    if (!nama || !username || !email) {
      return NextResponse.json({ error: 'Nama, username, dan email harus diisi' }, { status: 400 });
    }

    const currentGuru = await getGuru(usernameFromAuth);

    // Admin Sekolah tidak boleh mengganti sekolah_id
    const finalSekolahId = currentGuru.is_admin_sekolah 
      ? currentGuru.sekolah_id  // Keep original
      : (sekolah_id || null);

    const updatedProfile = {
      nama: nama.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim(),
      sekolah_id: finalSekolahId,
      walikelas_tingkatan: walikelas_tingkatan !== undefined ? (walikelas_tingkatan !== null ? Number(walikelas_tingkatan) : null) : undefined,
      walikelas_rombel_nama: walikelas_rombel_nama !== undefined ? (walikelas_rombel_nama ? walikelas_rombel_nama.trim() : null) : undefined,
      tahun_ajaran: tahun_ajaran !== undefined ? (tahun_ajaran ? tahun_ajaran.trim() : '2025/2026') : undefined
    };

    // Jika ingin mengganti password
    if (newPassword) {
      if (!oldPassword) {
        return NextResponse.json({ error: 'Password lama harus diisi untuk mengubah password' }, { status: 400 });
      }
      
      const bcrypt = await import('bcryptjs');
      let isOldPasswordValid = false;
      if (currentGuru.password.startsWith('$2a$') || currentGuru.password.startsWith('$2b$')) {
        isOldPasswordValid = bcrypt.compareSync(oldPassword, currentGuru.password);
      } else {
        isOldPasswordValid = (oldPassword === currentGuru.password);
      }
      
      if (!isOldPasswordValid) {
        return NextResponse.json({ error: 'Password lama salah' }, { status: 400 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 });
      }
      
      const salt = bcrypt.genSaltSync(10);
      updatedProfile.password = bcrypt.hashSync(newPassword, salt);
    }

    const updated = await updateGuru(usernameFromAuth, updatedProfile);
    if (!updated) {
      return NextResponse.json({ error: 'Gagal memperbarui profil atau username sudah digunakan' }, { status: 400 });
    }

    // Sync session cookie if username changed
    if (updated.username.toLowerCase() !== usernameFromAuth.toLowerCase()) {
      const { signToken } = await import('@/lib/auth');
      const token = await signToken({ username: updated.username });
      const cookieStore = await cookies();
      cookieStore.set('guru_session', token, {
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
      await logAktivitasGuru(usernameFromAuth, 'UBAH_PASSWORD', 'Memperbarui kata sandi akun');
    } else {
      await logAktivitasGuru(usernameFromAuth, 'EDIT_PROFIL', 'Memperbarui informasi profil akun');
    }

    const { password: _, ...guruData } = updated;
    const isExpired = guruData.premium_until ? new Date() > new Date(guruData.premium_until) : false;
    if (isExpired && !guruData.is_locked) {
      guruData.is_locked = true;
      guruData.lock_message = "Masa aktif premium Anda telah berakhir. Silakan lakukan aktivasi/perpanjangan paket di menu Masa Aktif.";
    }
    return NextResponse.json({ success: true, user: guruData });
  } catch (error) {
    console.error('Error in POST profil API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
