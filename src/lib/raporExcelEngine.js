import * as XLSX from "xlsx";
import { unzipSync, strToU8, strFromU8, zipSync } from "fflate";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS: konversi kolom index (0-based) ke huruf kolom Excel (A, B, ..., AA, ...)
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
// HELPERS: escape XML
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
// HELPERS: patch satu sel di XML worksheet
// Menemukan elemen <c r="XY"> yang sudah ada dan hanya mengganti <v>...</v>
// atau menambahkan sel baru jika belum ada (tanpa menyentuh style, format, dll)
// ─────────────────────────────────────────────────────────────────────────────
function patchCellInXml(xml, cellRef, value, isString) {
  const escapedRef = cellRef.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Cocokkan <c ...r="REF"...>...</c> dengan flag dotAll
  const cellPattern = new RegExp(
    `(<c\\b[^>]*\\br="${escapedRef}"[^>]*>)(.*?)(</c>)`,
    "s"
  );
  // Cocokkan <c ...r="REF"... />
  const selfClosePattern = new RegExp(
    `<c\\b[^>]*\\br="${escapedRef}"[^>]*/>`
  );

  // Ganti atau sisipkan atribut t= pada tag pembuka, tanpa menyentuh atribut lain
  function setType(openTag, typeVal) {
    if (/\bt="[^"]*"/.test(openTag)) {
      return openTag.replace(/\bt="[^"]*"/, `t="${typeVal}"`);
    }
    // Sisipkan setelah r="REF"
    return openTag.replace(
      new RegExp(`(\\br="${escapedRef}")`),
      `$1 t="${typeVal}"`
    );
  }

  // Hapus atribut t= sepenuhnya (untuk numerik)
  function removeType(tag) {
    return tag.replace(/\s*\bt="[^"]*"/, "");
  }

  if (isString) {
    // Inline string — tidak perlu ubah sharedStrings.xml
    const newInner = `<is><t>${escapeXml(value)}</t></is>`;

    if (cellPattern.test(xml)) {
      return xml.replace(cellPattern, (_m, open, _inner, close) =>
        `${setType(open, "inlineStr")}${newInner}${close}`
      );
    }
    if (selfClosePattern.test(xml)) {
      return xml.replace(selfClosePattern, (match) => {
        const openTag = setType(match.replace(/\/>$/, ""), "inlineStr");
        return `${openTag}>${newInner}</c>`;
      });
    }
    return xml;
  } else {
    // Numerik
    const newInner = `<v>${escapeXml(String(value))}</v>`;

    if (cellPattern.test(xml)) {
      return xml.replace(cellPattern, (_m, open, _inner, close) =>
        `${removeType(open)}${newInner}${close}`
      );
    }
    if (selfClosePattern.test(xml)) {
      return xml.replace(selfClosePattern, (match) => {
        const openTag = removeType(match.replace(/\/>$/, ""));
        return `${openTag}>${newInner}</c>`;
      });
    }
    return xml;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALISIS TEMPLATE (tetap pakai SheetJS karena hanya baca)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Mendeteksi baris header dan kolom-kolom penting dari template Excel e-Rapor.
 * @param {ArrayBuffer} fileBuffer - Data biner file Excel.
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

  let headerRowIdx = -1;
  let nisnIdx = -1;
  let namaIdx = -1;
  let nilaiRaporIdx = -1;

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
        if (/nisn/i.test(text)) nisnIdx = idx;
        else if (/nama|siswa/i.test(text)) namaIdx = idx;
        else if (/nilai\s*rapor|nilai\s*akhir|nilai/i.test(text))
          nilaiRaporIdx = idx;
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

    let tpCode = "";
    let uuidVal = "";
    let description = "";

    colValues.forEach((val) => {
      if (/^tp\.\d+/i.test(val)) {
        tpCode = val;
      } else if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          val
        )
      ) {
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
// PENGISIAN NILAI — SURGICAL XML PATCH (tidak mengubah format file sama sekali)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Mengisi nilai rapor dan status TP ke template Excel dengan cara memodifikasi
 * langsung XML di dalam file xlsx (zip), sehingga format asli 100% terjaga.
 *
 * @param {ArrayBuffer} fileBuffer - Data biner template Excel.
 * @param {Object} kelas - Objek kelas CekNilai.
 * @param {Array} students - Array siswa dengan nilai asli dan finalScore terhitung.
 * @param {Object} tpMapping - Pemetaan indeks kolom TP ke ID aspek nilai CekNilai.
 * @param {number} kkm - KKM kelulusan kelas.
 * @returns {ArrayBuffer} - File xlsx yang sudah terisi, format asli terjaga penuh.
 */
export function fillRaporExcel(fileBuffer, kelas, students, tpMapping, kkm) {
  // ── 1. Unzip file xlsx ──────────────────────────────────────────────────────
  const uint8 = new Uint8Array(fileBuffer);
  const unzipped = unzipSync(uint8);

  // ── 2. Identifikasi nama file worksheet (biasanya xl/worksheets/sheet1.xml) ─
  const sheetKey = Object.keys(unzipped).find(
    (k) => /xl\/worksheets\/sheet\d+\.xml$/i.test(k)
  );
  if (!sheetKey) {
    throw new Error("Tidak dapat menemukan worksheet di dalam file xlsx.");
  }

  // ── 3. Decode XML worksheet ke string ──────────────────────────────────────
  let sheetXml = strFromU8(unzipped[sheetKey]);

  // ── 4. Gunakan SheetJS HANYA untuk membaca struktur (baris/kolom) — baca saja
  const workbook = XLSX.read(fileBuffer, { type: "array" });
  const wsName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[wsName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

  // ── 5. Deteksi header dan kolom kunci ──────────────────────────────────────
  let headerRowIdx = -1;
  let nisnIdx = -1;
  let namaIdx = -1;
  let nilaiRaporIdx = -1;

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
        if (/nisn/i.test(text)) nisnIdx = idx;
        else if (/nama|siswa/i.test(text)) namaIdx = idx;
        else if (/nilai\s*rapor|nilai\s*akhir|nilai/i.test(text))
          nilaiRaporIdx = idx;
      });
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error("Gagal mengurai file Excel saat proses penulisan nilai.");
  }

  // Cari baris pertama siswa
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

  // ── 6. Iterasi baris siswa dan patch XML ────────────────────────────────────
  for (let r = firstStudentRowIdx; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rowNisn = String(row[nisnIdx] || "").trim();
    const rowNama = String(row[namaIdx] || "").trim();

    if (!rowNisn && !rowNama) continue;

    // Cocokkan siswa
    const student = students.find((s) => {
      if (rowNisn && s.nisn === rowNisn) return true;
      const cleanRowNama = rowNama.toLowerCase().replace(/\s+/g, "");
      const cleanStudentNama = s.nama.toLowerCase().replace(/\s+/g, "");
      return cleanRowNama === cleanStudentNama;
    });

    if (!student) continue;

    // Excel row number = 1-based (row index 0 → row 1)
    const excelRow = r + 1;

    // Patch nilai rapor
    const finalScore = Math.round(student.finalScore || 0);
    if (nilaiRaporIdx !== -1) {
      const cellRef = `${colIndexToLetter(nilaiRaporIdx)}${excelRow}`;
      sheetXml = patchCellInXml(sheetXml, cellRef, finalScore, false);
    }

    // Evaluasi TP
    const tpValues = {};
    const mappedAspectScores = [];

    Object.keys(tpMapping).forEach((colIdxStr) => {
      const colIdx = Number(colIdxStr);
      const aspectId = tpMapping[colIdx];

      let isFilled = false;
      let score = 0;

      if (aspectId) {
        const aspectDef = kelas.kolomNilai.find((c) => c.id === aspectId);
        if (aspectDef && aspectDef.isGroup && aspectDef.subKolom) {
          let subTotal = 0;
          let subFilledWeight = 0;
          let subFilledCount = 0;
          aspectDef.subKolom.forEach((sub) => {
            const sc = student.nilai[sub.id];
            if (sc !== undefined && sc !== null && sc !== "") {
              const scNum = Number(sc);
              if (aspectDef.hitungMetode === "persentase") {
                const subBobot =
                  sub.bobot !== undefined && sub.bobot !== null
                    ? Number(sub.bobot)
                    : 0;
                subTotal += scNum * subBobot;
                subFilledWeight += subBobot;
              } else {
                subTotal += scNum;
              }
              subFilledCount++;
            }
          });
          if (subFilledCount > 0) {
            score =
              aspectDef.hitungMetode === "persentase"
                ? subFilledWeight > 0
                  ? subTotal / subFilledWeight
                  : 0
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
      }

      let status = "R";
      if (isFilled && score >= kkmVal) {
        status = "T";
      }

      tpValues[colIdx] = status;
      if (isFilled) mappedAspectScores.push({ colIdx, score });
    });

    // Smart Fallback: jika nilai < 100 tapi semua T, paksa TP terendah jadi R
    if (finalScore < 100) {
      const allT = Object.keys(tpMapping).every(
        (colIdxStr) => tpValues[Number(colIdxStr)] === "T"
      );
      if (allT && mappedAspectScores.length > 0) {
        mappedAspectScores.sort((a, b) => a.score - b.score);
        tpValues[mappedAspectScores[0].colIdx] = "R";
      } else if (allT) {
        const firstTpColIdx = Number(Object.keys(tpMapping)[0]);
        if (!isNaN(firstTpColIdx)) tpValues[firstTpColIdx] = "R";
      }
    }

    // Patch setiap kolom TP
    Object.keys(tpValues).forEach((colIdxStr) => {
      const colIdx = Number(colIdxStr);
      const cellRef = `${colIndexToLetter(colIdx)}${excelRow}`;
      sheetXml = patchCellInXml(sheetXml, cellRef, tpValues[colIdx], true);
    });
  }

  // ── 7. Repack zip dengan XML yang sudah di-patch ────────────────────────────
  const patchedFiles = { ...unzipped };
  patchedFiles[sheetKey] = strToU8(sheetXml);

  const zipped = zipSync(patchedFiles, { level: 6 });
  return zipped.buffer;
}
