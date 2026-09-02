import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { getKelasById, getGuru, getBankSiswa, updateKelas, deleteSiswaBulkFromKelas, logAktivitasGuru } from '@/lib/db';



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
      let unmappedExisting = [...existingSiswa];
      let bankSiswaArr = [...filteredBankSiswa];
      
      const added = [];
      const updated = [];
      const removed = [];
      const unchanged = [];
      
      const normalize = (str) => String(str || "").toLowerCase().trim();
      const isValidDate = (d) => {
        const str = String(d || "").trim();
        return str && str !== '1900-01-01' && str !== 'undefined' && str !== 'null';
      };

      const processMatch = (exS, bankSIndex) => {
        const bankS = bankSiswaArr[bankSIndex];
        bankSiswaArr.splice(bankSIndex, 1); // Remove from unmatched bank pool
        
        const nisnChanged = normalize(exS.nisn) !== normalize(bankS.nisn);
        const nameChanged = normalize(exS.nama) !== normalize(bankS.nama);
        
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
      };

      // PASS 1: Prioritas Utama - Cocokkan berdasarkan NISN yang persis sama
      for (let i = unmappedExisting.length - 1; i >= 0; i--) {
        const exS = unmappedExisting[i];
        const matchIdx = bankSiswaArr.findIndex(b => normalize(b.nisn) === normalize(exS.nisn));
        
        if (matchIdx !== -1) {
          processMatch(exS, matchIdx);
          unmappedExisting.splice(i, 1);
        }
      }

      // PASS 2: Prioritas Kedua - Jika NISN berubah (typo), cocokkan Nama DAN Tanggal Lahir
      for (let i = unmappedExisting.length - 1; i >= 0; i--) {
        const exS = unmappedExisting[i];
        if (!isValidDate(exS.tanggalLahir)) continue;
        
        const matchIdx = bankSiswaArr.findIndex(b => 
          normalize(b.nama) === normalize(exS.nama) && 
          isValidDate(b.tanggal_lahir) &&
          normalize(b.tanggal_lahir) === normalize(exS.tanggalLahir)
        );
        
        if (matchIdx !== -1) {
          processMatch(exS, matchIdx);
          unmappedExisting.splice(i, 1);
        }
      }

      // PASS 3: Prioritas Ketiga - Cocokkan hanya dengan Nama (Hanya jika nama tersebut UNIK di kedua sisi)
      for (let i = unmappedExisting.length - 1; i >= 0; i--) {
        const exS = unmappedExisting[i];
        const exName = normalize(exS.nama);
        if (!exName) continue;
        
        // Pastikan nama ini hanya ada 1 di daftar bank data yang tersisa
        const bankMatches = bankSiswaArr.filter(b => normalize(b.nama) === exName);
        // Pastikan nama ini juga hanya ada 1 di kelas yang belum terpetakan
        const exMatches = unmappedExisting.filter(e => normalize(e.nama) === exName);

        if (bankMatches.length === 1 && exMatches.length === 1) {
          const matchIdx = bankSiswaArr.findIndex(b => normalize(b.nama) === exName);
          processMatch(exS, matchIdx);
          unmappedExisting.splice(i, 1);
        }
      }

      // Siswa yang masih tersisa di kelas (tidak menemukan pasangan) berarti dihapus
      unmappedExisting.forEach(exS => {
        removed.push({ nisn: exS.nisn, nama: exS.nama });
      });
      
      // Siswa yang masih tersisa di bank data (tidak terpakai) berarti siswa baru
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
