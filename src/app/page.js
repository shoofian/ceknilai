"use client";

import { useState, useEffect, Fragment } from "react";
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
  const [isPresensiOpen, setIsPresensiOpen] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState("Semua");
  const [selectedSemester, setSelectedSemester] = useState("Semua");
  const [selectedMataPelajaran, setSelectedMataPelajaran] = useState("Semua");
  const [selectedTingkatan, setSelectedTingkatan] = useState("Semua");

  // Dynamic filter options derived from search results
  const tahunAjaranOptions = results ? ["Semua", ...Array.from(new Set(results.map(r => r.tahunAjaran).filter(Boolean))).sort()] : [];
  const semesterOptions = results ? ["Semua", ...Array.from(new Set(results.map(r => r.semester || "Ganjil").filter(Boolean))).sort()] : [];
  const mataPelajaranOptions = results ? ["Semua", ...Array.from(new Set(results.map(r => r.mataPelajaran || "Informatika").filter(Boolean))).sort()] : [];
  const tingkatanOptions = results ? ["Semua", ...Array.from(new Set(results.map(r => r.tingkatan).filter(Boolean))).sort((a, b) => a - b).map(String)] : [];

  const filteredResults = results ? results.filter(r => {
    const matchesSearch = r.namaKelas.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (r.mataPelajaran || "Informatika").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTahun = selectedTahunAjaran === "Semua" || r.tahunAjaran === selectedTahunAjaran;
    const matchesSemester = selectedSemester === "Semua" || (r.semester || "Ganjil") === selectedSemester;
    const matchesMapel = selectedMataPelajaran === "Semua" || (r.mataPelajaran || "Informatika") === selectedMataPelajaran;
    const matchesTingkatan = selectedTingkatan === "Semua" || String(r.tingkatan) === selectedTingkatan;
    return matchesSearch && matchesTahun && matchesSemester && matchesMapel && matchesTingkatan;
  }) : [];

  // States untuk Fitur Gabung Kelas
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinKodeKelas, setJoinKodeKelas] = useState("");
  const [joinNisn, setJoinNisn] = useState("");
  const [joinNama, setJoinNama] = useState("");
  const [joinTglLahir, setJoinTglLahir] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const kelas = params.get("kelas");
      if (kelas) {
        setJoinKodeKelas(kelas);
        setJoinModalOpen(true);
        // Remove parameter from URL to prevent reopening on manual refresh
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

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

  const handlePrintKHS = () => {
    // 1. Tambahkan style element untuk set size: A4 portrait
    const printStyle = document.createElement("style");
    printStyle.id = "dynamic-print-portrait-style";
    printStyle.innerHTML = "@media print { @page { size: A4 portrait !important; margin: 15mm 15mm 15mm 15mm !important; } }";
    document.head.appendChild(printStyle);

    // 2. Tambahkan class print-portrait-mode pada body
    document.body.classList.add("print-portrait-mode");

    // 3. Panggil print dialog
    window.print();

    // 4. Bersihkan setelah dialog print ditutup
    setTimeout(() => {
      document.body.classList.remove("print-portrait-mode");
      const styleEl = document.getElementById("dynamic-print-portrait-style");
      if (styleEl) styleEl.remove();
    }, 1000);
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
    setSearchQuery("");
    setSelectedTahunAjaran("Semua");
    setSelectedSemester("Semua");
    setSelectedMataPelajaran("Semua");
    setSelectedTingkatan("Semua");

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
        
        // Scroll ke hasil pencarian secara otomatis setelah DOM di-update
        setTimeout(() => {
          const el = document.getElementById("search-results");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
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
      <main style={{ flex: 1, padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        
        {/* Split Hero Layout */}
        <div className="portal-hero-container">
          
          {/* Left Column: Branding */}
          <div className="portal-info-panel">
            <span style={{ display: "inline-block", width: "max-content", padding: "6px 12px", borderRadius: "99px", background: "var(--success-glow)", border: "1px solid rgba(16, 185, 129, 0.2)", fontSize: "0.78rem", fontWeight: "700", color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              ⚡ Cek Nilai Instan
            </span>
            <h2 style={{ fontSize: "clamp(1.75rem, 5vw, 2.8rem)", fontWeight: "800", letterSpacing: "-0.04em", lineHeight: 1.15, background: "linear-gradient(135deg, var(--text-primary) 30%, var(--primary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Pantau Hasil Belajar Kamu Secara Transparan
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
              <span>Powered by</span>
              <span style={{ fontWeight: "700", color: "var(--text-secondary)" }}>Memofy Studio</span>
            </div>
          </div>

          {/* Right Column: Search Card Form */}
          <div className="portal-form-panel">
            <div className="glass-card shadow-lg animate-fade-in" style={{ width: "100%", padding: "24px", border: "1px solid var(--border-color)" }}>
              <div style={{ marginBottom: "16px", textAlign: "center" }}>
                <h3 style={{ fontSize: "1.4rem", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Cari Nilai Siswa</h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "4px" }}>Isi form di bawah untuk mengakses nilai rapot.</p>
              </div>

              <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="nisn" style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "6px" }}>NISN Siswa</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2.5 3 6 3s6-1 6-3v-5"/></svg>
                    </span>
                    <input
                      id="nisn"
                      type="text"
                      placeholder="Contoh: 1234567890"
                      className="form-input"
                      style={{ paddingLeft: "42px" }}
                      value={nisn}
                      onChange={(e) => setNisn(e.target.value)}
                      maxLength={20}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="tgl-lahir" style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "6px" }}>Tanggal Lahir</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </span>
                    <input
                      id="tgl-lahir"
                      type="date"
                      className="form-input"
                      style={{ paddingLeft: "42px" }}
                      value={tanggalLahir}
                      onChange={(e) => setTanggalLahir(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ 
                    width: "100%", 
                    padding: "14px", 
                    marginTop: "6px",
                    fontWeight: "800",
                    fontSize: "0.95rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 12px var(--primary-glow)"
                  }} 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner" style={{ width: "16px", height: "16px", border: "2px solid #ffffff", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
                      Mencari Data...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      Cari Nilai Saya
                    </>
                  )}
                </button>
              </form>

              {error && (
                <div style={{ marginTop: "16px", padding: "10px 14px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--danger-glow)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "var(--danger)", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "8px" }} className="animate-fade-in">
                  <span style={{ fontSize: "1.1rem" }}>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Gabung Kelas Section */}
              <div style={{ marginTop: "24px", textAlign: "center", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "10px", fontWeight: "600" }}>
                  Diminta guru mendaftar mandiri?
                </p>
                <button 
                  onClick={() => setJoinModalOpen(true)}
                  className="btn btn-secondary btn-join-class" 
                  style={{ 
                    width: "100%",
                    padding: "10px 16px", 
                    fontSize: "0.85rem", 
                    fontWeight: "700",
                    borderRadius: "var(--radius-sm)", 
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    cursor: "pointer",
                    transition: "var(--transition)"
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  Gabung Kelas via Kode
                </button>
              </div>
              
              {/* Promo Section WhatsApp */}
              <div style={{ marginTop: "16px", textAlign: "center" }}>
                <a 
                  href="https://wa.me/6285157544004"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp-portal" 
                  style={{ 
                    width: "100%",
                    padding: "10px 16px", 
                    fontSize: "0.85rem", 
                    borderRadius: "var(--radius-sm)", 
                    border: "none", 
                    backgroundColor: "#25D366", 
                    color: "#fff", 
                    fontWeight: "700", 
                    display: "inline-flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    gap: "8px", 
                    textDecoration: "none",
                    transition: "var(--transition)",
                    boxShadow: "0 4px 10px rgba(37, 211, 102, 0.2)"
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                  </svg>
                  Gunakan di Sekolah Anda
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Search Results */}
        {results && results.length > 0 && (
          <div id="search-results" style={{ width: "100%", maxWidth: "900px" }} className="animate-fade-in">
            
            {/* Header pencarian */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
                <span>📊 Hasil Pencarian Nilai</span>
              </h3>
              <span className="badge badge-primary" style={{ fontSize: "0.9rem", padding: "6px 14px" }}>
                👤 {results[0].siswa.nama}
              </span>
            </div>

             {activeClassId === null ? (
              /* CARD GRID VIEW */
              <>
                {/* Filter Bar */}
                {results.length > 1 && (
                  <div className="glass-card" style={{ display: "flex", gap: "16px", flexWrap: "wrap", padding: "16px", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ flex: 1, minWidth: "200px", margin: 0 }}>
                      <input
                        type="text"
                        placeholder="🔍 Cari nama kelas atau mapel..."
                        className="form-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ padding: "8px 12px", fontSize: "0.85rem" }}
                      />
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px", width: "100%" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-secondary)" }}>Tahun Pelajaran</label>
                        <select
                          className="form-input"
                          value={selectedTahunAjaran}
                          onChange={(e) => setSelectedTahunAjaran(e.target.value)}
                          style={{ padding: "6px 12px", fontSize: "0.82rem", borderRadius: "var(--radius-sm)", width: "max-content" }}
                        >
                          {tahunAjaranOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-secondary)" }}>Semester</label>
                        <select
                          className="form-input"
                          value={selectedSemester}
                          onChange={(e) => setSelectedSemester(e.target.value)}
                          style={{ padding: "6px 12px", fontSize: "0.82rem", borderRadius: "var(--radius-sm)", width: "max-content" }}
                        >
                          {semesterOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-secondary)" }}>Mata Pelajaran</label>
                        <select
                          className="form-input"
                          value={selectedMataPelajaran}
                          onChange={(e) => setSelectedMataPelajaran(e.target.value)}
                          style={{ padding: "6px 12px", fontSize: "0.82rem", borderRadius: "var(--radius-sm)", width: "max-content" }}
                        >
                          {mataPelajaranOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-secondary)" }}>Tingkatan</label>
                        <select
                          className="form-input"
                          value={selectedTingkatan}
                          onChange={(e) => setSelectedTingkatan(e.target.value)}
                          style={{ padding: "6px 12px", fontSize: "0.82rem", borderRadius: "var(--radius-sm)", width: "max-content" }}
                        >
                          {tingkatanOptions.map(opt => <option key={opt} value={opt}>{opt === "Semua" ? "Semua" : `Kelas ${opt}`}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {(() => {
                  const activeResults = filteredResults.filter(r => !r.archived);
                  const archivedResults = filteredResults.filter(r => r.archived);

                  const renderClassCard = (res, index, isArchived = false) => {
                    const gradients = isArchived ? [
                      "linear-gradient(135deg, #64748b, #475569)",
                      "linear-gradient(135deg, #6b7280, #4b5563)",
                      "linear-gradient(135deg, #78716c, #57534e)",
                    ] : [
                      "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                      "linear-gradient(135deg, #10b981, #047857)",
                      "linear-gradient(135deg, #8b5cf6, #5b21b6)",
                      "linear-gradient(135deg, #f59e0b, #b45309)",
                      "linear-gradient(135deg, #ec4899, #be185d)",
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
                          opacity: isArchived ? 0.85 : 1,
                        }}
                        onClick={() => { setActiveClassId(res.kelasId); setSimulationScores({}); }}
                      >
                        {/* Accent Header */}
                        <div style={{ background: cardGradient, padding: "12px 16px", color: "#ffffff", position: "relative" }}>
                          <h4 style={{ fontSize: "1.35rem", fontWeight: "800", margin: 0, color: "#ffffff", paddingRight: "80px" }}>{res.namaKelas}</h4>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                            {res.tingkatan && (
                              <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.25)", color: "#ffffff", fontWeight: "700" }}>
                                🎓 Kelas {res.tingkatan}
                              </span>
                            )}
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
                        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "14px", flex: 1 }}>
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

                          {/* Progress Komponen Terisi */}
                          {res.totalAspekCount > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                              <span>Progres Komponen Terisi:</span>
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
                            padding: "12px 16px", 
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
                  };

                  if (filteredResults.length === 0) {
                    return (
                      <div style={{ padding: "60px 20px", textAlign: "center", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-color)" }}>
                        <h3 style={{ fontSize: "1.25rem", color: "var(--text-secondary)", marginBottom: "8px" }}>Pencarian Tidak Ditemukan</h3>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Tidak ada kelas yang cocok dengan filter pencarian Anda.</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* Kelas Aktif */}
                      {activeResults.length > 0 && (
                        <div style={{ marginTop: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                            <span style={{ fontSize: "1.05rem", fontWeight: "800", color: "var(--text-primary)" }}>🟢 Kelas Aktif</span>
                            <span style={{ fontSize: "0.72rem", fontWeight: "700", padding: "3px 10px", borderRadius: "99px", backgroundColor: "rgba(16,185,129,0.12)", color: "var(--success)", border: "1px solid rgba(16,185,129,0.25)" }}>{activeResults.length}</span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
                            {activeResults.map((res, index) => renderClassCard(res, index, false))}
                          </div>
                        </div>
                      )}

                      {/* Kelas Arsip */}
                      {archivedResults.length > 0 && (
                        <div style={{ marginTop: activeResults.length > 0 ? "36px" : "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", paddingTop: activeResults.length > 0 ? "20px" : "0", borderTop: activeResults.length > 0 ? "1px dashed var(--border-color)" : "none" }}>
                            <span style={{ fontSize: "1.05rem", fontWeight: "800", color: "var(--text-secondary)" }}>📦 Kelas Arsip</span>
                            <span style={{ fontSize: "0.72rem", fontWeight: "700", padding: "3px 10px", borderRadius: "99px", backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)", border: "1px solid var(--border-color)" }}>{archivedResults.length}</span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
                            {archivedResults.map((res, index) => renderClassCard(res, index, true))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            ) : (
              /* DETAIL CLASS VIEW WITH BACK BUTTON */
              <div>
                <button
                  onClick={() => { setActiveClassId(null); setSimulationScores({}); setIsSimulatorOpen(false); }}
                  className="btn btn-secondary animate-fade-in no-print"
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
                  
                  // Hanya jalankan simulasi jika ada komponen kosong atau nilai akhir belum dipublish
                  let simTotalNilai = 0;
                  let simTotalBobot = 0;
                  
                  res.detailNilai.forEach((col) => {
                    let scoreVal = col.nilaiAsli;
                    if (scoreVal === null || scoreVal === "-" || scoreVal === "") {
                      if (simulationScores[col.kolomId] !== undefined && simulationScores[col.kolomId] !== "") {
                        scoreVal = Number(simulationScores[col.kolomId]);
                        isSimulated = true;
                      } else {
                        scoreVal = null;
                      }
                    }
                    
                    if (scoreVal !== null && scoreVal !== "" && scoreVal !== "-") {
                      const valNum = Number(scoreVal);
                      if (!isNaN(valNum)) {
                        simTotalNilai += valNum * (col.bobot / 100);
                        simTotalBobot += col.bobot;
                      }
                    }
                  });

                  if (isSimulated) {
                    const simFinal = simTotalNilai + (res.katrol || 0);
                    displayNilaiAkhir = Number(simFinal.toFixed(2));
                    
                    displayPredikat = 'E';
                    if (displayNilaiAkhir >= res.skema.A) displayPredikat = 'A';
                    else if (displayNilaiAkhir >= res.skema.B) displayPredikat = 'B';
                    else if (displayNilaiAkhir >= res.skema.C) displayPredikat = 'C';
                    else if (displayNilaiAkhir >= res.skema.D) displayPredikat = 'D';
                  }

                  return (
                    <div id={`rapor-card-${res.kelasId}`} key={res.kelasId} className="glass-card animate-fade-in" style={{ borderTop: "4px solid var(--primary)", position: "relative" }}>
                      
                      <div className="no-print">
                        {/* Class Title Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid var(--border-color)" }}>
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
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "8px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", marginBottom: "20px" }}>
                          <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>🔒</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "var(--warning)" }}>Nilai Akhir belum dirilis</span>
                            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginLeft: "6px" }}>— gunakan Simulasi untuk estimasi</span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid-cols-1" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
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

                      {/* Info Bonus Keaktifan */}
                      {res.skema?.enableBonusStars && res.bonusStars > 0 && (
                        <div style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "var(--radius-sm)", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 4px 14px rgba(16, 185, 129, 0.05)" }}>
                          <span style={{ fontSize: "1.8rem" }}>⭐</span>
                          <div>
                            <h5 style={{ margin: "0 0 4px 0", fontSize: "0.95rem", fontWeight: "800", color: "var(--success)" }}>Apresiasi Keaktifan: +{res.bonusStars} Poin Bonus!</h5>
                            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>Selamat! Anda mendapatkan bintang keaktifan kelas. Tambahan {res.bonusStars} poin ini <strong>sudah otomatis ditambahkan</strong> ke dalam akumulasi Nilai Akhir Anda.</p>
                          </div>
                        </div>
                      )}

                      {/* Compact Action Toolbar */}
                      <div className="no-print compact-action-toolbar" data-html2canvas-ignore="true">
                        {(!res.isLengkap || res.jumlahAspekTerisi < res.totalAspekCount) && (
                          <button
                            onClick={() => setIsSimulatorOpen(true)}
                            className="compact-action-btn"
                            style={{ border: "1px solid rgba(59,130,246,0.25)", background: "rgba(59,130,246,0.08)", color: "var(--primary)" }}
                          >
                            ✨ Simulasi
                          </button>
                        )}
                        {res.rekapPresensi && res.rekapPresensi.totalPertemuan > 0 && (
                          <button
                            onClick={() => setIsPresensiOpen(true)}
                            className="compact-action-btn"
                            style={{ border: "1px solid rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.08)", color: "#6366f1" }}
                          >
                            📅 Presensi
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadImage(res.kelasId)}
                          disabled={isGenerating}
                          className="compact-action-btn"
                          style={{ border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.08)", color: "#10b981", cursor: isGenerating ? "wait" : "pointer", opacity: isGenerating ? 0.6 : 1 }}
                        >
                          {isGenerating ? "⏳ ..." : "📸 Bagikan"}
                        </button>
                        <button
                          onClick={handlePrintKHS}
                          className="compact-action-btn"
                          style={{ border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.08)", color: "#d97706" }}
                        >
                          🖨️ Cetak
                        </button>
                      </div>
                      
                      {/* Catatan Tambahan Guru (Jika ada) */}
                      {res.siswa.catatan && (
                        <div 
                          className="animate-fade-in" 
                          style={{ 
                            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(251, 191, 36, 0.15) 100%)", 
                            border: "1px solid rgba(245, 158, 11, 0.25)",
                            borderLeft: "6px solid var(--warning)", 
                            borderRadius: "var(--radius-md)", 
                            padding: "12px 16px", 
                            marginBottom: "16px", 
                            boxShadow: "var(--shadow-md), 0 8px 24px -10px rgba(245, 158, 11, 0.2)",
                            display: "flex", 
                            flexDirection: "column", 
                            gap: "10px",
                            position: "relative",
                            overflow: "hidden"
                          }}
                        >
                          {/* Decorative quote mark background */}
                          <div style={{
                            position: "absolute",
                            right: "12px",
                            bottom: "-15px",
                            fontSize: "6.5rem",
                            color: "rgba(245, 158, 11, 0.08)",
                            fontFamily: "Georgia, serif",
                            lineHeight: 1,
                            pointerEvents: "none",
                            userSelect: "none"
                          }}>
                            ”
                          </div>
                          
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "34px",
                              height: "34px",
                              borderRadius: "8px",
                              backgroundColor: "var(--warning)",
                              color: "#fff",
                              boxShadow: "0 4px 10px rgba(245, 158, 11, 0.3)"
                            }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </div>
                            <span style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Catatan & Umpan Balik Guru
                            </span>
                          </div>
                          
                          <p style={{ 
                            fontSize: "1.05rem", 
                            color: "var(--text-primary)", 
                            fontWeight: "600", 
                            fontStyle: "italic", 
                            margin: 0, 
                            lineHeight: "1.6",
                            paddingLeft: "2px",
                            position: "relative",
                            zIndex: 1
                          }}>
                            "{res.siswa.catatan}"
                          </p>
                        </div>
                      )}


                      {/* Attendance Recap Card */}
                      {res.rekapPresensi && res.rekapPresensi.totalPertemuan > 0 && (
                        <div 
                          className="glass-card animate-fade-in" 
                          style={{ 
                            padding: "20px", 
                            borderRadius: "var(--radius-md)", 
                            border: "1px solid var(--border-color)", 
                            backgroundColor: "var(--bg-secondary)", 
                            marginBottom: "16px",
                            boxShadow: "var(--shadow-sm)"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                            <span style={{ fontSize: "1.2rem" }}>📊</span>
                            <h5 style={{ fontSize: "0.95rem", fontWeight: "800", color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-heading)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Rekapan Presensi & Kehadiran
                            </h5>
                          </div>

                          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                            {/* Left Side: Large Percentage Circle */}
                            <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: "220px", flex: 1 }}>
                              <div 
                                style={{ 
                                  width: "64px", 
                                  height: "64px", 
                                  borderRadius: "50%", 
                                  background: "var(--success-glow)", 
                                  border: "2px solid var(--success)",
                                  display: "flex", 
                                  flexDirection: "column",
                                  alignItems: "center", 
                                  justifyContent: "center",
                                  flexShrink: 0
                                }}
                              >
                                <span style={{ fontSize: "1.15rem", fontWeight: "800", color: "var(--success)", lineHeight: 1 }}>
                                  {res.rekapPresensi.persentase}%
                                </span>
                              </div>
                              <div style={{ flex: 1 }}>
                                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase" }}>Kehadiran Siswa</span>
                                <div style={{ width: "100%", height: "6px", backgroundColor: "var(--bg-tertiary)", borderRadius: "99px", overflow: "hidden", marginTop: "4px", marginBottom: "4px" }}>
                                  <div style={{ width: `${res.rekapPresensi.persentase}%`, height: "100%", backgroundColor: "var(--success)", borderRadius: "99px" }} />
                                </div>
                                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: "600" }}>
                                  Hadir {res.rekapPresensi.summary.H} dari {res.rekapPresensi.totalPertemuan} pertemuan
                                </span>
                              </div>
                            </div>

                            {/* Right Side: Grid of Details */}
                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", flex: 1.2 }}>
                              <div style={{ flex: 1, minWidth: "60px", background: "var(--bg-tertiary)", padding: "10px", borderRadius: "8px", textAlign: "center", border: "1px solid var(--border-color)" }}>
                                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase" }}>Izin</div>
                                <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--warning)", marginTop: "2px" }}>{res.rekapPresensi.summary.I || 0}</div>
                              </div>
                              <div style={{ flex: 1, minWidth: "60px", background: "var(--bg-tertiary)", padding: "10px", borderRadius: "8px", textAlign: "center", border: "1px solid var(--border-color)" }}>
                                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase" }}>Sakit</div>
                                <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#3b82f6", marginTop: "2px" }}>{res.rekapPresensi.summary.S || 0}</div>
                              </div>
                              {res.rekapPresensi.summary.D > 0 && (
                                <div style={{ flex: 1, minWidth: "60px", background: "var(--bg-tertiary)", padding: "10px", borderRadius: "8px", textAlign: "center", border: "1px solid var(--border-color)" }}>
                                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase" }}>Dispen</div>
                                  <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#8b5cf6", marginTop: "2px" }}>{res.rekapPresensi.summary.D}</div>
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: "60px", background: "var(--bg-tertiary)", padding: "10px", borderRadius: "8px", textAlign: "center", border: "1px solid var(--border-color)" }}>
                                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase" }}>Alfa</div>
                                <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--danger)", marginTop: "2px" }}>{res.rekapPresensi.summary.A || 0}</div>
                              </div>
                            </div>
                          </div>
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
                            </tr>
                          </thead>
                          <tbody>
                            {res.detailNilai.map((col) => (
                              <>
                                {/* Baris komponen utama / grup */}
                                <tr key={col.kolomId} style={col.isGroup ? { backgroundColor: "rgba(59,130,246,0.06)", borderBottom: "none" } : col.isPresensi ? { backgroundColor: "rgba(16,185,129,0.06)" } : {}}>
                                  <td style={{ fontWeight: col.isGroup ? "800" : "600" }}>
                                    {col.isGroup && <span style={{ fontSize: "0.7rem", backgroundColor: "var(--primary-glow)", color: "var(--primary)", border: "1px solid var(--primary)", padding: "1px 5px", borderRadius: "4px", marginRight: "6px", fontWeight: "700" }}>GRUP</span>}
                                    {col.isPresensi && <span style={{ fontSize: "0.7rem", backgroundColor: "rgba(16,185,129,0.1)", color: "var(--success)", border: "1px solid var(--success)", padding: "1px 5px", borderRadius: "4px", marginRight: "6px", fontWeight: "700" }}>📅 PRESENSI</span>}
                                    {col.namaKolom}
                                  </td>
                                  <td>{col.bobot}%</td>
                                  <td style={{
                                    fontWeight: "700",
                                    color: col.isMayoritasSudah
                                      ? "var(--warning, #d97706)"
                                      : col.nilaiAsli === null || col.nilaiAsli === "" || col.nilaiAsli === "-"
                                        ? "var(--text-muted)"
                                        : col.nilaiAsli === "Tuntas" || (typeof col.nilaiAsli === 'number' && col.nilaiAsli >= res.kkm)
                                          ? "var(--success)"
                                          : col.nilaiAsli === "Belum Tuntas" || (typeof col.nilaiAsli === 'number' && col.nilaiAsli < res.kkm)
                                            ? "var(--danger)"
                                            : "var(--text-primary)"
                                  }}>
                                    {col.isMayoritasSudah ? (
                                      <span title="Mayoritas siswa di kelas sudah memiliki nilai untuk komponen ini" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                        Kosong (Mayoritas Kelas Sudah Dinilai) ⚠️
                                      </span>
                                    ) : (
                                      col.nilaiAsli === null || col.nilaiAsli === "" || col.nilaiAsli === "-" ? "Belum Diisi" : col.nilaiAsli
                                    )}
                                    {col.isGroup && col.nilaiAsli !== null && col.nilaiAsli !== "-" && col.hitungMetode !== "persentase" && (
                                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "500", marginLeft: "4px" }}>(rata-rata)</span>
                                    )}
                                    {col.isPresensi && col.nilaiAsli !== null && col.nilaiAsli !== "-" && (
                                      <span style={{ fontSize: "0.7rem", color: "var(--success)", fontWeight: "500", marginLeft: "4px" }}>(dari presensi)</span>
                                    )}
                                  </td>
                                </tr>

                                {/* Baris sub-komponen (indent, hanya jika isGroup) */}
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
                                      color: sub.isMayoritasSudah
                                        ? "var(--warning, #d97706)"
                                        : sub.nilaiAsli === null
                                          ? "var(--text-muted)"
                                          : sub.nilaiAsli >= res.kkm
                                            ? "var(--success)"
                                            : "var(--danger)"
                                    }}>
                                      {sub.isMayoritasSudah ? (
                                        <span title="Mayoritas siswa di kelas sudah memiliki nilai untuk sub-komponen ini" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                          Kosong (Mayoritas Kelas Sudah Dinilai) ⚠️
                                        </span>
                                      ) : (
                                        sub.nilaiAsli === null ? "Belum Diisi" : sub.nilaiAsli
                                      )}
                                    </td>
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
                      </div> {/* End of no-print wrapper */}

                      {/* PORTRAIT KHS / RAPOR BAYANGAN PRINT-ONLY VIEW */}
                      {(() => {
                        const config = res.skemaPenilaian?.laporanConfig || res.skema?.laporanConfig || {
                          namaSekolah: "",
                          alamatSekolah: "",
                          telpSekolah: "",
                          namaKepsek: "",
                          nipKepsek: "",
                          kotaCetak: "",
                          nipGuru: ""
                        };

                        return (
                          <div id="printable-khs-area">
                            {/* KOP SEKOLAH */}
                            <div className="khs-kop">
                              <h2>LAPORAN HASIL BELAJAR SISWA</h2>
                              <h3>{config.namaSekolah}</h3>
                              <p>Alamat: {config.alamatSekolah} &bull; Telp: {config.telpSekolah}</p>
                            </div>

                            <div className="khs-title">KARTU HASIL STUDI (RAPOR BAYANGAN)</div>

                            {/* BIODATA SISWA */}
                            <table className="khs-identity-table">
                              <tbody>
                                <tr>
                                  <td style={{ width: "15%", fontWeight: "bold" }}>Nama Siswa</td>
                                  <td style={{ width: "2%" }}>:</td>
                                  <td style={{ width: "33%" }}><strong>{res.siswa.nama}</strong></td>
                                  <td style={{ width: "15%", fontWeight: "bold" }}>Mata Pelajaran</td>
                                  <td style={{ width: "2%" }}>:</td>
                                  <td style={{ width: "33%" }}>{res.mataPelajaran || "Informatika"}</td>
                                </tr>
                                <tr>
                                  <td style={{ fontWeight: "bold" }}>NISN</td>
                                  <td>:</td>
                                  <td>{res.siswa.nisn}</td>
                                  <td style={{ fontWeight: "bold" }}>Kelas</td>
                                  <td>:</td>
                                  <td>{res.namaKelas}</td>
                                </tr>
                                <tr>
                                  <td style={{ fontWeight: "bold" }}>Tahun Ajaran</td>
                                  <td>:</td>
                                  <td>{res.tahunAjaran}</td>
                                  <td style={{ fontWeight: "bold" }}>Semester</td>
                                  <td>:</td>
                                  <td>{res.semester || "Ganjil"}</td>
                                </tr>
                              </tbody>
                            </table>

                            {/* TABEL NILAI */}
                            <table className="khs-grades-table">
                              <thead>
                                <tr>
                                  <th style={{ width: "5%", textAlign: "center" }}>No</th>
                                  <th style={{ width: "50%", textAlign: "left" }}>Komponen Penilaian</th>
                                  <th style={{ width: "15%", textAlign: "center" }}>KKM</th>
                                  <th style={{ width: "15%", textAlign: "center" }}>Nilai Angka</th>
                                  <th style={{ width: "15%", textAlign: "center" }}>Keterangan</th>
                                </tr>
                              </thead>
                              <tbody>
                                {res.detailNilai.map((col, idx) => {
                                  const isTuntas = col.nilaiAsli === "Tuntas" || (typeof col.nilaiAsli === 'number' && col.nilaiAsli >= res.kkm);
                                  const ketText = col.isMayoritasSudah
                                    ? "Kosong (Mayoritas Kelas Sudah Dinilai)"
                                    : (col.nilaiAsli === null || col.nilaiAsli === "" || col.nilaiAsli === "-" 
                                       ? "Belum Diisi" 
                                       : isTuntas ? "Tuntas" : "Belum Tuntas");
                                    
                                  return (
                                    <Fragment key={col.kolomId}>
                                      {/* Baris Komponen Utama */}
                                      <tr style={col.isGroup ? { fontWeight: "bold" } : {}}>
                                        <td style={{ textAlign: "center" }}>{idx + 1}</td>
                                        <td style={{ textAlign: "left" }}>
                                          {col.isGroup && <span style={{ fontSize: "0.7rem", border: "1.5px solid #000", padding: "1px 4px", marginRight: "6px", fontWeight: "bold" }}>GRUP</span>}
                                          {col.namaKolom}
                                          {(res.skemaPenilaian?.tpConfig?.[col.kolomId] || res.skema?.tpConfig?.[col.kolomId]) && (
                                            <div style={{ fontSize: "0.75rem", fontStyle: "italic", fontWeight: "normal", color: "#4b5563", marginTop: "2px" }}>
                                              {res.skemaPenilaian?.tpConfig?.[col.kolomId] || res.skema?.tpConfig?.[col.kolomId]}
                                            </div>
                                          )}
                                        </td>
                                        <td style={{ textAlign: "center" }}>{res.kkm}</td>
                                        <td style={{ textAlign: "center", fontWeight: "bold" }}>
                                          {col.nilaiAsli === null || col.nilaiAsli === "" || col.nilaiAsli === "-" ? "—" : col.nilaiAsli}
                                        </td>
                                        <td style={{ textAlign: "center", fontWeight: "bold", color: col.isMayoritasSudah ? "#d97706" : isTuntas ? "#15803d" : "#b91c1c" }}>
                                          {ketText}
                                        </td>
                                      </tr>

                                      {/* Baris sub-komponen jika merupakan Grup */}
                                      {col.isGroup && col.subDetail?.map((sub) => {
                                        const subTuntas = sub.nilaiAsli !== null && sub.nilaiAsli >= res.kkm;
                                        const subKet = sub.isMayoritasSudah
                                          ? "Kosong (Mayoritas Kelas Sudah Dinilai)"
                                          : (sub.nilaiAsli === null ? "Belum Diisi" : subTuntas ? "Tuntas" : "Belum Tuntas");
                                        const subTp = res.skemaPenilaian?.tpConfig?.[sub.subId] || res.skema?.tpConfig?.[sub.subId];
                                        return (
                                          <tr key={sub.subId} className="khs-sub-row">
                                            <td></td>
                                            <td style={{ fontStyle: "italic" }}>
                                              ↳ {sub.nama}
                                              {subTp && (
                                                <div style={{ fontSize: "0.72rem", fontStyle: "italic", fontWeight: "normal", color: "#4b5563", marginTop: "1px", paddingLeft: "12px" }}>
                                                  {subTp}
                                                </div>
                                              )}
                                            </td>
                                            <td style={{ textAlign: "center" }}>{res.kkm}</td>
                                            <td style={{ textAlign: "center" }}>
                                              {sub.nilaiAsli === null ? "—" : sub.nilaiAsli}
                                            </td>
                                            <td style={{ textAlign: "center", fontSize: "0.85em", color: sub.isMayoritasSudah ? "#d97706" : subTuntas ? "#15803d" : "#b91c1c" }}>
                                              {subKet}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </Fragment>
                                  );
                                })}
                              </tbody>
                            </table>

                            {/* RINGKASAN HASIL AKHIR */}
                            <div className="khs-summary-box">
                              <div className="khs-summary-column">
                                <div className="khs-summary-item">
                                  <span>KKM Kelulusan</span>
                                  <strong>{res.kkm}</strong>
                                </div>
                                <div className="khs-summary-item">
                                  <span>Nilai Akhir Rapor</span>
                                  <strong>{res.isNilaiAkhirGenerated ? res.nilaiAkhir : "🔒 Sedang Diproses"}</strong>
                                </div>
                              </div>
                              <div className="khs-summary-column">
                                <div className="khs-summary-item">
                                  <span>Predikat Capaian</span>
                                  <strong>{res.isNilaiAkhirGenerated ? res.predikat : "🔒"}</strong>
                                </div>
                                <div className="khs-summary-item">
                                  <span>Status Kelulusan</span>
                                  <strong style={{ color: res.nilaiAkhir >= res.kkm ? "#15803d" : "#b91c1c" }}>
                                    {res.isNilaiAkhirGenerated ? res.statusKelulusan : "🔒 Menunggu"}
                                  </strong>
                                </div>
                              </div>
                            </div>

                            {/* PRESENSI KEHADIRAN (Hanya jika diaktifkan) */}
                            {res.rekapPresensi && res.rekapPresensi.totalPertemuan > 0 && (
                              <div style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                                <h4 style={{ margin: "10pt 0 4pt 0", fontSize: "10pt", fontWeight: "bold" }}>Rekapitulasi Kehadiran</h4>
                                <table className="khs-presensi-table">
                                  <thead>
                                    <tr>
                                      <th style={{ width: "70%" }}>Keadaan Kehadiran</th>
                                      <th style={{ width: "30%", textAlign: "center" }}>Jumlah Hari</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td>1. Hadir (H)</td>
                                      <td>{res.rekapPresensi.summary.H || 0} hari</td>
                                    </tr>
                                    <tr>
                                      <td>2. Izin (I)</td>
                                      <td>{res.rekapPresensi.summary.I || 0} hari</td>
                                    </tr>
                                    <tr>
                                      <td>3. Sakit (S)</td>
                                      <td>{res.rekapPresensi.summary.S || 0} hari</td>
                                    </tr>
                                    <tr>
                                      <td>4. Dispensasi (D)</td>
                                      <td>{res.rekapPresensi.summary.D || 0} hari</td>
                                    </tr>
                                    <tr>
                                      <td>5. Alpha (A)</td>
                                      <td>{res.rekapPresensi.summary.A || 0} hari</td>
                                    </tr>
                                    <tr>
                                      <td>6. Persentase Kehadiran</td>
                                      <td>{res.rekapPresensi.persentase || 0}%</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* CATATAN GURU */}
                            {res.siswa.catatan && (
                              <div style={{ marginTop: "10pt", pageBreakInside: "avoid", breakInside: "avoid" }}>
                                <h4 style={{ margin: "0 0 4pt 0", fontSize: "10pt", fontWeight: "bold" }}>Catatan Perkembangan dari Guru</h4>
                                <div className="khs-catatan-box">
                                  "{res.siswa.catatan}"
                                </div>
                              </div>
                            )}

                            {/* TANDA TANGAN (SIGNATURES) */}
                            <div className="khs-signature-section">
                              <div className="khs-signature-col" style={{ width: "30%" }}>
                                <span>Orang Tua / Wali Siswa,</span>
                                <span style={{ borderBottom: "1px solid #000000", width: "120px", margin: "40px auto 0 auto" }}></span>
                              </div>
                              
                              <div className="khs-signature-col" style={{ width: "40%" }}>
                                <span>Mengetahui,</span>
                                <span>Kepala Sekolah,</span>
                                <span style={{ fontWeight: "bold", borderBottom: "1px solid #000000", width: "160px", margin: "30px auto 0 auto" }}>
                                  {config.namaKepsek}
                                </span>
                                <span style={{ fontSize: "0.8em" }}>NIP. {config.nipKepsek}</span>
                              </div>

                              <div className="khs-signature-col" style={{ width: "30%" }}>
                                <span>{config.kotaCetak || "Jakarta"}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                                <span>Guru Pengampu,</span>
                                <span style={{ fontWeight: "bold", borderBottom: "1px solid #000000", width: "120px", margin: "30px auto 0 auto" }}>
                                  {res.guruNama}
                                </span>
                                <span style={{ fontSize: "0.8em" }}>{config.nipGuru && config.nipGuru !== "-" ? `NIP. ${config.nipGuru}` : "NIP. —"}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Simulator Modal Pop-up */}
                      {isSimulatorOpen && (
                        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} className="animate-fade-in">
                          <div className="glass-card" style={{ width: "90%", maxWidth: "500px", padding: "30px", display: "flex", flexDirection: "column", gap: "12px", position: "relative", backgroundColor: "var(--bg-primary)" }}>
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
                              {res.detailNilai.map((col) => (col.nilaiAsli === null || col.nilaiAsli === "-" || col.nilaiAsli === "") ? (
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

                      {/* Attendance Recap Modal Pop-up */}
                      {isPresensiOpen && res.rekapPresensi && res.rekapPresensi.totalPertemuan > 0 && (
                        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} className="animate-fade-in">
                          <div className="glass-card" style={{ width: "90%", maxWidth: "600px", padding: "30px", display: "flex", flexDirection: "column", gap: "12px", position: "relative", backgroundColor: "var(--bg-primary)", maxHeight: "90vh", overflow: "hidden" }}>
                            <button onClick={() => setIsPresensiOpen(false)} style={{ position: "absolute", top: "15px", right: "15px", background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)", zIndex: 10 }}>✕</button>
                            
                            <div style={{ textAlign: "center" }}>
                              <span style={{ fontSize: "2rem" }}>📅</span>
                              <h3 style={{ fontSize: "1.3rem", fontWeight: "800", color: "var(--primary)", marginTop: "10px", marginBottom: "4px" }}>Rekap Presensi Kehadiran</h3>
                              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.5" }}>Detail catatan kehadiran Anda selama semester ini.</p>
                            </div>
                            
                            {/* Attendance Summary Cards */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: "8px", textAlign: "center" }}>
                              <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "10px 3px", borderRadius: "var(--radius-sm)" }}>
                                <div style={{ fontSize: "0.65rem", color: "var(--success)", fontWeight: "800" }}>HADIR</div>
                                <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--success)" }}>{res.rekapPresensi.summary.H}</div>
                              </div>
                              <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)", padding: "10px 3px", borderRadius: "var(--radius-sm)" }}>
                                <div style={{ fontSize: "0.65rem", color: "var(--warning)", fontWeight: "800" }}>IZIN</div>
                                <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--warning)" }}>{res.rekapPresensi.summary.I}</div>
                              </div>
                              <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: "10px 3px", borderRadius: "var(--radius-sm)" }}>
                                <div style={{ fontSize: "0.65rem", color: "#3b82f6", fontWeight: "800" }}>SAKIT</div>
                                <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#3b82f6" }}>{res.rekapPresensi.summary.S}</div>
                              </div>
                              <div style={{ background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.2)", padding: "10px 3px", borderRadius: "var(--radius-sm)" }}>
                                <div style={{ fontSize: "0.65rem", color: "#8b5cf6", fontWeight: "800" }}>DISPEN</div>
                                <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#8b5cf6" }}>{res.rekapPresensi.summary.D || 0}</div>
                              </div>
                              <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "10px 3px", borderRadius: "var(--radius-sm)" }}>
                                <div style={{ fontSize: "0.65rem", color: "var(--danger)", fontWeight: "800" }}>ALPHA</div>
                                <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--danger)" }}>{res.rekapPresensi.summary.A}</div>
                              </div>
                              <div style={{ background: "var(--primary-glow)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: "10px 3px", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                <div style={{ fontSize: "0.6rem", color: "var(--primary)", fontWeight: "800" }}>HADIR %</div>
                                <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--primary)" }}>{res.rekapPresensi.persentase}%</div>
                              </div>
                            </div>

                            {/* Meeting list */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "40vh", overflowY: "auto", paddingRight: "10px" }}>
                              <table className="premium-table" style={{ fontSize: "0.85rem" }}>
                                <thead>
                                  <tr>
                                    <th>Pertemuan</th>
                                    <th>Tanggal</th>
                                    <th>Materi</th>
                                    <th style={{ textAlign: "center" }}>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {res.rekapPresensi.detail.map((p, idx) => (
                                    <tr key={p.pertemuanId || idx}>
                                      <td style={{ fontWeight: "700" }}>{p.nama}</td>
                                      <td>{p.tanggal ? new Date(p.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : "-"}</td>
                                      <td style={{ color: "var(--text-secondary)" }}>{p.materi || "—"}</td>
                                      <td style={{ textAlign: "center" }}>
                                        <span style={{ 
                                          fontWeight: "800", 
                                          fontSize: "0.85rem",
                                          padding: "2px 8px",
                                          borderRadius: "4px",
                                          backgroundColor: 
                                            p.status === 'H' ? "rgba(16, 185, 129, 0.15)" :
                                            p.status === 'I' ? "rgba(245, 158, 11, 0.15)" :
                                            p.status === 'S' ? "rgba(59, 130, 246, 0.15)" :
                                            p.status === 'D' ? "rgba(139, 92, 246, 0.15)" :
                                            p.status === 'A' ? "rgba(239, 68, 68, 0.15)" : "rgba(255,255,255,0.05)",
                                          color:
                                            p.status === 'H' ? "var(--success)" :
                                            p.status === 'I' ? "var(--warning)" :
                                            p.status === 'S' ? "#3b82f6" :
                                            p.status === 'D' ? "#8b5cf6" :
                                            p.status === 'A' ? "var(--danger)" : "var(--text-muted)"
                                        }}>
                                          {p.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            
                            <button onClick={() => setIsPresensiOpen(false)} className="btn btn-secondary" style={{ width: "100%", padding: "10px", fontSize: "0.85rem" }}>Tutup</button>
                          </div>
                        </div>
                      )}

                      {/* Off-Screen Dashboard for Export (Portrait mode 4:5 ratio = 1000x1250) */}
                      <div id={`export-dashboard-${res.kelasId}`} style={{
                        position: "absolute", left: "-9999px", top: 0, width: "1000px", minHeight: "1250px", height: "auto",
                        backgroundColor: "#0f172a", padding: "60px 70px", 
                        boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "12px",
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
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
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
                          
                          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                            {res.isNilaiAkhirGenerated && (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
                                <span style={{ backgroundColor: res.nilaiAkhir >= res.kkm ? "rgba(16, 185, 129, 0.2)" : "rgba(244, 63, 94, 0.2)", color: res.nilaiAkhir >= res.kkm ? "#34d399" : "#fb7185", padding: "12px 16px", borderRadius: "99px", fontSize: "1.4rem", fontWeight: "800" }}>
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
                                      nama: `${aspectName} - ${sub.nama || "sub-komponen"}`,
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
                                          {col.isSub ? `sub-komponen (Bobot ${col.bobot}%)` : `Bobot {col.bobot}%`}
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
                                            {col.isSub ? `sub-komponen (Bobot ${col.bobot}%)` : `Bobot ${col.bobot}%`}
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

                        {/* SECTION 5: Rekap Presensi */}
                        {res.rekapPresensi && res.rekapPresensi.totalPertemuan > 0 && (
                          <div style={{ backgroundColor: "#1e293b", padding: "30px", borderRadius: "20px", border: "1px solid #334155" }}>
                            <p style={{ color: "#38bdf8", fontSize: "1.1rem", margin: "0 0 16px 0", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase" }}>5. Rekap Presensi Kehadiran</p>
                            
                            <div style={{ display: "flex", gap: "40px", alignItems: "center" }}>
                              {/* Summary badges */}
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", flex: 1 }}>
                                <div style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "12px 6px", borderRadius: "12px", textAlign: "center" }}>
                                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#34d399", fontWeight: "800" }}>HADIR</p>
                                  <h4 style={{ margin: "4px 0 0 0", fontSize: "1.8rem", fontWeight: "800", color: "#10b981" }}>{res.rekapPresensi.summary.H}</h4>
                                </div>
                                <div style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)", padding: "12px 6px", borderRadius: "12px", textAlign: "center" }}>
                                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#fbbf24", fontWeight: "800" }}>IZIN</p>
                                  <h4 style={{ margin: "4px 0 0 0", fontSize: "1.8rem", fontWeight: "800", color: "#f59e0b" }}>{res.rekapPresensi.summary.I}</h4>
                                </div>
                                <div style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: "12px 6px", borderRadius: "12px", textAlign: "center" }}>
                                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#60a5fa", fontWeight: "800" }}>SAKIT</p>
                                  <h4 style={{ margin: "4px 0 0 0", fontSize: "1.8rem", fontWeight: "800", color: "#3b82f6" }}>{res.rekapPresensi.summary.S}</h4>
                                </div>
                                <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "12px 6px", borderRadius: "12px", textAlign: "center" }}>
                                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#f87171", fontWeight: "800" }}>ALFA</p>
                                  <h4 style={{ margin: "4px 0 0 0", fontSize: "1.8rem", fontWeight: "800", color: "#ef4444" }}>{res.rekapPresensi.summary.A}</h4>
                                </div>
                                <div style={{ backgroundColor: "rgba(59, 130, 246, 0.2)", border: "1px solid rgba(59, 130, 246, 0.3)", padding: "12px 6px", borderRadius: "12px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#38bdf8", fontWeight: "800" }}>PERSENTASE</p>
                                  <h4 style={{ margin: "4px 0 0 0", fontSize: "1.6rem", fontWeight: "800", color: "#38bdf8" }}>{res.rekapPresensi.persentase}%</h4>
                                </div>
                              </div>

                              <div style={{ width: "300px", color: "#cbd5e1", fontSize: "0.95rem", lineHeight: "1.4" }}>
                                <p style={{ margin: 0 }}>
                                  Total Pertemuan: <strong>{res.rekapPresensi.totalPertemuan}</strong> kali
                                </p>
                                <p style={{ margin: "4px 0 0 0" }}>
                                  Kehadiran dinilai dengan bobot dari guru sebesar <strong>{res.rekapPresensi.bobot}%</strong> dari nilai akhir.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

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


      </div>

      {/* Modal Preview Gambar (Global to Portal) */}
      {generatedImage && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(8px)", padding: "20px" }} className="animate-fade-in">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", width: "100%", maxWidth: "450px" }}>
            
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
        .portal-hero-container {
          display: flex;
          width: 100%;
          max-width: 960px;
          gap: 48px;
          align-items: center;
          margin: 20px auto 40px auto;
        }
        .portal-info-panel {
          flex: 1.1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .portal-form-panel {
          flex: 0.9;
          width: 100%;
          max-width: 440px;
        }
        .btn-join-class:hover {
          background-color: var(--bg-tertiary) !important;
          color: var(--primary) !important;
          border-color: var(--primary) !important;
        }
        .btn-whatsapp-portal:hover {
          background-color: #128C7E !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 14px rgba(37, 211, 102, 0.3) !important;
        }
        .compact-action-toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 24px;
          margin-top: 8px;
          padding: 8px 4px;
          border-top: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
          flex-wrap: wrap;
          width: 100%;
        }
        .compact-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 14px;
          font-size: 0.8rem;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          white-space: nowrap;
          transition: var(--transition);
          flex: 1 1 calc(50% - 8px);
          min-width: 120px;
          text-align: center;
        }
        @media (min-width: 600px) {
          .compact-action-btn {
            flex: 0 1 auto;
            min-width: auto;
          }
        }
        @media (max-width: 900px) {
          .portal-hero-container {
            flex-direction: column;
            gap: 36px;
            margin-top: 10px;
            margin-bottom: 20px;
          }
          .portal-info-panel {
            text-align: center;
            align-items: center;
          }
          .portal-steps-list {
            display: none !important;
          }
          .portal-form-panel {
            max-width: 100%;
          }
        }
      `}</style>
    </>
  );
}
