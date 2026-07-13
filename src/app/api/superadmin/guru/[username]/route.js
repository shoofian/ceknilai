import { NextResponse } from 'next/server';
import { updateGuruByAdmin, deleteGuruByAdmin } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const SUPERADMIN_USERNAMES = ['superadmin', 'shoofian'];

async function checkSuperadminAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('guru_session');
  if (!session || !session.value) return null;
  const username = session.value.toLowerCase();
  return SUPERADMIN_USERNAMES.includes(username) ? session.value : null;
}

export async function PATCH(request, { params }) {
  try {
    const superadmin = await checkSuperadminAuth();
    if (!superadmin) {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Superadmin.' }, { status: 403 });
    }

    const { username } = await params;
    const { nama, email, password, is_locked, lock_message } = await request.json();

    if (!nama || !email) {
      return NextResponse.json({ error: 'Nama dan email harus diisi' }, { status: 400 });
    }

    if (password && password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    try {
      const updatedGuru = await updateGuruByAdmin(username, { nama, email, password, is_locked, lock_message });
      const { password: _, ...sanitized } = updatedGuru;
      return NextResponse.json({ success: true, user: sanitized });
    } catch (dbError) {
      return NextResponse.json({ error: dbError.message || 'Gagal memperbarui akun guru' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in PATCH superadmin guru API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const superadmin = await checkSuperadminAuth();
    if (!superadmin) {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Superadmin.' }, { status: 403 });
    }

    const { username } = await params;

    // Prevent deleting oneself
    if (username.toLowerCase() === superadmin.toLowerCase()) {
      return NextResponse.json({ error: 'Tidak dapat menghapus akun Anda sendiri' }, { status: 400 });
    }

    try {
      const success = await deleteGuruByAdmin(username);
      return NextResponse.json({ success });
    } catch (dbError) {
      return NextResponse.json({ error: dbError.message || 'Gagal menghapus akun guru' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in DELETE superadmin guru API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
