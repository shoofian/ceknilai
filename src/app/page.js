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
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // States untuk Fitur Gabung Kelas
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinKodeKelas, setJoinKodeKelas] = useState("");
  const [joinNisn, setJoinNisn] = useState("");
  const [joinNama, setJoinNama] = useState("");
  const [joinTglLahir, setJoinTglLahir] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");

  const handleJoinClass = async (e) => {
    e.preventDefault();
    setJoining(true);
    setJoinError("");
    setJoinSuccess("");

    try {
      const res = await fetch("/api/kelas/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kodeKelas: joinKodeKelas,
          nisn: joinNisn,
          nama: joinNama,
          tanggalLahir: joinTglLahir
        })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Gagal mendaftar ke kelas.");
      }

      setJoinSuccess(data.message || "Berhasil bergabung ke kelas!");
      // Reset form on success after a short delay
      setTimeout(() => {
        setJoinModalOpen(false);
        setJoinKodeKelas("");
        setJoinNisn("");
        setJoinNama("");
        setJoinTglLahir("");
        setJoinSuccess("");
      }, 2000);
      
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleDownloadImage = async (kelasId) => {
    const element = document.getElementById(`export-dashboard-${kelasId}`);
    if (!element) return;
    
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2, 
        backgroundColor: "#0f172a", // Cocok dengan tema gelap
        logging: false,
        useCORS: true
      });
      
      const image = canvas.toDataURL("image/png");
      setGeneratedImage({ url: image, filename: `Rapor_CekNilai_${kelasId}.png` });
    } catch (err) {
      console.error(err);
      alert("Gagal memproses gambar. Silakan coba kembali.");
    } finally {
      setIsGenerating(false);
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
    <>
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

          {/* Gabung Kelas Section */}
          <div style={{ marginTop: "28px", textAlign: "center", borderTop: "1px solid var(--border-color)", paddingTop: "24px" }}>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "12px", fontWeight: "500" }}>
              Diminta guru mendaftar mandiri?
            </p>
            <button 
              onClick={() => setJoinModalOpen(true)}
              className="btn btn-secondary" 
              style={{ padding: "8px 20px", fontSize: "0.9rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-color)" }}
            >
              🔗 Gabung ke Kelas dengan Kode
            </button>
          </div>
          
          {/* Promo Section */}
          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "12px", fontWeight: "600" }}>
              Tertarik menggunakan sistem ini di sekolah/kelas Anda?
            </p>
            <a 
              href="https://wa.me/6285157544004"
              target="_blank"
              rel="noopener noreferrer"
              className="btn" 
              style={{ padding: "8px 20px", fontSize: "0.9rem", borderRadius: "var(--radius-lg)", border: "none", backgroundColor: "#25D366", color: "#fff", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
              </svg>
              Hubungi Kami via WhatsApp
            </a>
          </div>
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
                        {res.archived ? (
                          <span className="badge" style={{ position: "absolute", top: "16px", right: "16px", backgroundColor: "rgba(0,0,0,0.3)", color: "#ffffff", fontSize: "0.65rem", fontWeight: "700", border: "1px solid rgba(255,255,255,0.2)" }}>ARSIP</span>
                        ) : (
                          <span className="badge" style={{ position: "absolute", top: "16px", right: "16px", backgroundColor: "var(--success)", color: "#fff", fontSize: "0.65rem", fontWeight: "800", padding: "4px 8px", boxShadow: "0 2px 10px rgba(16, 185, 129, 0.5)", border: "1px solid rgba(255,255,255,0.2)" }}>🟢 AKTIF</span>
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
                          {res.isNilaiAkhirGenerated && (
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
                          )}
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
                          ) : null}
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
                          disabled={isGenerating}
                          className="btn btn-secondary"
                          style={{ padding: "12px 24px", fontSize: "0.9rem", borderRadius: "99px", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "#10b981", borderColor: "rgba(16, 185, 129, 0.4)", boxShadow: "0 4px 14px rgba(16, 185, 129, 0.2)", flex: "1 1 auto", opacity: isGenerating ? 0.7 : 1, cursor: isGenerating ? "wait" : "pointer" }}
                        >
                          {isGenerating ? "📸 Memproses..." : "📸 Bagikan Hasil"}
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
                              <th>Nilai</th>
                              <th>Kontribusi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {res.detailNilai.map((col) => (
                              <>
                                {/* Baris aspek utama / grup */}
                                <tr key={col.kolomId} style={col.isGroup ? { backgroundColor: "rgba(59,130,246,0.06)", borderBottom: "none" } : {}}>
                                  <td style={{ fontWeight: col.isGroup ? "800" : "600" }}>
                                    {col.isGroup && <span style={{ fontSize: "0.7rem", backgroundColor: "var(--primary-glow)", color: "var(--primary)", border: "1px solid var(--primary)", padding: "1px 5px", borderRadius: "4px", marginRight: "6px", fontWeight: "700" }}>GRUP</span>}
                                    {col.namaKolom}
                                  </td>
                                  <td>{col.bobot}%</td>
                                  <td style={{
                                    fontWeight: "700",
                                    color: col.nilaiAsli === null || col.nilaiAsli === "" || col.nilaiAsli === "-"
                                      ? "var(--text-muted)"
                                      : col.nilaiAsli === "Tuntas" || (typeof col.nilaiAsli === 'number' && col.nilaiAsli >= res.kkm)
                                        ? "var(--success)"
                                        : col.nilaiAsli === "Belum Tuntas" || (typeof col.nilaiAsli === 'number' && col.nilaiAsli < res.kkm)
                                          ? "var(--danger)"
                                          : "var(--text-primary)"
                                  }}>
                                    {col.nilaiAsli === null || col.nilaiAsli === "" || col.nilaiAsli === "-" ? "Belum Diisi" : col.nilaiAsli}
                                    {col.isGroup && col.nilaiAsli !== null && col.nilaiAsli !== "-" && col.hitungMetode !== "persentase" && (
                                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "500", marginLeft: "4px" }}>(rata-rata)</span>
                                    )}
                                  </td>
                                  <td style={{ fontWeight: "600", color: "var(--text-secondary)" }}>
                                    {col.nilaiAsli === null || col.nilaiAsli === "" || col.nilaiAsli === "-" ? "-" : col.kontribusi}
                                  </td>
                                </tr>

                                {/* Baris sub-aspek (indent, hanya jika isGroup) */}
                                {col.isGroup && col.subDetail?.map((sub) => (
                                  <tr key={sub.subId} style={{ backgroundColor: "var(--bg-secondary)", opacity: 0.9 }}>
                                    <td style={{ paddingLeft: "2.5rem", fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600", borderLeft: "3px solid var(--primary)" }}>
                                      ↳ {sub.nama}
                                    </td>
                                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                                      {sub.bobot != null ? `${sub.bobot}%` : "—"}
                                    </td>
                                    <td style={{
                                      fontWeight: "700",
                                      fontSize: "0.88rem",
                                      color: sub.nilaiAsli === null
                                        ? "var(--text-muted)"
                                        : sub.nilaiAsli >= res.kkm
                                          ? "var(--success)"
                                          : "var(--danger)"
                                    }}>
                                      {sub.nilaiAsli === null ? "Belum Diisi" : sub.nilaiAsli}
                                    </td>
                                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>—</td>
                                  </tr>
                                ))}
                              </>
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

                      {/* Off-Screen Dashboard for Export (Portrait mode 4:5 ratio = 1000x1250) */}
                      <div id={`export-dashboard-${res.kelasId}`} style={{
                        position: "absolute", left: "-9999px", top: 0, width: "1000px", minHeight: "1250px", height: "auto",
                        backgroundColor: "#0f172a", padding: "60px 70px", 
                        boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "24px",
                        color: "#f8fafc", fontFamily: "sans-serif"
                      }}>
                        
                        {/* Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "10px", borderBottom: "2px solid #334155", paddingBottom: "20px" }}>
                          <div>
                            <h2 style={{ fontSize: "2.8rem", fontWeight: "900", color: "#10b981", margin: 0, letterSpacing: "-1px" }}>RAPOR HASIL BELAJAR</h2>
                            <p style={{ fontSize: "1.2rem", color: "#94a3b8", margin: "8px 0 0 0", fontWeight: "600" }}>Tahun Ajaran {res.tahunAjaran} &bull; Semester {res.semester || "Ganjil"}</p>
                          </div>
                          <div>
                            <h3 style={{ fontSize: "2.2rem", fontWeight: "800", margin: 0, letterSpacing: "-1px", background: "linear-gradient(135deg, #f8fafc 30%, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>CekNilai</h3>
                          </div>
                        </div>

                        {/* SECTION 1: Data Siswa */}
                        <div style={{ backgroundColor: "#1e293b", padding: "30px", borderRadius: "20px", border: "1px solid #334155" }}>
                          <p style={{ color: "#38bdf8", fontSize: "1.1rem", margin: "0 0 10px 0", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase" }}>1. Data Siswa</p>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <p style={{ color: "#94a3b8", fontSize: "1rem", margin: "0 0 4px 0", fontWeight: "600" }}>NAMA LENGKAP</p>
                              <h3 style={{ fontSize: "2.5rem", fontWeight: "800", margin: 0, color: "#f8fafc" }}>{res.siswa.nama}</h3>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <p style={{ color: "#94a3b8", fontSize: "1rem", margin: "0 0 4px 0", fontWeight: "600" }}>NISN</p>
                              <h3 style={{ fontSize: "2rem", fontWeight: "700", margin: 0, color: "#e2e8f0", fontFamily: "monospace" }}>{res.siswa.nisn}</h3>
                            </div>
                          </div>
                        </div>

                        {/* SECTION 2: Data Kelas */}
                        <div style={{ backgroundColor: "#1e293b", padding: "30px", borderRadius: "20px", border: "1px solid #334155" }}>
                          <p style={{ color: "#38bdf8", fontSize: "1.1rem", margin: "0 0 16px 0", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase" }}>2. Data Kelas</p>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                            <div>
                              <p style={{ color: "#94a3b8", fontSize: "1rem", margin: "0 0 4px 0", fontWeight: "600" }}>NAMA KELAS</p>
                              <p style={{ fontSize: "1.5rem", fontWeight: "700", margin: 0, color: "#f8fafc" }}>{res.namaKelas}</p>
                            </div>
                            <div>
                              <p style={{ color: "#94a3b8", fontSize: "1rem", margin: "0 0 4px 0", fontWeight: "600" }}>MATA PELAJARAN</p>
                              <p style={{ fontSize: "1.5rem", fontWeight: "700", margin: 0, color: "#f8fafc" }}>{res.mataPelajaran || "Informatika"}</p>
                            </div>
                            <div>
                              <p style={{ color: "#94a3b8", fontSize: "1rem", margin: "0 0 4px 0", fontWeight: "600" }}>GURU PENGAMPU</p>
                              <p style={{ fontSize: "1.5rem", fontWeight: "700", margin: 0, color: "#f8fafc" }}>{res.guruNama}</p>
                            </div>
                          </div>
                        </div>

                        {/* SECTION 3: Nilai dan Predikat */}
                        <div style={{ backgroundColor: res.nilaiAkhir >= res.kkm ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)", padding: "30px", borderRadius: "20px", border: `2px solid ${res.nilaiAkhir >= res.kkm ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <p style={{ color: res.nilaiAkhir >= res.kkm ? "#34d399" : "#fb7185", fontSize: "1.1rem", margin: "0 0 10px 0", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase" }}>3. Hasil Akhir</p>
                            <h1 style={{ fontSize: "5rem", fontWeight: "900", margin: 0, lineHeight: 1, color: res.nilaiAkhir >= res.kkm ? "#10b981" : "#f43f5e" }}>
                              {res.isNilaiAkhirGenerated ? res.nilaiAkhir : "🔒"}
                            </h1>
                            <p style={{ fontSize: "1.2rem", fontWeight: "700", color: "#e2e8f0", margin: "10px 0 0 0" }}>Standar KKM: {res.kkm}</p>
                          </div>
                          
                          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                            {res.isNilaiAkhirGenerated && (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
                                <span style={{ backgroundColor: res.nilaiAkhir >= res.kkm ? "rgba(16, 185, 129, 0.2)" : "rgba(244, 63, 94, 0.2)", color: res.nilaiAkhir >= res.kkm ? "#34d399" : "#fb7185", padding: "12px 24px", borderRadius: "99px", fontSize: "1.4rem", fontWeight: "800" }}>
                                  {res.statusKelulusan}
                                </span>
                                <div style={{ width: "90px", height: "90px", borderRadius: "50%", backgroundColor: res.predikat === 'A' || res.predikat === 'B' ? '#10b981' : res.predikat === 'C' ? '#f59e0b' : '#f43f5e', color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.5rem", fontWeight: "900", boxShadow: "0 10px 20px rgba(0,0,0,0.3)" }}>
                                  {res.predikat}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* SECTION 4: Grafik Performa Radar */}
                        <div style={{ backgroundColor: "#1e293b", padding: "30px", borderRadius: "20px", border: "1px solid #334155", flex: 1 }}>
                          <p style={{ color: "#38bdf8", fontSize: "1.1rem", margin: "0 0 20px 0", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase" }}>4. Grafik Performa</p>
                          {(() => {
                            const chartItems = [];
                            res.detailNilai.forEach(col => {
                              const aspectName = col.namaKomom || col.namaKolom || "";
                              if (col.isGroup && col.subDetail && col.subDetail.length > 0) {
                                col.subDetail.forEach(sub => {
                                  if (sub.nilaiAsli !== null && typeof sub.nilaiAsli === 'number') {
                                    chartItems.push({
                                      nama: `${aspectName} - ${sub.nama || "Sub-Aspek"}`,
                                      nilaiAsli: sub.nilaiAsli,
                                      bobot: sub.bobot,
                                      isSub: true
                                    });
                                  }
                                });
                              } else {
                                if (col.nilaiAsli !== null && typeof col.nilaiAsli === 'number') {
                                  chartItems.push({
                                    nama: aspectName,
                                    nilaiAsli: col.nilaiAsli,
                                    bobot: col.bobot,
                                    isSub: false
                                  });
                                }
                              }
                            });

                            if (chartItems.length < 3) {
                              return (
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                  {chartItems.map((col, idx) => (
                                    <div key={idx} style={{ backgroundColor: "#0f172a", padding: "20px", borderRadius: "16px", border: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <div>
                                        <h4 style={{ margin: 0, fontSize: "1.3rem", fontWeight: "700", color: "#e2e8f0" }}>{col.nama}</h4>
                                        <p style={{ margin: "6px 0 0 0", fontSize: "1rem", color: "#64748b", fontWeight: "600" }}>
                                          {col.isSub ? `Sub-Aspek (Bobot ${col.bobot}%)` : `Bobot {col.bobot}%`}
                                        </p>
                                      </div>
                                      <div style={{ 
                                        fontSize: "2.2rem", 
                                        fontWeight: "800", 
                                        color: col.nilaiAsli === null 
                                          ? "#475569" 
                                          : col.nilaiAsli === "Tuntas" || (typeof col.nilaiAsli === 'number' && col.nilaiAsli >= res.kkm)
                                            ? "#10b981" 
                                            : "#f43f5e" 
                                      }}>
                                        {col.nilaiAsli === null ? "-" : col.nilaiAsli}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            const N = chartItems.length;
                            const CX = 270, CY = 250, R = 200;
                            const toXY = (i, val) => {
                              const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
                              const r = (val / 100) * R;
                              return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
                            };
                            const gridLevels = [20, 40, 60, 80, 100];
                            return (
                              <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
                                <div style={{ flexShrink: 0 }}>
                                  <svg width="540" height="500" xmlns="http://www.w3.org/2000/svg">
                                    {gridLevels.map(level => (
                                      <polygon
                                        key={level}
                                        points={Array.from({ length: N }, (_, i) => {
                                          const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
                                          const r = (level / 100) * R;
                                          return `${CX + r * Math.cos(angle)},${CY + r * Math.sin(angle)}`;
                                        }).join(" ")}
                                        fill="none" stroke={level === 100 ? "#475569" : "#1e3a5f"} strokeWidth={level === 100 ? "1.5" : "1"}
                                      />
                                    ))}
                                    {chartItems.map((_, i) => {
                                      const [x, y] = toXY(i, 100);
                                      return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#334155" strokeWidth="1" />;
                                    })}
                                    <polygon
                                      points={chartItems.map((col, i) => toXY(i, col.nilaiAsli).join(",")).join(" ")}
                                      fill="rgba(59,130,246,0.2)" stroke="#3b82f6" strokeWidth="2.5"
                                    />
                                    {chartItems.map((col, i) => {
                                      const [x, y] = toXY(i, col.nilaiAsli);
                                      return <circle key={i} cx={x} cy={y} r="6" fill="#3b82f6" stroke="#f8fafc" strokeWidth="2.5" />;
                                    })}
                                    {chartItems.map((col, i) => {
                                      const [x, y] = toXY(i, col.nilaiAsli);
                                      const offsetY = y < CY ? -14 : 20;
                                      return <text key={i} x={x} y={y + offsetY} fill="#38bdf8" fontSize="16" fontWeight="800" textAnchor="middle">{col.nilaiAsli}</text>;
                                    })}
                                    {chartItems.map((col, i) => {
                                      const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
                                      const lr = R + 38;
                                      const lx = CX + lr * Math.cos(angle);
                                      const ly = CY + lr * Math.sin(angle);
                                      const label = col.nama;
                                      const words = label.split(" ");
                                      const lineH = 18;
                                      return (
                                        <text key={i} x={lx} y={ly} fill="#cbd5e1" fontSize="15" fontWeight="600" textAnchor="middle" dominantBaseline="middle">
                                          {words.length <= 2 ? label : (
                                            <>
                                              <tspan x={lx} dy={`-${lineH/2}px`}>{words.slice(0, Math.ceil(words.length/2)).join(" ")}</tspan>
                                              <tspan x={lx} dy={`${lineH}px`}>{words.slice(Math.ceil(words.length/2)).join(" ")}</tspan>
                                            </>
                                          )}
                                        </text>
                                      );
                                    })}
                                    {gridLevels.map(level => (
                                      <text key={level} x={CX + 5} y={CY - (level / 100) * R + 5} fill="#475569" fontSize="12">{ level}</text>
                                    ))}
                                  </svg>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "14px", flex: 1 }}>
                                  <p style={{ color: "#64748b", fontSize: "0.95rem", fontWeight: "700", margin: "0 0 8px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Legenda Aspek</p>
                                  {chartItems.map((col, i) => (
                                    <div key={i} style={{ 
                                      display: "flex", 
                                      alignItems: "center", 
                                      justifyContent: "space-between", 
                                      padding: "12px 16px", 
                                      backgroundColor: "#0f172a", 
                                      borderRadius: "12px", 
                                      border: `1px solid ${
                                        col.nilaiAsli === null 
                                          ? "#1e293b" 
                                          : col.nilaiAsli === "Tuntas" || (typeof col.nilaiAsli === 'number' && col.nilaiAsli >= res.kkm)
                                            ? "rgba(16,185,129,0.2)" 
                                            : "rgba(244,63,94,0.2)"
                                      }` 
                                    }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div style={{ 
                                          width: "10px", 
                                          height: "10px", 
                                          borderRadius: "50%", 
                                          backgroundColor: col.nilaiAsli === null 
                                            ? "#475569" 
                                            : col.nilaiAsli === "Tuntas" || (typeof col.nilaiAsli === 'number' && col.nilaiAsli >= res.kkm)
                                              ? "#10b981" 
                                              : "#f43f5e", 
                                          flexShrink: 0 
                                        }} />
                                        <div>
                                          <p style={{ margin: 0, fontSize: "1rem", color: "#cbd5e1", fontWeight: "600" }}>{col.nama}</p>
                                          <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569", fontWeight: "500" }}>
                                            {col.isSub ? `Sub-Aspek (Bobot ${col.bobot}%)` : `Bobot ${col.bobot}%`}
                                          </p>
                                        </div>
                                      </div>
                                      <span style={{ 
                                        fontSize: "1.4rem", 
                                        fontWeight: "800", 
                                        color: col.nilaiAsli === null 
                                          ? "#475569" 
                                          : col.nilaiAsli === "Tuntas" || (typeof col.nilaiAsli === 'number' && col.nilaiAsli >= res.kkm)
                                            ? "#10b981" 
                                            : "#f43f5e" 
                                      }}>
                                        {col.nilaiAsli === null ? "-" : col.nilaiAsli}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Footer Info */}
                        <div style={{ marginTop: "auto", borderTop: "2px solid #334155", paddingTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <p style={{ margin: 0, color: "#64748b", fontSize: "1.1rem", fontWeight: "600" }}>Dicetak pada: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p style={{ margin: "4px 0 0 0", color: "#475569", fontSize: "0.95rem", fontWeight: "500" }}>* Dokumen ini valid sebagai informasi pencapaian sementara/akhir.</p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ margin: 0, color: "#475569", fontSize: "1.1rem", fontWeight: "900", letterSpacing: "3px" }}>GENERATED BY CEKNILAI APP</p>
                            <p style={{ margin: "4px 0 0 0", color: "#475569", fontSize: "0.95rem", fontWeight: "600", fontStyle: "italic" }}>Powered by Memofy Studio</p>
                          </div>
                        </div>

                      </div>
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
        <p>&copy; {new Date().getFullYear()} CekNilai - Sistem Penilaian Online. Dikembangkan menggunakan Next.js & Vanilla CSS.</p>
      </footer>
      </div>

      {/* Modal Preview Gambar (Global to Portal) */}
      {generatedImage && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(8px)", padding: "20px" }} className="animate-fade-in">
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "center", width: "100%", maxWidth: "450px" }}>
            
            <div style={{ position: "relative", width: "100%", maxHeight: "75vh", overflow: "auto", borderRadius: "16px", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "center" }}>
              <img src={generatedImage.url} alt="Pratinjau Rapor" style={{ width: "100%", objectFit: "contain" }} />
            </div>

            <div style={{ display: "flex", gap: "16px", width: "100%", justifyContent: "center" }}>
              <button 
                onClick={() => setGeneratedImage(null)} 
                className="btn btn-secondary" 
                style={{ padding: "14px 24px", borderRadius: "99px", flex: 1, fontSize: "1rem", fontWeight: "700" }}
              >
                Tutup
              </button>
              <a 
                href={generatedImage.url} 
                download={generatedImage.filename} 
                onClick={() => setGeneratedImage(null)}
                className="btn btn-primary" 
                style={{ padding: "14px 24px", borderRadius: "99px", backgroundColor: "#10b981", borderColor: "#10b981", textDecoration: "none", flex: 2, textAlign: "center", fontSize: "1rem", fontWeight: "700" }}
              >
                💾 Unduh ke Perangkat
              </a>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: GABUNG KELAS */}
      {joinModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="glass-card animate-fade-in modal-content-scroll" style={{ width: "100%", maxWidth: "450px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "1.4rem", fontWeight: "800", color: "var(--primary)" }}>
                🔗 Gabung Kelas Baru
              </h3>
              <button onClick={() => setJoinModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "20px", lineHeight: "1.5" }}>
              Masukkan Kode Kelas yang diberikan oleh Guru Anda beserta identitas lengkap untuk mendaftar ke kelas tersebut secara otomatis.
            </p>

            <form onSubmit={handleJoinClass} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Kode Kelas (Diberikan Guru)</label>
                <input
                  type="text"
                  placeholder="Contoh: kelas-8fk2x9"
                  className="form-input"
                  value={joinKodeKelas}
                  onChange={(e) => setJoinKodeKelas(e.target.value)}
                  style={{ fontFamily: "monospace", letterSpacing: "1px" }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">NISN Siswa</label>
                <input
                  type="text"
                  placeholder="Contoh: 1234567890"
                  className="form-input"
                  value={joinNisn}
                  onChange={(e) => setJoinNisn(e.target.value)}
                  maxLength={20}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Lengkap (Sesuai Rapot)</label>
                <input
                  type="text"
                  placeholder="Contoh: Aditya Pratama"
                  className="form-input"
                  value={joinNama}
                  onChange={(e) => setJoinNama(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tanggal Lahir</label>
                <input
                  type="date"
                  className="form-input"
                  value={joinTglLahir}
                  onChange={(e) => setJoinTglLahir(e.target.value)}
                  required
                />
              </div>

              {joinError && (
                <div style={{ padding: "10px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--danger-glow)", color: "var(--danger)", fontSize: "0.85rem", border: "1px solid rgba(239, 68, 68, 0.2)", marginTop: "4px" }}>
                  ❌ {joinError}
                </div>
              )}
              
              {joinSuccess && (
                <div style={{ padding: "10px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--success-glow)", color: "var(--success)", fontSize: "0.85rem", border: "1px solid rgba(16, 185, 129, 0.2)", marginTop: "4px", textAlign: "center", fontWeight: "600" }}>
                  ✅ {joinSuccess}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" onClick={() => setJoinModalOpen(false)} className="btn btn-secondary" disabled={joining}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={joining}>
                  {joining ? "Memproses..." : "Daftar Sekarang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styles injector for spinning spinner and print styles */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
