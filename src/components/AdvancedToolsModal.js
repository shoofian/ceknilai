"use client";

import { useState, useEffect } from "react";

export default function AdvancedToolsModal({
  isOpen,
  onClose,
  kelas = {},
  isLocked = false,
  onOpenNormModal,
  onOpenRemedialModal,
  onToggleBonusStars,
  onUpdateSkema
}) {
  const [maxCapInput, setMaxCapInput] = useState(kelas.skemaPenilaian?.maxCap ?? 100);

  useEffect(() => {
    if (kelas && kelas.skemaPenilaian) {
      setMaxCapInput(kelas.skemaPenilaian.maxCap ?? 100);
    }
  }, [kelas, isOpen]);

  if (!isOpen) return null;

  const isBonusActive = !!kelas.skemaPenilaian?.enableBonusStars;
  const currentMaxCap = kelas.skemaPenilaian?.maxCap ?? 100;
  const currentKKM = kelas.skemaPenilaian?.kkm || 75;

  const handleSaveMaxCap = () => {
    const val = Number(maxCapInput);
    if (!isNaN(val) && val >= 50 && val <= 100) {
      onUpdateSkema({ maxCap: val });
    }
  };

  return (
    <div className="modal-backdrop no-print" onClick={onClose} style={backdropStyle}>
      <div
        className="modal-content animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={containerStyle}
      >
        {/* Modal Header */}
        <div style={headerStyle}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.4rem" }}>🧪</span>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "800", color: "var(--text-primary)" }}>
                Fitur & Pengaturan Lanjutan
              </h3>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              Kelola alat perhitungan khusus, program remedial, bonus keaktifan, dan aturan nilai maksimal (MaxCap).
            </p>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Modal Body Grid */}
        <div style={bodyStyle}>
          <div style={gridStyle}>
            
            {/* Card 1: Normalisasi Nilai */}
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <span style={{ fontSize: "1.6rem" }}>📐</span>
                <div style={{ flex: 1 }}>
                  <h4 style={cardTitleStyle}>Normalisasi Nilai Akhir</h4>
                  <p style={cardDescStyle}>
                    Sesuaikan rentang/skala nilai kelas secara otomatis menggunakan metode Linear, Min-Max, atau Scale to Max.
                  </p>
                </div>
              </div>
              <div style={{ marginTop: "auto", paddingTop: "12px" }}>
                <button
                  onClick={() => {
                    onClose();
                    onOpenNormModal();
                  }}
                  className="btn btn-primary"
                  style={btnCardStyle}
                  disabled={isLocked || kelas?.archived}
                >
                  ⚙️ Buka Tools Normalisasi
                </button>
              </div>
            </div>

            {/* Card 2: Program Remedial & Pengayaan */}
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <span style={{ fontSize: "1.6rem" }}>🔴</span>
                <div style={{ flex: 1 }}>
                  <h4 style={cardTitleStyle}>Program Remedial & Pengayaan</h4>
                  <p style={cardDescStyle}>
                    Kelola siswa di bawah KKM ({currentKKM}), input tes remedial bertahap, dan cetak Berita Acara resmi.
                  </p>
                </div>
              </div>
              <div style={{ marginTop: "auto", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <select
                  className="form-select"
                  style={selectStyle}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    if (selectedId) {
                      const col = kelas.kolomNilai.find(c => c.id === selectedId);
                      if (col) {
                        onClose();
                        onOpenRemedialModal(col);
                      }
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>-- Pilih Kolom Asesmen --</option>
                  {(kelas?.kolomNilai || []).map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.nama} ({col.bobot}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Card 3: Fitur Poin Bonus Keaktifan (⭐) */}
            <div style={{ ...cardStyle, border: isBonusActive ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <span style={{ fontSize: "1.6rem" }}>⭐</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <h4 style={cardTitleStyle}>Fitur Poin Bonus Keaktifan</h4>
                    <span style={{
                      fontSize: "0.68rem",
                      fontWeight: "700",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      backgroundColor: isBonusActive ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.15)",
                      color: isBonusActive ? "#10b981" : "var(--text-muted)"
                    }}>
                      {isBonusActive ? "🟢 Aktif" : "⚪ Non-Aktif (Default)"}
                    </span>
                  </div>
                  <p style={cardDescStyle}>
                    Fitur Bonus Keaktifan (⭐) memberikan poin apresiasi langsung untuk siswa yang aktif di kelas. <strong>Setiap 1 Bintang (⭐) bernilai +1 Poin</strong> pada nilai akhir (dibatasi MaxCap: {currentMaxCap}).
                  </p>
                </div>
              </div>
              <div style={{ marginTop: "auto", paddingTop: "12px" }}>
                <button
                  onClick={onToggleBonusStars}
                  type="button"
                  className={`btn ${isBonusActive ? "btn-secondary" : "btn-primary"}`}
                  style={{
                    ...btnCardStyle,
                    borderColor: isBonusActive ? "var(--border-color)" : "transparent",
                    color: isBonusActive ? "var(--text-primary)" : "#ffffff"
                  }}
                  disabled={isLocked || kelas?.archived}
                >
                  {isBonusActive ? "⚪ Non-Aktifkan Fitur Bonus" : "🟢 Aktifkan Fitur Bonus (Tampilkan Kolom)"}
                </button>
              </div>
            </div>

            {/* Card 4: Batas Nilai Maksimal (MaxCap Rule) */}
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <span style={{ fontSize: "1.6rem" }}>🔒</span>
                <div style={{ flex: 1 }}>
                  <h4 style={cardTitleStyle}>Batas Nilai Maksimal (MaxCap)</h4>
                  <p style={cardDescStyle}>
                    Atur batas nilai tertinggi yang diperbolehkan di kelas ini (misal: 90, 95, atau 100). Normalisasi & Bonus otomatis menyesuaikan MaxCap ini.
                  </p>
                </div>
              </div>
              <div style={{ marginTop: "auto", paddingTop: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={maxCapInput}
                  onChange={(e) => setMaxCapInput(e.target.value)}
                  style={{ width: "80px", padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", fontWeight: "700", textAlign: "center", fontSize: "0.85rem" }}
                />
                <button
                  onClick={handleSaveMaxCap}
                  className="btn btn-secondary"
                  style={{ fontSize: "0.8rem", padding: "6px 12px", borderRadius: "6px", fontWeight: "700" }}
                  disabled={isLocked || kelas?.archived || Number(maxCapInput) === currentMaxCap}
                >
                  Simpan MaxCap ({currentMaxCap})
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div style={footerStyle}>
          <button onClick={onClose} style={btnSecondaryStyle}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

const backdropStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.65)",
  backdropFilter: "blur(6px)",
  zIndex: 10000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
  overflowY: "auto"
};

const containerStyle = {
  backgroundColor: "var(--bg-primary, #ffffff)",
  borderRadius: "16px",
  width: "95%",
  maxWidth: "820px",
  maxHeight: "85vh",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
  border: "1px solid var(--border-color, #e2e8f0)",
  overflow: "hidden",
  position: "relative"
};

const headerStyle = {
  padding: "18px 24px",
  borderBottom: "1px solid var(--border-color, #e2e8f0)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "var(--bg-secondary, #f8fafc)",
  flexShrink: 0
};

const closeBtnStyle = {
  background: "none",
  border: "none",
  fontSize: "1.4rem",
  cursor: "pointer",
  color: "var(--text-secondary)"
};

const bodyStyle = {
  flex: 1,
  overflowY: "auto",
  padding: "20px 24px"
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "16px"
};

const cardStyle = {
  padding: "18px",
  borderRadius: "12px",
  backgroundColor: "var(--bg-secondary, #f8fafc)",
  border: "1px solid var(--border-color, #e2e8f0)",
  display: "flex",
  flexDirection: "column",
  gap: "10px"
};

const cardTitleStyle = {
  fontSize: "0.95rem",
  fontWeight: "800",
  margin: 0,
  color: "var(--text-primary)"
};

const cardDescStyle = {
  fontSize: "0.78rem",
  color: "var(--text-muted)",
  margin: "4px 0 0 0",
  lineHeight: "1.45"
};

const btnCardStyle = {
  fontSize: "0.8rem",
  padding: "8px 14px",
  fontWeight: "700",
  width: "100%",
  justifyContent: "center",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  borderRadius: "8px"
};

const selectStyle = {
  fontSize: "0.8rem",
  padding: "8px 10px",
  borderRadius: "8px",
  backgroundColor: "var(--bg-primary)",
  color: "var(--text-primary)",
  border: "1px solid var(--border-color)",
  width: "100%"
};

const footerStyle = {
  padding: "14px 24px",
  borderTop: "1px solid var(--border-color, #e2e8f0)",
  display: "flex",
  justifyContent: "flex-end",
  backgroundColor: "var(--bg-secondary, #f8fafc)",
  flexShrink: 0
};

const btnSecondaryStyle = {
  padding: "8px 20px",
  borderRadius: "8px",
  border: "1px solid var(--border-color, #cbd5e1)",
  backgroundColor: "var(--bg-primary, #ffffff)",
  color: "var(--text-primary)",
  fontSize: "0.85rem",
  fontWeight: "600",
  cursor: "pointer"
};
