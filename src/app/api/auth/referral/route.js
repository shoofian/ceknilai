import { NextResponse } from 'next/server';
import { getGuru } from '@/lib/db';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('guru_session');
    
    if (!session || !session.value) {
      return NextResponse.json({ error: 'Belum masuk' }, { status: 401 });
    }
    
    const guru = await getGuru(session.value);
    if (!guru || !guru.username || guru.username.toLowerCase() !== session.value.toLowerCase()) {
      return NextResponse.json({ error: 'Sesi tidak valid' }, { status: 401 });
    }

    const username = guru.username;

    // Fetch referral logs and redeem logs from log_aktivitas_guru
    const { data: logs, error } = await supabase
      .from('log_aktivitas_guru')
      .select('aksi, detail, created_at')
      .eq('guru_username', username)
      .in('aksi', ['REFERRAL_POINTS', 'REDEEM_POINTS'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referral logs:', error);
    }

    let balance = 0;
    const history = [];

    if (logs && logs.length > 0) {
      for (const log of logs) {
        const match = log.detail.match(/POINTS:([+-]?\d+)/);
        if (match) {
          const pts = parseInt(match[1], 10);
          balance += pts;
          history.push({
            points: pts,
            description: log.detail.split('|')[1]?.trim() || log.detail,
            date: log.created_at
          });
        }
      }
    }

    // Check if they have already claimed first payment referral
    const isFirstPaymentClaimed = history.some(h => h.description.includes('First Payment'));

    return NextResponse.json({
      success: true,
      balance,
      history,
      isFirstPaymentClaimed,
      referralCode: username
    });
  } catch (error) {
    console.error('Error in referral GET API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
