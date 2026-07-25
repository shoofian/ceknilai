"use client";

export default function RemedialReportModal({
  isOpen,
  onClose,
  kelas = {},
  kolom = {},
  siswaList = [],
  config = {}
}) {
  if (!isOpen || !kolom) return null;

  const kkm = config.kkm || 75;
  const maxCap = config.maxCap || 100;
  const policyLabelMap = {
    max_kkm: `Maksimal Nilai KKM (${kkm})`,
    average: "Rata-rata Nilai Awal & Tes",
    max_value: "Nilai Tertinggi",
    actual: "Nilai Remedial Murni"
  };

  const keyRemedial = `${kolom.id}_remedial`;
  const keyBonus = `${kolom.id}_bonus`;

  const pesertasRemedial = siswaList
    .map((s) => {
      const remData = s.nilai?.[keyRemedial];
      return remData ? { ...s, remData } : null;
    })
    .filter(Boolean);

  const pesertasBonus = siswaList
    .map((s) => {
      const bonusData = s.nilai?.[keyBonus];
      return bonusData ? { ...s, bonusData } : null;
    })
    .filter(Boolean);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop no-print-bg" onClick={onClose} style={backdropStyle}>
      <div
        className="modal-content print-content"
        onClick={(e) => e.stopPropagation()}
        style={containerStyle}
      >
        {/* Printable Document Header */}
        <div style={docHeaderStyle}>
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <h2 style={{ margin: "0 0 4px 0", fontSize: "1.3rem", fontWeight: "800", textTransform: "uppercase" }}>
              BERITA ACARA & REKAPITULASI PELAKSANAAN REMEDIAL & PENGAYAAN
            </h2>
            <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: "600", color: "#475569" }}>
              SEKOLAH / SATUAN PENDIDIKAN TAHUN AJARAN {kelas.tahunAjaran || "2025/2026"}
            </h4>
          </div>

          {/* Info Meta Grid */}
          <div style={metaGridStyle}>
            <div><strong>Mata Pelajaran:</strong> {kelas.mataPelajaran || "Umum"}</div>
            <div><strong>Kelas / Rombel:</strong> {kelas.nama}</div>
            <div><strong>Asesmen / Kolom:</strong> {kolom.nama}</div>
            <div><strong>KKM / KKTP:</strong> {kkm}</div>
            <div><strong>Metode Remedial:</strong> {policyLabelMap[config.remedialPolicy] || "Maksimal KKM"}</div>
            <div><strong>Batas Maksimal (MaxCap):</strong> {maxCap}</div>
          </div>
        </div>

        {/* Scrollable Printable Body */}
        <div style={{ padding: "0 24px 20px 24px", flex: 1, overflowY: "auto" }}>
          {/* Table 1: Peserta Remedial */}
          <h3 style={sectionTitleStyle}>1. Daftar Peserta & Hasil Pelaksanaan Remedial</h3>
          {pesertasRemedial.length === 0 ? (
            <p style={{ fontSize: "0.85rem", fontStyle: "italic", color: "#64748b" }}>
              Tidak ada catatan pelaksanaan tes remedial pada kolom ini.
            </p>
          ) : (
            <table style={reportTableStyle}>
              <thead>
                <tr>
                  <th style={reportThStyle}>No</th>
                  <th style={reportThStyle}>NISN</th>
                  <th style={reportThStyle}>Nama Siswa</th>
                  <th style={reportThStyle}>Nilai Awal</th>
                  <th style={reportThStyle}>Nilai Tes</th>
                  <th style={reportThStyle}>Nilai Akhir</th>
                  <th style={reportThStyle}>Status</th>
                  <th style={reportThStyle}>Tanggal & Catatan</th>
                </tr>
              </thead>
              <tbody>
                {pesertasRemedial.map((s, i) => (
                  <tr key={s.nisn}>
                    <td style={reportTdStyle}>{i + 1}</td>
                    <td style={reportTdStyle}>{s.nisn}</td>
                    <td style={reportTdStyle}><strong>{s.nama}</strong></td>
                    <td style={{ ...reportTdStyle, textAlign: "center", color: "#dc2626" }}>{s.remData.nilaiAwal}</td>
                    <td style={{ ...reportTdStyle, textAlign: "center" }}>{s.remData.nilaiTes}</td>
                    <td style={{ ...reportTdStyle, textAlign: "center", fontWeight: "700" }}>{s.remData.nilaiAkhir}</td>
                    <td style={reportTdStyle}>
                      <strong style={{ color: s.remData.status === "LULUS" ? "#16a34a" : "#dc2626" }}>
                        {s.remData.status}
                      </strong>
                    </td>
                    <td style={reportTdStyle}>{s.remData.tanggal} - {s.remData.catatan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Table 2: Peserta Pengayaan & Bonus */}
          <h3 style={{ ...sectionTitleStyle, marginTop: "24px" }}>2. Daftar Peserta Program Pengayaan & Bonus Keaktifan</h3>
          {pesertasBonus.length === 0 ? (
            <p style={{ fontSize: "0.85rem", fontStyle: "italic", color: "#64748b" }}>
              Tidak ada catatan pemberian bonus/pengayaan pada kolom ini.
            </p>
          ) : (
            <table style={reportTableStyle}>
              <thead>
                <tr>
                  <th style={reportThStyle}>No</th>
                  <th style={reportThStyle}>NISN</th>
                  <th style={reportThStyle}>Nama Siswa</th>
                  <th style={reportThStyle}>Nilai Awal</th>
                  <th style={reportThStyle}>Poin Bonus</th>
                  <th style={reportThStyle}>Nilai Akhir (Capped)</th>
                  <th style={reportThStyle}>Apresiasi / Catatan</th>
                </tr>
              </thead>
              <tbody>
                {pesertasBonus.map((s, i) => (
                  <tr key={s.nisn}>
                    <td style={reportTdStyle}>{i + 1}</td>
                    <td style={reportTdStyle}>{s.nisn}</td>
                    <td style={reportTdStyle}><strong>{s.nama}</strong></td>
                    <td style={{ ...reportTdStyle, textAlign: "center" }}>{s.bonusData.nilaiAwal}</td>
                    <td style={{ ...reportTdStyle, textAlign: "center", color: "#16a34a", fontWeight: "700" }}>+{s.bonusData.poin}</td>
                    <td style={{ ...reportTdStyle, textAlign: "center", fontWeight: "700" }}>{s.bonusData.nilaiAkhir}</td>
                    <td style={reportTdStyle}>{s.bonusData.catatan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Tanda Tangan Section */}
          <div style={signatureContainerStyle}>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: "0 0 60px 0", fontSize: "0.85rem" }}>Mengetahui,<br />Wali Kelas / Kepala Sekolah</p>
              <p style={{ margin: 0, fontWeight: "700", textDecoration: "underline" }}>( .................................... )</p>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>NIP. ............................</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: "0 0 60px 0", fontSize: "0.85rem" }}>Guru Mata Pelajaran</p>
              <p style={{ margin: 0, fontWeight: "700", textDecoration: "underline" }}>( .................................... )</p>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>NIP. ............................</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="no-print" style={footerActionStyle}>
          <button onClick={onClose} style={btnCancelStyle}>Tutup</button>
          <button onClick={handlePrint} style={btnPrintStyle}>🖨️ Cetak Berita Acara (Print/PDF)</button>
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
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  zIndex: 10000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px"
};

const containerStyle = {
  backgroundColor: "#ffffff",
  color: "#0f172a",
  borderRadius: "12px",
  width: "100%",
  maxWidth: "850px",
  maxHeight: "92vh",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
};

const docHeaderStyle = {
  padding: "24px 24px 12px 24px"
};

const metaGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px 16px",
  padding: "12px 16px",
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  fontSize: "0.85rem",
  border: "1px solid #e2e8f0"
};

const sectionTitleStyle = {
  fontSize: "0.95rem",
  fontWeight: "700",
  margin: "18px 0 8px 0",
  color: "#1e293b",
  borderBottom: "1px solid #cbd5e1",
  paddingBottom: "4px"
};

const reportTableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.8rem",
  border: "1px solid #cbd5e1"
};

const reportThStyle = {
  backgroundColor: "#f1f5f9",
  padding: "6px 10px",
  border: "1px solid #cbd5e1",
  textAlign: "left",
  fontWeight: "700"
};

const reportTdStyle = {
  padding: "6px 10px",
  border: "1px solid #e2e8f0"
};

const signatureContainerStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "40px",
  padding: "0 40px"
};

const footerActionStyle = {
  padding: "14px 24px",
  borderTop: "1px solid #e2e8f0",
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
  backgroundColor: "#f8fafc"
};

const btnCancelStyle = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  backgroundColor: "#ffffff",
  fontSize: "0.85rem",
  cursor: "pointer"
};

const btnPrintStyle = {
  padding: "8px 18px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: "#0284c7",
  color: "#ffffff",
  fontSize: "0.85rem",
  fontWeight: "700",
  cursor: "pointer"
};
