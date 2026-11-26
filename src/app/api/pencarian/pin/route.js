import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSiswaPinConfig, updateSiswaPinConfig } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

function getAnswerEncryptionKey() {
  const secret = process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'ceknilai-pin-answer-key-2026';
  return crypto.createHash('sha256').update(secret).digest();
}

function normalizeAnswerCompact(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function encryptAnswer(plainAnswer) {
  const key = getAnswerEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainAnswer, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptAnswer(payload) {
  try {
    const [ivHex, tagHex, dataHex] = String(payload || '').split(':');
    if (!ivHex || !tagHex || !dataHex) return null;
    const key = getAnswerEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function isAnswerMatch(userInput, storedNormalized) {
  const inputCompact = normalizeAnswerCompact(userInput);
  const targetCompact = normalizeAnswerCompact(storedNormalized);
  if (!inputCompact || !targetCompact) return false;
  if (inputCompact === targetCompact) return true;

  const maxLen = Math.max(inputCompact.length, targetCompact.length);
  const maxAllowedDist = maxLen >= 9 ? 2 : maxLen >= 5 ? 1 : 0;
  if (maxAllowedDist === 0) return false;
  return levenshtein(inputCompact, targetCompact) <= maxAllowedDist;
}

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();
    const { action, nisn, tanggalLahir, newPin, currentPin, question, answer } = body;

    if (!nisn || !tanggalLahir || !action) {
      return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
    }

    const cleanNisn = String(nisn).trim();
    const rl = checkRateLimit(`pin-action:${ip}:${cleanNisn}`, { limit: 10, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan. Silakan tunggu 1 menit.' },
        { status: 429 }
      );
    }

    const { found, pinConfig } = await getSiswaPinConfig(cleanNisn, tanggalLahir);
    if (!found) {
      return NextResponse.json({ error: 'Data siswa tidak ditemukan.' }, { status: 404 });
    }

    const bcrypt = await import('bcryptjs');

    if (action === 'setup') {
      const cleanNewPin = String(newPin || '').trim();
      const cleanQuestion = String(question || '').trim();
      const cleanAnswer = String(answer || '').trim().toLowerCase();

      if (!/^\d{6}$/.test(cleanNewPin)) {
        return NextResponse.json({ error: 'PIN harus berupa tepat 6 digit angka.' }, { status: 400 });
      }
      if (!cleanQuestion || cleanAnswer.length < 2) {
        return NextResponse.json({ error: 'Pertanyaan keamanan dan jawaban (minimal 2 huruf) wajib diisi.' }, { status: 400 });
      }

      // If PIN is already set, require currentPin to change it
      if (pinConfig && pinConfig.pinHash) {
        if (!currentPin || !bcrypt.compareSync(String(currentPin).trim(), pinConfig.pinHash)) {
          return NextResponse.json({ error: 'PIN lama tidak sesuai.' }, { status: 401 });
        }
      }

      const nextConfig = {
        pinHash: bcrypt.hashSync(cleanNewPin, 10),
        question: cleanQuestion,
        answerHash: bcrypt.hashSync(cleanAnswer, 10),
        answerEnc: encryptAnswer(cleanAnswer),
        updatedAt: new Date().toISOString()
      };

      const ok = await updateSiswaPinConfig(cleanNisn, tanggalLahir, nextConfig);
      if (!ok) {
        return NextResponse.json({ error: 'Gagal menyimpan PIN pengaman.' }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        message: 'PIN pengaman dan pertanyaan keamanan berhasil disimpan!'
      });
    }

    if (action === 'reset') {
      if (!pinConfig || !pinConfig.answerHash) {
        return NextResponse.json({ error: 'PIN atau pertanyaan keamanan belum diatur.' }, { status: 400 });
      }
      const rawAnswer = String(answer || '').trim();
      const cleanAnswer = rawAnswer.toLowerCase();
      const cleanNewPin = String(newPin || '').trim();

      let matched = false;
      if (pinConfig.answerEnc) {
        const decrypted = decryptAnswer(pinConfig.answerEnc);
        if (decrypted !== null) {
          matched = isAnswerMatch(rawAnswer, decrypted);
        }
      }
      if (!matched && cleanAnswer) {
        matched = bcrypt.compareSync(cleanAnswer, pinConfig.answerHash);
      }

      if (!matched) {
        return NextResponse.json({ error: 'Jawaban pertanyaan keamanan salah.' }, { status: 401 });
      }
      if (!/^\d{6}$/.test(cleanNewPin)) {
        return NextResponse.json({ error: 'PIN baru harus berupa tepat 6 digit angka.' }, { status: 400 });
      }

      const nextConfig = {
        ...pinConfig,
        pinHash: bcrypt.hashSync(cleanNewPin, 10),
        updatedAt: new Date().toISOString()
      };

      const ok = await updateSiswaPinConfig(cleanNisn, tanggalLahir, nextConfig);
      if (!ok) {
        return NextResponse.json({ error: 'Gagal mereset PIN.' }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        message: 'PIN berhasil direset! Silakan akses nilai Anda dengan PIN baru.'
      });
    }

    if (action === 'disable') {
      if (!pinConfig || !pinConfig.pinHash) {
        return NextResponse.json({ error: 'PIN pengaman tidak aktif.' }, { status: 400 });
      }
      if (!currentPin || !bcrypt.compareSync(String(currentPin).trim(), pinConfig.pinHash)) {
        return NextResponse.json({ error: 'PIN saat ini salah.' }, { status: 401 });
      }
      const ok = await updateSiswaPinConfig(cleanNisn, tanggalLahir, null);
      if (!ok) {
        return NextResponse.json({ error: 'Gagal menonaktifkan PIN.' }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        message: 'PIN pengaman berhasil dinonaktifkan.'
      });
    }

    return NextResponse.json({ error: 'Aksi tidak valid.' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST /api/pencarian/pin:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
