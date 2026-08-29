import { NextResponse } from 'next/server';
import { checkSuperadminAuth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const superadmin = await checkSuperadminAuth();
    if (!superadmin) {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Superadmin.' }, { status: 403 });
    }

    const { data: logs, error } = await supabase
      .from('log_aktivitas_guru')
      .select('id, guru_username, aksi, detail, created_at, guru(nama)')
      .in('aksi', ['PAYMENT_APPROVED', 'REFERRAL_POINTS', 'REDEEM_POINTS', 'BIAYA_OPERASIONAL', 'PAYMENT_PENDING'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching finance logs:', error);
      return NextResponse.json({ error: 'Gagal mengambil data keuangan' }, { status: 500 });
    }

    const formattedLogs = logs.map(log => ({
      id: log.id,
      username: log.guru_username,
      namaGuru: log.guru?.nama || log.guru_username,
      aksi: log.aksi,
      detail: log.detail,
      timestamp: log.created_at
    }));

    return NextResponse.json(formattedLogs);
  } catch (error) {
    console.error('Error in GET superadmin finance API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
