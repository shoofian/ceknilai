"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function KelolaKelas() {
  const [loading, setLoading] = useState(true);
  const [kelas, setKelas] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState("");
  const [nama, setNama] = useState("");
  const [mataPelajaran, setMataPelajaran] = useState("Informatika");
  const [tahunAjaran, setTahunAjaran] = useState("2025/2026");
  const [semester, setSemester] = useState("Ganjil");
  const [error, setError] = useState("");

  const fetchKelas = async () => {
    try {
      const response = await fetch("/api/kelas?archived=false");
      if (response.ok) {
        const data = await response.json();
        setKelas(data);
      }
    } catch (err) {
      console.error("Gagal mengambil data kelas", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKelas();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setNama("");
    setMataPelajaran("Informatika");
    setTahunAjaran("2025/2026");
    setSemester("Ganjil");
    setError("");
    setModalOpen(true);
  };

  const handleOpenEdit = (k) => {
    setIsEditing(true);
    setCurrentId(k.id);
    setNama(k.nama);
    setMataPelajaran(k.mataPelajaran || "Informatika");
    setTahunAjaran(k.tahunAjaran);
    setSemester(k.semester || "Ganjil");
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nama.trim()) {
      setError("Nama kelas harus diisi.");
      return;
    }
    if (!mataPelajaran.trim()) {
      setError("Mata pelajaran harus diisi.");
      return;
    }

    try {
      let response;
      if (isEditing) {
        response = await fetch(`/api/kelas/${currentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nama: nama.trim(), mataPelajaran: mataPelajaran.trim(), tahunAjaran: tahunAjaran.trim(), semester: semester.trim() }),
        });
      } else {
        response = await fetch("/api/kelas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nama: nama.trim(), mataPelajaran: mataPelajaran.trim(), tahunAjaran: tahunAjaran.trim(), semester: semester.trim() }),
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal memproses data");
      }

      setModalOpen(false);
      fetchKelas();
    } catch (err) {
      setError(err.message || "Terjadi kesalahan.");
    }
  };

  const handleArchive = async (id, name) => {
    if (confirm(`Apakah Anda yakin ingin mengarsipkan kelas "${name}"? Kelas ini tidak akan muncul di daftar aktif.`)) {
      try {
        const response = await fetch(`/api/kelas/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: true }),
        });
        
        if (response.ok) {
          fetchKelas();
        } else {
          const data = await response.json();
          alert(data.error || "Gagal mengarsipkan kelas.");
        }
      } catch (err) {
        console.error("Archive failed", err);
      }
    }
  };

  const handleDelete = async (id, name) => {
    if (confirm(`⚠️ PERINGATAN KERAS!\nApakah Anda yakin ingin menghapus kelas "${name}"?\nTindakan ini bersifat PERMANEN dan akan menghapus semua data siswa serta nilai di dalamnya!`)) {
      try {
        const response = await fetch(`/api/kelas/${id}`, {
          method: "DELETE",
        });
        
        if (response.ok) {
          fetchKelas();
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
      
      {/* Header section with add button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div className="page-title-section" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Manajemen Kelas</h1>
          <p className="page-subtitle">Buat dan kelola kelas aktif untuk tahun ajaran berjalan.</p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          ➕ Tambah Kelas Baru
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <span className="spinner" style={{ width: "30px", height: "30px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
        </div>
      ) : kelas.length > 0 ? (
        <div className="grid-cols-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {kelas.map((k) => (
            <div key={k.id} className="glass-card animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px", borderBottom: "4px solid var(--primary)" }}>
              <div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                  <span className="badge badge-primary" style={{ fontSize: "0.72rem" }}>
                    📚 {k.tahunAjaran}
                  </span>
                  <span className="badge" style={{ fontSize: "0.72rem", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.15)" }}>
                    ⏱️ Semester {k.semester || "Ganjil"}
                  </span>
                  <span className="badge" style={{ fontSize: "0.72rem", backgroundColor: "var(--primary-glow)", color: "var(--primary)", border: "1px solid rgba(59,130,246,0.15)" }}>
                    💻 {k.mataPelajaran}
                  </span>
                </div>
                <h3 style={{ fontSize: "1.4rem", fontWeight: "700" }}>{k.nama}</h3>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "600" }}>Kode Kelas:</span>
                  <code style={{ fontSize: "0.75rem", backgroundColor: "var(--bg-tertiary)", padding: "2px 6px", borderRadius: "4px", color: "var(--primary)", border: "1px solid var(--border-color)" }}>{k.id}</code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(k.id);
                      alert("Kode Kelas disalin!");
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem" }}
                    title="Salin Kode Kelas"
                  >
                    📋
                  </button>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "10px" }}>
                  👨‍🎓 <strong>{k.siswa.length}</strong> siswa terdaftar &bull; 🏷️ <strong>{k.kolomNilai.length}</strong> aspek penilaian
                </p>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "auto" }}>
                <Link href={`/guru/kelas/${k.id}`} className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                  ⚙️ Kelola Nilai &amp; Siswa
                </Link>
                
                <div className="flex-wrap-mobile" style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => handleOpenEdit(k)} className="btn btn-secondary" style={{ flex: 1, padding: "8px 12px", fontSize: "0.8rem", minWidth: "80px" }}>
                    ✏️ Edit
                  </button>
                  <button onClick={() => handleArchive(k.id, k.nama)} className="btn btn-secondary" style={{ flex: 1, padding: "8px 12px", fontSize: "0.8rem", color: "var(--warning)", borderColor: "rgba(245, 158, 11, 0.15)" }}>
                    📁 Arsipkan
                  </button>
                  <button onClick={() => handleDelete(k.id, k.nama)} className="btn btn-secondary" style={{ padding: "8px 12px", fontSize: "0.8rem", color: "var(--danger)", borderColor: "rgba(239, 68, 68, 0.15)" }} title="Hapus Kelas">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: "60px 20px", textAlign: "center", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-color)" }}>
          <h3 style={{ fontSize: "1.25rem", color: "var(--text-secondary)", marginBottom: "8px" }}>Belum Ada Kelas Aktif</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "20px" }}>Silakan klik tombol di atas untuk membuat kelas baru.</p>
          <button onClick={handleOpenAdd} className="btn btn-primary" style={{ display: "inline-flex" }}>
            ➕ Tambah Kelas Pertama
          </button>
        </div>
      )}

      {/* Glassmorphism Modal for Add/Edit Class */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div className="glass-card animate-fade-in modal-content-scroll" style={{ width: "100%", maxWidth: "450px", border: "1px solid var(--border-focus)", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "20px" }}>
              {isEditing ? "✏️ Edit Kelas" : "➕ Tambah Kelas Baru"}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Kelas</label>
                <input
                  type="text"
                  placeholder="Contoh: Kelas XI-IPA 2"
                  className="form-input"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Mata Pelajaran</label>
                <input
                  type="text"
                  placeholder="Contoh: Informatika"
                  className="form-input"
                  value={mataPelajaran}
                  onChange={(e) => setMataPelajaran(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tahun Ajaran</label>
                <input
                  type="text"
                  placeholder="Contoh: 2025/2026"
                  className="form-input"
                  value={tahunAjaran}
                  onChange={(e) => setTahunAjaran(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Semester</label>
                <select
                  className="form-input"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  required
                  style={{ 
                    appearance: "auto", 
                    backgroundColor: "rgba(30, 41, 59, 0.7)", 
                    color: "var(--text-primary)", 
                    border: "1px solid var(--border-color)" 
                  }}
                >
                  <option value="Ganjil" style={{ backgroundColor: "var(--bg-secondary)" }}>Semester Ganjil</option>
                  <option value="Genap" style={{ backgroundColor: "var(--bg-secondary)" }}>Semester Genap</option>
                </select>
              </div>

              {error && (
                <div style={{ padding: "10px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--danger-glow)", color: "var(--danger)", fontSize: "0.85rem" }}>
                  ❌ {error}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan
                </button>
              </div>
            </form>
          </div>
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
