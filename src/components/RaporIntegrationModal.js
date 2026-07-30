import React, { useState } from "react";
import { analyzeRaporTemplate, fillRaporExcel } from "@/lib/raporExcelEngine";

export default function RaporIntegrationModal({ isOpen, onClose, kelas, students }) {
  const [status, setStatus] = useState("idle"); // idle, analyzing, mapped, processing, error
  const [errorMsg, setErrorMsg] = useState("");
  const [file, setFile] = useState(null);
  const [fileBuffer, setFileBuffer] = useState(null);
  const [excelInfo, setExcelInfo] = useState(null);
  const [tpMapping, setTpMapping] = useState({});

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setStatus("analyzing");
    setErrorMsg("");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const buffer = event.target.result;
        setFileBuffer(buffer);
        try {
          const info = await analyzeRaporTemplate(buffer);
          setExcelInfo(info);
          
          // Inisialisasi default mapping (petakan kolom TP secara berurutan ke komponen kolom CekNilai)
          const defaultMapping = {};
          info.tpCols.forEach((tpCol, idx) => {
            const matchedAspect = kelas.kolomNilai[idx];
            defaultMapping[tpCol.index] = matchedAspect ? matchedAspect.id : "";
          });

          setTpMapping(defaultMapping);
          setStatus("mapped");
        } catch (err) {
          setErrorMsg(err.message || "Gagal menganalisis file Excel.");
          setStatus("error");
        }
      };
      reader.readAsArrayBuffer(uploadedFile);
    } catch (err) {
      setErrorMsg("Gagal membaca file.");
      setStatus("error");
    }
  };

  const handleAspectChange = (tpColIndex, aspectId) => {
    setTpMapping(prev => ({
      ...prev,
      [tpColIndex]: aspectId
    }));
  };

  const handleProcess = () => {
    if (!fileBuffer || !excelInfo) return;

    setStatus("processing");
    try {
      const kkm = kelas.skemaPenilaian?.kkm || 75;
      const outputBuffer = fillRaporExcel(fileBuffer, kelas, students, tpMapping, kkm);

      // Unduh file hasil pemrosesan
      const blob = new Blob([outputBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `e-Rapor_${kelas.nama.replace(/\s+/g, "_")}_${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus("done");
    } catch (err) {
      setErrorMsg(err.message || "Gagal memproses file Excel.");
      setStatus("error");
    }
  };

  const resetModal = () => {
    setFile(null);
    setFileBuffer(null);
    setExcelInfo(null);
    setTpMapping({});
    setStatus("idle");
    setErrorMsg("");
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, backdropFilter: "blur(6px)" }} className="animate-fade-in">
      <div className="glass-card" style={{ width: "90%", maxWidth: "600px", padding: "26px", display: "flex", flexDirection: "column", gap: "18px", position: "relative", backgroundColor: "var(--bg-primary)", maxHeight: "90vh", overflowY: "auto" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.4rem" }}>🔌</span>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--primary)", margin: 0 }}>Ekspor & Perekapan ke E-Rapor</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}>✕</button>
        </div>

        {/* Content berdasarkan Status */}
        {status === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "3rem" }}>📥</div>
            <div>
              <h4 style={{ fontWeight: "700", marginBottom: "6px" }}>Unggah Template Excel E-Rapor</h4>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", maxWidth: "420px", margin: "0 auto" }}>
                Unggah file Excel kosongan / daftar nama siswa yang telah Anda unduh dari aplikasi e-Rapor sekolah Anda.
              </p>
            </div>
            
            <div style={{ position: "relative", border: "2px dashed var(--border-color)", borderRadius: "var(--radius-sm)", padding: "30px", backgroundColor: "rgba(59,130,246,0.02)", cursor: "pointer" }}>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
              />
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>
                📁 Klik atau seret file Excel e-Rapor ke sini
              </span>
            </div>
          </div>
        )}

        {status === "analyzing" && (
          <div style={{ textAlign: "center", padding: "40px 0", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
            <div style={{ width: "30px", height: "30px", border: "3px solid rgba(59, 130, 246, 0.2)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s infinite linear" }} />
            <span style={{ fontSize: "0.88rem", color: "var(--text-secondary)", fontWeight: "600" }}>Menganalisis kolom template e-Rapor...</span>
          </div>
        )}

        {status === "mapped" && excelInfo && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            
            {/* Auto Detection Summary */}
            <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", padding: "12px" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Konektivitas Kolom</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginTop: "8px", fontSize: "0.8rem" }}>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>Kolom NISN:</span>
                  <strong style={{ color: "var(--success)" }}>✅ {excelInfo.headers[excelInfo.nisnIdx]}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>Kolom Nama:</span>
                  <strong style={{ color: "var(--success)" }}>✅ {excelInfo.headers[excelInfo.namaIdx]}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block" }}>Nilai Rapor:</span>
                  <strong style={{ color: "var(--success)" }}>✅ {excelInfo.headers[excelInfo.nilaiRaporIdx] || "Tidak Terdeteksi"}</strong>
                </div>
              </div>
            </div>

            {/* TP Columns Mapping */}
            <div>
              <h4 style={{ fontSize: "0.9rem", fontWeight: "700", marginBottom: "8px" }}>Petakan Indikator Tujuan Pembelajaran (TP)</h4>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
                Hubungkan setiap kolom Tujuan Pembelajaran di Excel dengan komponen nilai yang ada di CekNilai.
              </p>

              <div style={{ maxHeight: "35vh", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                      <th style={{ padding: "8px 12px", color: "var(--text-muted)", fontWeight: "700" }}>Kolom TP (Excel)</th>
                      <th style={{ padding: "8px 12px", color: "var(--text-muted)", fontWeight: "700" }}>Diambil dari Komponen (CekNilai)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelInfo.tpCols.map((tpCol) => (
                      <tr key={tpCol.index} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "8px 12px", fontWeight: "600", maxWidth: "240px", wordBreak: "break-word" }}>
                          {tpCol.name}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <select
                            className="form-input"
                            value={tpMapping[tpCol.index] || ""}
                            onChange={(e) => handleAspectChange(tpCol.index, e.target.value)}
                            style={{ width: "100%", padding: "5px 8px", fontSize: "0.8rem" }}
                          >
                            <option value="">-- Pilih Komponen Nilai --</option>
                            {kelas.kolomNilai.map(col => (
                              <option key={col.id} value={col.id}>
                                {col.nama} ({col.bobot}%)
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Smart Fallback Hint */}
            <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "flex", gap: "6px", alignItems: "flex-start", backgroundColor: "rgba(59,130,246,0.03)", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(59,130,246,0.1)" }}>
              <span>💡</span>
              <span>
                <strong>Smart Fallback Aktif:</strong> Jika nilai rapor siswa &lt; 100 tetapi semua komponen mencapai KKM, sistem otomatis memaksa komponen bernilai terendah menjadi status <strong>"R"</strong> agar file valid diunggah ke e-Rapor.
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
              <button onClick={resetModal} className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                Batal
              </button>
              <button onClick={handleProcess} className="btn btn-primary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                💾 Isi & Unduh Rapor Excel
              </button>
            </div>
          </div>
        )}

        {status === "processing" && (
          <div style={{ textAlign: "center", padding: "40px 0", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
            <div style={{ width: "30px", height: "30px", border: "3px solid rgba(59, 130, 246, 0.2)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s infinite linear" }} />
            <span style={{ fontSize: "0.88rem", color: "var(--text-secondary)", fontWeight: "600" }}>Menulis data nilai ke Excel template...</span>
          </div>
        )}

        {status === "done" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "3rem" }}>🎉</div>
            <div>
              <h4 style={{ fontWeight: "700", marginBottom: "6px" }}>Excel E-Rapor Berhasil Diunduh!</h4>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", maxWidth: "420px", margin: "0 auto" }}>
                Seluruh nilai rapor dan status ketercapaian Tujuan Pembelajaran telah terisi otomatis. Anda dapat langsung mengunggah file ini ke aplikasi e-Rapor sekolah Anda.
              </p>
            </div>
            
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "10px" }}>
              <button onClick={resetModal} className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                Proses File Lain
              </button>
              <button onClick={onClose} className="btn btn-primary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                Tutup
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "3rem" }}>⚠️</div>
            <div>
              <h4 style={{ fontWeight: "700", marginBottom: "6px", color: "var(--danger)" }}>Terjadi Kesalahan</h4>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", maxWidth: "420px", margin: "0 auto" }}>
                {errorMsg}
              </p>
            </div>
            
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "10px" }}>
              <button onClick={resetModal} className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                Coba Lagi
              </button>
              <button onClick={onClose} className="btn btn-primary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
