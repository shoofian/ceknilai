"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function GuruDashboard() {
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
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      
      {/* Welcome banner */}
      <div className="page-title-section">
        <h1 className="page-title">Selamat Datang, Guru!</h1>
        <p className="page-subtitle">Berikut adalah statistik pengajaran dan akses cepat manajemen kelas Anda hari ini.</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid-cols-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        
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
      <div className="grid-cols-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", alignItems: "start" }}>
        
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
                      Mata Pelajaran: {kelas.mataPelajaran || 'Informatika'} &bull; TA: {kelas.tahunAjaran} &bull; {kelas.siswa.length} Siswa
                    </p>
                  </div>
                  <Link href={`/guru/kelas/${kelas.id}`} className="btn btn-primary" style={{ padding: "8px 12px", fontSize: "0.8rem" }}>
                    Kelola Nilai
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", backgroundColor: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", border: "1px dashed var(--border-color)" }}>
              Belum ada kelas aktif yang terdaftar.
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
                <h5 style={{ fontSize: "0.9rem", fontWeight: "700" }}>Atur Kolom Nilai &amp; Bobot Persentase</h5>
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
                <h5 style={{ fontSize: "0.9rem", fontWeight: "700" }}>Cetak &amp; Cari Nilai</h5>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Cetak laporan nilai per kelas yang rapi, dan biarkan siswa mengakses nilainya di portal pencarian siswa mandiri.
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
