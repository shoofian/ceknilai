import { NextResponse } from 'next/server';
import { getGuru } from '@/lib/db';
import { checkAuth } from '@/lib/auth';
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
    const usernameFromAuth = await checkAuth();
    if (!usernameFromAuth) {
      return NextResponse.json({ error: 'Belum masuk' }, { status: 401 });
    }
    
    const guru = await getGuru(usernameFromAuth);
    if (!guru || !guru.username || guru.username.toLowerCase() !== usernameFromAuth.toLowerCase()) {
      return NextResponse.json({ error: 'Sesi tidak valid' }, { status: 401 });
    }

    const username = guru.username;

    // Fetch referral, redeem, and approved payment logs in chronological order to calculate stacking
    const { data: logs, error } = await supabase
      .from('log_aktivitas_guru')
      .select('aksi, detail, created_at')
      .eq('guru_username', username)
      .in('aksi', ['REFERRAL_POINTS', 'REDEEM_POINTS', 'PAYMENT_APPROVED'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching logs for premium calculation:', error);
    }

    let balance = 0;
    let premiumUntil = null;
    const history = [];

    if (logs && logs.length > 0) {
      for (const log of logs) {
        // Only include point transactions in the referral points history
        if (log.aksi === 'REFERRAL_POINTS' || log.aksi === 'REDEEM_POINTS') {
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

        // Calculate Premium Active Expiry Date Stacking
        let daysToAdd = 0;
        if (log.aksi === 'PAYMENT_APPROVED') {
          const isYearly = log.detail.toUpperCase().includes('PAKET:TAHUNAN');
          const isMonthly = log.detail.toUpperCase().includes('PAKET:BULANAN');
          if (isYearly) daysToAdd = 365;
          else if (isMonthly) daysToAdd = 30;
        } else if (log.aksi === 'REDEEM_POINTS') {
          const isYearly = log.detail.includes('Gratis 1 Tahun Premium');
          const isMonthly = log.detail.includes('Gratis 1 Bulan Premium');
          if (isYearly) daysToAdd = 365;
          else if (isMonthly) daysToAdd = 30;
        }

        if (daysToAdd > 0) {
          const txDate = new Date(log.created_at);
          if (!premiumUntil || txDate > premiumUntil) {
            premiumUntil = new Date(txDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
          } else {
            premiumUntil = new Date(premiumUntil.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
          }
        }
      }
    }

    // Sort history descending for UI display (latest points log first)
    history.reverse();

    // Check if they have already claimed first payment referral
    const isFirstPaymentClaimed = history.some(h => h.description.includes('First Payment'));

    return NextResponse.json({
      success: true,
      balance,
      history,
      isFirstPaymentClaimed,
      referralCode: username,
      premiumUntil: premiumUntil ? premiumUntil.toISOString() : null
    });
  } catch (error) {
    console.error('Error in referral GET API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
