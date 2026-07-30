"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function GuruDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeClassesCount: 0,
    archivedClassesCount: 0,
    totalStudentsCount: 0,
    overallAverage: 0,
  });
  const [recentClasses, setRecentClasses] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("/api/kelas?archived=all");
        if (response.ok) {
          const classes = await response.json();
          
          const activeClasses = classes.filter(k => !k.archived);
          const archivedClasses = classes.filter(k => k.archived);
          
          let totalStudents = 0;
          let totalScoreSum = 0;
          let totalGradedStudents = 0;

          activeClasses.forEach(kelas => {
            totalStudents += kelas.siswa.length;
 
            kelas.siswa.forEach(siswa => {
              // Hitung nilai akhir siswa secara proporsional
              let totalBobotTerisi = 0;
              let totalNilaiTerisi = 0;
              
              kelas.kolomNilai.forEach(col => {
                const score = siswa.nilai[col.id];
                if (score !== undefined && score !== null && score !== "") {
                  totalNilaiTerisi += Number(score) * (col.bobot / 100);
                  totalBobotTerisi += col.bobot;
                }
              });

              const finalScore = totalBobotTerisi > 0 
                ? (totalNilaiTerisi / (totalBobotTerisi / 100)) 
                : 0;
              
              totalScoreSum += finalScore;
              totalGradedStudents++;
            });
          });

          const average = totalGradedStudents > 0 
            ? (totalScoreSum / totalGradedStudents).toFixed(2) 
            : 0;

          setStats({
            activeClassesCount: activeClasses.length,
            archivedClassesCount: archivedClasses.length,
            totalStudentsCount: totalStudents,
            overallAverage: average,
          });

          // Ambil maksimal 3 kelas aktif terakhir untuk ditampilkan di ringkasan
          setRecentClasses(activeClasses.slice(0, 3));
        }
      } catch (err) {
        console.error("Failed to load dashboard statistics", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="spinner" style={{ width: "30px", height: "30px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .clickable-recent-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          cursor: pointer;
        }
        .clickable-recent-card:hover {
          transform: translateY(-2px);
          border-color: var(--primary) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .clickable-recent-card:hover .recent-card-btn {
          background-color: var(--primary) !important;
          color: white !important;
        }
      `}} />
      <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      
      {/* Welcome banner */}
      <div className="page-title-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="page-title">Selamat Datang, Guru!</h1>
          <p className="page-subtitle">Berikut adalah statistik pengajaran dan akses cepat manajemen kelas Anda hari ini.</p>
        </div>
        <Link 
          href="/guru/referral"
          className="btn animate-pulse"
          style={{
            background: "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)",
            color: "#000000",
            fontWeight: "800",
            fontSize: "0.85rem",
            padding: "10px 18px",
            borderRadius: "999px",
            boxShadow: "0 4px 15px rgba(234, 179, 8, 0.25)",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            textDecoration: "none"
          }}
        >
          👑 Cek Masa Aktif / Langganan &rarr;
        </Link>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid-cols-4">
        
        <div className="stat-card">
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "600" }}>KELAS AKTIF</span>
            <h2 style={{ fontSize: "2rem", marginTop: "4px" }}>{stats.activeClassesCount}</h2>
          </div>
          <div className="stat-icon" style={{ backgroundColor: "var(--primary-glow)", color: "var(--primary)" }}>📘</div>
        </div>

        <div className="stat-card">
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "600" }}>SISWA AKTIF</span>
            <h2 style={{ fontSize: "2rem", marginTop: "4px" }}>{stats.totalStudentsCount}</h2>
          </div>
          <div className="stat-icon" style={{ backgroundColor: "var(--success-glow)", color: "var(--success)" }}>👥</div>
        </div>

        <div className="stat-card">
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "600" }}>NILAI RATA-RATA</span>
            <h2 style={{ fontSize: "2rem", marginTop: "4px" }}>{stats.overallAverage}</h2>
          </div>
          <div className="stat-icon" style={{ backgroundColor: "var(--warning-glow)", color: "var(--warning)" }}>⭐</div>
        </div>

        <div className="stat-card">
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "600" }}>ARSIP KELAS</span>
            <h2 style={{ fontSize: "2rem", marginTop: "4px" }}>{stats.archivedClassesCount}</h2>
          </div>
          <div className="stat-icon" style={{ backgroundColor: "var(--danger-glow)", color: "var(--danger)" }}>📁</div>
        </div>

      </div>

      {/* Main Grid Dashboard */}
      <div className="grid-cols-2" style={{ alignItems: "start" }}>
        
        {/* Left Side: Recent Classes */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ fontSize: "1.2rem", fontWeight: "700" }}>📚 Kelas Aktif Terbaru</h4>
            <Link href="/guru/kelas" style={{ fontSize: "0.85rem", fontWeight: "600" }}>Lihat Semua →</Link>
          </div>

          {recentClasses.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {recentClasses.map((kelas) => (
                <div
                  key={kelas.id}
                  className="clickable-recent-card"
                  onClick={() => router.push(`/guru/kelas/${kelas.id}`)}
                  style={{
                    padding: "16px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-tertiary)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <h5 style={{ fontSize: "0.95rem", fontWeight: "700" }}>{kelas.nama}</h5>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                      Mata Pelajaran: {kelas.mataPelajaran || 'Informatika'} &bull; TA: {kelas.tahunAjaran} ({kelas.semester || "Ganjil"}) &bull; {kelas.siswa.length} Siswa
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                    <Link href={`/guru/kelas/${kelas.id}`} className="btn btn-primary recent-card-btn" style={{ padding: "8px 12px", fontSize: "0.75rem", fontWeight: "700", textDecoration: "none" }}>
                      📊 Kelola
                    </Link>
                    <Link href={`/guru/kelas/${kelas.id}?action=quick-attendance`} className="btn" style={{ padding: "8px 12px", fontSize: "0.75rem", backgroundColor: "#10b981", color: "#ffffff", border: "none", fontWeight: "700", display: "flex", alignItems: "center", gap: "2px", textDecoration: "none" }}>
                      ⚡ Presensi
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "40px 20px", textAlign: "center", backgroundColor: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", border: "2px dashed var(--primary-glow)", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              <div style={{ fontSize: "3.5rem", marginBottom: "8px", filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.1))" }}>🏫</div>
              <h5 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)" }}>Belum Ada Kelas</h5>
              <p style={{ color: "var(--text-secondary)", maxWidth: "350px", fontSize: "0.9rem", lineHeight: "1.5" }}>
                Mari mulai langkah pertama Anda dengan mendaftarkan kelas baru untuk tahun ajaran ini.
              </p>
              <Link href="/guru/kelas" className="btn btn-primary" style={{ marginTop: "8px", padding: "12px 28px", fontSize: "1rem", fontWeight: "700", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px", borderRadius: "99px", boxShadow: "0 8px 20px var(--primary-glow)", transition: "transform 0.2s" }} onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"} onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}>
                ➕ Buat Kelas Pertamamu
              </Link>
            </div>
          )}
        </div>

        {/* Right Side: Quick Guides & Steps */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h4 style={{ fontSize: "1.2rem", fontWeight: "700" }}>💡 Panduan Alur Kerja Penilaian</h4>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "16px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "var(--primary-glow)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "0.85rem", flexShrink: 0 }}>
                1
              </div>
              <div>
                <h5 style={{ fontSize: "0.9rem", fontWeight: "700" }}>Buat Kelas Baru</h5>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Buka menu <strong>Daftar Kelas</strong>, lalu buat kelas sesuai semester/tahun ajaran aktif.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "var(--primary-glow)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "0.85rem", flexShrink: 0 }}>
                2
              </div>
              <div>
                <h5 style={{ fontSize: "0.9rem", fontWeight: "700" }}>Atur Kolom Nilai & Bobot Persentase</h5>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Masukkan komponen penilaian (UTS, UAS, Tugas) beserta bobot masing-masing. Total bobot otomatis dihitung menuju 100%.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "var(--primary-glow)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "0.85rem", flexShrink: 0 }}>
                3
              </div>
              <div>
                <h5 style={{ fontSize: "0.9rem", fontWeight: "700" }}>Input Siswa / Impor CSV</h5>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Tambahkan siswa secara manual, atau unduh format template nilai dan impor file CSV untuk memasukkan nilai secara massal.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "var(--primary-glow)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "0.85rem", flexShrink: 0 }}>
                4
              </div>
              <div>
                <h5 style={{ fontSize: "0.9rem", fontWeight: "700" }}>Cetak & Cari Nilai</h5>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Cetak laporan nilai per kelas yang rapi, dan biarkan siswa mengakses nilainya di portal pencarian siswa mandiri.
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
    </>
  );
}
