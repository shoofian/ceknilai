import { NextResponse } from 'next/server';
import { getKelasById, updateKelas } from '@/lib/db';
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
  // Excel counts days from 1899-12-30 (with the intentional 1900 leap-year bug)
  if (/^\d+$/.test(clean)) {
    const serial = parseInt(clean, 10);
    if (serial > 1 && serial < 80000) { // sanity check: plausible school-age student birth years
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

  // 5. Indonesian long format: "15 Januari 2009" or "15 januari 2009"
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

  // 6. Fallback: let JavaScript Date try to parse it
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

export async function POST(request, { params }) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { isGuruLocked } = await import('@/lib/db');
    if (await isGuruLocked(username)) {
      return NextResponse.json({ error: 'Akun Anda sedang dikunci (Read-Only)' }, { status: 403 });
    }

    const { id } = await params;
    const { siswaList } = await request.json();

    console.log(`[Import API] Received siswaList with ${siswaList?.length} items.`);
    if (siswaList && siswaList.length > 0) {
      console.log(`[Import API] First student sample keys:`, Object.keys(siswaList[0]));
      console.log(`[Import API] First student sample data:`, JSON.stringify(siswaList[0]));
    }

    if (!Array.isArray(siswaList)) {
      return NextResponse.json({ error: 'Data impor tidak valid' }, { status: 400 });
    }

    const kelas = await getKelasById(id, username);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    }

    let addedCount = 0;
    let updatedCount = 0;

    // Clone daftar siswa kelas saat ini
    const currentStudents = [...kelas.siswa];

    for (const item of siswaList) {
      const { nisn, nama, tanggalLahir, nilai } = item;
      
      if (!nisn || !nama) {
        console.warn(`[Import API] Skipped student due to missing fields: nisn=${!!nisn}, nama=${!!nama}`);
        continue; // Skip baris tidak lengkap
      }

      const cleanNisn = nisn.toString().trim();
      const cleanNama = nama.toString().trim();
      
      // Parse tanggal lahir dengan fungsi robust helper jika ada
      let cleanTanggal = null;
      if (tanggalLahir && tanggalLahir.toString().trim() !== '') {
        cleanTanggal = parseDateToYmd(tanggalLahir);
        if (!cleanTanggal) {
          console.warn(`[Import API] Skipped student "${cleanNama}" (${cleanNisn}) due to invalid date format: "${tanggalLahir}"`);
          continue; // Skip jika format tanggal tidak dapat diidentifikasi
        }
      }

      // Bersihkan nilai agar sesuai dengan kolomNilai yang ada
      const cleanedNilai = {};
      kelas.kolomNilai.forEach(col => {
        if (col.isGroup && col.subKolom && col.subKolom.length > 0) {
          col.subKolom.forEach(sub => {
            // Prioritas 1: nilai dikirim langsung dengan sub.id sebagai key
            if (nilai && nilai[sub.id] !== undefined && nilai[sub.id] !== null && nilai[sub.id] !== '') {
              cleanedNilai[sub.id] = Number(nilai[sub.id]);
            // Prioritas 2 (backward compat): nilai dikirim dengan format "NamaGrup - NamaSub"
            } else {
              const keyName = `${col.nama} - ${sub.nama}`;
              if (nilai && nilai[keyName] !== undefined && nilai[keyName] !== null && nilai[keyName] !== '') {
                cleanedNilai[sub.id] = Number(nilai[keyName]);
              } else {
                cleanedNilai[sub.id] = sub.defaultNilai !== undefined && sub.defaultNilai !== null ? sub.defaultNilai : null;
              }
            }
          });
        } else {
          // Prioritas 1: nilai dikirim langsung dengan col.id sebagai key
          if (nilai && nilai[col.id] !== undefined && nilai[col.id] !== null && nilai[col.id] !== '') {
            cleanedNilai[col.id] = Number(nilai[col.id]);
          // Prioritas 2 (backward compat): nilai dikirim dengan col.nama sebagai key
          } else if (nilai && nilai[col.nama] !== undefined && nilai[col.nama] !== null && nilai[col.nama] !== '') {
            cleanedNilai[col.id] = Number(nilai[col.nama]);
          } else {
            cleanedNilai[col.id] = col.defaultNilai !== undefined && col.defaultNilai !== null ? col.defaultNilai : null;
          }
        }
      });

      const existingIndex = currentStudents.findIndex(s => s.nisn === cleanNisn);

      if (existingIndex !== -1) {
        // Update siswa yang sudah ada
        currentStudents[existingIndex] = {
          ...currentStudents[existingIndex],
          nama: cleanNama,
          tanggalLahir: cleanTanggal,
          // Merge nilai: pertahankan nilai lama jika kolom baru tidak ada di Excel
          nilai: {
            ...currentStudents[existingIndex].nilai,
            ...cleanedNilai
          }
        };
        updatedCount++;
      } else {
        // Tambah siswa baru
        currentStudents.push({
          nisn: cleanNisn,
          nama: cleanNama,
          tanggalLahir: cleanTanggal,
          nilai: cleanedNilai
        });
        addedCount++;
      }
    }

    await updateKelas(id, { siswa: currentStudents }, username);

    return NextResponse.json({
      success: true,
      message: `Impor berhasil: ${addedCount} siswa baru ditambahkan, ${updatedCount} siswa diperbarui.`,
      addedCount,
      updatedCount
    });
  } catch (error) {
    console.error('Error in POST import API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
