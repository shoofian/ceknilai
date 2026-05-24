"use client";

import { useState } from "react";
import Link from "next/link";
import html2canvas from "html2canvas";

export default function StudentPortal() {
  const [nisn, setNisn] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);
  const [activeClassId, setActiveClassId] = useState(null);
  const [simulationScores, setSimulationScores] = useState({});
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  const handleDownloadImage = async (kelasId) => {
    const element = document.getElementById(`rapor-card-${kelasId}`);
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2, 
        backgroundColor: "#0f172a", // Cocok dengan tema gelap
        logging: false,
        useCORS: true
      });
      
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `Rapor_CekNilai_${kelasId}.png`;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Gagal mengunduh gambar. Silakan coba fitur screenshot manual perangkat Anda.");
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!nisn.trim() || !tanggalLahir) {
      setError("Harap isi NISN dan Tanggal Lahir.");
      return;
    }

    setLoading(true);
    setError("");
    setResults(null);
    setActiveClassId(null);

    try {
      const response = await fetch(
        `/api/pencarian?nisn=${encodeURIComponent(nisn)}&tanggalLahir=${encodeURIComponent(tanggalLahir)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal memuat data");
      }

      if (data.hasil && data.hasil.length > 0) {
        setResults(data.hasil);
        setActiveClassId(null); // Menampilkan card-card kelas terlebih dahulu
        setSimulationScores({});
      } else {
        setResults([]);
        setError("Data nilai tidak ditemukan. Periksa kembali NISN dan Tanggal Lahir Anda.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan saat mencari data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }} className="animate-fade-in">
      {/* Navbar Portal */}
      <nav className="header no-print">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, var(--primary), var(--success))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "800",
              color: "#ffffff",
              fontSize: "1.2rem",
              fontFamily: "var(--font-heading)"
            }}
          >
            N
          </div>
          <div>
            <h1 style={{ fontSize: "1.2rem", fontWeight: "800", letterSpacing: "-0.02em" }}>CekNilai</h1>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Sistem Penilaian Online</p>
          </div>
        </div>
        <Link href="/login" className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
          🔐 Area Guru
        </Link>
      </nav>

      {/* Main Container */}
      <main style={{ flex: 1, padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        
        {/* Hero Section */}
        <div style={{ textAlign: "center", marginBottom: "40px", maxWidth: "600px" }}>
          <h2 style={{ fontSize: "2.5rem", fontWeight: "800", letterSpacing: "-0.04em", marginBottom: "12px", background: "linear-gradient(135deg, var(--text-primary) 30%, var(--primary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Portal Nilai Siswa
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", lineHeight: "1.6" }}>
            Selamat datang! Masukkan Nomor Induk Siswa Nasional (NISN) dan Tanggal Lahir Anda untuk melihat riwayat nilai secara instan, transparan, dan detail.
          </p>
        </div>

        {/* Search Card */}
        <div className="glass-card" style={{ width: "100%", maxWidth: "480px", marginBottom: "40px" }}>
          <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="nisn">NISN Siswa</label>
              <input
                id="nisn"
                type="text"
                placeholder="Contoh: 1234567890"
                className="form-input"
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                maxLength={20}
                required
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="tgl-lahir">Tanggal Lahir</label>
              <input
                id="tgl-lahir"
                type="date"
                className="form-input"
                value={tanggalLahir}
                onChange={(e) => setTanggalLahir(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "14px" }} disabled={loading}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="spinner" style={{ width: "16px", height: "16px", border: "2px solid #ffffff", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
                  Mencari Data...
                </span>
              ) : (
                "🔍 Cari Nilai Saya"
              )}
            </button>
          </form>

          {error && (
            <div style={{ marginTop: "20px", padding: "12px 16px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--danger-glow)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "var(--danger)", fontSize: "0.9rem", textAlign: "center" }}>
              {error}
            </div>
          )}
        </div>

        {/* Search Results */}
        {results && results.length > 0 && (
          <div style={{ width: "100%", maxWidth: "900px" }} className="animate-fade-in">
            
            {/* Header pencarian */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "10px" }}>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
                <span>📊 Hasil Pencarian Nilai</span>
              </h3>
              <span className="badge badge-primary" style={{ fontSize: "0.9rem", padding: "6px 14px" }}>
                👤 {results[0].siswa.nama}
              </span>
            </div>

            {activeClassId === null ? (
              /* CARD GRID VIEW */
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px", marginTop: "10px" }}>
                {results.map((res, index) => {
                  const gradients = [
                    "linear-gradient(135deg, #3b82f6, #1d4ed8)", // Blue
                    "linear-gradient(135deg, #10b981, #047857)", // Emerald
                    "linear-gradient(135deg, #8b5cf6, #5b21b6)", // Purple
                    "linear-gradient(135deg, #f59e0b, #b45309)", // Amber
                    "linear-gradient(135deg, #ec4899, #be185d)", // Pink
                  ];
                  const cardGradient = gradients[index % gradients.length];
                  
                  return (
                    <div
                      key={res.kelasId}
                      className="glass-card animate-fade-in"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        padding: 0,
                        overflow: "hidden",
                        border: "1px solid var(--border-color)",
                        cursor: "pointer",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                      onClick={() => { setActiveClassId(res.kelasId); setSimulationScores({}); }}
                    >
                      {/* Accent Header */}
                      <div style={{ background: cardGradient, padding: "20px 24px", color: "#ffffff", position: "relative" }}>
                        <h4 style={{ fontSize: "1.35rem", fontWeight: "800", margin: 0, color: "#ffffff" }}>{res.namaKelas}</h4>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                          <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.2)", color: "#ffffff", fontWeight: "600" }}>
                            📚 TA: {res.tahunAjaran}
                          </span>
                          <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.2)", color: "#ffffff", fontWeight: "600" }}>
                            ⏱️ Sem. {res.semester || "Ganjil"}
                          </span>
                          <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.15)", color: "#ffffff", fontWeight: "600" }}>
                            💻 {res.mataPelajaran || "Informatika"}
                          </span>
                        </div>
                        {res.archived && (
                          <span className="badge" style={{ position: "absolute", top: "16px", right: "16px", backgroundColor: "rgba(0,0,0,0.3)", color: "#ffffff", fontSize: "0.6rem", border: "1px solid rgba(255,255,255,0.2)" }}>ARSIP</span>
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px", flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase" }}>Guru Pengampu</span>
                            <p style={{ fontSize: "0.88rem", fontWeight: "700", color: "var(--text-primary)", marginTop: "2px" }}>{res.guruNama}</p>
                          </div>
                          
                          {/* Predikat Circle */}
                          <div
                            style={{
                              width: "42px",
                              height: "42px",
                              borderRadius: "50%",
                              backgroundColor: res.predikat === "A" || res.predikat === "B" ? "var(--success-glow)" : res.predikat === "C" ? "var(--warning-glow)" : "var(--danger-glow)",
                              border: `1.5px solid ${res.predikat === "A" || res.predikat === "B" ? "var(--success)" : res.predikat === "C" ? "var(--warning)" : "var(--danger)"}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1.1rem",
                              fontWeight: "800",
                              color: res.predikat === "A" || res.predikat === "B" ? "var(--success)" : res.predikat === "C" ? "var(--warning)" : "var(--danger)"
                            }}
                          >
                            {res.predikat}
                          </div>
                        </div>

                        <div style={{ borderTop: "1px dashed var(--border-color)", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase" }}>Nilai Akhir</span>
                            {res.isNilaiAkhirGenerated ? (
                              <p style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--primary)", margin: 0 }}>{res.nilaiAkhir.toFixed(2)}</p>
                            ) : (
                              <p style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-muted)", margin: 0 }}>🔒 Menunggu</p>
                            )}
                          </div>
                          
                          {res.isNilaiAkhirGenerated ? (
                            <span
                              className={`badge ${res.statusKelulusan === "LULUS" ? "badge-success" : "badge-danger"}`}
                              style={{ fontSize: "0.72rem", padding: "5px 10px", borderRadius: "6px" }}
                            >
                              {res.statusKelulusan}
                            </span>
                          ) : (
                            <span
                              className={`badge badge-warning`}
                              style={{ fontSize: "0.72rem", padding: "5px 10px", borderRadius: "6px" }}
                            >
                              DRAFT
                            </span>
                          )}
                        </div>

                        {/* Progress */}
                        <div style={{ width: "100%", height: "6px", backgroundColor: "var(--bg-tertiary)", borderRadius: "99px", overflow: "hidden", marginTop: "4px" }}>
                          <div style={{ width: `${Math.min(res.nilaiAkhir, 100)}%`, height: "100%", backgroundColor: res.nilaiAkhir >= res.kkm ? "var(--success)" : "var(--danger)", borderRadius: "99px" }}></div>
                        </div>

                        {/* Progress Aspek Terisi */}
                        {res.totalAspekCount > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                            <span>Progres Aspek Terisi:</span>
                            <span style={{ fontWeight: "700", color: res.jumlahAspekTerisi === res.totalAspekCount ? "var(--success)" : "var(--text-secondary)" }}>
                              {res.jumlahAspekTerisi} / {res.totalAspekCount} ({res.totalBobotTerisi}% Bobot)
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Action Link */}
                      <div 
                        style={{ 
                          borderTop: "1px solid var(--border-color)", 
                          padding: "12px 24px", 
                          backgroundColor: "var(--bg-secondary)", 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center" 
                        }}
                      >
                        <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "var(--primary)" }}>Buka Rincian Nilai</span>
                        <span style={{ fontSize: "0.95rem", color: "var(--primary)" }}>➔</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* DETAIL CLASS VIEW WITH BACK BUTTON */
              <div>
                <button
                  onClick={() => { setActiveClassId(null); setSimulationScores({}); setIsSimulatorOpen(false); }}
                  className="btn btn-secondary animate-fade-in"
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", marginBottom: "16px", fontSize: "0.85rem", borderRadius: "var(--radius-sm)" }}
                >
                  ⬅️ Kembali ke Daftar Kelas
                </button>

                {results.map((res) => {
                  if (res.kelasId !== activeClassId) return null;

                  const handleSimulationChange = (kolomId, val) => {
                    setSimulationScores(prev => ({...prev, [kolomId]: val}));
                  };
                  
                  let displayNilaiAkhir = res.nilaiAkhir;
                  let displayPredikat = res.predikat;
                  let isSimulated = false;
                  
                  // Hanya jalankan simulasi jika ada aspek kosong atau nilai akhir belum dipublish
                  let simTotalNilai = 0;
                  let simTotalBobot = 0;
                  
                  res.detailNilai.forEach((col) => {
                    let scoreVal = col.nilaiAsli;
                    if (scoreVal === null) {
                      if (simulationScores[col.kolomId] !== undefined && simulationScores[col.kolomId] !== "") {
                        scoreVal = Number(simulationScores[col.kolomId]);
                        isSimulated = true;
                      }
                    }
                    
                    if (scoreVal !== null && scoreVal !== "") {
                      simTotalNilai += Number(scoreVal) * (col.bobot / 100);
                      simTotalBobot += col.bobot;
                    }
                  });

                  if (simTotalBobot > 0) {
                    const simFinal = simTotalNilai;
                    displayNilaiAkhir = Number(simFinal.toFixed(2));
                    
                    displayPredikat = 'E';
                    if (displayNilaiAkhir >= res.skema.A) displayPredikat = 'A';
                    else if (displayNilaiAkhir >= res.skema.B) displayPredikat = 'B';
                    else if (displayNilaiAkhir >= res.skema.C) displayPredikat = 'C';
                    else if (displayNilaiAkhir >= res.skema.D) displayPredikat = 'D';
                  }

                  return (
                    <div id={`rapor-card-${res.kelasId}`} key={res.kelasId} className="glass-card animate-fade-in" style={{ borderTop: "4px solid var(--primary)", position: "relative" }}>
                      
                      {/* Class Title Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid var(--border-color)" }}>
                        <div>
                          <h4 style={{ fontSize: "1.5rem", fontWeight: "700" }}>{res.namaKelas}</h4>
                          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>
                            Mata Pelajaran: <strong>{res.mataPelajaran || "Informatika"}</strong> &bull; Tahun Ajaran: <strong>{res.tahunAjaran}</strong> &bull; Semester: <strong>{res.semester || "Ganjil"}</strong> &bull; Guru Pengampu: <strong>{res.guruNama}</strong>
                          </p>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                          <span className="badge badge-primary" style={{ fontSize: "0.85rem", padding: "6px 12px" }}>
                            NISN: {res.siswa.nisn}
                          </span>
                          {!res.isLengkap && (
                            <span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>
                              ⚠️ Bobot Belum 100%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Summary Score Grid / Simulator Grid */}
                      {!res.isNilaiAkhirGenerated ? (
                        <div style={{ background: "var(--warning-glow)", padding: "24px", borderRadius: "var(--radius-md)", border: "1px dashed rgba(245, 158, 11, 0.4)", marginBottom: "30px", textAlign: "center" }}>
                          <span style={{ fontSize: "2rem" }}>🔒</span>
                          <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--warning)", marginTop: "8px", marginBottom: "4px" }}>Nilai Akhir Sedang Diproses</h3>
                          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Guru belum merilis Nilai Akhir resmi untuk kelas ini. Namun Anda dapat menggunakan <strong>Kalkulator Simulasi</strong> di bawah untuk memprediksi nilai target Anda!</p>
                        </div>
                      ) : (
                        <div className="grid-cols-1" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" }}>
                          <div style={{ background: "var(--bg-tertiary)", padding: "20px", borderRadius: "var(--radius-md)", textAlign: "center", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>Nilai Akhir Resmi</span>
                            <h3 style={{ fontSize: "3rem", fontWeight: "800", color: "var(--primary)", marginTop: "6px", marginBottom: 0, lineHeight: 1.1 }}>{res.nilaiAkhir}</h3>
                            
                            {/* Progress bar */}
                            <div style={{ width: "100%", height: "8px", backgroundColor: "var(--border-color)", borderRadius: "99px", overflow: "hidden", marginTop: "12px" }}>
                              <div style={{ width: `${Math.min(res.nilaiAkhir, 100)}%`, height: "100%", backgroundColor: res.nilaiAkhir >= res.kkm ? "var(--success)" : res.nilaiAkhir >= 60 ? "var(--warning)" : "var(--danger)", borderRadius: "99px", transition: "var(--transition)" }}></div>
                            </div>
                          </div>

                          <div style={{ background: "var(--bg-tertiary)", padding: "20px", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-color)" }}>
                            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>Predikat Hasil</span>
                            <div
                              style={{
                                width: "70px",
                                height: "70px",
                                borderRadius: "50%",
                                backgroundColor: res.predikat === "A" || res.predikat === "B" ? "var(--success-glow)" : res.predikat === "C" ? "var(--warning-glow)" : "var(--danger-glow)",
                                border: `2px solid ${res.predikat === "A" || res.predikat === "B" ? "var(--success)" : res.predikat === "C" ? "var(--warning)" : "var(--danger)"}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "2rem",
                                fontWeight: "800",
                                color: res.predikat === "A" || res.predikat === "B" ? "var(--success)" : res.predikat === "C" ? "var(--warning)" : "var(--danger)",
                                marginTop: "10px"
                              }}
                            >
                              {res.predikat}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Button Container for Actions */}
                      <div className="no-print" data-html2canvas-ignore="true" style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", marginBottom: "30px", marginTop: "10px" }}>
                        {(!res.isLengkap || res.jumlahAspekTerisi < res.totalAspekCount) && (
                          <button
                            onClick={() => setIsSimulatorOpen(true)}
                            className="btn btn-primary"
                            style={{ padding: "12px 24px", fontSize: "0.9rem", borderRadius: "99px", boxShadow: "0 4px 14px rgba(59, 130, 246, 0.4)", flex: "1 1 auto" }}
                          >
                            ✨ Buka Kalkulator Estimasi Target
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadImage(res.kelasId)}
                          className="btn btn-secondary"
                          style={{ padding: "12px 24px", fontSize: "0.9rem", borderRadius: "99px", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "#10b981", borderColor: "rgba(16, 185, 129, 0.4)", boxShadow: "0 4px 14px rgba(16, 185, 129, 0.2)", flex: "1 1 auto" }}
                        >
                          📸 Unduh Gambar Rapor (Sosmed)
                        </button>
                      </div>
                      
                      {/* Catatan Tambahan Guru (Jika ada) */}
                      {res.siswa.catatan && (
                        <div 
                          className="animate-fade-in" 
                          style={{ 
                            background: "var(--primary-glow)", 
                            borderLeft: "4px solid var(--primary)", 
                            borderRadius: "var(--radius-sm)", 
                            padding: "16px 20px", 
                            marginBottom: "30px", 
                            display: "flex", 
                            flexDirection: "column", 
                            gap: "6px" 
                          }}
                        >
                          <span style={{ fontSize: "0.78rem", fontWeight: "800", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}>
                            📝 Keterangan Tambahan dari Guru
                          </span>
                          <p style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: "600", fontStyle: "italic", margin: 0, lineHeight: "1.5" }}>
                            "{res.siswa.catatan}"
                          </p>
                        </div>
                      )}

                      {/* Detailed Grades Table */}
                      <h5 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "12px", fontFamily: "var(--font-heading)" }}>Rincian Komponen Nilai</h5>
                      
                      <div className="table-container" style={{ marginTop: 0 }}>
                        <table className="premium-table">
                          <thead>
                            <tr>
                              <th>Komponen Nilai</th>
                              <th>Bobot</th>
                              <th>Nilai Asli</th>
                              <th>Kontribusi Nilai</th>
                            </tr>
                          </thead>
                          <tbody>
                            {res.detailNilai.map((col) => (
                              <tr key={col.kolomId}>
                                <td style={{ fontWeight: "600" }}>{col.namaKomom || col.namaKolom}</td>
                                <td>{col.bobot}%</td>
                                <td style={{ fontWeight: "700", color: col.nilaiAsli === null ? "var(--text-muted)" : (col.nilaiAsli >= res.kkm ? "var(--success)" : "var(--text-primary)") }}>
                                  {col.nilaiAsli === null ? "Belum Diisi" : col.nilaiAsli}
                                </td>
                                <td style={{ fontWeight: "600", color: "var(--text-secondary)" }}>
                                  {col.nilaiAsli === null ? "-" : col.kontribusi}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "right" }}>
                        * Nilai Akhir dihitung berdasarkan penjumlahan dari (Nilai Asli &times; Bobot %). KKM kelulusan untuk kelas ini adalah {res.kkm}.
                      </p>

                      {/* Watermark for Image Download */}
                      <div className="watermark" style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "24px", opacity: 0.6, fontWeight: "600", letterSpacing: "1px" }}>
                        GENERATED BY CEKNILAI APP
                      </div>

                      {/* Simulator Modal Pop-up */}
                      {isSimulatorOpen && (
                        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} className="animate-fade-in">
                          <div className="glass-card" style={{ width: "90%", maxWidth: "500px", padding: "30px", display: "flex", flexDirection: "column", gap: "20px", position: "relative", backgroundColor: "var(--bg-primary)" }}>
                            <button onClick={() => setIsSimulatorOpen(false)} style={{ position: "absolute", top: "15px", right: "15px", background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
                            
                            <div style={{ textAlign: "center" }}>
                              <span style={{ fontSize: "2rem" }}>✨</span>
                              <h3 style={{ fontSize: "1.3rem", fontWeight: "800", color: "var(--primary)", marginTop: "10px", marginBottom: "4px" }}>Kalkulator Simulasi Target</h3>
                              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.5" }}>Isi target skor Anda pada tugas yang masih kosong untuk melihat proyeksi hasil akhir murni (aktual).</p>
                            </div>
                            
                            <div style={{ background: "var(--primary-glow)", padding: "16px", borderRadius: "var(--radius-sm)", textAlign: "center", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "700" }}>PROYEKSI NILAI AKHIR AKTUAL</span>
                              <h3 style={{ fontSize: "2.5rem", fontWeight: "800", color: "var(--primary)", margin: "4px 0", lineHeight: 1 }}>{displayNilaiAkhir}</h3>
                              <span className="badge badge-primary" style={{ fontSize: "0.7rem" }}>PREDIKAT: {displayPredikat}</span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "40vh", overflowY: "auto", paddingRight: "10px" }}>
                              {res.detailNilai.map((col) => col.nilaiAsli === null ? (
                                <div key={col.kolomId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "var(--bg-secondary)" }}>
                                  <div>
                                    <h4 style={{ fontSize: "0.9rem", fontWeight: "700", margin: 0 }}>{col.namaKolom || col.namaKomom}</h4>
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Bobot: {col.bobot}%</span>
                                  </div>
                                  <input 
                                    type="number" 
                                    min="0" 
                                    max="100" 
                                    placeholder="Skor (0-100)" 
                                    value={simulationScores[col.kolomId] || ""}
                                    onChange={(e) => handleSimulationChange(col.kolomId, e.target.value)}
                                    style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--primary)", background: "var(--bg-primary)", color: "var(--text-primary)", fontWeight: "700", width: "120px", fontSize: "0.9rem", outline: "none" }}
                                  />
                                </div>
                              ) : null)}
                            </div>
                            
                            <button onClick={() => setSimulationScores({})} className="btn btn-secondary" style={{ width: "100%", padding: "10px", fontSize: "0.85rem" }}>Reset Simulasi</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="no-print" style={{ borderTop: "1px solid var(--border-color)", padding: "20px", textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)", backgroundColor: "var(--bg-secondary)" }}>
        <p>&copy; {new Date().getFullYear()} CekNilai - Sistem Penilaian Online. Dikembangkan menggunakan Next.js &amp; Vanilla CSS.</p>
      </footer>

      {/* Styles injector for spinning spinner and print styles */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
