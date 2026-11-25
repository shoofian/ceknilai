import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { checkAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import {
  getGuru,
  getKelas,
  getKelasById,
  createKelas,
  updateSiswaInKelas,
  getKelasMetaAndSiswa,
  isGuruLocked,
  logAktivitasGuru
} from '@/lib/db';

export const dynamic = 'force-dynamic';

const SYSTEM_INSTRUCTION = `Anda adalah **Asisten AI CekNilai**, asisten cerdas khusus untuk Guru di platform CekNilai.
Tugas Anda:
1. Membantu guru memahami dan menemukan fitur CekNilai dengan langkah yang jelas, singkat, dan praktis dalam bahasa Indonesia.
2. Membantu tugas guru secara langsung menggunakan tools yang tersedia: mengecek daftar kelas, mencari nilai siswa, melihat siswa di bawah KKM, membuat draf catatan perkembangan siswa, atau mengusulkan aksi (seperti membuat kelas baru atau menyimpan catatan siswa) dengan konfirmasi guru.

Peta Fitur & Menu CekNilai:
- **Dashboard (/guru)**: Ringkasan jumlah kelas aktif, arsip, total siswa, dan rata-rata nilai.
- **Daftar Kelas (/guru/kelas)**: Buat kelas baru, salin kelas, impor siswa massal, sinkronisasi dari Bank Data Sekolah.
- **Detail Kelas (/guru/kelas/[id])**:
  - **Kelola Kolom & Bobot**: Tambah kolom tunggal, Grup Kolom (rata-rata / bobot khusus), atau kolom Presensi.
  - **Input Nilai Cepat**: Ketik langsung di tabel, copy-paste banyak baris sekaligus dari Excel (Ctrl+V), atau impor Excel (.xlsx).
  - **Fitur Lanjutan (🧪)**:
    1. *Program Remedial & Pengayaan*: Kelola tes remedial siswa di bawah KKM & cetak Berita Acara.
    2. *Poin Bonus Keaktifan (⭐)*: Aktifkan kolom bintang; bisa diatur apakah menambah Nilai Akhir (+1 poin/bintang) atau hanya rekap keaktifan. Jumlah bintang juga ikut terekspor ke Excel.
    3. *Normalisasi Nilai Akhir*: Linear, Min-Max, atau Scale to Max.
    4. *MaxCap*: Batas nilai maksimal.
  - **Katrol Rahasia (🔒)**: Klik ikon/sel pada kolom N. AKHIR untuk penyesuaian nilai rapor.
  - **Publikasi Nilai**: Klik tombol di header kolom N. AKHIR agar nilai bisa dicek siswa/orang tua di halaman utama.
  - **Cetak & Ekspor (🖨️)**: Cetak Laporan PDF, Kartu QR Presensi, Integrasi e-Rapor, dan Ekspor Excel (.xlsx).
- **Wali Kelas & Leger (/guru/walikelas)**: Leger nilai semua mapel untuk rombel wali kelas, input nilai Ekskul, dan Catatan Wali Kelas.
- **e-Rapor (/guru/erapor)**: Impor biodata Dapodik dan cetak rapor siswa.
- **Arsip (/guru/arsip)**, **Laporan (/guru/laporan)**, **Profil (/guru/profil)**, **Masa Aktif (/guru/masa-aktif)**, **Hadiah & Referral (/guru/hadiah)**.

Aturan Penting:
- Jangan pernah mengarang data siswa/nilai. Selalu panggil tool untuk mengambil data nyata guru sebelum menjawab pertanyaan tentang kelas atau siswa.
- Jika guru meminta membuat kelas atau menyimpan catatan siswa, gunakan tool \`propose_action\` agar guru bisa meninjau dan menekan tombol Konfirmasi terlebih dahulu.
- Jika relevan untuk membantu guru langsung menuju halaman tertentu, sertakan juga tool \`suggest_navigation\`.`;

const functionDeclarations = [
  {
    name: 'list_classes',
    description: 'Mengambil daftar kelas milik guru yang sedang login (aktif atau arsip).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        includeArchived: {
          type: Type.BOOLEAN,
          description: 'Sertakan kelas yang sudah diarsipkan (default false).'
        }
      }
    }
  },
  {
    name: 'get_class_summary',
    description: 'Mengambil ringkasan detail suatu kelas: KKM, kolom nilai, rata-rata kelas, dan daftar siswa yang nilainya di bawah KKM.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        kelasId: {
          type: Type.STRING,
          description: 'ID kelas yang ingin diperiksa.'
        }
      },
      required: ['kelasId']
    }
  },
  {
    name: 'search_student_grades',
    description: 'Mencari siswa berdasarkan nama atau NISN di kelas milik guru, lalu mengembalikan rincian nilai, bintang keaktifan, dan nilai akhirnya.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'Nama atau NISN siswa yang dicari.'
        },
        kelasId: {
          type: Type.STRING,
          description: 'Opsional: batasi pencarian pada ID kelas tertentu.'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'suggest_navigation',
    description: 'Menampilkan tombol pintas navigasi halaman CekNilai di antarmuka chat agar guru bisa langsung mengkliknya.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        label: {
          type: Type.STRING,
          description: 'Teks tombol, misal "Buka Kelas 7A" atau "Buka Halaman e-Rapor".'
        },
        path: {
          type: Type.STRING,
          description: 'Path tujuan di aplikasi, misal "/guru/kelas/123", "/guru/erapor", "/guru/walikelas", "/guru/profil".'
        }
      },
      required: ['label', 'path']
    }
  },
  {
    name: 'propose_action',
    description: 'Mengusulkan aksi yang mengubah data (membuat kelas baru atau menyimpan catatan siswa) agar dikonfirmasi guru terlebih dahulu.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        actionType: {
          type: Type.STRING,
          description: 'Jenis aksi: "create_class" atau "save_student_note".'
        },
        summary: {
          type: Type.STRING,
          description: 'Ringkasan singkat aksi yang akan dilakukan untuk ditampilkan ke guru.'
        },
        kelasId: {
          type: Type.STRING,
          description: 'Untuk save_student_note: ID kelas.'
        },
        nisn: {
          type: Type.STRING,
          description: 'Untuk save_student_note: NISN siswa.'
        },
        catatan: {
          type: Type.STRING,
          description: 'Untuk save_student_note: isi catatan siswa.'
        },
        namaKelas: {
          type: Type.STRING,
          description: 'Untuk create_class: nama kelas (misal "7A - Informatika").'
        },
        mataPelajaran: {
          type: Type.STRING,
          description: 'Untuk create_class: nama mata pelajaran.'
        },
        tahunAjaran: {
          type: Type.STRING,
          description: 'Untuk create_class: tahun ajaran (misal "2025/2026").'
        },
        semester: {
          type: Type.STRING,
          description: 'Untuk create_class: "Ganjil" atau "Genap".'
        }
      },
      required: ['actionType', 'summary']
    }
  }
];

function computeStudentFinalScore(kelas, student) {
  const skema = kelas.skemaPenilaian || {};
  let totalNilaiTerisi = 0;
  let filledCount = 0;
  const details = [];

  (kelas.kolomNilai || []).forEach((col) => {
    let score = null;
    let isFilled = false;

    if (col.isGroup && Array.isArray(col.subKolom) && col.subKolom.length > 0) {
      let sum = 0;
      let count = 0;
      col.subKolom.forEach((sub) => {
        const v = student.nilai?.[sub.id];
        if (v !== undefined && v !== null && v !== '') {
          sum += Number(v);
          count++;
        }
      });
      if (count > 0) {
        score = sum / count;
        isFilled = true;
      }
    } else if (!col.isPresensi) {
      const v = student.nilai?.[col.id];
      if (v !== undefined && v !== null && v !== '') {
        score = Number(v);
        isFilled = true;
      }
    }

    if (isFilled && score !== null) {
      totalNilaiTerisi += score * ((Number(col.bobot) || 0) / 100);
      filledCount++;
      details.push({ kolom: col.nama, nilai: Number(score.toFixed(2)), bobot: col.bobot });
    }
  });

  let totalStars = 0;
  Object.keys(student.nilai || {}).forEach((k) => {
    if (k.endsWith('_bonus')) totalStars += Number(student.nilai[k]?.poin) || 0;
  });

  const addBonus = skema.enableBonusStars && skema.bonusStarsAddToFinal !== false;
  const maxCap = Number(skema.maxCap) || 100;
  const rawFinal = totalNilaiTerisi + (Number(student.nilai?._katrol) || 0) + (addBonus ? totalStars : 0);
  const finalScore = Number(Math.min(maxCap, rawFinal).toFixed(2));

  return { finalScore, filledCount, totalStars, details };
}

async function executeTool(name, args, username, actionsOut, pendingActionsOut) {
  if (name === 'list_classes') {
    const classes = await getKelas(!!args?.includeArchived, username, { summary: true });
    return {
      classes: classes.map((c) => ({
        id: c.id,
        nama: c.nama,
        mataPelajaran: c.mataPelajaran,
        tahunAjaran: c.tahunAjaran,
        semester: c.semester,
        tingkatan: c.tingkatan,
        rombelNama: c.rombelNama,
        archived: c.archived,
        jumlahSiswa: c.siswa?.length || 0,
        jumlahKolom: c.kolomNilai?.length || 0,
        kkm: c.skemaPenilaian?.kkm || 75,
        enableBonusStars: !!c.skemaPenilaian?.enableBonusStars
      }))
    };
  }

  if (name === 'get_class_summary') {
    const kelas = await getKelasById(args?.kelasId, username);
    if (!kelas) return { error: 'Kelas tidak ditemukan atau bukan milik Anda.' };

    const kkm = Number(kelas.skemaPenilaian?.kkm) || 75;
    let sum = 0;
    const belowKkm = [];
    const siswaList = (kelas.siswa || []).map((s) => {
      const calc = computeStudentFinalScore(kelas, s);
      sum += calc.finalScore;
      if (calc.filledCount > 0 && calc.finalScore < kkm) {
        belowKkm.push({ nisn: s.nisn, nama: s.nama, nilaiAkhir: calc.finalScore });
      }
      return { nisn: s.nisn, nama: s.nama, nilaiAkhir: calc.finalScore, bintang: calc.totalStars };
    });

    const avg = siswaList.length > 0 ? Number((sum / siswaList.length).toFixed(2)) : 0;
    return {
      id: kelas.id,
      nama: kelas.nama,
      mataPelajaran: kelas.mataPelajaran,
      kkm,
      totalSiswa: siswaList.length,
      rataRataKelas: avg,
      kolomNilai: (kelas.kolomNilai || []).map((c) => ({ id: c.id, nama: c.nama, bobot: c.bobot })),
      siswaDiBawahKKM: belowKkm.slice(0, 25),
      totalDiBawahKKM: belowKkm.length
    };
  }

  if (name === 'search_student_grades') {
    const q = String(args?.query || '').trim().toLowerCase();
    if (!q) return { error: 'Kata kunci pencarian kosong.' };

    let targetClasses = [];
    if (args?.kelasId) {
      const k = await getKelasById(args.kelasId, username);
      if (k) targetClasses = [k];
    } else {
      targetClasses = await getKelas(false, username);
    }

    const matches = [];
    for (const k of targetClasses) {
      for (const s of k.siswa || []) {
        if (
          String(s.nama || '').toLowerCase().includes(q) ||
          String(s.nisn || '').toLowerCase().includes(q)
        ) {
          const calc = computeStudentFinalScore(k, s);
          matches.push({
            kelasId: k.id,
            namaKelas: k.nama,
            mataPelajaran: k.mataPelajaran,
            kkm: Number(k.skemaPenilaian?.kkm) || 75,
            nisn: s.nisn,
            nama: s.nama,
            nilaiAkhir: calc.finalScore,
            bintang: calc.totalStars,
            catatanSaatIni: s.catatan || '',
            rincianNilai: calc.details
          });
        }
      }
    }
    return { totalDitemukan: matches.length, hasil: matches.slice(0, 15) };
  }

  if (name === 'suggest_navigation') {
    if (args?.path && String(args.path).startsWith('/guru')) {
      actionsOut.push({ label: args.label || 'Buka Halaman', path: args.path });
    }
    return { ok: true };
  }

  if (name === 'propose_action') {
    pendingActionsOut.push({
      actionType: args.actionType,
      summary: args.summary,
      payload: {
        kelasId: args.kelasId,
        nisn: args.nisn,
        catatan: args.catatan,
        namaKelas: args.namaKelas,
        mataPelajaran: args.mataPelajaran,
        tahunAjaran: args.tahunAjaran,
        semester: args.semester
      }
    });
    return { status: 'menunggu_konfirmasi_guru' };
  }

  return { error: `Tool ${name} tidak dikenal.` };
}

export async function POST(request) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const body = await request.json();

    // Handle Human-in-the-loop confirmation execution
    if (body?.confirmAction) {
      if (await isGuruLocked(username)) {
        return NextResponse.json({ error: 'Akun Anda sedang dikunci (Read-Only).' }, { status: 403 });
      }
      const { actionType, payload } = body.confirmAction;

      if (actionType === 'save_student_note') {
        const { kelasId, nisn, catatan } = payload || {};
        const { kelas, siswa } = await getKelasMetaAndSiswa(kelasId, nisn, username);
        if (!kelas || !siswa) {
          return NextResponse.json({ error: 'Kelas atau siswa tidak ditemukan.' }, { status: 404 });
        }
        const updated = await updateSiswaInKelas(
          kelasId,
          nisn,
          {
            nisn: siswa.nisn,
            nama: siswa.nama,
            tanggalLahir: siswa.tanggalLahir,
            nilai: siswa.nilai || {},
            catatan: String(catatan || '').trim()
          },
          username
        );
        if (!updated) {
          return NextResponse.json({ error: 'Gagal menyimpan catatan siswa.' }, { status: 500 });
        }
        await logAktivitasGuru(username, 'EDIT_SISWA', `Memperbarui catatan "${siswa.nama}" via Asisten AI`);
        return NextResponse.json({
          success: true,
          message: `Catatan untuk ${siswa.nama} di kelas ${kelas.nama} berhasil disimpan.`
        });
      }

      if (actionType === 'create_class') {
        const { namaKelas, mataPelajaran, tahunAjaran, semester } = payload || {};
        if (!namaKelas || !mataPelajaran) {
          return NextResponse.json({ error: 'Nama kelas dan mata pelajaran wajib diisi.' }, { status: 400 });
        }
        const guruData = await getGuru(username);
        const created = await createKelas(
          {
            nama: String(namaKelas).trim(),
            mataPelajaran: String(mataPelajaran).trim(),
            tahunAjaran: tahunAjaran || guruData?.tahun_ajaran || '2025/2026',
            semester: semester || 'Ganjil',
            skemaPenilaian: guruData?.sekolah_id ? { original_sekolah_id: guruData.sekolah_id } : {}
          },
          username
        );
        if (!created) {
          return NextResponse.json({ error: 'Gagal membuat kelas baru.' }, { status: 500 });
        }
        await logAktivitasGuru(username, 'BUAT_KELAS', `Membuat kelas "${created.nama}" via Asisten AI`);
        return NextResponse.json({
          success: true,
          message: `Kelas "${created.nama}" berhasil dibuat!`,
          navigateTo: `/guru/kelas/${created.id}`
        });
      }

      return NextResponse.json({ error: 'Jenis aksi konfirmasi tidak valid.' }, { status: 400 });
    }

    const rl = checkRateLimit(`ai-assistant:${username}`, { limit: 30, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan ke Asisten AI. Mohon tunggu sebentar.' },
        { status: 429 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY belum dikonfigurasi di server.' },
        { status: 500 }
      );
    }

    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const contextInfo = body?.context || {};
    if (messages.length === 0) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong.' }, { status: 400 });
    }

    const guru = await getGuru(username);
    const contextHeader = `[Konteks Guru: nama="${guru?.nama || username}", halaman="${contextInfo.pathname || '/guru'}", kelasIdAktif="${contextInfo.kelasId || '-'}"]`;

    const contents = messages.slice(-12).map((m, idx) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: idx === messages.slice(-12).length - 1 && m.role === 'user' ? `${contextHeader}\n${m.content}` : String(m.content || '') }]
    }));

    const ai = new GoogleGenAI({ apiKey });
    const actionsOut = [];
    const pendingActionsOut = [];

    const MODEL_FALLBACKS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];
    const callGeminiWithFallback = async (reqContents) => {
      let lastErr;
      for (const modelName of MODEL_FALLBACKS) {
        try {
          return await ai.models.generateContent({
            model: modelName,
            contents: reqContents,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              tools: [{ functionDeclarations }]
            }
          });
        } catch (err) {
          lastErr = err;
          const status = err?.status || err?.code;
          if (status === 404 || status === 429 || status === 503 || status === 500) {
            continue;
          }
          throw err;
        }
      }
      throw lastErr;
    };

    let response = await callGeminiWithFallback(contents);

    // Loop up to 4 tool-call rounds
    let round = 0;
    while (response.functionCalls && response.functionCalls.length > 0 && round < 4) {
      round++;
      const modelParts = response.candidates?.[0]?.content?.parts || [];
      contents.push({ role: 'model', parts: modelParts });

      const functionResponseParts = [];
      for (const call of response.functionCalls) {
        const result = await executeTool(call.name, call.args || {}, username, actionsOut, pendingActionsOut);
        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: result
          }
        });
      }
      contents.push({ role: 'user', parts: functionResponseParts });

      response = await callGeminiWithFallback(contents);
    }

    const replyText = response.text || 'Maaf, saya belum bisa memproses permintaan tersebut. Silakan coba lagi.';

    return NextResponse.json({
      reply: replyText,
      navigationActions: actionsOut,
      pendingActions: pendingActionsOut
    });
  } catch (error) {
    console.error('Error in POST /api/guru/assistant:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada Asisten AI. Silakan coba beberapa saat lagi.' },
      { status: 500 }
    );
  }
}
