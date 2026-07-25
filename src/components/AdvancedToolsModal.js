"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

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
  const [mounted, setMounted] = useState(false);
  const [maxCapInput, setMaxCapInput] = useState(kelas.skemaPenilaian?.maxCap ?? 100);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (kelas && kelas.skemaPenilaian) {
      setMaxCapInput(kelas.skemaPenilaian.maxCap ?? 100);
    }
  }, [kelas, isOpen]);

  if (!isOpen || !mounted) return null;

  const isBonusActive = !!kelas.skemaPenilaian?.enableBonusStars;
  const currentMaxCap = kelas.skemaPenilaian?.maxCap ?? 100;
  const currentKKM = kelas.skemaPenilaian?.kkm || 75;

  const handleSaveMaxCap = (valToSave) => {
    const val = Number(valToSave !== undefined ? valToSave : maxCapInput);
    if (!isNaN(val) && val >= 50 && val <= 100) {
      setMaxCapInput(val);
      onUpdateSkema({ maxCap: val });
    }
  };

  const modalContent = (
    <div className="no-print" onClick={onClose} style={backdropStyle}>
      <div
        className="glass-card animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={containerStyle}
      >
        {/* Modal Header */}
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              backgroundColor: "rgba(124, 58, 237, 0.14)",
              color: "#7c3aed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
              fontWeight: "800",
              boxShadow: "0 2px 8px rgba(124, 58, 237, 0.2)"
            }}>
              🧪
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "800", color: "var(--text-primary)" }}>
                Fitur & Pengaturan Lanjutan
              </h3>
              <p style={{ margin: "3px 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Pengaturan khusus kelas: Normalisasi, Remedial, Poin Bonus, & Batas Nilai (MaxCap)
              </p>
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle} title="Tutup Modal">✕</button>
        </div>

        {/* Modal Body */}
        <div style={bodyStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* SECTION 1: REMEDIAL & PENGAYAAN */}
            <div style={{ ...sectionCardStyle, borderLeft: "5px solid #ef4444" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1.2rem" }}>🔴</span>
                  <h4 style={sectionTitleStyle}>1. Program Remedial & Pengayaan</h4>
                </div>
                <span style={badgeStyle}>Berdasarkan KKM: {currentKKM}</span>
              </div>
              <p style={cardDescStyle}>
                Kelola siswa di bawah KKM ({currentKKM}) untuk tes remedial bertahap serta cetak Berita Acara resmi. Nilai murni awal siswa tetap tersimpan aman.
              </p>
              <div style={{ marginTop: "12px", display: "flex", gap: "10px", alignItems: "center" }}>
                <select
                  className="form-select"
                  style={{ ...selectStyle, flex: 1 }}
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
                  <option value="" disabled>-- Pilih Kolom Asesmen yang Ingin Diremedial --</option>
                  {(kelas?.kolomNilai || []).map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.nama} (Bobot: {col.bobot}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SECTION 2: POIN BONUS KEAKTIFAN */}
            <div style={{
              ...sectionCardStyle,
              borderLeft: isBonusActive ? "5px solid #10b981" : "5px solid #f59e0b",
              backgroundColor: isBonusActive ? "rgba(16, 185, 129, 0.04)" : "var(--bg-primary)"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1.2rem" }}>⭐</span>
                  <h4 style={sectionTitleStyle}>2. Fitur Poin Bonus Keaktifan</h4>
                </div>
                <span style={{
                  fontSize: "0.7rem",
                  fontWeight: "800",
                  padding: "3px 10px",
                  borderRadius: "12px",
                  backgroundColor: isBonusActive ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.15)",
                  color: isBonusActive ? "#059669" : "var(--text-muted)"
                }}>
                  {isBonusActive ? "🟢 FITUR AKTIF" : "⚪ NON-AKTIF (DEFAULT)"}
                </span>
              </div>
              <p style={cardDescStyle}>
                Fitur opsional untuk memberikan poin apresiasi langsung kepada siswa yang aktif di kelas. <strong>1 Bintang (⭐) = +1 Poin Nilai</strong>.
              </p>
              
              <div style={infoBoxStyle}>
                💡 <strong>Perbedaan Penting:</strong> Fitur ini digunakan untuk <em>apresiasi keaktifan harian</em>. Jika Anda ingin mendongkrak/menyesuaikan Nilai Akhir Rapor secara administratif di akhir semester, gunakan fitur <strong>Katrol Rahasia (🔒)</strong> pada kolom <strong>N. AKHIR</strong>.
              </div>

              <div style={{ marginTop: "12px" }}>
                <button
                  onClick={onToggleBonusStars}
                  type="button"
                  className={`btn ${isBonusActive ? "btn-secondary" : "btn-primary"}`}
                  style={{
                    fontSize: "0.82rem",
                    padding: "8px 16px",
                    fontWeight: "700",
                    width: "100%",
                    justifyContent: "center",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    borderRadius: "8px",
                    borderColor: isBonusActive ? "var(--border-color)" : "transparent",
                    color: isBonusActive ? "var(--text-primary)" : "#ffffff"
                  }}
                  disabled={isLocked || kelas?.archived}
                >
                  {isBonusActive ? "⚪ Non-Aktifkan Fitur Bonus (Sembunyikan Kolom ⭐)" : "🟢 Aktifkan Fitur Bonus (Tampilkan Kolom ⭐)"}
                </button>
              </div>
            </div>

            {/* SECTION 3: NORMALISASI NILAI & MAXCAP (GRID 2 KOLOM) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: "16px" }}>
              
              {/* Card 3A: Normalisasi Nilai */}
              <div style={{ ...sectionCardStyle, borderLeft: "5px solid #8b5cf6" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "1.2rem" }}>📐</span>
                  <h4 style={sectionTitleStyle}>3. Normalisasi Nilai Akhir</h4>
                </div>
                <p style={cardDescStyle}>
                  Sesuaikan skala nilai kelas secara otomatis (Metode Linear, Min-Max 60–100, atau Scale to Max).
                </p>
                <div style={{ marginTop: "auto", paddingTop: "12px" }}>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenNormModal();
                    }}
                    className="btn btn-primary"
                    style={{ fontSize: "0.8rem", padding: "8px 14px", fontWeight: "700", width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: "6px", borderRadius: "8px" }}
                    disabled={isLocked || kelas?.archived}
                  >
                    ⚙️ Buka Tools Normalisasi
                  </button>
                </div>
              </div>

              {/* Card 3B: Batas MaxCap */}
              <div style={{ ...sectionCardStyle, borderLeft: "5px solid #3b82f6" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "1.2rem" }}>🔒</span>
                  <h4 style={sectionTitleStyle}>4. Batas Nilai Maksimal (MaxCap)</h4>
                </div>
                <p style={cardDescStyle}>
                  Nilai tertinggi yang diperbolehkan di kelas ini. Berlaku otomatis untuk Normalisasi & Bonus.
                </p>

                {/* Preset Pills */}
                <div style={{ display: "flex", gap: "6px", marginTop: "10px", alignItems: "center" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600" }}>Pilihan:</span>
                  {[100, 95, 90, 85].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSaveMaxCap(preset)}
                      style={{
                        padding: "4px 9px",
                        fontSize: "0.75rem",
                        borderRadius: "6px",
                        fontWeight: "700",
                        border: currentMaxCap === preset ? "1px solid var(--primary)" : "1px solid var(--border-color)",
                        backgroundColor: currentMaxCap === preset ? "var(--primary)" : "var(--bg-secondary)",
                        color: currentMaxCap === preset ? "#fff" : "var(--text-primary)",
                        cursor: "pointer",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: "auto", paddingTop: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={maxCapInput}
                    onChange={(e) => setMaxCapInput(e.target.value)}
                    style={{ width: "70px", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--border-color)", fontWeight: "700", textAlign: "center", fontSize: "0.85rem", backgroundColor: "var(--bg-secondary)" }}
                  />
                  <button
                    onClick={() => handleSaveMaxCap()}
                    className="btn btn-secondary"
                    style={{ fontSize: "0.78rem", padding: "6px 12px", borderRadius: "6px", fontWeight: "700", flex: 1 }}
                    disabled={isLocked || kelas?.archived || Number(maxCapInput) === currentMaxCap}
                  >
                    Simpan Custom MaxCap ({currentMaxCap})
                  </button>
                </div>
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

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}

const backdropStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.65)",
  backdropFilter: "blur(6px)",
  zIndex: 100000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px"
};

const containerStyle = {
  width: "100%",
  maxWidth: "760px",
  maxHeight: "88vh",
  display: "flex",
  flexDirection: "column",
  padding: 0,
  overflow: "hidden",
  borderRadius: "16px",
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
  backgroundColor: "var(--bg-primary, #ffffff)",
  border: "1px solid var(--border-color, #cbd5e1)"
};

const headerStyle = {
  padding: "16px 24px",
  borderBottom: "1px solid var(--border-color, #e2e8f0)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)",
  flexShrink: 0
};

const closeBtnStyle = {
  background: "none",
  border: "none",
  fontSize: "1.3rem",
  cursor: "pointer",
  color: "var(--text-secondary)",
  padding: "4px 8px",
  borderRadius: "6px"
};

const bodyStyle = {
  flex: 1,
  overflowY: "auto",
  padding: "20px 24px",
  backgroundColor: "var(--bg-secondary, #f8fafc)"
};

const sectionCardStyle = {
  padding: "18px 20px",
  borderRadius: "14px",
  backgroundColor: "var(--bg-primary, #ffffff)",
  border: "1px solid var(--border-color, #cbd5e1)",
  boxShadow: "0 4px 14px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.03)",
  display: "flex",
  flexDirection: "column"
};

const sectionTitleStyle = {
  fontSize: "0.95rem",
  fontWeight: "800",
  margin: 0,
  color: "var(--text-primary)"
};

const cardDescStyle = {
  fontSize: "0.78rem",
  color: "var(--text-muted)",
  margin: "2px 0 0 0",
  lineHeight: "1.45"
};

const badgeStyle = {
  fontSize: "0.7rem",
  fontWeight: "800",
  padding: "3px 10px",
  borderRadius: "12px",
  backgroundColor: "rgba(239, 68, 68, 0.12)",
  color: "#dc2626"
};

const infoBoxStyle = {
  backgroundColor: "rgba(59, 130, 246, 0.08)",
  border: "1px solid rgba(59, 130, 246, 0.2)",
  borderRadius: "10px",
  padding: "9px 13px",
  marginTop: "10px",
  fontSize: "0.74rem",
  color: "var(--text-secondary)",
  lineHeight: "1.45"
};

const selectStyle = {
  fontSize: "0.8rem",
  padding: "8px 12px",
  borderRadius: "8px",
  backgroundColor: "var(--bg-secondary, #f8fafc)",
  color: "var(--text-primary)",
  border: "1px solid var(--border-color, #cbd5e1)",
  width: "100%"
};

const footerStyle = {
  padding: "14px 24px",
  borderTop: "1px solid var(--border-color, #e2e8f0)",
  display: "flex",
  justifyContent: "flex-end",
  backgroundColor: "var(--bg-primary, #ffffff)",
  flexShrink: 0
};

const btnSecondaryStyle = {
  padding: "8px 22px",
  borderRadius: "8px",
  border: "1px solid var(--border-color, #cbd5e1)",
  backgroundColor: "var(--bg-secondary, #f8fafc)",
  color: "var(--text-primary)",
  fontSize: "0.85rem",
  fontWeight: "600",
  cursor: "pointer"
};
