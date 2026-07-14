import { NextResponse } from 'next/server';
import { createKelas, isGuruLocked } from '@/lib/db';
import { cookies } from 'next/headers';

// Helper to check auth
async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('guru_session');
  return session && session.value ? session.value : null;
}

// Helper to parse dates of various formats to YYYY-MM-DD
function parseDateToYmd(dateStr) {
  if (!dateStr) return null;
  const clean = dateStr.toString().trim();

  // 1. Matches YYYY-MM-DD (e.g. 2010-01-15)
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // 2. Matches DD/MM/YYYY or DD-MM-YYYY (e.g. 15/01/2010 or 15-01-2010)
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 3. Matches YYYY/MM/DD (e.g. 2010/01/15)
  const ymdSlashMatch = clean.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/);
  if (ymdSlashMatch) {
    const year = ymdSlashMatch[1];
    const month = ymdSlashMatch[2].padStart(2, '0');
    const day = ymdSlashMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 4. Excel serial date number (e.g. 40200 = 2010-01-15)
  if (/^\d+$/.test(clean)) {
    const serial = parseInt(clean, 10);
    if (serial > 1 && serial < 80000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const msPerDay = 86400000;
      const date = new Date(excelEpoch.getTime() + serial * msPerDay);
      if (!isNaN(date.getTime())) {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
  }

  // 5. Indonesian long format: "15 Januari 2009"
  const BULAN_ID = {
    januari: '01', februari: '02', maret: '03', april: '04',
    mei: '05', juni: '06', juli: '07', agustus: '08',
    september: '09', oktober: '10', november: '11', desember: '12',
  };
  const idLongMatch = clean.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (idLongMatch) {
    const day = idLongMatch[1].padStart(2, '0');
    const monthName = idLongMatch[2].toLowerCase();
    const year = idLongMatch[3];
    const month = BULAN_ID[monthName];
    if (month) return `${year}-${month}-${day}`;
  }

  // 6. Fallback
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

export async function POST(request) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    if (await isGuruLocked(username)) {
      return NextResponse.json({ error: 'Akun Anda sedang dikunci (Read-Only)' }, { status: 403 });
    }

    const { classes } = await request.json();
    if (!classes || !Array.isArray(classes) || classes.length === 0) {
      return NextResponse.json({ error: 'Data impor massal tidak valid atau kosong' }, { status: 400 });
    }

    const results = [];
    const errors = [];

    // Run parallel operations on the server for ultra-low database latency
    await Promise.all(
      classes.map(async (cls) => {
        try {
          const {
            nama,
            tingkatan,
            rombelNama,
            namaKustom,
            mataPelajaran,
            tahunAjaran,
            semester,
            siswaList,
          } = cls;

          if (!nama || !mataPelajaran || !rombelNama || !tingkatan) {
            throw new Error(`Data kelas "${nama || 'Tanpa Nama'}" tidak lengkap.`);
          }

          // Parse and format students list
          const formattedStudents = [];
          if (Array.isArray(siswaList)) {
            for (const s of siswaList) {
              const { nisn, nama: sNama, tanggalLahir, nilai, catatan } = s;
              if (!nisn || !sNama || !tanggalLahir) continue;

              const cleanTanggal = parseDateToYmd(tanggalLahir);
              if (!cleanTanggal) continue;

              formattedStudents.push({
                nisn: nisn.toString().trim(),
                nama: sNama.toString().trim(),
                tanggalLahir: cleanTanggal,
                nilai: nilai || {},
                catatan: catatan || '',
              });
            }
          }

          // Create the class along with its students in one DB call
          const newKelas = await createKelas(
            {
              nama,
              tingkatan,
              rombelNama,
              namaKustom,
              mataPelajaran,
              tahunAjaran,
              semester,
              kolomNilai: [],
              siswa: formattedStudents,
            },
            username
          );

          results.push({
            nama: cls.nama,
            id: newKelas?.id,
            siswaCount: formattedStudents.length,
          });
        } catch (clsErr) {
          console.error(`Error processing class bulk-import for ${cls.nama}:`, clsErr);
          errors.push(`Kelas "${cls.nama}": ${clsErr.message}`);
        }
      })
    );

    // Activity Logging
    if (results.length > 0) {
      const { logAktivitasGuru } = await import('@/lib/db');
      await logAktivitasGuru(
        username,
        'IMPOR_KELAS_MASSAL',
        `Berhasil mengimpor ${results.length} kelas baru secara massal (Dapodik)`
      );
    }

    if (errors.length > 0 && results.length === 0) {
      // All failed
      return NextResponse.json({ error: 'Gagal mengimpor semua kelas', detail: errors }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Impor massal berhasil: ${results.length} kelas diimpor.`,
      results,
      errors: errors.length > 0 ? errors : null,
    });
  } catch (error) {
    console.error('Error in POST bulk-import API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
