import { NextResponse } from 'next/server';
import { checkSuperadminAuth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

export async function POST(request) {
  try {
    const superadmin = await checkSuperadminAuth();
    if (!superadmin) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const { logId } = await request.json();

    if (!logId) {
      return NextResponse.json({ error: 'Data logId wajib diisi' }, { status: 400 });
    }

    const { error } = await supabase
      .from('log_aktivitas_guru')
      .delete()
      .eq('id', logId)
      .eq('aksi', 'PAYMENT_PENDING');

    if (error) {
      console.error('Error deleting pending payment:', error);
      return NextResponse.json({ error: 'Gagal menghapus riwayat transaksi.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Transaksi pending berhasil dihapus secara permanen.' });
  } catch (error) {
    console.error('Error in delete payment API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
