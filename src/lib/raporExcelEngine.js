import * as XLSX from "xlsx";
import { unzipSync, zipSync } from "fflate";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY: Konversi kolom index (0-based) ke huruf kolom Excel (A, B, ..., Z, AA, ...)
// ─────────────────────────────────────────────────────────────────────────────
function colIndexToLetter(idx) {
  let letter = "";
  let n = idx + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY: Bandingkan dua huruf kolom Excel (untuk urutan penyisipan)
// ─────────────────────────────────────────────────────────────────────────────
function compareColLetters(a, b) {
  if (a.length !== b.length) return a.length - b.length;
  return a < b ? -1 : a > b ? 1 : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY: Escape karakter XML
// ─────────────────────────────────────────────────────────────────────────────
function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE: Sisipkan atau patch sel di worksheet XML.
//
// Strategi:
//   1. Cari elemen <c r="REF" ...>...</c> atau <c r="REF" ... /> → patch value-nya
//   2. Jika tidak ditemukan → sisipkan elemen <c> baru di dalam <row r="N"> yang sesuai,
//      pada posisi kolom yang benar (agar urutan kolom tetap ascending)
// ─────────────────────────────────────────────────────────────────────────────
function insertOrPatchCell(xml, cellRef, value, isString) {
  const colLetter = cellRef.match(/^[A-Z]+/)[0];
  const rowNum    = cellRef.match(/\d+$/)[0];

  // ── Buat XML untuk sel baru ─────────────────────────────────────────────
  let newCellXml;
  if (isString) {
    // Gunakan inline string agar tidak perlu ubah sharedStrings.xml
    newCellXml = `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
  } else {
    newCellXml = `<c r="${cellRef}"><v>${escapeXml(String(value))}</v></c>`;
  }

  // ── Escape cellRef untuk regex ──────────────────────────────────────────
  const esc = cellRef.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // ── Coba patch sel yang sudah ada (<c r="REF">...</c>) ──────────────────
  const existingPattern = new RegExp(
    `<c\\b[^>]*\\br="${esc}"[^>]*>.*?</c>`,
    "s"
  );
  if (existingPattern.test(xml)) {
    // Ganti seluruh sel (termasuk formula jika ada) dengan nilai statis
    return xml.replace(existingPattern, newCellXml);
  }

  // ── Coba patch sel self-closing (<c r="REF" ... />) ─────────────────────
  const selfClosePattern = new RegExp(`<c\\b[^>]*\\br="${esc}"[^>]*/>`);
  if (selfClosePattern.test(xml)) {
    return xml.replace(selfClosePattern, newCellXml);
  }

  // ── Sel tidak ada → sisipkan di dalam baris yang tepat ──────────────────
  const rowEsc = rowNum.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rowPattern = new RegExp(
    `(<row\\b[^>]*\\br="${rowEsc}"[^>]*>)(.*?)(</row>)`,
    "s"
  );

  if (rowPattern.test(xml)) {
    return xml.replace(rowPattern, (_m, rowOpen, rowContent, rowClose) => {
      // Temukan semua sel di baris ini dan posisi teks mereka
      const cellRe = /<c\b[^>]*\br="([A-Z]+)\d+"[^>]*(?:\/>|>.*?<\/c>)/gs;
      let insertPos = rowContent.length; // Default: append di akhir
      let match;

      while ((match = cellRe.exec(rowContent)) !== null) {
        if (compareColLetters(match[1], colLetter) > 0) {
          // Kolom ini lebih besar → sisipkan sebelum sel ini
          insertPos = match.index;
          break;
        }
      }

      const newContent =
        rowContent.slice(0, insertPos) +
        newCellXml +
        rowContent.slice(insertPos);

      return `${rowOpen}${newContent}${rowClose}`;
    });
  }

  // ── Baris tidak ada sama sekali → biarkan (tidak ubah) ──────────────────
  return xml;
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALISIS TEMPLATE (hanya baca — menggunakan SheetJS)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Mendeteksi baris header dan kolom-kolom penting dari template Excel e-Rapor.
 * @param {ArrayBuffer} fileBuffer
 */
export async function analyzeRaporTemplate(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: "array", cellComments: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

  console.log("=== DEBUG: analyzeRaporTemplate ===");
  console.log("Sheet name:", sheetName);
  console.log("Total rows found:", rows.length);
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    console.log(`Row index ${i}:`, JSON.stringify(rows[i]));
  }

  let headerRowIdx   = -1;
  let nisnIdx        = -1;
  let namaIdx        = -1;
  let nilaiRaporIdx  = -1;

  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    const hasNISN = row.some(
      (cell) => typeof cell === "string" && /nisn/i.test(cell.trim())
    );
    const hasNama = row.some(
      (cell) => typeof cell === "string" && /nama|siswa/i.test(cell.trim())
    );

    if (hasNISN && hasNama) {
      headerRowIdx = i;
      row.forEach((cell, idx) => {
        const text = String(cell || "").trim().toLowerCase();
        if (/nisn/i.test(text))                              nisnIdx       = idx;
        else if (/nama|siswa/i.test(text))                   namaIdx       = idx;
        else if (/nilai\s*rapor|nilai\s*akhir|nilai/i.test(text)) nilaiRaporIdx = idx;
      });
      break;
    }
  }

  console.log("Detected headerRowIdx:", headerRowIdx);
  console.log("nisnIdx:", nisnIdx, "namaIdx:", namaIdx, "nilaiRaporIdx:", nilaiRaporIdx);

  if (headerRowIdx === -1) {
    throw new Error(
      "Format template Excel tidak valid. Baris header dengan kolom 'NISN' dan 'Nama' tidak ditemukan."
    );
  }

  // Cari baris pertama data siswa
  let firstStudentRowIdx = -1;
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const nisnVal    = String(row[nisnIdx] || "").trim();
    const namaVal    = String(row[namaIdx] || "").trim();
    const isNisnNum  = /^\d+$/.test(nisnVal);
    const isNamaText = namaVal && !/nama|siswa|student/i.test(namaVal);
    const isNoNum    = /^\d+$/.test(String(row[0] || "").trim());

    if ((isNisnNum && isNamaText) || (isNoNum && namaVal)) {
      firstStudentRowIdx = r;
      break;
    }
  }
  if (firstStudentRowIdx === -1) {
    firstStudentRowIdx = Math.min(rows.length, headerRowIdx + 2);
  }
  console.log("Detected firstStudentRowIdx:", firstStudentRowIdx);

  const tpCols   = [];
  const startCol = Math.max(namaIdx, nilaiRaporIdx) + 1;
  const maxCols  = rows[headerRowIdx].length;

  for (let idx = startCol; idx < maxCols; idx++) {
    const colValues = [];
    for (let r = headerRowIdx; r < firstStudentRowIdx; r++) {
      const cellVal = String(rows[r]?.[idx] || "").trim();
      if (cellVal && !colValues.includes(cellVal)) {
        if (
          !/^(no|nomor|predikat|keterangan|aksi|catatan|tgl|tanggal|validasi|nilai|tr|op)$/i.test(
            cellVal
          )
        ) {
          colValues.push(cellVal);
        }
      }
    }

    if (colValues.length === 0) continue;

    let tpCode = "", uuidVal = "", description = "";

    colValues.forEach((val) => {
      if (/^tp\.\d+/i.test(val)) {
        tpCode = val;
      } else if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
      ) {
        uuidVal = val;
      } else if (val.length > 15 && !/tingkat ketercapaian/i.test(val)) {
        description = val;
      }
    });

    let displayName = tpCode || uuidVal || colValues[colValues.length - 1];
    if (description)                        displayName = `${displayName} (${description})`;
    else if (uuidVal && uuidVal !== displayName) displayName = `${displayName} (${uuidVal})`;

    tpCols.push({ index: idx, name: displayName });
  }

  const headers      = rows[headerRowIdx] || [];
  const hasSubHeaders = firstStudentRowIdx > headerRowIdx + 1;

  return {
    headers: headers.map((h) => String(h || "").trim()),
    headerRowIdx,
    hasSubHeaders,
    tpCols,
    nisnIdx,
    namaIdx,
    nilaiRaporIdx,
    rows,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PENGISIAN NILAI — SURGICAL XML PATCH via fflate
// Format asli 100% terjaga: hanya sel target yang dimodifikasi di level XML.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {ArrayBuffer} fileBuffer
 * @param {Object}      kelas
 * @param {Array}       students
 * @param {Object}      tpMapping
 * @param {number}      kkm
 * @returns {ArrayBuffer}
 */
export function fillRaporExcel(fileBuffer, kelas, students, tpMapping, kkm) {
  // ── 1. Unzip xlsx ───────────────────────────────────────────────────────────
  const uint8     = new Uint8Array(fileBuffer);
  const unzipped  = unzipSync(uint8);
  const allKeys   = Object.keys(unzipped);

  // ── 2. Temukan file worksheet ───────────────────────────────────────────────
  const sheetKey = allKeys.find((k) =>
    /xl\/worksheets\/sheet\d+\.xml$/i.test(k)
  );
  if (!sheetKey) {
    throw new Error("Tidak dapat menemukan worksheet di dalam file xlsx.");
  }

  // ── 3. Decode XML dengan TextDecoder (native, andal) ───────────────────────
  const decoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();
  let sheetXml  = decoder.decode(unzipped[sheetKey]);

  // ── 4. SheetJS hanya untuk baca struktur baris/kolom ──────────────────────
  const workbook  = XLSX.read(fileBuffer, { type: "array" });
  const wsName    = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[wsName];
  const rows      = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

  // ── 5. Deteksi indeks kolom ─────────────────────────────────────────────────
  let headerRowIdx  = -1;
  let nisnIdx       = -1;
  let namaIdx       = -1;
  let nilaiRaporIdx = -1;

  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const hasNISN = row.some(
      (c) => typeof c === "string" && /nisn/i.test(c.trim())
    );
    const hasNama = row.some(
      (c) => typeof c === "string" && /nama|siswa/i.test(c.trim())
    );
    if (hasNISN && hasNama) {
      headerRowIdx = i;
      row.forEach((c, idx) => {
        const t = String(c || "").trim().toLowerCase();
        if (/nisn/i.test(t))                              nisnIdx       = idx;
        else if (/nama|siswa/i.test(t))                   namaIdx       = idx;
        else if (/nilai\s*rapor|nilai\s*akhir|nilai/i.test(t)) nilaiRaporIdx = idx;
      });
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error("Gagal mengurai file Excel saat proses penulisan nilai.");
  }

  // ── 6. Cari baris pertama siswa ─────────────────────────────────────────────
  let firstStudentRowIdx = -1;
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row     = rows[r];
    if (!row) continue;
    const nisnVal = String(row[nisnIdx] || "").trim();
    const namaVal = String(row[namaIdx] || "").trim();
    const isNisnNum  = /^\d+$/.test(nisnVal);
    const isNamaText = namaVal && !/nama|siswa|student/i.test(namaVal);
    const isNoNum    = /^\d+$/.test(String(row[0] || "").trim());
    if ((isNisnNum && isNamaText) || (isNoNum && namaVal)) {
      firstStudentRowIdx = r;
      break;
    }
  }
  if (firstStudentRowIdx === -1) {
    firstStudentRowIdx = Math.min(rows.length, headerRowIdx + 2);
  }

  const kkmVal = Number(kkm) || 75;

  // ── 7. Iterasi siswa → patch XML ────────────────────────────────────────────
  for (let r = firstStudentRowIdx; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rowNisn = String(row[nisnIdx] || "").trim();
    const rowNama = String(row[namaIdx] || "").trim();
    if (!rowNisn && !rowNama) continue;

    // Cocokkan dengan data siswa CekNilai
    const student = students.find((s) => {
      if (rowNisn && s.nisn === rowNisn) return true;
      const a = rowNama.toLowerCase().replace(/\s+/g, "");
      const b = s.nama.toLowerCase().replace(/\s+/g, "");
      return a === b;
    });
    if (!student) continue;

    // Excel row number adalah 1-based
    const excelRow   = r + 1;
    const finalScore = Math.round(student.finalScore || 0);

    // Tulis Nilai Rapor
    if (nilaiRaporIdx !== -1) {
      const cellRef = `${colIndexToLetter(nilaiRaporIdx)}${excelRow}`;
      sheetXml = insertOrPatchCell(sheetXml, cellRef, finalScore, false);
    }

    // Hitung status TP
    const tpValues          = {};
    const mappedAspectScores = [];

    Object.keys(tpMapping).forEach((colIdxStr) => {
      const colIdx   = Number(colIdxStr);
      const aspectId = tpMapping[colIdx];

      // Kolom tidak dipetakan → lewati, jangan tulis apapun ke sel tersebut
      if (!aspectId) return;

      let isFilled = false;
      let score    = 0;

      const aspectDef = kelas.kolomNilai.find((c) => c.id === aspectId);
      if (aspectDef && aspectDef.isGroup && aspectDef.subKolom) {
        let subTotal = 0, subFilledWeight = 0, subFilledCount = 0;
        aspectDef.subKolom.forEach((sub) => {
          const sc = student.nilai[sub.id];
          if (sc !== undefined && sc !== null && sc !== "") {
            const scNum = Number(sc);
            if (aspectDef.hitungMetode === "persentase") {
              const w = sub.bobot != null ? Number(sub.bobot) : 0;
              subTotal += scNum * w;
              subFilledWeight += w;
            } else {
              subTotal += scNum;
            }
            subFilledCount++;
          }
        });
        if (subFilledCount > 0) {
          score = aspectDef.hitungMetode === "persentase"
            ? subFilledWeight > 0 ? subTotal / subFilledWeight : 0
            : subTotal / subFilledCount;
          isFilled = true;
        }
      } else {
        const sc = student.nilai[aspectId];
        if (sc !== undefined && sc !== null && sc !== "") {
          score = Number(sc);
          isFilled = true;
        }
      }

      const status = (isFilled && score >= kkmVal) ? "T" : "R";
      tpValues[colIdx] = status;
      if (isFilled) mappedAspectScores.push({ colIdx, score });
    });

    // Smart Fallback: nilai < 100 tapi semua T → paksa TP terendah jadi R
    if (finalScore < 100) {
      const allT = Object.keys(tpMapping).every(
        (s) => tpValues[Number(s)] === "T"
      );
      if (allT && mappedAspectScores.length > 0) {
        mappedAspectScores.sort((a, b) => a.score - b.score);
        tpValues[mappedAspectScores[0].colIdx] = "R";
      } else if (allT) {
        const first = Number(Object.keys(tpMapping)[0]);
        if (!isNaN(first)) tpValues[first] = "R";
      }
    }

    // Tulis status TP ke XML
    Object.keys(tpValues).forEach((colIdxStr) => {
      const colIdx  = Number(colIdxStr);
      const cellRef = `${colIndexToLetter(colIdx)}${excelRow}`;
      sheetXml = insertOrPatchCell(sheetXml, cellRef, tpValues[colIdx], true);
    });
  }

  // ── 8. Repack zip — pastikan [Content_Types].xml tetap pertama ─────────────
  const patchedFiles = {};

  // Helper: strip semua referensi ke calcChain.xml dari XML string
  function stripCalcChainRef(xml) {
    // Hapus <Override PartName="/xl/calcChain.xml" ... /> dari [Content_Types].xml
    xml = xml.replace(
      /<Override[^>]*PartName=["'][^"']*calcChain\.xml["'][^>]*\/?>/gi,
      ""
    );
    // Hapus <Relationship ... Target="calcChain.xml" ... /> dari workbook.xml.rels
    xml = xml.replace(
      /<Relationship[^>]*Target=["'][^"']*calcChain\.xml["'][^>]*\/?>/gi,
      ""
    );
    return xml;
  }

  // Prioritaskan [Content_Types].xml — strip referensi calcChain di dalamnya
  const contentTypesKey = allKeys.find((k) =>
    /^\[Content_Types\]\.xml$/i.test(k)
  );
  if (contentTypesKey) {
    const ctXml = stripCalcChainRef(decoder.decode(unzipped[contentTypesKey]));
    patchedFiles[contentTypesKey] = encoder.encode(ctXml);
  }

  // Key untuk workbook.xml.rels
  const wbRelsKey = allKeys.find((k) =>
    /xl\/_rels\/workbook\.xml\.rels$/i.test(k)
  );

  for (const key of allKeys) {
    if (key === contentTypesKey) continue; // sudah diatas

    // Hapus calcChain.xml sepenuhnya — Excel regenerasi otomatis saat dibuka
    if (/xl\/calcChain\.xml$/i.test(key)) continue;

    if (key === wbRelsKey) {
      // Hapus <Relationship> yang menunjuk calcChain.xml
      const relsXml = stripCalcChainRef(decoder.decode(unzipped[key]));
      patchedFiles[key] = encoder.encode(relsXml);
    } else {
      patchedFiles[key] =
        key === sheetKey ? encoder.encode(sheetXml) : unzipped[key];
    }
  }

  const zipped = zipSync(patchedFiles, { level: 6 });

  // Kembalikan ArrayBuffer yang tepat (slice untuk menghindari oversized buffer)
  return zipped.buffer.slice(
    zipped.byteOffset,
    zipped.byteOffset + zipped.byteLength
  );
}
