"use client";

export default function CetakEksporModal({
  isOpen,
  onClose,
  activeTab,
  onChangeTab,
  onOpenPreview,
  onOpenQrCard,
  onOpenRapor,
  onExportExcel,
  disableRapor
}) {
  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "16px" }}>
      <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "520px", display: "flex", flexDirection: "column", padding: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.3rem" }}>🖨️</span>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "800", color: "var(--primary)", margin: 0 }}>Cetak & Ekspor</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-secondary)", padding: "4px", margin: "16px 24px 0 24px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
          {[
            { id: "laporan", label: "🖨️ Laporan" },
            { id: "kartu", label: "📇 Kartu QR" },
            { id: "erapor", label: "📋 E-Rapor" },
            { id: "excel", label: "📥 Excel" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              style={{
                flex: 1, padding: "8px", fontSize: "0.8rem", fontWeight: "700", borderRadius: "6px", border: "none", cursor: "pointer", transition: "all 0.15s",
                backgroundColor: activeTab === tab.id ? "var(--primary)" : "transparent",
                color: activeTab === tab.id ? "#fff" : "var(--text-secondary)"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px", minHeight: "180px", justifyContent: "space-between" }}>
          {activeTab === "laporan" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                Cetak lembar nilai siswa secara fisik atau simpan sebagai dokumen PDF dengan layout rapi dan profesional.
              </p>
              <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                <button
                  onClick={() => {
                    onClose();
                    onOpenPreview();
                  }}
                  className="btn btn-primary"
                  style={{ padding: "10px 24px", fontSize: "0.85rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  🖨️ Cetak Lembar Laporan
                </button>
              </div>
            </div>
          )}

          {activeTab === "kartu" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                Buat dan cetak kartu presensi siswa yang berisi nama, NISN, dan QR Code unik untuk sistem pemindaian.
              </p>
              <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                <button
                  onClick={() => {
                    onClose();
                    onOpenQrCard();
                  }}
                  className="btn btn-primary"
                  style={{ padding: "10px 24px", fontSize: "0.85rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  📇 Cetak Kartu Presensi & QR
                </button>
              </div>
            </div>
          )}

          {activeTab === "erapor" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                Format dan ekspor nilai kelas langsung ke format data e-Rapor resmi (Kemendikbud).
              </p>
              <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                <button
                  onClick={() => {
                    onClose();
                    onOpenRapor();
                  }}
                  className="btn btn-primary"
                  style={{ padding: "10px 24px", fontSize: "0.85rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}
                  disabled={disableRapor}
                >
                  📋 Integrasi ke E-Rapor
                </button>
              </div>
            </div>
          )}

          {activeTab === "excel" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                Unduh seluruh data siswa beserta nilainya ke dalam format spreadsheet Excel (.xlsx).
              </p>
              <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                <button
                  onClick={() => {
                    onClose();
                    onExportExcel();
                  }}
                  className="btn btn-primary"
                  style={{ padding: "10px 24px", fontSize: "0.85rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  📥 Ekspor Data ke Excel
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: "14px", marginTop: "12px" }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ padding: "6px 16px", fontSize: "0.82rem" }}>Tutup</button>
          </div>
        </div>
      </div>
    </div>
  );
}
