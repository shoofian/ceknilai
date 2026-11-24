import { NextResponse } from 'next/server';
import { savePushSubscription } from '@/lib/webPush';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { isValidSiswaNisn } from '@/lib/db';

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`push:${ip}`, { limit: 15, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan pendaftaran notifikasi.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { nisn, subscription } = body;

    if (!nisn || !subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'NISN dan data push subscription wajib disertakan.' },
        { status: 400 }
      );
    }

    let endpointUrl;
    try {
      endpointUrl = new URL(subscription.endpoint);
    } catch {
      return NextResponse.json({ error: 'Endpoint push tidak valid.' }, { status: 400 });
    }
    if (endpointUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Endpoint push harus menggunakan HTTPS.' }, { status: 400 });
    }

    const cleanNisn = nisn.toString().trim();
    const exists = await isValidSiswaNisn(cleanNisn);
    if (!exists) {
      return NextResponse.json({ error: 'NISN siswa tidak ditemukan.' }, { status: 404 });
    }

    const userAgent = request.headers.get('user-agent') || '';

    const result = await savePushSubscription({
      nisn: cleanNisn,
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
