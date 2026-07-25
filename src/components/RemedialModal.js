"use client";

import { useState, useEffect } from "react";

export default function RemedialModal({
  isOpen,
  onClose,
  kolom,
  siswaList = [],
  skemaPenilaian = {},
  onSave,
  onOpenReport
}) {
  const [activeTab, setActiveTab] = useState("remedial"); // 'remedial' | 'pengayaan'
  const [remedialPolicy, setRemedialPolicy] = useState("max_kkm");
  const [maxCap, setMaxCap] = useState(100);
  const [cappingScope, setCappingScope] = useState("bonus_only");
  const [kkm, setKkm] = useState(75);

  // Local state for edits
  // Object keyed by student NISN: { remedialTes: number|string, catatan: string }
  const [remedialData, setRemedialData] = useState({});

  useEffect(() => {
    if (skemaPenilaian) {
      setKkm(Number(skemaPenilaian.kkm) || 75);
      setRemedialPolicy(skemaPenilaian.remedialPolicy || "max_kkm");
      setMaxCap(skemaPenilaian.maxCap !== undefined ? Number(skemaPenilaian.maxCap) : 100);
      setCappingScope(skemaPenilaian.cappingScope || "bonus_only");
    }
  }, [skemaPenilaian]);

  useEffect(() => {
    if (kolom && siswaList.length > 0) {
      const initialData = {};
      siswaList.forEach((s) => {
        const keyRemedial = `${kolom.id}_remedial`;
        const remObj = s.nilai?.[keyRemedial] || {};

        initialData[s.nisn] = {
          remedialTes: remObj.nilaiTes !== undefined ? remObj.nilaiTes : "",
          catatan: remObj.catatan || ""
        };
      });
      setRemedialData(initialData);
    }
  }, [kolom, siswaList]);

  if (!isOpen || !kolom) return null;

  // Helper function to extract original pre-remedial grade
  const getOriginalGrade = (s) => {
    const keyRemedial = `${kolom.id}_remedial`;
    if (s.nilai?.[keyRemedial]?.nilaiAwal !== undefined && s.nilai?.[keyRemedial]?.nilaiAwal !== null) {
      return Number(s.nilai[keyRemedial].nilaiAwal);
    }
    return Number(s.nilai?.[kolom.id]) || 0;
  };

  // Helper calculation functions
  const computeRemedialFinal = (nilaiAwal, tesInput) => {
    if (tesInput === "" || tesInput === null || isNaN(Number(tesInput))) {
      return Number(nilaiAwal) || 0;
    }
    const awal = Number(nilaiAwal) || 0;
    const tes = Number(tesInput);
    let finalVal = awal;

    if (remedialPolicy === "max_kkm") {
      finalVal = tes >= kkm ? Math.min(tes, kkm) : tes;
    } else if (remedialPolicy === "average") {
      finalVal = Math.round((awal + tes) / 2);
    } else if (remedialPolicy === "max_value") {
      finalVal = Math.max(awal, tes);
    } else if (remedialPolicy === "actual") {
      finalVal = tes;
    }

    // Apply Capping
    return Math.min(finalVal, maxCap);
  };

  // Group students: candidates based on original pre-remedial grade
  const siswaRemedial = siswaList.filter((s) => getOriginalGrade(s) < kkm);
  const siswaPengayaan = siswaList.filter((s) => getOriginalGrade(s) >= kkm);

  const handleInputChange = (nisn, field, val) => {
    setRemedialData((prev) => ({
      ...prev,
      [nisn]: {
        ...prev[nisn],
        [field]: val
      }
    }));
  };

  const handleSaveAll = () => {
    const updatedSiswa = siswaList.map((s) => {
      const data = remedialData[s.nisn] || {};
      const awal = getOriginalGrade(s);
      const newNilai = { ...(s.nilai || {}) };

      const keyRemedial = `${kolom.id}_remedial`;

      if (awal < kkm && data.remedialTes !== "" && data.remedialTes !== null) {
        const finalRem = computeRemedialFinal(awal, data.remedialTes);
        newNilai[kolom.id] = finalRem; // Update main grade column
        newNilai[keyRemedial] = {
          nilaiAwal: awal,
          nilaiTes: Number(data.remedialTes),
          nilaiAkhir: finalRem,
          status: finalRem >= kkm ? "LULUS" : "BELUM LULUS",
          catatan: data.catatan || "Telah mengikuti tes remedial",
          tanggal: s.nilai?.[keyRemedial]?.tanggal || new Date().toISOString().split("T")[0]
        };
      } else if (awal >= kkm && data.catatan) {
        newNilai[keyRemedial] = {
          nilaiAwal: awal,
          nilaiTes: awal,
          nilaiAkhir: awal,
          status: "PENGAYAAN",
          catatan: data.catatan || "Mengikuti Program Pengayaan",
          tanggal: new Date().toISOString().split("T")[0]
        };
      }

      return {
        ...s,
        nilai: newNilai
      };
    });

    onSave(updatedSiswa, {
      remedialPolicy,
      maxCap,
      cappingScope,
      kkm
    });
  };

  return (
    <div className="modal-backdrop no-print" onClick={onClose} style={backdropStyle}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={containerStyle}
      >
        {/* Modal Header */}
        <div style={headerStyle}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.3rem" }}>✨</span>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700", color: "var(--text-primary)" }}>
                Program Remedial & Pengayaan
              </h3>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Kolom Penilaian: <strong style={{ color: "var(--primary)" }}>{kolom.nama}</strong> | KKM: <strong style={{ color: "#ef4444" }}>{kkm}</strong>
            </p>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Dynamic Controls Bar: Policy & MaxCap */}
        <div style={controlsBarStyle}>
          <div style={controlItemStyle}>
            <label style={labelStyle}>Metode Remedial:</label>
            <select
              value={remedialPolicy}
              onChange={(e) => setRemedialPolicy(e.target.value)}
              style={selectStyle}
            >
              <option value="max_kkm">Maksimal Nilai KKM ({kkm}) [Default]</option>
              <option value="average">Rata-rata (Nilai Awal + Remedial / 2)</option>
              <option value="max_value">Nilai Tertinggi (Max Value)</option>
              <option value="actual">Nilai Remedial Murni</option>
            </select>
          </div>

          <div style={controlItemStyle}>
            <label style={labelStyle}>Batas Nilai Maks (MaxCap):</label>
            <input
              type="number"
              min={kkm}
              max={100}
              value={maxCap}
              onChange={(e) => setMaxCap(Number(e.target.value) || 100)}
              style={inputNumberStyle}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Contoh: 90, 95, 100</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={tabContainerStyle}>
          <button
            onClick={() => setActiveTab("remedial")}
            style={tabButtonStyle(activeTab === "remedial", "#ef4444")}
          >
            🔴 Program Remedial ({siswaRemedial.length} Peserta &lt; KKM)
          </button>
          <button
            onClick={() => setActiveTab("pengayaan")}
            style={tabButtonStyle(activeTab === "pengayaan", "#10b981")}
          >
            🟢 Program Pengayaan ({siswaPengayaan.length} Siswa ≥ KKM)
          </button>
        </div>

        {/* Body Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {activeTab === "remedial" && (
            <div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
                💡 <strong>Remedial Fleksibel / Bertahap:</strong> Nilai awal siswa tetap tersimpan. Anda dapat memasukkan nilai tes remedial kapan saja secara individu per siswa.
              </p>
              {siswaRemedial.length === 0 ? (
                <div style={emptyStateStyle}>
                  🎉 <strong>Selamat!</strong> Tidak ada siswa yang nilai awalknya berada di bawah KKM ({kkm}) pada kolom ini.
                </div>
              ) : (
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>No</th>
                      <th style={thStyle}>Nama Siswa</th>
                      <th style={{ ...thStyle, textAlign: "center" }}>Nilai Awal</th>
                      <th style={{ ...thStyle, textAlign: "center" }}>Nilai Tes Remedial</th>
                      <th style={{ ...thStyle, textAlign: "center" }}>Nilai Akhir Hasil</th>
                      <th style={thStyle}>Status Remedial</th>
                      <th style={thStyle}>Catatan / Materi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siswaRemedial.map((s, idx) => {
                      const awal = getOriginalGrade(s);
                      const keyRemedial = `${kolom.id}_remedial`;
                      const existingRem = s.nilai?.[keyRemedial];
                      const inputTes = remedialData[s.nisn]?.remedialTes;
                      
                      const hasRemedial = inputTes !== "" && inputTes !== null && !isNaN(Number(inputTes));
                      const finalVal = hasRemedial ? computeRemedialFinal(awal, inputTes) : (existingRem?.nilaiAkhir !== undefined ? existingRem.nilaiAkhir : awal);
                      const isLulus = finalVal >= kkm;

                      return (
                        <tr key={s.nisn} style={trStyle}>
                          <td style={tdStyle}>{idx + 1}</td>
                          <td style={tdStyle}>
                            <strong>{s.nama}</strong>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>NISN: {s.nisn}</div>
                          </td>
                          <td style={{ ...tdStyle, textAlign: "center", color: "#ef4444", fontWeight: "700" }}>
                            {awal}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              placeholder="Tes Remedial"
                              value={inputTes ?? ""}
                              onChange={(e) => handleInputChange(s.nisn, "remedialTes", e.target.value)}
                              style={tableInputStyle}
                            />
                          </td>
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            <span style={{
                              fontWeight: "800",
                              fontSize: "1rem",
                              color: isLulus ? "#10b981" : "#ef4444"
                            }}>
                              {finalVal}
                            </span>
                            {maxCap < 100 && finalVal === maxCap && (
                              <span style={{ fontSize: "0.65rem", display: "block", color: "var(--text-secondary)" }}>
                                (Capped @ {maxCap})
                              </span>
                            )}
                          </td>
                          <td style={tdStyle}>
                            <span style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              backgroundColor: hasRemedial || existingRem ? (isLulus ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)") : "rgba(239, 68, 68, 0.15)",
                              color: hasRemedial || existingRem ? (isLulus ? "#10b981" : "#d97706") : "#ef4444"
                            }}>
                              {hasRemedial || existingRem ? (isLulus ? "🟢 LULUS REMEDIAL" : "⚠️ BELUM TUNTAS") : "🔴 BELUM REMEDIAL"}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <input
                              type="text"
                              placeholder="Materi / Catatan"
                              value={remedialData[s.nisn]?.catatan || ""}
                              onChange={(e) => handleInputChange(s.nisn, "catatan", e.target.value)}
                              style={tableTextInputsStyle}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "pengayaan" && (
            <div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
                Program Pengayaan diperuntukkan bagi siswa yang telah mencapai KKM ({kkm}). Rekam aktivitas pendalaman materi dan tugas khusus di bawah ini.
              </p>
              {siswaPengayaan.length === 0 ? (
                <div style={emptyStateStyle}>
                  Belum ada siswa yang mencapai KKM ({kkm}) pada kolom ini.
                </div>
              ) : (
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>No</th>
                      <th style={thStyle}>Nama Siswa</th>
                      <th style={{ ...thStyle, textAlign: "center" }}>Nilai Murni</th>
                      <th style={thStyle}>Materi / Bentuk Pengayaan</th>
                      <th style={thStyle}>Catatan Guru</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siswaPengayaan.map((s, idx) => {
                      const awal = getOriginalGrade(s);

                      return (
                        <tr key={s.nisn} style={trStyle}>
                          <td style={tdStyle}>{idx + 1}</td>
                          <td style={tdStyle}>
                            <strong>{s.nama}</strong>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>NISN: {s.nisn}</div>
                          </td>
                          <td style={{ ...tdStyle, textAlign: "center", fontWeight: "700", color: "#10b981" }}>
                            {awal}
                          </td>
                          <td style={tdStyle}>
                            <input
                              type="text"
                              placeholder="Pendalaman Materi / Project Mandiri"
                              value={remedialData[s.nisn]?.catatan || ""}
                              onChange={(e) => handleInputChange(s.nisn, "catatan", e.target.value)}
                              style={tableTextInputsStyle}
                            />
                          </td>
                          <td style={tdStyle}>
                            <span style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              backgroundColor: "rgba(16, 185, 129, 0.15)",
                              color: "#10b981"
                            }}>
                              🟢 PENGAYAAN
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={footerStyle}>
          <button
            onClick={() => onOpenReport && onOpenReport(kolom, { remedialPolicy, maxCap, kkm })}
            style={btnSecondaryStyle}
          >
            🖨️ Cetak Berita Acara
          </button>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={onClose} style={btnCancelStyle}>
              Batal
            </button>
            <button onClick={handleSaveAll} style={btnPrimaryStyle}>
              💾 Terapkan & Simpan Nilai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline Styles using App Design System Tokens
const backdropStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  backdropFilter: "blur(4px)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px"
};

const containerStyle = {
  backgroundColor: "var(--bg-primary, #ffffff)",
  borderRadius: "16px",
  width: "100%",
  maxWidth: "920px",
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  border: "1px solid var(--border-color, #e2e8f0)",
  overflow: "hidden"
};

const headerStyle = {
  padding: "18px 24px",
  borderBottom: "1px solid var(--border-color, #e2e8f0)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const closeBtnStyle = {
  background: "none",
  border: "none",
  fontSize: "1.4rem",
  cursor: "pointer",
  color: "var(--text-secondary)"
};

const controlsBarStyle = {
  padding: "12px 24px",
  backgroundColor: "var(--bg-secondary, #f8fafc)",
  borderBottom: "1px solid var(--border-color, #e2e8f0)",
  display: "flex",
  gap: "20px",
  flexWrap: "wrap",
  alignItems: "center"
};

const controlItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px"
};

const labelStyle = {
  fontSize: "0.82rem",
  fontWeight: "600",
  color: "var(--text-primary)"
};

const selectStyle = {
  padding: "6px 10px",
  borderRadius: "8px",
  border: "1px solid var(--border-color, #cbd5e1)",
  backgroundColor: "var(--bg-primary, #fff)",
  color: "var(--text-primary)",
  fontSize: "0.85rem"
};

const inputNumberStyle = {
  width: "70px",
  padding: "6px 10px",
  borderRadius: "8px",
  border: "1px solid var(--border-color, #cbd5e1)",
  backgroundColor: "var(--bg-primary, #fff)",
  color: "var(--text-primary)",
  fontWeight: "700",
  textAlign: "center",
  fontSize: "0.85rem"
};

const tabContainerStyle = {
  display: "flex",
  borderBottom: "1px solid var(--border-color, #e2e8f0)",
  padding: "0 24px",
  backgroundColor: "var(--bg-primary)"
};

const tabButtonStyle = (active, color) => ({
  padding: "12px 18px",
  border: "none",
  background: "none",
  borderBottom: active ? `3px solid ${color}` : "3px solid transparent",
  color: active ? color : "var(--text-secondary)",
  fontWeight: active ? "700" : "500",
  fontSize: "0.9rem",
  cursor: "pointer",
  transition: "all 0.2s"
});

const emptyStateStyle = {
  textAlign: "center",
  padding: "40px 20px",
  color: "var(--text-secondary)",
  fontSize: "0.95rem"
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.85rem"
};

const thStyle = {
  padding: "10px 12px",
  textAlign: "left",
  borderBottom: "2px solid var(--border-color, #e2e8f0)",
  color: "var(--text-secondary)",
  fontWeight: "600"
};

const trStyle = {
  borderBottom: "1px solid var(--border-color, #f1f5f9)"
};

const tdStyle = {
  padding: "10px 12px",
  verticalAlign: "middle"
};

const tableInputStyle = {
  width: "80px",
  padding: "6px 8px",
  borderRadius: "6px",
  border: "1px solid var(--border-color, #cbd5e1)",
  textAlign: "center",
  fontWeight: "700",
  color: "var(--text-primary)"
};

const tableTextInputsStyle = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: "6px",
  border: "1px solid var(--border-color, #cbd5e1)",
  fontSize: "0.8rem",
  color: "var(--text-primary)"
};

const footerStyle = {
  padding: "16px 24px",
  borderTop: "1px solid var(--border-color, #e2e8f0)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "var(--bg-secondary, #f8fafc)"
};

const btnSecondaryStyle = {
  padding: "8px 14px",
  borderRadius: "8px",
  border: "1px solid var(--border-color, #cbd5e1)",
  backgroundColor: "var(--bg-primary, #ffffff)",
  color: "var(--text-primary)",
  fontSize: "0.85rem",
  fontWeight: "600",
  cursor: "pointer"
};

const btnCancelStyle = {
  padding: "8px 16px",
  borderRadius: "8px",
  border: "1px solid var(--border-color, #cbd5e1)",
  backgroundColor: "transparent",
  color: "var(--text-secondary)",
  fontSize: "0.85rem",
  fontWeight: "600",
  cursor: "pointer"
};

const btnPrimaryStyle = {
  padding: "8px 20px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "var(--primary, #3b82f6)",
  color: "#ffffff",
  fontSize: "0.85rem",
  fontWeight: "700",
  cursor: "pointer"
};
