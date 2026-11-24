import { NextResponse } from 'next/server';
import { processPendingNotifications } from '@/lib/webPush';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';

    if (!cronSecret) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'CRON_SECRET belum dikonfigurasi' }, { status: 500 });
      }
    } else if (authHeader !== `Bearer ${cronSecret}`) {
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
