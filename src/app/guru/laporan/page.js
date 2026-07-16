"use client";

import { useState, useEffect } from "react";

export default function CetakLaporan() {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [kelas, setKelas] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);
  const [guruProfile, setGuruProfile] = useState(null);

  // === DYNAMIC REPORT KOP & SIGNATURE SETTINGS (stored in localStorage) ===
  const [namaSekolah, setNamaSekolah] = useState("");
  const [alamatSekolah, setAlamatSekolah] = useState("");
  const [telpSekolah, setTelpSekolah] = useState("");
  const [namaKepsek, setNamaKepsek] = useState("");
  const [nipKepsek, setNipKepsek] = useState("");
  const [kotaCetak, setKotaCetak] = useState("");
  const [nipGuru, setNipGuru] = useState("");
  const [showSettings, setShowSettings] = useState(false);

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

    const fetchGuruProfile = async () => {
      try {
        const response = await fetch("/api/profil");
        if (response.ok) {
          const data = await response.json();
          setGuruProfile(data);
          if (data && data.username.toLowerCase() !== "shoofian") {
            setIsAuthorized(false);
          }
        }
      } catch (err) {
        console.error("Gagal memuat profil guru", err);
      }
    };

    fetchAllKelas();
    fetchGuruProfile();

    // Load custom settings from localStorage if available
    if (typeof window !== "undefined") {
      const savedNamaSekolah = localStorage.getItem("rep_namaSekolah");
      const savedAlamatSekolah = localStorage.getItem("rep_alamatSekolah");
      const savedTelpSekolah = localStorage.getItem("rep_telpSekolah");
      const savedNamaKepsek = localStorage.getItem("rep_namaKepsek");
      const savedNipKepsek = localStorage.getItem("rep_nipKepsek");
      const savedKotaCetak = localStorage.getItem("rep_kotaCetak");
      const savedNipGuru = localStorage.getItem("rep_nipGuru");

      if (savedNamaSekolah) setNamaSekolah(savedNamaSekolah);
      if (savedAlamatSekolah) setAlamatSekolah(savedAlamatSekolah);
      if (savedTelpSekolah) setTelpSekolah(savedTelpSekolah);
      if (savedNamaKepsek) setNamaKepsek(savedNamaKepsek);
      if (savedNipKepsek) setNipKepsek(savedNipKepsek);
      if (savedKotaCetak) setKotaCetak(savedKotaCetak);
      if (savedNipGuru) setNipGuru(savedNipGuru);
    }
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

          // Load settings from Supabase skemaPenilaian.laporanConfig if available
          const config = data.skemaPenilaian?.laporanConfig;
          if (config) {
            if (config.namaSekolah !== undefined) setNamaSekolah(config.namaSekolah);
            if (config.alamatSekolah !== undefined) setAlamatSekolah(config.alamatSekolah);
            if (config.telpSekolah !== undefined) setTelpSekolah(config.telpSekolah);
            if (config.namaKepsek !== undefined) setNamaKepsek(config.namaKepsek);
            if (config.nipKepsek !== undefined) setNipKepsek(config.nipKepsek);
            if (config.kotaCetak !== undefined) setKotaCetak(config.kotaCetak);
            if (config.nipGuru !== undefined) setNipGuru(config.nipGuru);
          } else {
            // Fallback to localStorage or defaults
            const savedNamaSekolah = localStorage.getItem("rep_namaSekolah") || "";
            const savedAlamatSekolah = localStorage.getItem("rep_alamatSekolah") || "";
            const savedTelpSekolah = localStorage.getItem("rep_telpSekolah") || "";
            const savedNamaKepsek = localStorage.getItem("rep_namaKepsek") || "";
            const savedNipKepsek = localStorage.getItem("rep_nipKepsek") || "";
            const savedKotaCetak = localStorage.getItem("rep_kotaCetak") || "";
            const savedNipGuru = localStorage.getItem("rep_nipGuru") || "";

            setNamaSekolah(savedNamaSekolah);
            setAlamatSekolah(savedAlamatSekolah);
            setTelpSekolah(savedTelpSekolah);
            setNamaKepsek(savedNamaKepsek);
            setNipKepsek(savedNipKepsek);
            setKotaCetak(savedKotaCetak);
            setNipGuru(savedNipGuru);
          }
        }
      } catch (err) {
        console.error("Gagal memuat detail kelas untuk laporan", err);
      }
    };
    fetchClassDetail();
  }, [selectedClassId]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    
    // Save to localStorage
    localStorage.setItem("rep_namaSekolah", namaSekolah);
    localStorage.setItem("rep_alamatSekolah", alamatSekolah);
    localStorage.setItem("rep_telpSekolah", telpSekolah);
    localStorage.setItem("rep_namaKepsek", namaKepsek);
    localStorage.setItem("rep_nipKepsek", nipKepsek);
    localStorage.setItem("rep_kotaCetak", kotaCetak);
    localStorage.setItem("rep_nipGuru", nipGuru);

    // Save to Supabase (if class is selected)
    if (selectedClassId && selectedClass) {
      try {
        const updatedSkema = {
          ...(selectedClass.skemaPenilaian || {}),
          laporanConfig: {
            namaSekolah,
            alamatSekolah,
            telpSekolah,
            namaKepsek,
            nipKepsek,
            kotaCetak,
            nipGuru
          }
        };

        const response = await fetch(`/api/kelas/${selectedClassId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            skemaPenilaian: updatedSkema
          })
        });

        if (response.ok) {
          // Update local state
          setSelectedClass(prev => ({
            ...prev,
            skemaPenilaian: updatedSkema
          }));
        } else {
          console.error("Gagal sinkronisasi config laporan ke database");
        }
      } catch (err) {
        console.error("Gagal menyimpan config laporan ke database", err);
      }
    }

    setShowSettings(false);
  };

  // === HELPER: CALCULATE ASPECT SCORE IN GRUP / SINGLE COL ===
  const getColScore = (student, col) => {
    if (col.isGroup && col.subKolom) {
      let subTotal = 0;
      let subFilledCount = 0;
      let subFilledWeight = 0;
      
      col.subKolom.forEach(sub => {
        let sc = student.nilai[sub.id];
        if (sc !== undefined && sc !== null && sc !== "") {
          const scNum = Number(sc);
          if (col.hitungMetode === "persentase") {
            const subBobot = sub.bobot !== undefined && sub.bobot !== null ? Number(sub.bobot) : 0;
            subTotal += scNum * subBobot;
            subFilledWeight += subBobot;
          } else {
            subTotal += scNum;
          }
          subFilledCount++;
        }
      });
      
      if (subFilledCount === 0) return { score: null, isFilled: false, isAllFilled: false };
      
      const score = col.hitungMetode === "persentase"
        ? (subFilledWeight > 0 ? subTotal / subFilledWeight : 0)
        : (subTotal / subFilledCount);
        
      return {
        score,
        isFilled: true,
        isAllFilled: subFilledCount === col.subKolom.length
      };
    } else {
      let sc = student.nilai[col.id];
      if (sc !== undefined && sc !== null && sc !== "") {
        return {
          score: Number(sc),
          isFilled: true,
          isAllFilled: true
        };
      }
      return { score: null, isFilled: false, isAllFilled: false };
    }
  };

  // === CALCULATE DETAILED REPORT STATISTICS ===
  let stats = {
    average: 0,
    highest: 0,
    lowest: 0,
    passRate: 0,
    totalStudents: 0
  };

  const studentReports = [];

  if (selectedClass) {
    const skema = selectedClass.skemaPenilaian || { A: 85, B: 75, C: 65, D: 50, kkm: 75 };
    const classKkm = skema.kkm ?? 75;

    stats.totalStudents = selectedClass.siswa.length;
    let totalScoreSum = 0;
    let passCount = 0;
    let scoresList = [];

    // Sort siswa secara alfabetis berdasarkan nama
    const sortedSiswa = [...selectedClass.siswa].sort((a, b) => a.nama.localeCompare(b.nama, "id", { sensitivity: "base" }));
    sortedSiswa.forEach(siswa => {
      // Hitung nilai akhir terbobot secara proporsional sesuai dengan logika di Buku Nilai
      let totalBobotTerisi = 0;
      let totalNilaiTerisi = 0;
      let filledCount = 0;
      
      selectedClass.kolomNilai.forEach(col => {
        const { score, isFilled, isAllFilled } = getColScore(siswa, col);
        if (isFilled) {
          totalNilaiTerisi += score * (col.bobot / 100);
          if (isAllFilled) {
            filledCount++;
          }
        }
      });

      let total = totalNilaiTerisi;

      // Hitung Presensi jika digunakan
      const presensiConfig = skema.presensi || { digunakan: false, bobot: 0 };
      const pertemuanList = skema.pertemuan || [];
      
      let attSummary = { H: 0, I: 0, S: 0, A: 0, D: 0 };
      pertemuanList.forEach(p => {
        const val = siswa.nilai[`_presensi_${p.id}`];
        if (val && attSummary[val] !== undefined) {
          attSummary[val]++;
        }
      });

      if (presensiConfig.digunakan && presensiConfig.bobot > 0 && pertemuanList.length > 0) {
        let attCount = attSummary.H + attSummary.S + attSummary.I + attSummary.A + attSummary.D;
        let attTotal = (attSummary.H * 100) + (attSummary.S * 50) + (attSummary.I * 50) + (attSummary.A * 0) + (attSummary.D * 100);
        
        const attAvg = attCount > 0 ? (attTotal / attCount) : 0;
        total += attAvg * (presensiConfig.bobot / 100);
      }

      // Tambahkan Nilai Katrol jika ada
      total += (Number(siswa.nilai?._katrol) || 0);

      const finalScoreRounded = Number(total.toFixed(2));
      scoresList.push(finalScoreRounded);
      totalScoreSum += finalScoreRounded;

      // Predikat dinamis sesuai skema penilaian kelas
      let predikat = "E";
      if (finalScoreRounded >= skema.A) predikat = skema.statusA || "A";
      else if (finalScoreRounded >= skema.B) predikat = skema.statusB || "B";
      else if (finalScoreRounded >= skema.C) predikat = skema.statusC || "C";
      else if (finalScoreRounded >= skema.D) predikat = skema.statusD || "D";

      // Status Kelulusan (KKM dinamis)
      const statusKelulusan = finalScoreRounded >= classKkm ? "LULUS" : "TIDAK LULUS";
      if (finalScoreRounded >= classKkm) passCount++;

      // Simpan nilai aspek yang dihitung (misal rata-rata untuk kolom aspek grup)
      const calculatedGrades = {};
      selectedClass.kolomNilai.forEach(col => {
        const { score, isFilled } = getColScore(siswa, col);
        calculatedGrades[col.id] = isFilled ? Number(score.toFixed(2)) : "-";
      });

      studentReports.push({
        nisn: siswa.nisn,
        nama: siswa.nama,
        tanggalLahir: siswa.tanggalLahir,
        nilai: calculatedGrades,
        nilaiAkhir: finalScoreRounded,
        predikat,
        statusKelulusan,
        attSummary
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

  if (!isAuthorized) {
    return (
      <div className="container-card animate-fade-in" style={{ padding: "40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "300px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", background: "var(--bg-secondary)" }}>
        <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--danger)", marginBottom: "12px" }}>Akses Terbatas</h2>
        <p style={{ color: "var(--text-secondary)", maxWidth: "500px", lineHeight: "1.6" }}>
          Fitur Cetak Laporan saat ini masih dalam tahap uji coba terbatas dan hanya dapat diakses oleh akun dengan username <strong>shoofian</strong>.
        </p>
      </div>
    );
  }

  const hasPresensi = !!(selectedClass?.skemaPenilaian?.pertemuan && selectedClass.skemaPenilaian.pertemuan.length > 0);

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      
      {/* Page Title & Class Selector - Hidden in print */}
      <div className="page-title-section no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: 0 }}>
        <div>
          <h1 className="page-title">Cetak Laporan Nilai</h1>
          <p className="page-subtitle">Pilih kelas untuk melihat analisis hasil belajar dan cetak laporan resmi kelas.</p>
        </div>
        
        {/* Class Selection Dropdown & Settings button */}
        {kelas.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              className="btn btn-secondary" 
              style={{ padding: "10px 16px", display: "inline-flex", alignItems: "center", gap: "8px", border: "1px solid var(--border-color)" }}
            >
              ⚙️ {showSettings ? "Tutup Kop & Ttd" : "Atur Kop & Tanda Tangan"}
            </button>

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
                    {k.nama} - {k.mataPelajaran || "Informatika"} (Sem. {k.semester || "Ganjil"} - {k.tahunAjaran}) {k.archived ? "[Arsip]" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Customizable Settings Panel for Report Kop and Signatures */}
      {showSettings && (
        <div className="glass-card no-print animate-fade-in" style={{ borderLeft: "4px solid var(--primary)", padding: "20px" }}>
          <h4 style={{ fontSize: "1.05rem", fontWeight: "700", marginBottom: "16px" }}>⚙️ Pengaturan Kop Laporan & Tanda Tangan</h4>
          <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Sekolah / Instansi</label>
                <input 
                  type="text" 
                  value={namaSekolah} 
                  onChange={(e) => setNamaSekolah(e.target.value)} 
                  className="form-input" 
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Alamat Sekolah</label>
                <input 
                  type="text" 
                  value={alamatSekolah} 
                  onChange={(e) => setAlamatSekolah(e.target.value)} 
                  className="form-input" 
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Telepon Sekolah</label>
                <input 
                  type="text" 
                  value={telpSekolah} 
                  onChange={(e) => setTelpSekolah(e.target.value)} 
                  className="form-input" 
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Kota Penerbitan Laporan</label>
                <input 
                  type="text" 
                  value={kotaCetak} 
                  onChange={(e) => setKotaCetak(e.target.value)} 
                  className="form-input" 
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Kepala Sekolah</label>
                <input 
                  type="text" 
                  value={namaKepsek} 
                  onChange={(e) => setNamaKepsek(e.target.value)} 
                  className="form-input" 
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">NIP Kepala Sekolah</label>
                <input 
                  type="text" 
                  value={nipKepsek} 
                  onChange={(e) => setNipKepsek(e.target.value)} 
                  className="form-input" 
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">NIP Guru Pengampu <span style={{ fontWeight: "500", color: "var(--text-muted)", fontSize: "0.75rem" }}>(opsional)</span></label>
                <input 
                  type="text" 
                  value={nipGuru} 
                  onChange={(e) => setNipGuru(e.target.value)} 
                  className="form-input" 
                />
              </div>

            </div>
            
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
              <button 
                type="button" 
                onClick={() => {
                  setNamaSekolah("");
                  setAlamatSekolah("");
                  setTelpSekolah("");
                  setNamaKepsek("");
                  setNipKepsek("");
                  setKotaCetak("");
                  setNipGuru("");
                }} 
                className="btn btn-secondary" 
                style={{ padding: "8px 16px", fontSize: "0.85rem" }}
              >
                🔄 Reset Default
              </button>
              <button type="submit" className="btn btn-primary" style={{ padding: "8px 24px", fontSize: "0.85rem" }}>
                💾 Simpan & Terapkan
              </button>
            </div>
          </form>
        </div>
      )}

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
            <div className="report-kop" style={{ textAlign: "center", borderBottom: "4px double #333", paddingBottom: "20px", marginBottom: "10px" }}>
              <h2 style={{ fontSize: "1.8rem", textTransform: "uppercase", fontWeight: "800", letterSpacing: "0.02em", color: "inherit" }}>
                Laporan Hasil Belajar Siswa
              </h2>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginTop: "4px", color: "inherit" }}>
                {namaSekolah}
              </h3>
              <p style={{ fontSize: "0.85rem", marginTop: "4px", color: "inherit" }}>
                Alamat: {alamatSekolah} &bull; Telp: {telpSekolah}
              </p>
            </div>

            {/* REPORT METADATA - two-column info block */}
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", fontSize: "0.95rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <p>Kelas: <strong>{selectedClass.nama}</strong></p>
                <p>Mata Pelajaran: <strong>{selectedClass.mataPelajaran || "Informatika"}</strong></p>
                <p>Tahun Ajaran: <strong>{selectedClass.tahunAjaran} ({selectedClass.semester || "Ganjil"})</strong></p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", textAlign: "right" }} className="align-left-mobile">
                <p>Total Siswa: <strong>{stats.totalStudents} orang</strong></p>
                <p>Tanggal Cetak: <strong>{new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</strong></p>
                <p>Status: <span className={`badge ${selectedClass.archived ? "badge-warning" : "badge-primary"}`} style={{ fontSize: "0.7rem", padding: "2px 8px" }}>{selectedClass.archived ? "Arsip" : "Aktif"}</span></p>
              </div>
            </div>

            {/* STATISTIK KELAS — formal HTML table (print-safe, no CSS vars) */}
            <table className="print-stats-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "4px" }}>
              <thead>
                <tr>
                  {[
                    "Rata-rata Kelas",
                    "Nilai Tertinggi",
                    "Nilai Terendah",
                    "% Kelulusan",
                    "KKM"
                  ].map(label => (
                    <th
                      key={label}
                      style={{
                        border: "1px solid #aaaaaa",
                        padding: "8px 12px",
                        textAlign: "center",
                        backgroundColor: "#f3f4f6",
                        fontSize: "0.76rem",
                        fontWeight: "700",
                        letterSpacing: "0.03em",
                        textTransform: "uppercase",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: "1px solid #aaaaaa", padding: "10px 12px", textAlign: "center", fontSize: "1.5rem", fontWeight: "800", color: "#2563eb" }}>{stats.average}</td>
                  <td style={{ border: "1px solid #aaaaaa", padding: "10px 12px", textAlign: "center", fontSize: "1.5rem", fontWeight: "800", color: "#16a34a" }}>{stats.highest}</td>
                  <td style={{ border: "1px solid #aaaaaa", padding: "10px 12px", textAlign: "center", fontSize: "1.5rem", fontWeight: "800", color: "#dc2626" }}>{stats.lowest}</td>
                  <td style={{ border: "1px solid #aaaaaa", padding: "10px 12px", textAlign: "center", fontSize: "1.5rem", fontWeight: "800", color: stats.passRate >= 75 ? "#16a34a" : "#d97706" }}>{stats.passRate}%</td>
                  <td style={{ border: "1px solid #aaaaaa", padding: "10px 12px", textAlign: "center", fontSize: "1.5rem", fontWeight: "800" }}>{selectedClass.skemaPenilaian?.kkm || 75}</td>
                </tr>
              </tbody>
            </table>

            {/* TABEL LAPORAN NILAI UTAMA */}
            <div className="table-container" style={{ margin: "8px 0 0 0" }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th style={{ width: "36px", textAlign: "center" }}>No</th>
                    <th style={{ width: "108px" }}>NISN</th>
                    <th style={{ minWidth: "160px" }}>Nama Siswa</th>
                    {selectedClass.kolomNilai.map(col => (
                      <th key={col.id} style={{ textAlign: "center", minWidth: "80px" }}>
                        {col.nama}
                        <br />
                        <span style={{ fontSize: "0.78em", fontWeight: "400", opacity: 0.8 }}>({col.bobot}%)</span>
                      </th>
                    ))}
                    <th style={{ textAlign: "center", width: "72px", backgroundColor: "#dce6f1" }}>N. Akhir</th>
                    <th style={{ textAlign: "center", width: "80px" }}>Predikat</th>
                    <th style={{ textAlign: "center", width: "110px" }}>Kelulusan</th>
                  </tr>
                </thead>
                <tbody>
                  {studentReports.map((report, idx) => (
                    <tr key={report.nisn}>
                      <td style={{ textAlign: "center" }}>{idx + 1}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{report.nisn}</td>
                      <td style={{ fontWeight: "700" }}>{report.nama}</td>
                      
                      {/* Dynamic calculated grades (handles Aspect Groups as well) */}
                      {selectedClass.kolomNilai.map(col => (
                        <td key={col.id} style={{ textAlign: "center" }}>
                          {report.nilai[col.id]}
                        </td>
                      ))}

                      {/* Final weighted score */}
                      <td style={{ textAlign: "center", fontWeight: "800", color: "#2563eb", backgroundColor: "rgba(59,130,246,0.05)" }}>
                        {report.nilaiAkhir}
                      </td>

                      {/* Predicate */}
                      <td style={{ textAlign: "center", fontWeight: "800" }}>
                        <span style={{
                          color: (report.predikat === "A" || report.predikat === "B")
                            ? "#16a34a"
                            : report.predikat === "C"
                            ? "#d97706"
                            : "#dc2626"
                        }}>
                          {report.predikat}
                        </span>
                      </td>

                      {/* Graduation status */}
                      <td style={{ textAlign: "center" }}>
                        <span style={{
                          fontWeight: "800",
                          fontSize: "0.8rem",
                          color: report.statusKelulusan === "LULUS" ? "#16a34a" : "#dc2626"
                        }}>
                          {report.statusKelulusan}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TABEL REKAP PRESENSI TERPISAH */}
            {hasPresensi && (
              <div style={{ marginTop: "24px", pageBreakInside: "avoid", breakInside: "avoid" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: "800", marginBottom: "8px", borderBottom: "2px solid #333", paddingBottom: "4px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  📅 Rekapitulasi Kehadiran Siswa
                </h3>
                <table className="premium-table" style={{ width: "100%" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f3f4f6" }}>
                      <th style={{ width: "40px", textAlign: "center" }}>No</th>
                      <th style={{ width: "120px" }}>NISN</th>
                      <th>Nama Siswa</th>
                      <th style={{ textAlign: "center", width: "80px" }}>Hadir</th>
                      <th style={{ textAlign: "center", width: "80px" }}>Izin</th>
                      <th style={{ textAlign: "center", width: "80px" }}>Sakit</th>
                      <th style={{ textAlign: "center", width: "100px" }}>Dispensasi</th>
                      <th style={{ textAlign: "center", width: "80px" }}>Alpha</th>
                      <th style={{ textAlign: "center", width: "100px", backgroundColor: "#e2e8f0" }}>% Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentReports.map((report, idx) => {
                      const h = report.attSummary?.H || 0;
                      const i = report.attSummary?.I || 0;
                      const s = report.attSummary?.S || 0;
                      const d = report.attSummary?.D || 0;
                      const a = report.attSummary?.A || 0;
                      const total = h + i + s + d + a;
                      const percentage = total > 0 ? Math.round(((h + d) / total) * 100) : 100;
                      
                      return (
                        <tr key={report.nisn}>
                          <td style={{ textAlign: "center" }}>{idx + 1}</td>
                          <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{report.nisn}</td>
                          <td style={{ fontWeight: "700" }}>{report.nama}</td>
                          <td style={{ textAlign: "center", color: "#16a34a" }}>{h}</td>
                          <td style={{ textAlign: "center", color: "var(--warning)" }}>{i}</td>
                          <td style={{ textAlign: "center", color: "#3b82f6" }}>{s}</td>
                          <td style={{ textAlign: "center", color: "#8b5cf6" }}>{d}</td>
                          <td style={{ textAlign: "center", color: "#dc2626" }}>{a}</td>
                          <td style={{ textAlign: "center", fontWeight: "800", backgroundColor: "rgba(226, 232, 240, 0.3)" }}>
                            {percentage}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* KKM Footnote */}
            <p className="report-footnote" style={{ fontSize: "0.8rem", color: "#6b7280", fontStyle: "italic", borderTop: "1px solid #e5e7eb", paddingTop: "8px", marginTop: "4px" }}>
              * Kriteria Ketuntasan Minimal (KKM) mata pelajaran ini adalah <strong>{selectedClass.skemaPenilaian?.kkm || 75}</strong>. Nilai akhir dihitung secara otomatis berdasarkan persentase bobot setiap aspek penilaian yang telah ditetapkan.
            </p>

            {/* OFFICIAL SIGNATURE SECTION */}
            <div className="report-signature" style={{ display: "flex", justifyContent: "space-between", marginTop: "50px", padding: "0 20px" }}>
              
              {/* Left: Guru Pengampu */}
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "56px" }}>
                <p style={{ fontSize: "0.95rem", fontWeight: "700" }}>Guru Pengampu,</p>
                <div>
                  <p style={{ fontSize: "0.95rem", fontWeight: "700", borderBottom: "1px solid #333", display: "inline-block", paddingBottom: "2px" }}>
                    {guruProfile?.nama || "Nama Guru"}
                  </p>
                  <p style={{ fontSize: "0.8rem", marginTop: "3px", color: "#6b7280" }}>
                    {nipGuru && nipGuru !== "-" ? `NIP. ${nipGuru}` : "NIP. —"}
                  </p>
                </div>
              </div>

              {/* Right: Kepala Sekolah */}
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "56px" }}>
                <div>
                  <p style={{ fontSize: "0.9rem" }}>
                    {kotaCetak}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <p style={{ fontSize: "0.95rem", fontWeight: "700", marginTop: "2px" }}>
                    Mengetahui,<br />Kepala Sekolah
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: "0.95rem", fontWeight: "700", borderBottom: "1px solid #333", display: "inline-block", paddingBottom: "2px" }}>
                    {namaKepsek}
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "3px" }}>NIP. {nipKepsek}</p>
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
        
        /* Premium concise table style for print-safe area */
        #printable-area table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin-top: 10px !important;
          background: #ffffff !important;
          table-layout: auto !important;
        }
        #printable-area th, #printable-area td {
          border: 1px solid #94a3b8 !important;
          padding: 6px 10px !important;
          font-size: 0.78rem !important;
          line-height: 1.3 !important;
          vertical-align: middle !important;
          text-align: left;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        }
        #printable-area th {
          background: #f1f5f9 !important;
          font-weight: 800 !important;
          color: #0f172a !important;
          font-size: 0.74rem !important;
          text-transform: uppercase !important;
          letter-spacing: 0.02em !important;
        }
        #printable-area td {
          color: #1e293b !important;
        }
        #printable-area tbody tr:nth-of-type(even) td {
          background: #f8fafc !important;
        }
        
        @media print {
          /* Force printable-area to take full screen width and hide border radius */
          #printable-area {
            border: none !important;
            padding: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          #printable-area table {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            table-layout: auto !important;
          }
          #printable-area th {
            background: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-area tbody tr:nth-of-type(even) td {
            background: #f8fafc !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .report-signature {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
