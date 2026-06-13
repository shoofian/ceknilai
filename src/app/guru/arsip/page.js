"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function ArsipKelas() {
  const [loading, setLoading] = useState(true);
  const [kelas, setKelas] = useState([]);

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
        <div className="grid-cols-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {kelas.map((k) => (
            <div key={k.id} className="glass-card animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px", borderBottom: "4px solid var(--text-muted)", opacity: 0.85 }}>
              <div>
                <span className="badge badge-warning" style={{ marginBottom: "8px", backgroundColor: "rgba(100, 116, 139, 0.1)", color: "var(--text-secondary)", borderColor: "var(--border-color)" }}>
                  📁 diarsipkan &bull; {k.tahunAjaran} ({k.semester || "Ganjil"})
                </span>
                <h3 style={{ fontSize: "1.4rem", fontWeight: "700" }}>{k.nama}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "6px" }}>
                  👨‍🎓 <strong>{k.siswa.length}</strong> siswa terdaftar &bull; 🏷️ <strong>{k.kolomNilai.length}</strong> aspek penilaian
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
