import { NextResponse } from 'next/server';
import { savePushSubscription } from '@/lib/webPush';

export async function POST(request) {
  try {
    const body = await request.json();
    const { nisn, subscription } = body;

    if (!nisn || !subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'NISN dan data push subscription wajib disertakan.' },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get('user-agent') || '';

    const result = await savePushSubscription({
      nisn: nisn.toString().trim(),
      subscription,
      userAgent
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Gagal menyimpan langganan notifikasi.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notifikasi berhasil diaktifkan di perangkat ini.'
    });
  } catch (error) {
    console.error('Error in /api/push/subscribe:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server saat mendaftarkan notifikasi.' },
      { status: 500 }
    );
  }
}
