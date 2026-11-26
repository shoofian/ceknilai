import { NextResponse } from 'next/server';
import { pencarianSiswa } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function GET(request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`pencarian:${ip}`, { limit: 30, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan pencarian. Mohon tunggu sebentar.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const nisn = searchParams.get('nisn');
    const tanggalLahir = searchParams.get('tanggalLahir');
    const pin = searchParams.get('pin') || null;

    if (!nisn || !tanggalLahir) {
      return NextResponse.json(
        { error: 'NISN dan Tanggal Lahir harus diisi' },
        { status: 400 }
      );
    }

    if (pin) {
      const pinRl = checkRateLimit(`pin-verify:${ip}:${nisn.trim()}`, { limit: 8, windowMs: 60_000 });
      if (!pinRl.allowed) {
        return NextResponse.json(
          { error: 'Terlalu banyak percobaan PIN salah. Mohon tunggu 1 menit.' },
          { status: 429 }
        );
      }
    }

    const result = await pencarianSiswa(nisn, tanggalLahir, pin);
    if (result.pinInvalid) {
      return NextResponse.json(
        {
          error: 'PIN pengaman salah. Silakan periksa kembali PIN Anda.',
          requiresPin: true,
          pinInvalid: true,
          securityQuestion: result.securityQuestion
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      requiresPin: result.requiresPin,
      hasPin: result.hasPin,
      securityQuestion: result.securityQuestion,
      hasil: result.hasil
    });
  } catch (error) {
    console.error('Error in GET pencarian API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`pencarian:${ip}`, { limit: 30, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan pencarian. Mohon tunggu sebentar.' },
        { status: 429 }
      );
    }

    const { nisn, tanggalLahir, pin = null } = await request.json();

    if (!nisn || !tanggalLahir) {
      return NextResponse.json(
        { error: 'NISN dan Tanggal Lahir harus diisi' },
        { status: 400 }
      );
    }

    if (pin) {
      const pinRl = checkRateLimit(`pin-verify:${ip}:${String(nisn).trim()}`, { limit: 8, windowMs: 60_000 });
      if (!pinRl.allowed) {
        return NextResponse.json(
          { error: 'Terlalu banyak percobaan PIN salah. Mohon tunggu 1 menit.' },
          { status: 429 }
        );
      }
    }

    const result = await pencarianSiswa(nisn, tanggalLahir, pin);
    if (result.pinInvalid) {
      return NextResponse.json(
        {
          error: 'PIN pengaman salah. Silakan periksa kembali PIN Anda.',
          requiresPin: true,
          pinInvalid: true,
          securityQuestion: result.securityQuestion
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      requiresPin: result.requiresPin,
      hasPin: result.hasPin,
      securityQuestion: result.securityQuestion,
      hasil: result.hasil
    });
  } catch (error) {
    console.error('Error in POST pencarian API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
