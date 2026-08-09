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
          
          // Match if NISN is exactly the same, OR if at least 2 other fields match
          if (nisnMatch || score >= 2) {
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
              nilai: exS.nilai, 
              tanggalLahir: bankS.tanggal_lahir,
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
      const { added = [], updated = [], removed = [], unchanged = [] } = previewData;
      const { deleteSiswaFromKelas } = await import('@/lib/db');
      
      // Remove deleted students
      for (const r of removed) {
        await deleteSiswaFromKelas(kelasId, r.nisn, username);
      }
      
      // For updated students, if NISN changed, we must delete the old NISN record to prevent duplicates in Supabase
      for (const u of updated) {
        if (String(u.nisnLama) !== String(u.nisnBaru)) {
          await deleteSiswaFromKelas(kelasId, u.nisnLama, username);
        }
      }
      
      // Build the final array
      const finalSiswa = [...unchanged];
      
      updated.forEach(u => {
        finalSiswa.push({
          nisn: u.nisnBaru,
          nama: u.namaBaru,
          tanggalLahir: u.tanggalLahir,
          nilai: u.nilai,
          catatan: u.catatan
        });
      });
      
      added.forEach(a => {
        finalSiswa.push({
          nisn: a.nisn,
          nama: a.nama,
          tanggalLahir: a.tanggalLahir,
          nilai: {},
          catatan: ""
        });
      });
      
      const result = await updateKelas(kelasId, { siswa: finalSiswa }, username);
      
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
