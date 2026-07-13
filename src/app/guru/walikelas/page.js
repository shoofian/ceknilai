"use client";

import { useState, useEffect } from "react";
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
  
  // Data States
  const [siswa, setSiswa] = useState([]);
  const [mataPelajaranList, setMataPelajaranList] = useState([]);
  const [activeTab, setActiveTab] = useState("leger");
  const [rombelList, setRombelList] = useState([]);
  const [selectedRombelKey, setSelectedRombelKey] = useState("");

  // Options
  const TAHUN_AJARAN_OPTIONS = ["2023/2024", "2024/2025", "2025/2026", "2026/2027"];
  const SEMESTER_OPTIONS = ["Ganjil", "Genap"];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.loggedIn && data.user) {
            setGuru(data.user);
            if (data.user.sekolah_id) {
              setAuthorized(true);
            } else {
              setErrorMsg("Asal sekolah Anda belum diatur. Silakan setel sekolah Anda di halaman Profil terlebih dahulu untuk menggunakan dashboard ini.");
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

  // Fetch Rombels list on mount
  useEffect(() => {
    if (!authorized || !guru) return;
    const fetchRombels = async () => {
      try {
        const res = await fetch("/api/sekolah/rombel");
        if (res.ok) {
          const list = await res.json();
          setRombelList(list);
          if (list.length > 0) {
            let defaultRombel = list[0];
            if (guru.walikelas_tingkatan && guru.walikelas_rombel_nama) {
              const found = list.find(r => r.tingkatan === guru.walikelas_tingkatan && r.rombelNama === guru.walikelas_rombel_nama);
              if (found) defaultRombel = found;
            }
            setSelectedRombelKey(`${defaultRombel.tingkatan}-${defaultRombel.rombelNama}`);
          }
        }
      } catch (err) {
        console.error("Gagal mengambil daftar rombel", err);
      }
    };
    fetchRombels();
  }, [authorized, guru]);

  // Fetch Leger Data when filters change
  useEffect(() => {
    if (!authorized || !guru || !selectedRombelKey) return;

    const fetchLeger = async () => {
      setLoading(true);
      try {
        const [tingkatan, rombelNama] = selectedRombelKey.split("-");
        const res = await fetch(`/api/walikelas/leger?tingkatan=${tingkatan}&rombel_nama=${rombelNama}&tahun_ajaran=${tahunAjaran}&semester=${semester}`);
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
  }, [authorized, guru, tahunAjaran, semester]);

  // EWS Calculations
  const ewsData = (() => {
    const highRisk = []; // >= 3 failing
    const mediumRisk = []; // 1-2 failing
    let safeCount = 0;

    siswa.forEach(s => {
      const failingSubjects = [];
      mataPelajaranList.forEach(mp => {
        const score = s.nilaiMapel[mp.mataPelajaran];
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
    const [tingkatan, rombelNama] = selectedRombelKey.split("-");
    csvContent += `Rombel:;Kelas ${tingkatan} ${rombelNama}\n`;
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
        const score = s.nilaiMapel[mp.mataPelajaran];
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
    const rombelStr = selectedRombelKey.replace("-", "_");
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "10px 0" }}>
      
      {/* Header Profile Section */}
      <div className="glass-card" style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        flexWrap: "wrap", 
        gap: "16px",
        background: "linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%)",
        borderLeft: "4px solid var(--primary)"
      }}>
        <div>
          <span style={{ fontSize: "0.7rem", fontWeight: "800", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>🏫 Dashboard Wali Kelas</span>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "900", margin: "4px 0 6px" }}>
            {selectedRombelKey ? `Kelas ${selectedRombelKey.split("-").join(" ")}` : "Pilih Rombel"}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 }}>
            Instansi: <strong>{guru?.sekolah?.nama || "Sekolah Contoh"}</strong> • NPSN: <strong>{guru?.sekolah?.npsn || "-"}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Guru Pengampu: <strong>{guru?.nama}</strong></span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", padding: "16px" }}>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.7rem", fontWeight: "700", color: "var(--text-secondary)" }}>Rombongan Belajar (Rombel)</label>
            {rombelList.length > 0 ? (
              <select
                className="form-input"
                value={selectedRombelKey}
                onChange={(e) => setSelectedRombelKey(e.target.value)}
                style={{ padding: "6px 12px", fontSize: "0.82rem", width: "max-content", minWidth: "150px", appearance: "auto", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
              >
                {rombelList.map(r => (
                  <option key={`${r.tingkatan}-${r.rombelNama}`} value={`${r.tingkatan}-${r.rombelNama}`} style={{ backgroundColor: "var(--bg-secondary)" }}>
                    Kelas {r.tingkatan} {r.rombelNama}
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", padding: "8px 0" }}>Belum ada kelas aktif</span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.7rem", fontWeight: "700", color: "var(--text-secondary)" }}>Tahun Ajaran</label>
            <select
              className="form-input"
              value={tahunAjaran}
              onChange={(e) => setTahunAjaran(e.target.value)}
              style={{ padding: "6px 12px", fontSize: "0.82rem", width: "max-content", minWidth: "120px", appearance: "auto", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
            >
              {TAHUN_AJARAN_OPTIONS.map(ta => (
                <option key={ta} value={ta} style={{ backgroundColor: "var(--bg-secondary)" }}>{ta}</option>
              ))}
            </select>
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
          { id: "leger", label: "📊 Buku Leger Nilai" },
          { id: "catatan", label: "📝 Catatan Guru" },
          { id: "ews", label: `🚨 Deteksi Kerawanan (${ewsData.highRisk.length + ewsData.mediumRisk.length})` }
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
      ) : activeTab === "leger" ? (
        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
          {siswa.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th style={{ width: "80px", textAlign: "center" }}>Rank</th>
                    <th style={{ width: "130px" }}>NISN</th>
                    <th>Nama Siswa</th>
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
                      <td style={{ textAlign: "center", fontWeight: "800" }}>
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
                      <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{s.nisn}</td>
                      <td style={{ fontWeight: "700" }}>{s.nama}</td>
                      {mataPelajaranList.map(mp => {
                        const score = s.nilaiMapel[mp.mataPelajaran];
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
                .filter(([_, remark]) => remark && remark.trim() !== "");
                
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
      ) : (
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
      )}

      {/* global animations */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}
