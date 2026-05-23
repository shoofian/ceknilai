import { NextResponse } from 'next/server';
import { getKelasById, updateKelas } from '@/lib/db';
import { cookies } from 'next/headers';

// Helper to check auth
async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('guru_session');
  return session && !!session.value;
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

  // 4. Try parsing with standard Date parser
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
    if (!(await checkAuth())) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { id } = await params;
    const { siswaList } = await request.json();

    if (!Array.isArray(siswaList)) {
      return NextResponse.json({ error: 'Data impor tidak valid' }, { status: 400 });
    }

    const kelas = await getKelasById(id);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    }

    let addedCount = 0;
    let updatedCount = 0;

    // Clone daftar siswa kelas saat ini
    const currentStudents = [...kelas.siswa];

    for (const item of siswaList) {
      const { nisn, nama, tanggalLahir, nilai } = item;
      
      if (!nisn || !nama || !tanggalLahir) continue; // Skip baris tidak lengkap

      const cleanNisn = nisn.toString().trim();
      const cleanNama = nama.toString().trim();
      
      // Parse tanggal lahir dengan fungsi robust helper
      const cleanTanggal = parseDateToYmd(tanggalLahir);
      if (!cleanTanggal) {
        console.warn(`Skipped student ${cleanNama} (${cleanNisn}) due to invalid date: ${tanggalLahir}`);
        continue; // Skip jika format tanggal tidak dapat diidentifikasi
      }

      // Bersihkan nilai agar sesuai dengan kolomNilai yang ada
      const cleanedNilai = {};
      kelas.kolomNilai.forEach(col => {
        if (nilai && nilai[col.nama] !== undefined && nilai[col.nama] !== null && nilai[col.nama] !== '') {
          cleanedNilai[col.id] = Number(nilai[col.nama]);
        } else if (nilai && nilai[col.id] !== undefined && nilai[col.id] !== null && nilai[col.id] !== '') {
          cleanedNilai[col.id] = Number(nilai[col.id]);
        } else {
          cleanedNilai[col.id] = null;
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

    await updateKelas(id, { siswa: currentStudents });

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
