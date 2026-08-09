import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { getKelasById, getGuru, getBankSiswa, updateKelas } from '@/lib/db';



export async function POST(request) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { kelasId, action = 'commit', previewData, targetTingkatan, targetRombel, targetTahun } = await request.json();
    if (!kelasId) {
      return NextResponse.json({ error: 'ID Kelas tidak ditemukan' }, { status: 400 });
    }

    const kelas = await getKelasById(kelasId, username);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan atau Anda tidak memiliki akses' }, { status: 404 });
    }

    const guruData = await getGuru(username);
    if (!guruData || !guruData.sekolah_id) {
      return NextResponse.json({ error: 'Gagal mendapatkan data sekolah guru.' }, { status: 400 });
    }

    // Gunakan original_sekolah_id jika ada, fallback ke sekolah guru saat ini
    const targetSekolahId = kelas.skemaPenilaian?.original_sekolah_id || guruData.sekolah_id;

    if (action === 'get-rombels') {
      const bankSiswa = await getBankSiswa(targetSekolahId);
      const rombelSet = new Set();
      const rombels = [];
      bankSiswa.forEach(s => {
        const tahun = s.tahun_pelajaran || '2024/2025';
        const key = `${tahun}|${s.tingkatan}|${s.rombel}`;
        if (!rombelSet.has(key)) {
          rombelSet.add(key);
          rombels.push({ tahun, tingkatan: s.tingkatan, rombel: s.rombel });
        }
      });
      return NextResponse.json({ rombels });
    }

    if (action === 'preview') {
      const tahunQuery = targetTahun || kelas.tahun_ajaran || '2024/2025';
      const bankSiswa = await getBankSiswa(targetSekolahId, tahunQuery);
      
      const filterTingkatan = targetTingkatan ? String(targetTingkatan) : String(kelas.tingkatan);
      const filterRombel = targetRombel ? String(targetRombel).toLowerCase() : String(kelas.rombel_nama).toLowerCase();
      
      const filteredBankSiswa = bankSiswa.filter(
        s => String(s.tingkatan) === filterTingkatan && 
             String(s.rombel).toLowerCase() === filterRombel
      );

      const existingSiswa = kelas.siswa || [];
      const bankSiswaArr = [...filteredBankSiswa];
      
      const added = [];
      const updated = [];
      const removed = [];
      const unchanged = [];
      
      const normalize = (str) => String(str || "").toLowerCase().trim();
      const isValidDate = (d) => {
        const str = String(d || "").trim();
        return str && str !== '1900-01-01' && str !== 'undefined' && str !== 'null';
      };

      existingSiswa.forEach(exS => {
        let bestMatchIndex = -1;
        
        for (let i = 0; i < bankSiswaArr.length; i++) {
          const bankS = bankSiswaArr[i];
          let score = 0;
          
          const nisnMatch = normalize(exS.nisn) === normalize(bankS.nisn);
          if (nisnMatch) score++;
          if (exS.nama && bankS.nama && normalize(exS.nama) === normalize(bankS.nama)) score++;
          if (isValidDate(exS.tanggalLahir) && isValidDate(bankS.tanggal_lahir) && normalize(exS.tanggalLahir) === normalize(bankS.tanggal_lahir)) score++;
          
          // Match if NISN is exactly the same, OR if at least 2 other fields match, OR if Name is exactly the same (potential merge)
          const nameMatch = exS.nama && bankS.nama && normalize(exS.nama) === normalize(bankS.nama);
          if (nisnMatch || score >= 2 || nameMatch) {
            bestMatchIndex = i;
            break; // Stop at first valid match
          }
        }
        
        if (bestMatchIndex !== -1) {
          const bankS = bankSiswaArr[bestMatchIndex];
          bankSiswaArr.splice(bestMatchIndex, 1); // Remove from unmatched bank pool
          
          const nisnChanged = normalize(exS.nisn) !== normalize(bankS.nisn);
          const nameChanged = normalize(exS.nama) !== normalize(bankS.nama);
          
          // Check if DOB changed (treating missing/invalid DOBs as different if bank has a valid one)
          const exDob = isValidDate(exS.tanggalLahir) ? normalize(exS.tanggalLahir) : "";
          const bankDob = isValidDate(bankS.tanggal_lahir) ? normalize(bankS.tanggal_lahir) : "";
          const dobChanged = exDob !== bankDob;
          
          if (nisnChanged || nameChanged || dobChanged) {
            updated.push({ 
              nisnLama: exS.nisn, 
              nisnBaru: bankS.nisn, 
              namaLama: exS.nama, 
              namaBaru: bankS.nama, 
              tanggalLahirLama: exS.tanggalLahir,
              tanggalLahirBaru: bankS.tanggal_lahir,
              nisnChanged,
              nameChanged,
              dobChanged,
              nilai: exS.nilai, 
              catatan: exS.catatan 
            });
          } else {
            unchanged.push(exS);
          }
        } else {
          removed.push({ nisn: exS.nisn, nama: exS.nama });
        }
      });
      
      bankSiswaArr.forEach(bankS => {
        added.push({ nisn: bankS.nisn, nama: bankS.nama, tanggalLahir: bankS.tanggal_lahir });
      });

      if (added.length === 0 && updated.length === 0 && removed.length === 0) {
        return NextResponse.json({ message: 'Data kelas sudah tersinkronisasi 100% dengan Bank Data.' });
      }

      return NextResponse.json({ preview: true, added, updated, removed, unchanged });
    }

    if (action === 'commit' && previewData) {
      const { added = [], updated = [], removed = [] } = previewData;
      const { deleteSiswaBulkFromKelas } = await import('@/lib/db');
      
      let currentSiswa = kelas.siswa ? [...kelas.siswa] : [];
      
      // Collect all NISNs to delete in Supabase
      const nisnsToDelete = [
        ...removed.map(r => r.nisn),
        ...updated.filter(u => String(u.nisnLama) !== String(u.nisnBaru)).map(u => u.nisnLama)
      ];

      if (nisnsToDelete.length > 0) {
        await deleteSiswaBulkFromKelas(kelasId, nisnsToDelete, username);
      }

      // 1. Remove deleted students from array
      for (const r of removed) {
        currentSiswa = currentSiswa.filter(s => String(s.nisn) !== String(r.nisn));
      }
      
      // 2. Update existing students in array
      for (const u of updated) {
        const idx = currentSiswa.findIndex(s => String(s.nisn) === String(u.nisnLama));
        if (idx !== -1) {
          currentSiswa[idx].nisn = u.nisnBaru;
          currentSiswa[idx].nama = u.namaBaru;
          currentSiswa[idx].tanggalLahir = u.tanggalLahirBaru;
        }
      }
      
      // 3. Add new students
      for (const a of added) {
        if (!currentSiswa.some(s => String(s.nisn) === String(a.nisn))) {
          currentSiswa.push({
            nisn: a.nisn,
            nama: a.nama,
            tanggalLahir: a.tanggalLahir,
            nilai: {},
            catatan: ""
          });
        }
      }
      
      const result = await updateKelas(kelasId, { siswa: currentSiswa }, username);
      
      if (!result) {
        return NextResponse.json({ error: 'Gagal menyimpan pembaruan sinkronisasi.' }, { status: 500 });
      }

      const { logAktivitasGuru } = await import('@/lib/db');
      await logAktivitasGuru(
        username,
        'EDIT_KELAS',
        `Sinkronisasi 2-Arah Bank Data: ${added.length} ditambah, ${removed.length} dihapus, ${updated.length} diperbarui.`
      );

      return NextResponse.json({ success: true, kelas: result });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error syncing with bank data:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal server' }, { status: 500 });
  }
}
