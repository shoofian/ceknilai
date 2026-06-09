import * as XLSX from "xlsx";

/**
 * Mendeteksi baris header dan kolom-kolom penting dari template Excel e-Rapor.
 * @param {ArrayBuffer} fileBuffer - Data biner file Excel.
 * @returns {Promise<{headers: string[], headerRowIdx: number, tpCols: Array<{index: number, name: string}>, nisnIdx: number, namaIdx: number, nilaiRaporIdx: number, rows: any[][]}>}
 */
export async function analyzeRaporTemplate(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellComments: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

  console.log("=== DEBUG: analyzeRaporTemplate ===");
  console.log("Sheet name:", sheetName);
  console.log("Total rows found:", rows.length);
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    console.log(`Row index ${i}:`, JSON.stringify(rows[i]));
  }

  let headerRowIdx = -1;
  let nisnIdx = -1;
  let namaIdx = -1;
  let nilaiRaporIdx = -1;

  // Scan baris untuk menemukan header utama (baris yang mengandung "NISN" dan "Nama")
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    const hasNISN = row.some(cell => typeof cell === 'string' && /nisn/i.test(cell.trim()));
    const hasNama = row.some(cell => typeof cell === 'string' && /nama|siswa/i.test(cell.trim()));

    if (hasNISN && hasNama) {
      headerRowIdx = i;
      row.forEach((cell, idx) => {
        const text = String(cell || "").trim().toLowerCase();
        if (/nisn/i.test(text)) nisnIdx = idx;
        else if (/nama|siswa/i.test(text)) namaIdx = idx;
        else if (/nilai\s*rapor|nilai\s*akhir|nilai/i.test(text)) nilaiRaporIdx = idx;
      });
      break;
    }
  }

  console.log("Detected headerRowIdx:", headerRowIdx);
  console.log("nisnIdx:", nisnIdx, "namaIdx:", namaIdx, "nilaiRaporIdx:", nilaiRaporIdx);

  if (headerRowIdx === -1) {
    throw new Error("Format template Excel tidak valid. Baris header dengan kolom 'NISN' dan 'Nama' tidak ditemukan.");
  }

  // 1. Cari baris pertama data siswa
  let firstStudentRowIdx = -1;
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    
    const nisnVal = String(row[nisnIdx] || "").trim();
    const namaVal = String(row[namaIdx] || "").trim();
    
    const isNisnNumeric = /^\d+$/.test(nisnVal);
    const isNamaText = namaVal && !/nama|siswa|student/i.test(namaVal);
    const isNoNumeric = /^\d+$/.test(String(row[0] || "").trim());
    
    if ((isNisnNumeric && isNamaText) || (isNoNumeric && namaVal)) {
      firstStudentRowIdx = r;
      break;
    }
  }
  
  if (firstStudentRowIdx === -1) {
    firstStudentRowIdx = Math.min(rows.length, headerRowIdx + 2); 
  }
  console.log("Detected firstStudentRowIdx:", firstStudentRowIdx);

  const tpCols = [];
  const startCol = Math.max(namaIdx, nilaiRaporIdx) + 1;
  const maxCols = rows[headerRowIdx].length;

  for (let idx = startCol; idx < maxCols; idx++) {
    const colValues = [];
    for (let r = headerRowIdx; r < firstStudentRowIdx; r++) {
      const cellVal = String(rows[r]?.[idx] || "").trim();
      if (cellVal && !colValues.includes(cellVal)) {
        if (!/^(no|nomor|predikat|keterangan|aksi|catatan|tgl|tanggal|validasi|nilai|tr|op)$/i.test(cellVal)) {
          colValues.push(cellVal);
        }
      }
    }
    
    if (colValues.length === 0) continue;
    
    let tpCode = "";
    let uuidVal = "";
    let description = "";
    
    colValues.forEach(val => {
      if (/^tp\.\d+/i.test(val)) {
        tpCode = val;
      } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) {
        uuidVal = val;
      } else if (val.length > 15 && !/tingkat ketercapaian/i.test(val)) {
        description = val;
      }
    });
    
    let displayName = tpCode || uuidVal || colValues[colValues.length - 1];
    
    if (description) {
      displayName = `${displayName} (${description})`;
    } else if (uuidVal && uuidVal !== displayName) {
      displayName = `${displayName} (${uuidVal})`;
    }
    
    tpCols.push({ index: idx, name: displayName });
  }

  const headers = rows[headerRowIdx] || [];
  const hasSubHeaders = firstStudentRowIdx > headerRowIdx + 1;

  return {
    headers: headers.map(h => String(h || "").trim()),
    headerRowIdx,
    hasSubHeaders,
    tpCols,
    nisnIdx,
    namaIdx,
    nilaiRaporIdx,
    rows
  };
}

/**
 * Mengisi nilai rapor dan status TP ke template Excel.
 * @param {ArrayBuffer} fileBuffer - Data biner template Excel.
 * @param {Object} kelas - Objek kelas CekNilai.
 * @param {Array} students - Array siswa dengan nilai asli dan finalScore terhitung.
 * @param {Object} tpMapping - Pemetaan indeks kolom TP ke ID aspek nilai CekNilai (e.g. { 4: "col-xxx", 5: "col-yyy" }).
 * @param {number} kkm - KKM kelulusan kelas.
 * @returns {ArrayBuffer} - Workbook Excel yang sudah terisi dalam bentuk ArrayBuffer.
 */
export function fillRaporExcel(fileBuffer, kelas, students, tpMapping, kkm) {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

  // Panggil deteksi index kolom
  let headerRowIdx = -1;
  let nisnIdx = -1;
  let namaIdx = -1;
  let nilaiRaporIdx = -1;

  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const hasNISN = row.some(cell => typeof cell === 'string' && /nisn/i.test(cell.trim()));
    const hasNama = row.some(cell => typeof cell === 'string' && /nama|siswa/i.test(cell.trim()));
    if (hasNISN && hasNama) {
      headerRowIdx = i;
      row.forEach((cell, idx) => {
        const text = String(cell || "").trim().toLowerCase();
        if (/nisn/i.test(text)) nisnIdx = idx;
        else if (/nama|siswa/i.test(text)) namaIdx = idx;
        else if (/nilai\s*rapor|nilai\s*akhir|nilai/i.test(text)) nilaiRaporIdx = idx;
      });
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error("Gagal mengurai file Excel saat proses penulisan nilai.");
  }

  // Cari index baris pertama siswa
  let firstStudentRowIdx = -1;
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const nisnVal = String(row[nisnIdx] || "").trim();
    const namaVal = String(row[namaIdx] || "").trim();
    const isNisnNumeric = /^\d+$/.test(nisnVal);
    const isNamaText = namaVal && !/nama|siswa|student/i.test(namaVal);
    const isNoNumeric = /^\d+$/.test(String(row[0] || "").trim());
    
    if ((isNisnNumeric && isNamaText) || (isNoNumeric && namaVal)) {
      firstStudentRowIdx = r;
      break;
    }
  }

  if (firstStudentRowIdx === -1) {
    firstStudentRowIdx = Math.min(rows.length, headerRowIdx + 2);
  }

  const kkmVal = Number(kkm) || 75;
  const startRowIdx = firstStudentRowIdx;

  // Mulai mengisi baris demi baris di bawah header
  for (let r = startRowIdx; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rowNisn = String(row[nisnIdx] || "").trim();
    const rowNama = String(row[namaIdx] || "").trim();

    if (!rowNisn && !rowNama) continue; // Skip baris kosong di dasar tabel

    // Cari kecocokan data siswa di CekNilai
    const student = students.find(s => {
      if (rowNisn && s.nisn === rowNisn) return true;
      const cleanRowNama = rowNama.toLowerCase().replace(/\s+/g, "");
      const cleanStudentNama = s.nama.toLowerCase().replace(/\s+/g, "");
      return cleanRowNama === cleanStudentNama;
    });

    if (!student) continue; // Siswa Excel tidak ditemukan di CekNilai, skip

    // 1. Tulis Nilai Rapor
    const finalScore = Math.round(student.finalScore || 0);
    if (nilaiRaporIdx !== -1) {
      const cellRef = XLSX.utils.encode_cell({ r, c: nilaiRaporIdx });
      worksheet[cellRef] = { t: 'n', v: finalScore };
    }

    // 2. Evaluasi Nilai TP
    const tpValues = {}; // Menyimpan sementara hasil status T/F per index kolom
    const mappedAspectScores = []; // Untuk melacak nilai aspek yang dipetakan guna smart fallback

    Object.keys(tpMapping).forEach(colIdxStr => {
      const colIdx = Number(colIdxStr);
      const aspectId = tpMapping[colIdx];
      
      let isFilled = false;
      let score = 0;

      // Ambil nilai aspek dari data siswa
      if (aspectId) {
        // Cari apakah ini grup atau aspek biasa
        const aspectDef = kelas.kolomNilai.find(c => c.id === aspectId);
        if (aspectDef && aspectDef.isGroup && aspectDef.subKolom) {
          // Hitung rata-rata subkolom
          let subTotal = 0;
          let subFilled = 0;
          aspectDef.subKolom.forEach(sub => {
            const sc = student.nilai[sub.id];
            if (sc !== undefined && sc !== null && sc !== "") {
              subTotal += Number(sc);
              subFilled++;
            }
          });
          if (subFilled > 0) {
            score = subTotal / subFilled;
            isFilled = true;
          }
        } else {
          const sc = student.nilai[aspectId];
          if (sc !== undefined && sc !== null && sc !== "") {
            score = Number(sc);
            isFilled = true;
          }
        }
      }

      // Tentukan T / R awal berdasarkan KKM
      let status = "R";
      if (isFilled && score >= kkmVal) {
        status = "T";
      }

      tpValues[colIdx] = status;

      if (isFilled) {
        mappedAspectScores.push({ colIdx, score });
      }
    });

    // 3. Smart Fallback Rule: Jika nilai akhir < 100, minimal harus ada satu kolom TP bernilai "R"
    if (finalScore < 100) {
      const allT = Object.keys(tpMapping).every(colIdxStr => tpValues[Number(colIdxStr)] === "T");
      if (allT && mappedAspectScores.length > 0) {
        // Cari TP dengan nilai aspek paling rendah untuk dipaksa menjadi "R"
        mappedAspectScores.sort((a, b) => a.score - b.score);
        const lowestTP = mappedAspectScores[0];
        tpValues[lowestTP.colIdx] = "R";
      } else if (allT) {
        // Jika tidak ada aspek terisi tapi entah bagaimana all T, paksa TP pertama menjadi "R"
        const firstTpColIdx = Number(Object.keys(tpMapping)[0]);
        if (!isNaN(firstTpColIdx)) {
          tpValues[firstTpColIdx] = "R";
        }
      }
    }

    // 4. Tulis hasil TP ke worksheet Excel
    Object.keys(tpValues).forEach(colIdxStr => {
      const colIdx = Number(colIdxStr);
      const cellRef = XLSX.utils.encode_cell({ r, c: colIdx });
      worksheet[cellRef] = { t: 's', v: tpValues[colIdx] };
    });
  }

  // Tulis kembali ke ArrayBuffer
  const output = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return output;
}
