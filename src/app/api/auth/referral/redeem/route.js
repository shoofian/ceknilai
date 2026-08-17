import { NextResponse } from 'next/server';
import { getGuru, logAktivitasGuru } from '@/lib/db';
import { checkAuth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const REWARDS = {
  theme_bw: { name: 'Tema Black & White', price: 40 },
  theme_pastel: { name: 'Tema Warna Pastel Lavender', price: 40 },
  theme_pinky: { name: 'Tema Warna Sakura Pinky', price: 40 },
  theme_cool: { name: 'Tema Warna Cool Cyan', price: 40 },
  theme_green: { name: 'Tema Warna Mint Emerald', price: 40 },
  theme_gold: { name: 'Tema Warna Royal Gold', price: 50 },
  free_1m: { name: 'Gratis 1 Bulan Premium', price: 130 },
  free_12m: { name: 'Gratis 1 Tahun Premium', price: 1060 },
  cash_1m: { name: 'Uang Tunai Rp 1.000.000', price: 6500 }
};

export async function POST(request) {
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
    const { rewardId } = await request.json();

    if (!rewardId || !REWARDS[rewardId]) {
      return NextResponse.json({ error: 'Pilihan hadiah tidak valid' }, { status: 400 });
    }

    const reward = REWARDS[rewardId];

    // Compute balance from logs
    const { data: logs, error } = await supabase
      .from('log_aktivitas_guru')
      .select('detail')
      .eq('guru_username', username)
      .in('aksi', ['REFERRAL_POINTS', 'REDEEM_POINTS']);

    if (error) {
      console.error('Error fetching logs for balance verification:', error);
      return NextResponse.json({ error: 'Gagal melakukan verifikasi saldo poin' }, { status: 500 });
    }

    let balance = 0;
    if (logs && logs.length > 0) {
      for (const log of logs) {
        const match = log.detail.match(/POINTS:([+-]?\d+)/);
        if (match) {
          balance += parseInt(match[1], 10);
        }
      }
    }

    if (balance < reward.price) {
      return NextResponse.json({ error: `Poin Anda tidak mencukupi untuk menukar hadiah ini. Dibutuhkan ${reward.price} poin (Saldo Anda: ${balance} poin).` }, { status: 400 });
    }

    // Success! Deduct points
    const logResult = await logAktivitasGuru(
      username,
      'REDEEM_POINTS',
      `POINTS:-${reward.price} | Menukarkan hadiah: ${reward.name}`
    );

    if (!logResult) {
      return NextResponse.json({ error: 'Gagal memproses penukaran poin' }, { status: 500 });
    }

    // Recalculate premiumUntil
    const { recalculatePremiumUntil } = await import('@/lib/db');
    await recalculatePremiumUntil(username);

    return NextResponse.json({
      success: true,
      message: `Berhasil menukarkan ${reward.price} poin dengan "${reward.name}". Permintaan Anda telah dicatat dan akan segera diproses oleh admin!`,
      newBalance: balance - reward.price
    });
  } catch (error) {
    console.error('Error in redeem API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
