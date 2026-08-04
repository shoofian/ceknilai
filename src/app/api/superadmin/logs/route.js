import { NextResponse } from 'next/server';
import { checkSuperadminAuth } from '@/lib/auth';
import { getSuperadminLogs, getSuperadminTeacherLogs } from '@/lib/db';

export const dynamic = 'force-dynamic';

const SUPERADMIN_USERNAMES = ['superadmin', 'shoofian'];



export async function GET(request) {
  try {
    const superadmin = await checkSuperadminAuth();
    if (!superadmin) {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Superadmin.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'siswa';

    if (type === 'guru') {
      const logs = await getSuperadminTeacherLogs();
      return NextResponse.json(logs);
    } else {
      const logs = await getSuperadminLogs();
      return NextResponse.json(logs);
    }
  } catch (error) {
    console.error('Error in GET superadmin logs API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
