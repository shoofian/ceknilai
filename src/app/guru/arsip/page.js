"use client";
 
import { useState, useEffect } from "react";
import Link from "next/link";
 
export default function ArsipKelas() {
  const [loading, setLoading] = useState(true);
  const [kelas, setKelas] = useState([]);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState("Semua");
  const [selectedSemester, setSelectedSemester] = useState("Semua");
  const [selectedMataPelajaran, setSelectedMataPelajaran] = useState("Semua");
  const [selectedTingkatan, setSelectedTingkatan] = useState("Semua");
  const TINGKATAN_OPTIONS = [...Array.from({ length: 12 }, (_, i) => i + 1), "Ekskul"];
 
  const fetchArchivedKelas = async () => {
    try {
      const response = await fetch("/api/kelas?archived=true");
      if (response.ok) {
        const data = await response.json();
        setKelas(data);
      }
    } catch (err) {
      console.error("Gagal mengambil arsip kelas", err);
    } finally {
      setLoading(false);
    }
  };
 
  useEffect(() => {
    fetchArchivedKelas();
  }, []);
 
  const handleRestore = async (id, name) => {
    if (confirm(`Apakah Anda yakin ingin memulihkan kelas "${name}"? Kelas ini akan kembali muncul di daftar kelas aktif.`)) {
      try {
        const response = await fetch(`/api/kelas/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: false }),
        });
        
        if (response.ok) {
          fetchArchivedKelas();
        } else {
          const data = await response.json();
          alert(data.error || "Gagal memulihkan kelas.");
        }
      } catch (err) {
        console.error("Restore failed", err);
      }
    }
  };
 
  const handleDelete = async (id, name) => {
    if (confirm(`⚠️ PERINGATAN KERAS!\nApakah Anda yakin ingin menghapus kelas "${name}" dari arsip?\nTindakan ini bersifat PERMANEN dan akan menghapus semua data siswa serta nilai di dalamnya secara permanen!`)) {
      try {
        const response = await fetch(`/api/kelas/${id}`, {
          method: "DELETE",
        });
        
        if (response.ok) {
          fetchArchivedKelas();
        } else {
          const data = await response.json();
          alert(data.error || "Gagal menghapus kelas.");
        }
      } catch (err) {
        console.error("Delete failed", err);
      }
    }
  };

  // Dynamic filter options derived from data
  const tahunAjaranOptions = ["Semua", ...Array.from(new Set(kelas.map(k => k.tahunAjaran).filter(Boolean))).sort()];
  const semesterOptions = ["Semua", ...Array.from(new Set(kelas.map(k => k.semester || "Ganjil").filter(Boolean))).sort()];
  const mataPelajaranOptions = ["Semua", ...Array.from(new Set(kelas.map(k => k.mataPelajaran || "Informatika").filter(Boolean))).sort()];
  const tingkatanOptions = ["Semua", ...Array.from(new Set(kelas.map(k => k.tingkatan).filter(Boolean))).sort((a, b) => a - b).map(String)];

  const filteredKelas = kelas.filter(k => {
    const matchesSearch = k.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (k.mataPelajaran || "Informatika").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTahun = selectedTahunAjaran === "Semua" || k.tahunAjaran === selectedTahunAjaran;
    const matchesSemester = selectedSemester === "Semua" || (k.semester || "Ganjil") === selectedSemester;
    const matchesMapel = selectedMataPelajaran === "Semua" || (k.mataPelajaran || "Informatika") === selectedMataPelajaran;
    const matchesTingkatan = selectedTingkatan === "Semua" || String(k.tingkatan) === selectedTingkatan;
    return matchesSearch && matchesTahun && matchesSemester && matchesMapel && matchesTingkatan;
  });
 
  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Title */}
      <div className="page-title-section">
        <h1 className="page-title">Arsip Kelas</h1>
        <p className="page-subtitle">Daftar kelas-kelas yang tidak aktif. Anda dapat memulihkannya kembali atau menghapusnya permanen.</p>
      </div>
 
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <span className="spinner" style={{ width: "30px", height: "30px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
        </div>
      ) : kelas.length > 0 ? (
        <>
          {/* Filter Bar */}
          <div className="glass-card" style={{ display: "flex", gap: "16px", flexWrap: "wrap", padding: "16px", alignItems: "center" }}>
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
            
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-secondary)" }}>Tahun Pelajaran</label>
                <select
                  className="form-input"
                  value={selectedTahunAjaran}
                  onChange={(e) => setSelectedTahunAjaran(e.target.value)}
                  style={{ padding: "6px 12px", fontSize: "0.82rem", borderRadius: "var(--radius-sm)", width: "max-content", minWidth: "130px" }}
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
                  style={{ padding: "6px 12px", fontSize: "0.82rem", borderRadius: "var(--radius-sm)", width: "max-content", minWidth: "110px" }}
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
                  style={{ padding: "6px 12px", fontSize: "0.82rem", borderRadius: "var(--radius-sm)", width: "max-content", minWidth: "150px" }}
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
                  style={{ padding: "6px 12px", fontSize: "0.82rem", borderRadius: "var(--radius-sm)", width: "max-content", minWidth: "120px" }}
                >
                  {tingkatanOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
          </div>
 
          {filteredKelas.length > 0 ? (
            <div className="grid-cols-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {filteredKelas.map((k) => (
                <div key={k.id} className="glass-card animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px", borderBottom: "4px solid var(--text-muted)", opacity: 0.85 }}>
                  <div>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
                      <span className="badge badge-warning" style={{ backgroundColor: "rgba(100, 116, 139, 0.1)", color: "var(--text-secondary)", borderColor: "var(--border-color)" }}>
                        📁 diarsipkan &bull; {k.tahunAjaran} ({k.semester || "Ganjil"}) &bull; {k.mataPelajaran || "Informatika"}
                      </span>
                      {k.tingkatan && (
                        <span className="badge" style={{ backgroundColor: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6", border: "1px solid rgba(139, 92, 246, 0.15)", fontWeight: "700" }}>
                          🎓 Kelas {k.tingkatan}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: "1.4rem", fontWeight: "700" }}>{k.nama}</h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "6px" }}>
                      👨‍🎓 <strong>{k.siswa?.length || 0}</strong> siswa terdaftar &bull; 🏷️ <strong>{k.kolomNilai?.length || 0}</strong> komponen nilai
                    </p>
                  </div>
 
                  {/* Actions */}
                  <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                    <Link href={`/guru/kelas/${k.id}`} className="btn btn-secondary" style={{ flex: 1.5, fontSize: "0.85rem", padding: "10px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      👁️ Lihat Kelas
                    </Link>
                    <button onClick={() => handleRestore(k.id, k.nama)} className="btn btn-primary" style={{ flex: 1.2, fontSize: "0.85rem", padding: "10px" }}>
                      ♻️ Pulihkan
                    </button>
                    <button onClick={() => handleDelete(k.id, k.nama)} className="btn btn-secondary" style={{ padding: "10px", color: "var(--danger)", borderColor: "rgba(239, 68, 68, 0.15)", backgroundColor: "var(--danger-glow)", display: "inline-flex", alignItems: "center", justifyContent: "center" }} title="Hapus Permanen">
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "60px 20px", textAlign: "center", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-color)" }}>
              <h3 style={{ fontSize: "1.25rem", color: "var(--text-secondary)", marginBottom: "8px" }}>Pencarian Tidak Ditemukan</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Tidak ada kelas arsip yang cocok dengan filter pencarian Anda.</p>
            </div>
          )}
        </>
      ) : (
        <div style={{ padding: "60px 20px", textAlign: "center", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-color)" }}>
          <h3 style={{ fontSize: "1.25rem", color: "var(--text-secondary)", marginBottom: "8px" }}>Arsip Kelas Kosong</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Belum ada kelas yang diarsipkan saat ini.</p>
        </div>
      )}
 
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
