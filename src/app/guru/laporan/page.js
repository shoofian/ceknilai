"use client";

import { useState, useEffect } from "react";

export default function CetakLaporan() {
  const [loading, setLoading] = useState(true);
  const [kelas, setKelas] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    const fetchAllKelas = async () => {
      try {
        const response = await fetch("/api/kelas?archived=all");
        if (response.ok) {
          const data = await response.json();
          setKelas(data);
          if (data.length > 0) {
            setSelectedClassId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Gagal memuat daftar kelas", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllKelas();
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setSelectedClass(null);
      return;
    }

    const fetchClassDetail = async () => {
      try {
        const response = await fetch(`/api/kelas/${selectedClassId}`);
        if (response.ok) {
          const data = await response.json();
          setSelectedClass(data);
        }
      } catch (err) {
        console.error("Gagal memuat detail kelas untuk laporan", err);
      }
    };
    fetchClassDetail();
  }, [selectedClassId]);

  // === CALCULATE DETAILED REPORT STATISTICS ===
  let stats = {
    average: 0,
    highest: 0,
    lowest: 0,
    passRate: 0, // KKM >= 75
    totalStudents: 0
  };

  const studentReports = [];

  if (selectedClass) {
    stats.totalStudents = selectedClass.siswa.length;
    let totalScoreSum = 0;
    let passCount = 0;
    let scoresList = [];

    selectedClass.siswa.forEach(siswa => {
      // Hitung nilai akhir terbobot secara proporsional
      let totalBobotTerisi = 0;
      let totalNilaiTerisi = 0;
      
      selectedClass.kolomNilai.forEach(col => {
        const score = siswa.nilai[col.id];
        if (score !== undefined && score !== null && score !== "") {
          totalNilaiTerisi += Number(score) * (col.bobot / 100);
          totalBobotTerisi += col.bobot;
        }
      });

      const finalScore = totalBobotTerisi > 0 
        ? (totalNilaiTerisi / (totalBobotTerisi / 100)) 
        : 0;

      const finalScoreRounded = Number(finalScore.toFixed(2));
      scoresList.push(finalScoreRounded);
      totalScoreSum += finalScoreRounded;

      // Predikat
      let predikat = "E";
      if (finalScoreRounded >= 85) predikat = "A";
      else if (finalScoreRounded >= 75) predikat = "B";
      else if (finalScoreRounded >= 65) predikat = "C";
      else if (finalScoreRounded >= 50) predikat = "D";

      // Status Kelulusan (KKM >= 75)
      const statusKelulusan = finalScoreRounded >= 75 ? "LULUS" : "TIDAK LULUS";
      if (finalScoreRounded >= 75) passCount++;

      studentReports.push({
        nisn: siswa.nisn,
        nama: siswa.nama,
        tanggalLahir: siswa.tanggalLahir,
        nilai: siswa.nilai,
        nilaiAkhir: finalScoreRounded,
        predikat,
        statusKelulusan
      });
    });

    if (stats.totalStudents > 0) {
      stats.average = Number((totalScoreSum / stats.totalStudents).toFixed(2));
      stats.highest = Math.max(...scoresList);
      stats.lowest = Math.min(...scoresList);
      stats.passRate = Number(((passCount / stats.totalStudents) * 100).toFixed(0));
    }
  }

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="spinner" style={{ width: "30px", height: "30px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      
      {/* Page Title & Class Selector - Hidden in print */}
      <div className="page-title-section no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Cetak Laporan Nilai</h1>
          <p className="page-subtitle">Pilih kelas untuk melihat analisis hasil belajar dan cetak laporan resmi kelas.</p>
        </div>
        
        {/* Class Selection Dropdown */}
        {kelas.length > 0 && (
          <div className="form-group" style={{ marginBottom: 0, flexDirection: "row", alignItems: "center", gap: "10px" }}>
            <label className="form-label" style={{ whiteSpace: "nowrap" }}>Pilih Kelas:</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="form-input"
              style={{ width: "220px", padding: "10px 16px" }}
            >
              {kelas.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama} - {k.mataPelajaran || "Informatika"} ({k.tahunAjaran}) {k.archived ? "[Arsip]" : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {kelas.length === 0 ? (
        <div className="glass-card no-print" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
          Belum ada data kelas yang dapat dibuatkan laporannya.
        </div>
      ) : selectedClass && (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          
          {/* Action Print Button - Hidden in print */}
          <div style={{ display: "flex", justifyContent: "flex-end" }} className="no-print">
            <button onClick={handlePrint} className="btn btn-primary" style={{ padding: "12px 28px" }}>
              🖨️ Cetak / Simpan PDF
            </button>
          </div>

          {/* Premium Printable Gradebook Report Layout */}
          <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "24px", border: "1px solid var(--border-color)", padding: "40px" }} id="printable-area">
            
            {/* OFFICIAL REPORT KOP / HEADER */}
            <div style={{ textAlign: "center", borderBottom: "4px double var(--text-primary)", paddingBottom: "20px", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "1.8rem", textTransform: "uppercase", fontWeight: "800", letterSpacing: "0.02em" }}>
                Laporan Hasil Belajar Siswa
              </h2>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--text-secondary)", marginTop: "4px" }}>
                Sekolah Menengah Atas Digital CekNilai
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Alamat: Jl. Edukasi Pintar No. 45, Jakarta Selatan &bull; Telp: (021) 7890123
              </p>
            </div>

            {/* REPORT METADATA GRID */}
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", fontSize: "0.95rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <p>Kelas: <strong>{selectedClass.nama}</strong></p>
                <p>Mata Pelajaran: <strong>{selectedClass.mataPelajaran || "Informatika"}</strong></p>
                <p>Tahun Ajaran: <strong>{selectedClass.tahunAjaran}</strong></p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", textAlign: "right" }} className="align-left-mobile">
                <p>Total Siswa: <strong>{stats.totalStudents} orang</strong></p>
                <p>Tanggal Cetak: <strong>{new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p>
                <p>Status: <span className="badge badge-primary" style={{ fontSize: "0.7rem", padding: "2px 8px" }}>{selectedClass.archived ? "Arsip" : "Aktif"}</span></p>
              </div>
            </div>

            {/* CLASS STATISTICS ANALYTICS SUMMARY */}
            <div className="grid-cols-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginTop: "10px" }}>
              <div style={{ padding: "16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", textAlign: "center", backgroundColor: "var(--bg-tertiary)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "700" }}>RATA-RATA KELAS</span>
                <h4 style={{ fontSize: "1.75rem", color: "var(--primary)", marginTop: "4px" }}>{stats.average}</h4>
              </div>
              <div style={{ padding: "16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", textAlign: "center", backgroundColor: "var(--bg-tertiary)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "700" }}>NILAI TERTINGGI</span>
                <h4 style={{ fontSize: "1.75rem", color: "var(--success)", marginTop: "4px" }}>{stats.highest}</h4>
              </div>
              <div style={{ padding: "16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", textAlign: "center", backgroundColor: "var(--bg-tertiary)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "700" }}>NILAI TERENDAH</span>
                <h4 style={{ fontSize: "1.75rem", color: "var(--danger)", marginTop: "4px" }}>{stats.lowest}</h4>
              </div>
              <div style={{ padding: "16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", textAlign: "center", backgroundColor: "var(--bg-tertiary)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "700" }}>PERSENTASE KELULUSAN</span>
                <h4 style={{ fontSize: "1.75rem", color: stats.passRate >= 75 ? "var(--success)" : "var(--warning)", marginTop: "4px" }}>{stats.passRate}%</h4>
              </div>
            </div>

            {/* TABEL LAPORAN NILAI UTAMA */}
            <div className="table-container" style={{ margin: "20px 0 10px 0" }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>NISN</th>
                    <th>Nama Siswa</th>
                    {selectedClass.kolomNilai.map(col => (
                      <th key={col.id} style={{ textAlign: "center" }}>{col.nama} ({col.bobot}%)</th>
                    ))}
                    <th style={{ textAlign: "center", backgroundColor: "var(--bg-tertiary)" }}>N. Akhir</th>
                    <th style={{ textAlign: "center", width: "100px" }}>Predikat</th>
                    <th style={{ textAlign: "center", width: "130px" }}>Kelulusan</th>
                  </tr>
                </thead>
                <tbody>
                  {studentReports.map((report, idx) => (
                    <tr key={report.nisn}>
                      <td>{idx + 1}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{report.nisn}</td>
                      <td style={{ fontWeight: "700" }}>{report.nama}</td>
                      
                      {/* Dynamic grades */}
                      {selectedClass.kolomNilai.map(col => (
                        <td key={col.id} style={{ textAlign: "center" }}>
                          {report.nilai[col.id] !== null && report.nilai[col.id] !== undefined ? report.nilai[col.id] : "-"}
                        </td>
                      ))}

                      {/* Final weighted score */}
                      <td style={{ textAlign: "center", fontWeight: "800", color: "var(--primary)", backgroundColor: "rgba(59,130,246,0.02)" }}>
                        {report.nilaiAkhir}
                      </td>

                      {/* Predicate */}
                      <td style={{ textAlign: "center", fontWeight: "800" }}>
                        <span style={{ color: report.predikat === "A" || report.predikat === "B" ? "var(--success)" : report.predikat === "C" ? "var(--warning)" : "var(--danger)" }}>
                          {report.predikat}
                        </span>
                      </td>

                      {/* Graduation status */}
                      <td style={{ textAlign: "center" }}>
                        <span className={`badge ${report.statusKelulusan === "LULUS" ? "badge-success" : "badge-danger"}`} style={{ fontSize: "0.7rem", width: "100%", justifyContent: "center" }}>
                          {report.statusKelulusan}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* KKM Footnote */}
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
              * Kriteria Ketuntasan Minimal (KKM) mata pelajaran adalah 75. Nilai akhir dihitung secara otomatis berdasarkan pembagian persentase bobot aspek nilai kelas.
            </p>

            {/* OFFICIAL SIGNATURE SECTION */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "50px", padding: "0 20px" }} className="align-left-mobile">
              <div></div>
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "60px" }}>
                <div>
                  <p style={{ fontSize: "0.9rem" }}>Mengetahui,</p>
                  <p style={{ fontSize: "0.95rem", fontWeight: "700", marginTop: "2px" }}>Kepala Sekolah SMA Digital</p>
                </div>
                <div>
                  <p style={{ fontSize: "0.95rem", fontWeight: "700", borderBottom: "1px solid var(--text-primary)", display: "inline-block" }}>
                    Drs. H. Mulyadi, M.Pd.
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>NIP. 19680512 199403 1 002</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Style overrides for custom printing configurations */}
      <style jsx global>{`
        @media (max-width: 640px) {
          .align-left-mobile {
            text-align: left !important;
          }
        }
        
        @media print {
          /* Force printable-area to take full screen width and hide border radius */
          #printable-area {
            border: none !important;
            padding: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
