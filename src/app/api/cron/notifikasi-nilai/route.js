import { NextResponse } from 'next/server';
import { processPendingNotifications } from '@/lib/webPush';

export async function GET(request) {
  try {
    // Verifikasi otorisasi opsional (misal Vercel Cron / custom secret)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Izinkan jika tidak ada CRON_SECRET disetel, atau cocok
      const queryKey = url.searchParams.get('key');
      if (queryKey !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await processPendingNotifications({ force });
    return NextResponse.json({
      success: true,
      diagnostics: {
        hasVapidPublicKey: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        hasVapidPrivateKey: !!process.env.VAPID_PRIVATE_KEY,
        hasVapidSubject: !!process.env.VAPID_SUBJECT,
      },
      ...result
    });
  } catch (error) {
    console.error('Error in /api/cron/notifikasi-nilai:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal memproses antrean notifikasi',
      diagnostics: {
        hasVapidPublicKey: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        hasVapidPrivateKey: !!process.env.VAPID_PRIVATE_KEY,
        hasVapidSubject: !!process.env.VAPID_SUBJECT,
      }
    }, { status: 500 });
  }
}

export const POST = GET;
