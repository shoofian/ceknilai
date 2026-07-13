"use client";

import { useState, useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function WaliKelasDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Session User Info
  const [guru, setGuru] = useState(null);
  
  // Filter States
  const [tahunAjaran, setTahunAjaran] = useState("2025/2026");
  const [semester, setSemester] = useState("Ganjil");
  const [mounted, setMounted] = useState(false);
  
  // Data States
  const [siswa, setSiswa] = useState([]);
  const [mataPelajaranList, setMataPelajaranList] = useState([]);
  const [activeTab, setActiveTab] = useState("mapel");
  const [selectedTingkatan, setSelectedTingkatan] = useState("");

  // Subject Detail Modal States
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState(null);
  const [loadingSubjectDetail, setLoadingSubjectDetail] = useState(false);
  const [subjectDetailModalOpen, setSubjectDetailModalOpen] = useState(false);

  // Perpaduan Semester States
  const [loadingPerpaduan, setLoadingPerpaduan] = useState(false);
  const [perpaduanSiswa, setPerpaduanSiswa] = useState([]);
  const [perpaduanMapelList, setPerpaduanMapelList] = useState([]);

  // Options
  const TAHUN_AJARAN_OPTIONS = ["2023/2024", "2024/2025", "2025/2026", "2026/2027"];
  const SEMESTER_OPTIONS = ["Ganjil", "Genap"];

  const getSubjectStats = (subjectName, kkm) => {
    const scores = (siswa || [])
      .map(s => (s.nilaiMapel || {})[subjectName])
      .filter(score => score !== undefined && score !== null);
      
    if (scores.length === 0) {
      return { average: 0, passingCount: 0, failingCount: 0, passingPercent: 0, total: 0, highest: 0, lowest: 0, median: 0 };
    }
    
    const sorted = [...scores].sort((a, b) => a - b);
    const sum = scores.reduce((a, b) => a + b, 0);
    const average = sum / scores.length;
    const passingCount = scores.filter(score => score >= kkm).length;
    const failingCount = scores.length - passingCount;
    const passingPercent = (passingCount / scores.length) * 100;
    const highest = sorted[sorted.length - 1];
    const lowest = sorted[0];
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    
    return {
      average,
      passingCount,
      failingCount,
      passingPercent,
      total: scores.length,
      highest,
      lowest,
      median
    };
  };

  useEffect(() => {
    setMounted(true);
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.loggedIn && data.user) {
            setGuru(data.user);
            if (data.user.tahun_ajaran) {
              setTahunAjaran(data.user.tahun_ajaran);
            }
            if (!data.user.sekolah_id) {
              setErrorMsg("Asal sekolah Anda belum diatur. Silakan setel sekolah Anda di halaman Profil terlebih dahulu untuk menggunakan dashboard ini.");
            } else if (!data.user.walikelas_tingkatan || !data.user.walikelas_rombel_nama) {
              setErrorMsg("Anda belum mengatur kelas perwalian. Silakan buka halaman Profil Saya untuk menentukan Tingkatan dan Rombel perwalian Anda terlebih dahulu.");
            } else {
              setSelectedTingkatan(String(data.user.walikelas_tingkatan));
              setAuthorized(true);
            }
          } else {
            router.push("/login");
          }
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Gagal memeriksa sesi", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  // Fetch Leger Data when filters change
  useEffect(() => {
    if (!authorized || !guru || !selectedTingkatan) return;

    const fetchLeger = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/walikelas/leger?tingkatan=${selectedTingkatan}&rombel_nama=${guru.walikelas_rombel_nama}&tahun_ajaran=${tahunAjaran}&semester=${semester}`);
        if (res.ok) {
          const data = await res.json();
          setSiswa(data.siswa || []);
          setMataPelajaranList(data.mataPelajaranList || []);
        } else {
          console.error("Gagal mengambil data leger");
        }
      } catch (err) {
        console.error("Kesalahan koneksi API leger", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeger();
  }, [authorized, guru, selectedTingkatan, tahunAjaran, semester]);

  // Fetch Perpaduan (Merged Semester) Data
  useEffect(() => {
    if (!authorized || !guru || !selectedTingkatan || activeTab !== "perpaduan") return;

    const fetchPerpaduanData = async () => {
      setLoadingPerpaduan(true);
      try {
        const [resGanjil, resGenap] = await Promise.all([
          fetch(`/api/walikelas/leger?tingkatan=${selectedTingkatan}&rombel_nama=${guru.walikelas_rombel_nama}&tahun_ajaran=${tahunAjaran}&semester=Ganjil`),
          fetch(`/api/walikelas/leger?tingkatan=${selectedTingkatan}&rombel_nama=${guru.walikelas_rombel_nama}&tahun_ajaran=${tahunAjaran}&semester=Genap`)
        ]);

        let ganjilData = { siswa: [], mataPelajaranList: [] };
        let genapData = { siswa: [], mataPelajaranList: [] };

        if (resGanjil.ok) ganjilData = await resGanjil.json();
        if (resGenap.ok) genapData = await resGenap.json();

        // 1. Unique subject list
        const mapelSet = new Set();
        const mapelInfo = {};
        [...ganjilData.mataPelajaranList, ...genapData.mataPelajaranList].forEach(mp => {
          mapelSet.add(mp.mataPelajaran);
          mapelInfo[mp.mataPelajaran] = {
            mataPelajaran: mp.mataPelajaran,
            kkm: mp.kkm || 75
          };
        });
        const uniqueMapels = Array.from(mapelSet).map(name => mapelInfo[name]);
        setPerpaduanMapelList(uniqueMapels);

        // 2. Merged students list
        const mergedStudentsMap = {};
        
        ganjilData.siswa.forEach(s => {
          mergedStudentsMap[s.nisn] = {
            nisn: s.nisn,
            nama: s.nama,
            nilaiGanjil: s.nilaiMapel || {},
            nilaiGenap: {}
          };
        });

        genapData.siswa.forEach(s => {
          if (!mergedStudentsMap[s.nisn]) {
            mergedStudentsMap[s.nisn] = {
              nisn: s.nisn,
              nama: s.nama,
              nilaiGanjil: {},
              nilaiGenap: s.nilaiMapel || {}
            };
          } else {
            mergedStudentsMap[s.nisn].nilaiGenap = s.nilaiMapel || {};
          }
        });

        setPerpaduanSiswa(Object.values(mergedStudentsMap));
      } catch (err) {
        console.error("Kesalahan koneksi API perpaduan", err);
      } finally {
        setLoadingPerpaduan(false);
      }
    };

    fetchPerpaduanData();
  }, [authorized, guru, selectedTingkatan, tahunAjaran, activeTab]);

  const handleViewSubjectDetail = async (classId) => {
    setLoadingSubjectDetail(true);
    setSelectedSubjectDetail(null);
    setSubjectDetailModalOpen(true);
    try {
      const res = await fetch(`/api/kelas/${classId}?walikelas=true`);
      if (res.ok) {
        const data = await res.json();
        setSelectedSubjectDetail(data);
      } else {
        console.error("Gagal memuat detail mapel");
        setSelectedSubjectDetail(null);
      }
    } catch (err) {
      console.error(err);
      setSelectedSubjectDetail(null);
    } finally {
      setLoadingSubjectDetail(false);
    }
  };

  // EWS Calculations
  const ewsData = (() => {
    const highRisk = []; // >= 3 failing
    const mediumRisk = []; // 1-2 failing
    let safeCount = 0;

    siswa.forEach(s => {
      const failingSubjects = [];
      mataPelajaranList.forEach(mp => {
        const score = (s.nilaiMapel || {})[mp.mataPelajaran];
        if (score !== undefined && score !== null) {
          if (score < mp.kkm) {
            failingSubjects.push({ mapel: mp.mataPelajaran, nilai: score, kkm: mp.kkm });
          }
        }
      });

      if (failingSubjects.length >= 3) {
        highRisk.push({ ...s, failingSubjects });
      } else if (failingSubjects.length > 0) {
        mediumRisk.push({ ...s, failingSubjects });
      } else {
        safeCount++;
      }
    });

    return { highRisk, mediumRisk, safeCount };
  })();

  const downloadLegerCSV = () => {
    if (siswa.length === 0) return;
    
    // Build CSV Content
    let csvContent = "\ufeff"; // BOM for excel utf-8
    csvContent += `LEGER NILAI CONSOLIDATED\n`;
    csvContent += `Sekolah:;${guru?.sekolah?.nama || "-"}\n`;
    csvContent += `Wali Kelas:;${guru?.nama || "-"}\n`;
    csvContent += `Rombel:;Kelas ${selectedTingkatan} ${guru?.walikelas_rombel_nama}\n`;
    csvContent += `Periode:;${tahunAjaran} - ${semester}\n\n`;
    
    // Headers
    const headers = ["Ranking", "NISN", "Nama Siswa"];
    mataPelajaranList.forEach(mp => {
      headers.push(`${mp.mataPelajaran} (KKM: ${mp.kkm})`);
    });
    headers.push("Rata-Rata");
    csvContent += headers.join(";") + "\n";
    
    // Rows
    siswa.forEach(s => {
      const row = [s.ranking, `="${s.nisn}"`, s.nama];
      mataPelajaranList.forEach(mp => {
        const score = (s.nilaiMapel || {})[mp.mataPelajaran];
        row.push(score !== undefined && score !== null ? score : "-");
      });
      row.push(s.rataRata);
      csvContent += row.join(";") + "\n";
    });
    
    // Download Trigger
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const rombelStr = `${selectedTingkatan}_${guru?.walikelas_rombel_nama}`;
    link.setAttribute("download", `Leger_${rombelStr.replace(/\s+/g, "_")}_${tahunAjaran.replace(/\//g, "-")}_${semester}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !guru) {
    return (
      <div style={{ display: "flex", minHeight: "80vh", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <span className="spinner" style={{ width: "36px", height: "36px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Menghubungkan ke Portal Wali Kelas...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ padding: "40px 20px", display: "flex", justifyContent: "center" }}>
        <div className="glass-card" style={{ maxWidth: "480px", width: "100%", textAlign: "center", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "30px" }}>
          <span style={{ fontSize: "3rem" }}>⚠️</span>
          <h3 style={{ fontSize: "1.25rem", margin: "16px 0 8px", color: "var(--danger)" }}>Akses Terbatas</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.6" }}>{errorMsg}</p>
          <Link href="/guru" className="btn btn-secondary" style={{ marginTop: "24px", display: "inline-flex" }}>
            🏠 Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const renderModal = () => {
    if (!subjectDetailModalOpen || !mounted) return null;
    return createPortal(
      <div
        onClick={(e) => { if (e.target === e.currentTarget) { setSubjectDetailModalOpen(false); setSelectedSubjectDetail(null); }}}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          zIndex: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}
      >
        <div className="glass-card animate-fade-in modal-glass-container" style={{ width: "100%", maxWidth: "1000px", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", border: "1px solid var(--border-focus)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)", padding: "0" }}>
          
          {/* Modal Header */}
          <div className="modal-header-container" style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--bg-primary)", flexShrink: 0 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "0.65rem", fontWeight: "800", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "2px 8px", borderRadius: "10px", backgroundColor: "rgba(59, 130, 246, 0.1)" }}>📚 Leger Detail</span>
                <span style={{ fontSize: "0.65rem", fontWeight: "800", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>• Nilai Akademik</span>
              </div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "900", margin: "4px 0", color: "var(--text-primary)" }}>{selectedSubjectDetail?.mataPelajaran || "Memuat Detail..."}</h3>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                <span style={{ fontSize: "0.75rem", padding: "4px 8px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
                  👤 Guru: <strong>{selectedSubjectDetail?.guru?.nama || selectedSubjectDetail?.guru_username || "-"}</strong>
                </span>
                <span style={{ fontSize: "0.75rem", padding: "4px 8px", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", color: "var(--success)", display: "flex", alignItems: "center", gap: "4px" }}>
                  🎯 KKM: <strong>{selectedSubjectDetail?.skemaPenilaian?.kkm || "75"}</strong>
                </span>
                <span style={{ fontSize: "0.75rem", padding: "4px 8px", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(124, 58, 237, 0.1)", border: "1px solid rgba(124, 58, 237, 0.2)", color: "var(--primary)", display: "flex", alignItems: "center", gap: "4px" }}>
                  📅 Semester {selectedSubjectDetail?.semester || semester}
                </span>
              </div>
            </div>
            <button 
              onClick={() => { setSubjectDetailModalOpen(false); setSelectedSubjectDetail(null); }}
              className="btn btn-secondary"
              style={{ padding: "8px 16px", fontSize: "0.85rem", flexShrink: 0, display: "flex", alignItems: "center", gap: "6px", borderRadius: "var(--radius-sm)" }}
            >
              ✕ Tutup
            </button>
          </div>

          {loadingSubjectDetail ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexGrow: 1, padding: "80px 0" }}>
              <span className="spinner" style={{ width: "35px", height: "35px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
            </div>
          ) : selectedSubjectDetail ? (() => {
            // Pre-calculate stats for the summary bar
            const allStudents = selectedSubjectDetail.siswa || [];
            const kkm = selectedSubjectDetail.skemaPenilaian?.kkm || 75;
            const columns = selectedSubjectDetail.kolomNilai || [];

            const getColScore = (student, col) => {
              if (col.subKolom && col.subKolom.length > 0) {
                let subTotal = 0, subFilledWeight = 0, subFilledCount = 0;
                col.subKolom.forEach(sub => {
                  const sc = student.nilai?.[sub.id];
                  if (sc !== undefined && sc !== null && sc !== "") {
                    if (col.hitungMetode === "persentase") {
                      subTotal += Number(sc) * (sub.bobot || 0);
                      subFilledWeight += (sub.bobot || 0);
                    } else { subTotal += Number(sc); }
                    subFilledCount++;
                  }
                });
                if (subFilledCount === 0) return 0;
                return col.hitungMetode === "persentase" ? (subFilledWeight > 0 ? subTotal / subFilledWeight : 0) : (subTotal / subFilledCount);
              } else {
                const sc = student.nilai?.[col.id];
                return (sc !== undefined && sc !== null && sc !== "") ? Number(sc) : 0;
              }
            };

            const calcFinal = (s) => {
              let total = 0;
              columns.forEach(col => { total += getColScore(s, col) * (col.bobot / 100); });
              
              // Hitung Kehadiran (Presensi) jika digunakan
              const skema = selectedSubjectDetail.skemaPenilaian || { A: 85, B: 75, C: 65, D: 50, kkm: 75 };
              const presensiConfig = skema.presensi || { digunakan: false, bobot: 0 };
              const pertemuanList = skema.pertemuan || [];
              let totalPresensiScore = 0;
              
              if (presensiConfig.digunakan && presensiConfig.bobot > 0 && pertemuanList.length > 0) {
                let attSummary = { H: 0, I: 0, S: 0, A: 0 };
                pertemuanList.forEach(p => {
                  const val = s.nilai?.[`_presensi_${p.id}`];
                  if (val && attSummary[val] !== undefined) {
                    attSummary[val]++;
                  }
                });
                let attCount = attSummary.H + attSummary.S + attSummary.I + attSummary.A;
                let attTotal = (attSummary.H * 100) + (attSummary.S * 50) + (attSummary.I * 50) + (attSummary.A * 0);
                const attAvg = attCount > 0 ? (attTotal / attCount) : 0;
                totalPresensiScore = attAvg * (presensiConfig.bobot / 100);
              }
              
              return total + totalPresensiScore + (Number(s.nilai?._katrol) || 0);
            };

            const finals = allStudents.map(s => calcFinal(s));
            const avg = finals.length > 0 ? finals.reduce((a, b) => a + b, 0) / finals.length : 0;
            const passing = finals.filter(f => f >= kkm).length;
            const failing = finals.length - passing;
            const highest = finals.length > 0 ? Math.max(...finals) : 0;
            const lowest = finals.length > 0 ? Math.min(...finals) : 0;

            return (
              <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, overflowY: "auto" }}>
                
                {/* Summary Stats Cards */}
                <div className="stats-grid stats-grid-container" style={{ padding: "20px 24px", backgroundColor: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
                  {[
                    { label: "Jumlah Siswa", value: allStudents.length, color: "var(--text-primary)", icon: "👥", bg: "rgba(255,255,255,0.03)" },
                    { label: "Rata-Rata", value: avg.toFixed(1), color: "var(--primary)", icon: "📈", bg: "rgba(59, 130, 246, 0.05)" },
                    { label: "Tertinggi", value: highest.toFixed(1), color: "var(--success)", icon: "🏆", bg: "rgba(16, 185, 129, 0.05)" },
                    { label: "Terendah", value: lowest.toFixed(1), color: lowest < kkm ? "var(--danger)" : "var(--text-primary)", icon: "📉", bg: lowest < kkm ? "rgba(239, 68, 68, 0.05)" : "rgba(255,255,255,0.03)" },
                    { label: "Tuntas", value: `${passing} siswa`, color: "var(--success)", icon: "✅", bg: "rgba(16, 185, 129, 0.05)" },
                    { label: "Belum Tuntas", value: `${failing} siswa`, color: failing > 0 ? "var(--danger)" : "var(--text-muted)", icon: "⚠️", bg: failing > 0 ? "rgba(239, 68, 68, 0.05)" : "rgba(255,255,255,0.03)" },
                  ].map((stat, i) => (
                    <div key={i} style={{ backgroundColor: stat.bg, padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "4px", position: "relative" }}>
                      <span style={{ position: "absolute", top: "12px", right: "12px", fontSize: "1.2rem" }}>{stat.icon}</span>
                      <div style={{ fontSize: "0.65rem", fontWeight: "800", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{stat.label}</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: "900", color: stat.color, marginTop: "4px" }}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Grade Table */}
                <div className="table-padding-container" style={{ padding: "20px 24px" }}>
                  <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", overflowX: "auto", backgroundColor: "var(--bg-primary)" }}>
                    <table className="premium-table" style={{ margin: 0, width: "100%" }}>
                      <thead>
                        <tr style={{ backgroundColor: "var(--bg-tertiary)" }}>
                          <th style={{ width: "60px", textAlign: "center", padding: "12px 10px" }}>No</th>
                          <th style={{ width: "130px", padding: "12px 16px" }}>NISN</th>
                          <th style={{ minWidth: "180px", padding: "12px 16px" }}>Nama Siswa</th>
                          {columns.map(col => (
                            <th key={col.id} style={{ textAlign: "center", minWidth: "100px", padding: "12px 10px" }}>
                              {col.nama}
                              <span style={{ display: "block", fontSize: "0.6rem", color: "var(--text-secondary)", textTransform: "none", marginTop: "4px", fontWeight: "normal" }}>
                                Bobot {col.bobot}%
                              </span>
                            </th>
                          ))}
                          <th style={{ width: "120px", textAlign: "center", backgroundColor: "rgba(59, 130, 246, 0.08)", padding: "12px 16px" }}>Nilai Akhir</th>
                          <th style={{ width: "110px", textAlign: "center", padding: "12px 16px" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allStudents.map((s, index) => {
                          const finalScore = finals[index];
                          const isUnderKkm = finalScore < kkm;

                          return (
                            <tr key={s.nisn} style={{ backgroundColor: isUnderKkm ? "rgba(239, 68, 68, 0.01)" : "transparent", borderBottom: "1px solid var(--border-color)" }}>
                              <td style={{ textAlign: "center", fontWeight: "700", padding: "12px 10px" }}>{index + 1}</td>
                              <td style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--text-secondary)", padding: "12px 16px" }}>{s.nisn}</td>
                              <td style={{ fontWeight: "700", color: "var(--text-primary)", padding: "12px 16px" }}>{s.nama}</td>
                              {columns.map(col => {
                                const score = getColScore(s, col);
                                const colUnderKkm = score < kkm;
                                return (
                                  <td key={col.id} style={{ textAlign: "center", fontSize: "0.88rem", padding: "12px 10px", color: colUnderKkm ? "var(--danger)" : "var(--text-primary)", fontWeight: colUnderKkm ? "600" : "normal" }}>
                                    {score > 0 ? score.toFixed(1) : <span style={{ color: "var(--text-muted)" }}>-</span>}
                                  </td>
                                );
                              })}
                              <td style={{ 
                                textAlign: "center", 
                                fontWeight: "900",
                                fontSize: "0.95rem",
                                backgroundColor: "rgba(59, 130, 246, 0.03)",
                                color: isUnderKkm ? "var(--danger)" : "var(--primary)",
                                padding: "12px 16px"
                              }}>
                                {finalScore.toFixed(1)}
                              </td>
                              <td style={{ textAlign: "center", padding: "12px 16px" }}>
                                <span style={{ 
                                  display: "inline-block",
                                  fontSize: "0.7rem", 
                                  fontWeight: "800", 
                                  padding: "4px 10px", 
                                  borderRadius: "12px",
                                  backgroundColor: isUnderKkm ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                                  color: isUnderKkm ? "var(--danger)" : "var(--success)",
                                  border: isUnderKkm ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(16, 185, 129, 0.2)"
                                }}>
                                  {isUnderKkm ? "Belum Tuntas" : "Tuntas"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            );
          })() : (
            <div style={{ padding: "80px 24px", textAlign: "center", color: "var(--text-muted)", flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
              <span style={{ fontSize: "3rem", marginBottom: "16px" }}>📭</span>
              <h4 style={{ margin: "0 0 8px 0", fontWeight: "800", color: "var(--text-secondary)" }}>Gagal Memuat Detail Nilai</h4>
              <p style={{ fontSize: "0.85rem", margin: 0, color: "var(--text-muted)", maxWidth: "400px" }}>Data kelas ini tidak dapat diakses. Pastikan guru pengampu dan Anda terdaftar di sekolah yang sama.</p>
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      
      {/* Title Header */}
      <div className="page-title-section no-print" style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        flexWrap: "wrap", 
        gap: "16px",
        padding: "24px",
        borderRadius: "var(--radius-md)",
        background: "linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%)",
        borderLeft: "4px solid var(--primary)"
      }}>
        <div>
          <span style={{ fontSize: "0.7rem", fontWeight: "800", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>🏫 Dashboard Wali Kelas</span>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "900", margin: "4px 0 6px" }}>
            Kelas {selectedTingkatan} {guru?.walikelas_rombel_nama}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 }}>
            Instansi: <strong>{guru?.sekolah?.nama || "Sekolah Contoh"}</strong> • NPSN: <strong>{guru?.sekolah?.npsn || "-"}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Guru Pengampu: <strong>{guru?.nama}</strong></span>
        </div>
      </div>

      <div className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", padding: "16px" }}>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          {guru && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "0.7rem", fontWeight: "700", color: "var(--text-secondary)" }}>Tingkatan Kelas</label>
              <select
                className="form-input"
                value={selectedTingkatan}
                onChange={(e) => setSelectedTingkatan(e.target.value)}
                style={{ padding: "6px 12px", fontSize: "0.82rem", width: "max-content", minWidth: "100px", appearance: "auto", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
              >
                {Array.from({ length: Math.max(1, guru.walikelas_tingkatan - 9) }, (_, i) => 10 + i).map(t => (
                  <option key={t} value={String(t)} style={{ backgroundColor: "var(--bg-secondary)" }}>Kelas {t}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.7rem", fontWeight: "700", color: "var(--text-secondary)" }}>Tahun Pelajaran</label>
            <div style={{ padding: "6px 12px", fontSize: "0.82rem", fontWeight: "bold", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", display: "flex", alignItems: "center", height: "34px" }}>
              📅 {tahunAjaran}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.7rem", fontWeight: "700", color: "var(--text-secondary)" }}>Semester</label>
            <select
              className="form-input"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              style={{ padding: "6px 12px", fontSize: "0.82rem", width: "max-content", minWidth: "100px", appearance: "auto", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
            >
              {SEMESTER_OPTIONS.map(s => (
                <option key={s} value={s} style={{ backgroundColor: "var(--bg-secondary)" }}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          onClick={downloadLegerCSV} 
          disabled={siswa.length === 0}
          className="btn btn-secondary" 
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "fit-content", opacity: siswa.length === 0 ? 0.5 : 1 }}
        >
          📥 Ekspor Leger (CSV)
        </button>
      </div>

      {/* Overview Cards (Real-time EWS metrics) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        
        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "20px" }}>
          <div style={{ fontSize: "2rem", backgroundColor: "rgba(59, 130, 246, 0.1)", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>👥</div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>Total Siswa</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "900", marginTop: "2px" }}>{siswa.length}</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "20px" }}>
          <div style={{ fontSize: "2rem", backgroundColor: "rgba(16, 185, 129, 0.1)", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>✅</div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>Siswa Aman (100% Tuntas)</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "900", marginTop: "2px", color: "var(--success)" }}>{ewsData.safeCount}</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "20px" }}>
          <div style={{ fontSize: "2rem", backgroundColor: "rgba(245, 158, 11, 0.1)", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>⚠️</div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>Perhatian (1-2 Gagal)</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "900", marginTop: "2px", color: "var(--warning)" }}>{ewsData.mediumRisk.length}</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "20px" }}>
          <div style={{ fontSize: "2rem", backgroundColor: "rgba(239, 68, 68, 0.1)", width: "50px", height: "50px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>🚨</div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>Rawan Gagal (≥ 3 Gagal)</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "900", marginTop: "2px", color: "var(--danger)" }}>{ewsData.highRisk.length}</div>
          </div>
        </div>

      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-secondary)", padding: "4px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", width: "fit-content" }}>
        {[
          { id: "mapel", label: "📚 Mata Pelajaran" },
          { id: "leger", label: "📊 Buku Leger Nilai" },
          { id: "catatan", label: "📝 Catatan Guru" },
          { id: "ews", label: `🚨 Deteksi Kerawanan (${ewsData.highRisk.length + ewsData.mediumRisk.length})` },
          { id: "perpaduan", label: "🌓 Perpaduan Semester" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="btn"
            style={{
              padding: "8px 16px",
              fontSize: "0.85rem",
              backgroundColor: activeTab === tab.id ? "var(--bg-tertiary)" : "transparent",
              color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)",
              border: activeTab === tab.id ? "1px solid var(--border-color)" : "1px solid transparent",
              borderRadius: "var(--radius-sm)",
              fontWeight: activeTab === tab.id ? "700" : "500",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <span className="spinner" style={{ width: "30px", height: "30px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
        </div>
      ) : activeTab === "mapel" ? (
        <div>
          {mataPelajaranList.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px", padding: "10px 0" }}>
              {mataPelajaranList.map(mp => {
                const stats = getSubjectStats(mp.mataPelajaran, mp.kkm);
                return (
                  <div 
                    key={mp.id} 
                    onClick={() => handleViewSubjectDetail(mp.id)}
                    className="glass-card subject-card"
                    style={{ 
                      padding: "20px", 
                      cursor: "pointer", 
                      border: "1px solid var(--border-color)", 
                      transition: "all 0.2s ease",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      position: "relative",
                      overflow: "hidden",
                      paddingBottom: "45px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "2rem" }}>📚</span>
                      <span className={`badge ${mp.isNilaiAkhirGenerated ? "badge-success" : "badge-warning"}`} style={{ fontSize: "0.7rem" }}>
                        {mp.isNilaiAkhirGenerated ? "✅ Nilai Akhir" : "⏳ Sedang Diinput"}
                      </span>
                    </div>
                    <div>
                      <h4 style={{ fontSize: "1.15rem", fontWeight: "800", margin: "4px 0" }}>{mp.mataPelajaran}</h4>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "2px 0 8px" }}>
                        Guru: <strong>{mp.guru?.nama || mp.guru_username}</strong>
                      </p>

                      {/* Real-time stats section */}
                      <div style={{ 
                        backgroundColor: "var(--bg-secondary)", 
                        borderRadius: "var(--radius-sm)", 
                        padding: "10px 12px",
                        border: "1px solid var(--border-color)",
                        fontSize: "0.75rem",
                        margin: "12px 0 4px"
                      }}>
                        {/* Top row: Rata-rata highlight */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", marginBottom: "8px", borderBottom: "1px solid var(--border-color)" }}>
                          <span style={{ color: "var(--text-secondary)", fontWeight: "600" }}>Rata-Rata Kelas</span>
                          <strong style={{ fontSize: "1.05rem", color: "var(--primary)" }}>
                            {stats.average > 0 ? stats.average.toFixed(1) : "-"}
                          </strong>
                        </div>
                        {/* Stats grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-muted)" }}>Tertinggi:</span>
                            <strong style={{ color: "var(--success)" }}>{stats.highest > 0 ? stats.highest.toFixed(1) : "-"}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-muted)" }}>Terendah:</span>
                            <strong style={{ color: stats.lowest < mp.kkm ? "var(--danger)" : "var(--text-primary)" }}>{stats.lowest > 0 ? stats.lowest.toFixed(1) : "-"}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-muted)" }}>Median:</span>
                            <strong>{stats.median > 0 ? stats.median.toFixed(1) : "-"}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-muted)" }}>Terdata:</span>
                            <strong>{stats.total}/{siswa.length}</strong>
                          </div>
                        </div>
                        {/* Ketuntasan bar */}
                        <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--border-color)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ color: "var(--text-secondary)", fontWeight: "600" }}>Ketuntasan (≥ {mp.kkm})</span>
                            <span style={{ fontWeight: "700", color: stats.passingPercent >= 75 ? "var(--success)" : stats.passingPercent >= 50 ? "var(--warning)" : "var(--danger)" }}>
                              {stats.total > 0 ? stats.passingPercent.toFixed(0) : 0}%
                            </span>
                          </div>
                          <div style={{ width: "100%", height: "6px", backgroundColor: "var(--bg-tertiary)", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ 
                              width: `${stats.total > 0 ? stats.passingPercent : 0}%`, 
                              height: "100%", 
                              borderRadius: "3px",
                              background: stats.passingPercent >= 75 ? "var(--success)" : stats.passingPercent >= 50 ? "var(--warning)" : "var(--danger)",
                              transition: "width 0.3s ease"
                            }}></div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                            <span style={{ color: "var(--success)", fontWeight: "600" }}>✓ {stats.passingCount} tuntas</span>
                            <span style={{ color: stats.failingCount > 0 ? "var(--danger)" : "var(--text-muted)", fontWeight: "600" }}>✗ {stats.failingCount} belum</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "12px", fontSize: "0.78rem", borderTop: "1px solid var(--border-color)", paddingTop: "8px", marginTop: "8px" }}>
                        <span>KKM: <strong>{mp.kkm}</strong></span>
                        <span>Semester: <strong>{mp.semester}</strong></span>
                      </div>
                    </div>
                    
                    <div style={{ 
                      position: "absolute", 
                      bottom: "12px", 
                      right: "12px", 
                      fontSize: "0.8rem", 
                      fontWeight: "700", 
                      color: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }} className="view-detail-label">
                      Lihat Nilai ➔
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card" style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
              <span style={{ fontSize: "2.5rem" }}>📭</span>
              <h4 style={{ margin: "16px 0 4px", fontWeight: "700", color: "var(--text-secondary)" }}>Belum Ada Mapel Terdaftar</h4>
              <p style={{ fontSize: "0.85rem", margin: 0 }}>Belum ada kelas aktif atau mata pelajaran untuk rombel ini pada periode terpilih.</p>
            </div>
          )}
        </div>
      ) : activeTab === "leger" ? (
        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
          {siswa.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th style={{ width: "80px", minWidth: "80px", textAlign: "center", position: "sticky", left: 0, zIndex: 12, background: "var(--bg-tertiary)" }}>Rank</th>
                    <th style={{ width: "120px", minWidth: "120px", position: "sticky", left: "80px", zIndex: 12, background: "var(--bg-tertiary)" }}>NISN</th>
                    <th style={{ width: "220px", minWidth: "220px", maxWidth: "220px", position: "sticky", left: "200px", zIndex: 12, background: "var(--bg-tertiary)", borderRight: "2px solid var(--border-color)" }}>Nama Siswa</th>
                    {mataPelajaranList.map(mp => (
                      <th key={mp.id} style={{ textAlign: "center", minWidth: "120px" }}>
                        <div>{mp.mataPelajaran}</div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: "500", marginTop: "2px" }}>
                          KKM: {mp.kkm} {!mp.isNilaiAkhirGenerated && "⏳"}
                        </div>
                      </th>
                    ))}
                    <th style={{ width: "100px", textAlign: "center", backgroundColor: "rgba(59, 130, 246, 0.05)" }}>Rata-Rata</th>
                  </tr>
                </thead>
                <tbody>
                  {siswa.map(s => (
                    <tr key={s.nisn}>
                      <td style={{ textAlign: "center", fontWeight: "800", position: "sticky", left: 0, zIndex: 10, background: "var(--bg-secondary)" }}>
                        <span style={{ 
                          display: "inline-flex", 
                          width: "24px", 
                          height: "24px", 
                          alignItems: "center", 
                          justifyContent: "center",
                          borderRadius: "50%",
                          backgroundColor: s.ranking === 1 ? "rgba(251, 191, 36, 0.2)" : s.ranking === 2 ? "rgba(226, 232, 240, 0.2)" : s.ranking === 3 ? "rgba(180, 83, 9, 0.15)" : "transparent",
                          color: s.ranking === 1 ? "#fbbf24" : s.ranking === 2 ? "#e2e8f0" : s.ranking === 3 ? "#b45309" : "var(--text-primary)"
                        }}>
                          {s.ranking}
                        </span>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85rem", position: "sticky", left: "80px", zIndex: 10, background: "var(--bg-secondary)" }}>{s.nisn}</td>
                      <td style={{ fontWeight: "700", position: "sticky", left: "200px", zIndex: 10, background: "var(--bg-secondary)", borderRight: "2px solid var(--border-color)" }}>{s.nama}</td>
                      {mataPelajaranList.map(mp => {
                        const score = (s.nilaiMapel || {})[mp.mataPelajaran];
                        const isUnderKkm = score !== undefined && score !== null && score < mp.kkm;
                        return (
                          <td 
                            key={mp.id} 
                            style={{ 
                              textAlign: "center", 
                              fontWeight: "700",
                              color: isUnderKkm ? "var(--danger)" : "var(--text-primary)",
                              backgroundColor: isUnderKkm ? "rgba(239, 68, 68, 0.02)" : "transparent"
                            }}
                          >
                            {score !== undefined && score !== null ? (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <span>{score.toFixed(2)}</span>
                                {isUnderKkm && <span style={{ fontSize: "0.65rem", color: "var(--danger)" }} title="Di bawah KKM">⚠️</span>}
                              </div>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontWeight: "400" }}>-</span>
                            )}
                          </td>
                        );
                      })}
                      <td style={{ textAlign: "center", fontWeight: "900", backgroundColor: "rgba(59, 130, 246, 0.02)" }}>{s.rataRata.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
              <span style={{ fontSize: "2.5rem" }}>📭</span>
              <h4 style={{ margin: "16px 0 4px", fontWeight: "700", color: "var(--text-secondary)" }}>Belum Ada Data Nilai</h4>
              <p style={{ fontSize: "0.85rem", margin: 0 }}>Belum ada kelas aktif atau nilai terinput untuk rombel ini pada periode terpilih.</p>
            </div>
          )}
        </div>
      ) : activeTab === "catatan" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {siswa.length > 0 ? (
            siswa.map(s => {
              const subjectRemarks = Object.entries(s.catatanMapel || {})
                .filter(([_, remark]) => remark && String(remark).trim() !== "");
                
              return (
                <div key={s.nisn} className="glass-card animate-fade-in" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
                    <div>
                      <strong style={{ fontSize: "1.1rem", color: "var(--text-primary)" }}>{s.nama}</strong>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginLeft: "12px", fontFamily: "monospace" }}>NISN: {s.nisn}</span>
                    </div>
                    <span className="badge badge-info">Peringkat {s.ranking}</span>
                  </div>
                  
                  {subjectRemarks.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {subjectRemarks.map(([mapel, remark]) => (
                        <div key={mapel} style={{ display: "flex", gap: "12px", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", padding: "10px 14px", borderLeft: "4px solid var(--primary)", alignItems: "flex-start" }}>
                          <div style={{ minWidth: "140px", fontWeight: "700", color: "var(--text-secondary)" }}>
                            📚 {mapel}
                          </div>
                          <div style={{ fontSize: "0.88rem", color: "var(--text-primary)", fontStyle: "italic", whiteSpace: "pre-wrap", flex: 1 }}>
                            "{remark}"
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                      Belum ada catatan atau umpan balik perkembangan dari guru mata pelajaran.
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="glass-card" style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
              <span style={{ fontSize: "2.5rem" }}>📭</span>
              <h4 style={{ margin: "16px 0 4px", fontWeight: "700", color: "var(--text-secondary)" }}>Belum Ada Data Siswa</h4>
              <p style={{ fontSize: "0.85rem", margin: 0 }}>Belum ada data siswa untuk rombel ini pada periode terpilih.</p>
            </div>
          )}
        </div>
      ) : activeTab === "ews" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* High Risk Section */}
          <div className="glass-card" style={{ borderLeft: "4px solid var(--danger)" }}>
            <h4 style={{ color: "var(--danger)", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px", margin: "0 0 16px" }}>
              🚨 Rawan Gagal Akademis (≥ 3 Mapel di bawah KKM)
            </h4>
            {ewsData.highRisk.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {ewsData.highRisk.map(s => (
                  <div key={s.nisn} style={{ padding: "14px", backgroundColor: "rgba(239, 68, 68, 0.04)", border: "1px dashed rgba(239, 68, 68, 0.15)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "8px" }}>
                      <span style={{ fontWeight: "800" }}>{s.nama} ({s.nisn})</span>
                      <span className="badge" style={{ backgroundColor: "var(--danger)", color: "#fff", fontSize: "0.75rem", padding: "2px 8px" }}>
                        {s.failingSubjects.length} Mapel Gagal
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {s.failingSubjects.map(sub => (
                        <span key={sub.mapel} style={{ fontSize: "0.75rem", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", padding: "4px 8px", borderRadius: "4px" }}>
                          {sub.mapel}: <strong style={{ color: "var(--danger)" }}>{sub.nilai}</strong> (KKM: {sub.kkm})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>✅ Sangat Bagus! Tidak ada siswa terdeteksi dalam kategori rawan gagal.</p>
            )}
          </div>

          {/* Medium Risk Section */}
          <div className="glass-card" style={{ borderLeft: "4px solid var(--warning)" }}>
            <h4 style={{ color: "var(--warning)", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px", margin: "0 0 16px" }}>
              ⚠️ Perlu Perhatian Khusus (1-2 Mapel di bawah KKM)
            </h4>
            {ewsData.mediumRisk.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {ewsData.mediumRisk.map(s => (
                  <div key={s.nisn} style={{ padding: "14px", backgroundColor: "rgba(245, 158, 11, 0.03)", border: "1px dashed rgba(245, 158, 11, 0.12)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "8px" }}>
                      <span style={{ fontWeight: "800" }}>{s.nama} ({s.nisn})</span>
                      <span className="badge" style={{ backgroundColor: "var(--warning)", color: "#fff", fontSize: "0.75rem", padding: "2px 8px" }}>
                        {s.failingSubjects.length} Mapel Gagal
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {s.failingSubjects.map(sub => (
                        <span key={sub.mapel} style={{ fontSize: "0.75rem", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", padding: "4px 8px", borderRadius: "4px" }}>
                          {sub.mapel}: <strong style={{ color: "var(--warning)" }}>{sub.nilai}</strong> (KKM: {sub.kkm})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>✅ Bagus! Tidak ada siswa terdeteksi dalam kategori perlu perhatian.</p>
            )}
          </div>

        </div>
      ) : activeTab === "perpaduan" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }} className="no-print">
          <div className="glass-card" style={{ padding: "20px" }}>
            <h4 style={{ fontSize: "1.1rem", fontWeight: "800", marginBottom: "6px" }}>🌓 Perpaduan Semester (Ganjil &amp; Genap)</h4>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
              Menampilkan gabungan nilai rata-rata siswa untuk Semester Ganjil dan Semester Genap pada Tahun Pelajaran {tahunAjaran}.
            </p>
          </div>

          {loadingPerpaduan ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
              <span className="spinner" style={{ width: "30px", height: "30px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
            </div>
          ) : perpaduanSiswa.length > 0 ? (
            <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", overflowX: "auto", backgroundColor: "var(--bg-primary)" }}>
              <table className="premium-table" style={{ margin: 0, width: "100%" }}>
                <thead>
                  <tr style={{ backgroundColor: "var(--bg-tertiary)" }}>
                    <th rowSpan={2} style={{ width: "60px", textAlign: "center", verticalAlign: "middle" }}>No</th>
                    <th rowSpan={2} style={{ width: "130px", verticalAlign: "middle" }}>NISN</th>
                    <th rowSpan={2} style={{ minWidth: "180px", verticalAlign: "middle" }}>Nama Siswa</th>
                    {perpaduanMapelList.map(mp => (
                      <th key={mp.mataPelajaran} colSpan={3} style={{ textAlign: "center", borderBottom: "1px solid var(--border-color)" }}>
                        {mp.mataPelajaran} (KKM: {mp.kkm})
                      </th>
                    ))}
                    <th rowSpan={2} style={{ width: "90px", textAlign: "center", backgroundColor: "rgba(59, 130, 246, 0.05)", verticalAlign: "middle" }}>Rata Akhir (Ganjil)</th>
                    <th rowSpan={2} style={{ width: "90px", textAlign: "center", backgroundColor: "rgba(16, 185, 129, 0.05)", verticalAlign: "middle" }}>Rata Akhir (Genap)</th>
                    <th rowSpan={2} style={{ width: "100px", textAlign: "center", backgroundColor: "rgba(124, 58, 237, 0.08)", verticalAlign: "middle" }}>Rata Akhir (Tahun)</th>
                  </tr>
                  <tr style={{ backgroundColor: "var(--bg-tertiary)" }}>
                    {perpaduanMapelList.map(mp => (
                      <Fragment key={mp.mataPelajaran}>
                        <th style={{ textAlign: "center", fontSize: "0.7rem", padding: "6px 4px", fontWeight: "normal" }}>Gj</th>
                        <th style={{ textAlign: "center", fontSize: "0.7rem", padding: "6px 4px", fontWeight: "normal" }}>Gp</th>
                        <th style={{ textAlign: "center", fontSize: "0.7rem", padding: "6px 4px", fontWeight: "bold" }}>Avg</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {perpaduanSiswa.map((s, index) => {
                    const ganjilScores = Object.values(s.nilaiGanjil).map(Number).filter(v => !isNaN(v));
                    const genapScores = Object.values(s.nilaiGenap).map(Number).filter(v => !isNaN(v));
                    
                    const ganjilAvg = ganjilScores.length > 0 ? ganjilScores.reduce((a, b) => a + b, 0) / ganjilScores.length : null;
                    const genapAvg = genapScores.length > 0 ? genapScores.reduce((a, b) => a + b, 0) / genapScores.length : null;

                    const yearSubjectScores = perpaduanMapelList.map(mp => {
                      const gj = s.nilaiGanjil[mp.mataPelajaran];
                      const gp = s.nilaiGenap[mp.mataPelajaran];
                      const vals = [];
                      if (gj !== undefined && gj !== null && gj !== "") vals.push(Number(gj));
                      if (gp !== undefined && gp !== null && gp !== "") vals.push(Number(gp));
                      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
                    }).filter(v => v !== null);

                    const yearAvg = yearSubjectScores.length > 0 ? yearSubjectScores.reduce((a, b) => a + b, 0) / yearSubjectScores.length : null;

                    return (
                      <tr key={s.nisn} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ textAlign: "center", fontWeight: "700" }}>{index + 1}</td>
                        <td style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{s.nisn}</td>
                        <td style={{ fontWeight: "700", color: "var(--text-primary)" }}>{s.nama}</td>
                        {perpaduanMapelList.map(mp => {
                          const gjVal = s.nilaiGanjil[mp.mataPelajaran];
                          const gpVal = s.nilaiGenap[mp.mataPelajaran];
                          
                          const gjNum = gjVal !== undefined && gjVal !== null && gjVal !== "" ? Number(gjVal) : null;
                          const gpNum = gpVal !== undefined && gpVal !== null && gpVal !== "" ? Number(gpVal) : null;
                          
                          const subjectAvg = (gjNum !== null || gpNum !== null) 
                            ? ((gjNum || 0) + (gpNum || 0)) / ((gjNum !== null ? 1 : 0) + (gpNum !== null ? 1 : 0))
                            : null;

                          return (
                            <Fragment key={mp.mataPelajaran}>
                              <td style={{ textAlign: "center", fontSize: "0.82rem", color: gjNum && gjNum < mp.kkm ? "var(--danger)" : "var(--text-primary)" }}>
                                {gjNum !== null ? gjNum.toFixed(1) : <span style={{ color: "var(--text-muted)" }}>-</span>}
                              </td>
                              <td style={{ textAlign: "center", fontSize: "0.82rem", color: gpNum && gpNum < mp.kkm ? "var(--danger)" : "var(--text-primary)" }}>
                                {gpNum !== null ? gpNum.toFixed(1) : <span style={{ color: "var(--text-muted)" }}>-</span>}
                              </td>
                              <td style={{ textAlign: "center", fontSize: "0.82rem", fontWeight: "700", backgroundColor: "var(--bg-secondary)", color: subjectAvg && subjectAvg < mp.kkm ? "var(--danger)" : "var(--primary)" }}>
                                {subjectAvg !== null ? subjectAvg.toFixed(1) : <span style={{ color: "var(--text-muted)" }}>-</span>}
                              </td>
                            </Fragment>
                          );
                        })}
                        <td style={{ textAlign: "center", fontWeight: "700", backgroundColor: "rgba(59, 130, 246, 0.02)" }}>
                          {ganjilAvg !== null ? ganjilAvg.toFixed(1) : <span style={{ color: "var(--text-muted)" }}>-</span>}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: "700", backgroundColor: "rgba(16, 185, 129, 0.02)" }}>
                          {genapAvg !== null ? genapAvg.toFixed(1) : <span style={{ color: "var(--text-muted)" }}>-</span>}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: "900", color: "var(--primary)", backgroundColor: "rgba(124, 58, 237, 0.04)" }}>
                          {yearAvg !== null ? yearAvg.toFixed(1) : <span style={{ color: "var(--text-muted)" }}>-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
              <span style={{ fontSize: "2.5rem" }}>📭</span>
              <h4 style={{ margin: "16px 0 4px", fontWeight: "700", color: "var(--text-secondary)" }}>Belum Ada Data</h4>
              <p style={{ fontSize: "0.85rem", margin: 0 }}>Belum ada kelas aktif atau nilai terinput untuk rombel ini pada periode terpilih.</p>
            </div>
          )}
        </div>
      ) : null}

            {renderModal()}



      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .premium-table tr:hover td {
          background-color: var(--bg-tertiary) !important;
        }
        .subject-card:hover {
          transform: translateY(-4px);
          border-color: var(--primary) !important;
          box-shadow: 0 10px 20px rgba(124, 58, 237, 0.08) !important;
        }
        .subject-card:hover .view-detail-label {
          text-decoration: underline;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
        }
        @media (max-width: 992px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 576px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .modal-glass-container {
            max-height: 92vh !important;
            border-radius: var(--radius-sm) !important;
          }
          .modal-header-container {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
          }
          .stats-grid-container {
            padding: 12px 16px !important;
            gap: 8px !important;
          }
          .table-padding-container {
            padding: 12px 16px !important;
          }
        }
      `}</style>

    </div>
  );
}
