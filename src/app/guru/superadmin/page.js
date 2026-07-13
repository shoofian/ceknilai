"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuperadminPanel() {
  const [activeTab, setActiveTab] = useState("logs");
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState("");

  // Data States
  const [logs, setLogs] = useState([]);
  const [gurus, setGurus] = useState([]);
  const [teacherLogs, setTeacherLogs] = useState([]);

  // Search/Filter States
  const [searchLogQuery, setSearchLogQuery] = useState("");
  const [searchGuruQuery, setSearchGuruQuery] = useState("");
  const [searchTeacherLogQuery, setSearchTeacherLogQuery] = useState("");

  // CRUD Guru Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Guru Form Fields
  const [formUsername, setFormUsername] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formIsLocked, setFormIsLocked] = useState(false);
  const [formLockMessage, setFormLockMessage] = useState("");
  const [formSekolahId, setFormSekolahId] = useState("");
  const [formWalikelasTingkatan, setFormWalikelasTingkatan] = useState("");
  const [formWalikelasRombelNama, setFormWalikelasRombelNama] = useState("");
  
  // Smart Search States
  const [sekolahSearchQuery, setSekolahSearchQuery] = useState("");
  const [sekolahSearchResults, setSekolahSearchResults] = useState([]);
  const [showSekolahDropdown, setShowSekolahDropdown] = useState(false);

  const router = useRouter();
  const SUPERADMIN_USERNAMES = ["superadmin", "shoofian"];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.loggedIn && SUPERADMIN_USERNAMES.includes(data.user.username.toLowerCase())) {
            setAuthorized(true);
            setCurrentUser(data.user.username);
            fetchData();
          } else {
            router.push("/guru");
          }
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Auth check failed", err);
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Logs
      const resLogs = await fetch("/api/superadmin/logs");
      if (resLogs.ok) {
        const dataLogs = await resLogs.json();
        setLogs(dataLogs);
      }

      // Fetch Gurus
      const resGurus = await fetch("/api/superadmin/guru");
      if (resGurus.ok) {
        const dataGurus = await resGurus.json();
        setGurus(dataGurus);
      }

      // Fetch Sekolah list - removed, loaded dynamically on type search

      // Fetch Teacher Logs
      const resTeacherLogs = await fetch("/api/superadmin/logs?type=guru");
      if (resTeacherLogs.ok) {
        const dataTeacherLogs = await resTeacherLogs.json();
        setTeacherLogs(dataTeacherLogs);
      }
    } catch (err) {
      console.error("Gagal mengambil data superadmin", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormUsername("");
    setFormNama("");
    setFormEmail("");
    setFormPassword("");
    setFormIsLocked(false);
    setFormLockMessage("");
    setFormSekolahId("");
    setFormWalikelasTingkatan("");
    setFormWalikelasRombelNama("");
    setSekolahSearchQuery("");
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleOpenEdit = (guru) => {
    setIsEditing(true);
    setFormUsername(guru.username);
    setFormNama(guru.nama);
    setFormEmail(guru.email);
    setFormPassword(""); // Leave empty if not changing
    setFormIsLocked(guru.is_locked || false);
    setFormLockMessage(guru.lock_message || "");
    setFormSekolahId(guru.sekolah_id || "");
    setFormWalikelasTingkatan(guru.walikelas_tingkatan || "");
    setFormWalikelasRombelNama(guru.walikelas_rombel_nama || "");
    setSekolahSearchQuery(guru.sekolah?.nama || "");
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleGuruSubmit = async (e) => {
    e.preventDefault();
    if (!formUsername.trim() || !formNama.trim() || !formEmail.trim()) {
      setErrorMsg("Semua kolom harus diisi.");
      return;
    }
    if (!isEditing && !formPassword) {
      setErrorMsg("Password harus diisi untuk akun baru.");
      return;
    }

    const payload = {
      nama: formNama.trim(),
      email: formEmail.trim(),
      is_locked: formIsLocked,
      lock_message: formLockMessage,
      sekolah_id: formSekolahId || null,
      walikelas_tingkatan: formWalikelasTingkatan ? Number(formWalikelasTingkatan) : null,
      walikelas_rombel_nama: formWalikelasRombelNama.trim() || null,
    };
    
    if (formPassword) {
      if (formPassword.length < 6) {
        setErrorMsg("Password minimal harus 6 karakter.");
        return;
      }
      payload.password = formPassword;
    }

    try {
      let res;
      if (isEditing) {
        res = await fetch(`/api/superadmin/guru/${formUsername}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        payload.username = formUsername.trim().toLowerCase();
        res = await fetch("/api/superadmin/guru", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok) {
        setModalOpen(false);
        fetchData();
      } else {
        setErrorMsg(data.error || "Gagal memproses data guru.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Terjadi kesalahan koneksi server.");
    }
  };

  const handleGuruDelete = async (username, nama) => {
    if (username.toLowerCase() === currentUser.toLowerCase()) {
      alert("Anda tidak dapat menghapus akun Anda sendiri.");
      return;
    }

    if (confirm(`⚠️ PERINGATAN!\nApakah Anda yakin ingin menghapus akun guru "${nama}"?\nSemua kelas yang dibuat oleh guru ini akan terpengaruh!`)) {
      try {
        const res = await fetch(`/api/superadmin/guru/${username}`, {
          method: "DELETE",
        });

        if (res.ok) {
          fetchData();
        } else {
          const data = await res.json();
          alert(data.error || "Gagal menghapus akun guru.");
        }
      } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan koneksi server.");
      }
    }
  };

  // Filtered lists
  const filteredLogs = logs.filter(log => 
    log.namaSiswa.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
    log.nisn.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
    log.kelasNama.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
    log.mataPelajaran.toLowerCase().includes(searchLogQuery.toLowerCase())
  );

  const filteredTeacherLogs = teacherLogs.filter(log =>
    log.namaGuru.toLowerCase().includes(searchTeacherLogQuery.toLowerCase()) ||
    log.username.toLowerCase().includes(searchTeacherLogQuery.toLowerCase()) ||
    log.aksi.toLowerCase().includes(searchTeacherLogQuery.toLowerCase()) ||
    log.detail.toLowerCase().includes(searchTeacherLogQuery.toLowerCase())
  );

  const filteredGurus = gurus.filter(g =>
    g.nama.toLowerCase().includes(searchGuruQuery.toLowerCase()) ||
    g.username.toLowerCase().includes(searchGuruQuery.toLowerCase()) ||
    g.email.toLowerCase().includes(searchGuruQuery.toLowerCase())
  );

  if (!authorized) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--danger)" }}>
        <h3>⛔ Akses Ditolak</h3>
        <p>Halaman ini dikhususkan untuk akun tingkat Superadmin.</p>
      </div>
    );
  }

  return (
    <>
      <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Title */}
      <div className="page-title-section">
        <h1 className="page-title">Panel Kontrol Superadmin</h1>
        <p className="page-subtitle">Kelola otorisasi akun guru secara terpusat dan tinjau log riwayat akses siswa.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
        <button
          onClick={() => setActiveTab("logs")}
          className={`btn ${activeTab === "logs" ? "btn-primary" : "btn-secondary"}`}
          style={{ padding: "8px 16px", borderRadius: "8px" }}
        >
          📋 Log Aktivitas Siswa
        </button>
        <button
          onClick={() => setActiveTab("logs_guru")}
          className={`btn ${activeTab === "logs_guru" ? "btn-primary" : "btn-secondary"}`}
          style={{ padding: "8px 16px", borderRadius: "8px" }}
        >
          👨‍🏫 Log Aktivitas Guru
        </button>
        <button
          onClick={() => setActiveTab("guru")}
          className={`btn ${activeTab === "guru" ? "btn-primary" : "btn-secondary"}`}
          style={{ padding: "8px 16px", borderRadius: "8px" }}
        >
          🔑 Manajemen Akun Guru
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <span className="spinner" style={{ width: "30px", height: "30px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
        </div>
      ) : (
        <>
          {/* TAB 1: LOG AKTIVITAS */}
          {activeTab === "logs" && (
            <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <h4 style={{ margin: 0, fontWeight: "800" }}>Riwayat Pencarian Nilai Siswa</h4>
                <input
                  type="text"
                  placeholder="🔍 Cari nama, NISN, atau kelas..."
                  className="form-input"
                  value={searchLogQuery}
                  onChange={(e) => setSearchLogQuery(e.target.value)}
                  style={{ maxWidth: "300px", padding: "8px 12px", fontSize: "0.85rem" }}
                />
              </div>

              {filteredLogs.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Waktu Akses</th>
                        <th>Nama Siswa</th>
                        <th>NISN</th>
                        <th>Kelas</th>
                        <th>Mata Pelajaran</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log, index) => {
                        const date = new Date(log.timestamp);
                        const formattedDate = date.toLocaleString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        });
                        return (
                          <tr key={index}>
                            <td>{formattedDate}</td>
                            <td style={{ fontWeight: "700" }}>{log.namaSiswa}</td>
                            <td><code>{log.nisn}</code></td>
                            <td>{log.kelasNama}</td>
                            <td>{log.mataPelajaran}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                  Belum ada log riwayat akses siswa yang tercatat.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LOG AKTIVITAS GURU */}
          {activeTab === "logs_guru" && (
            <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <h4 style={{ margin: 0, fontWeight: "800" }}>Log Riwayat Aktivitas Guru</h4>
                <input
                  type="text"
                  placeholder="🔍 Cari guru, aksi, detail..."
                  className="form-input"
                  value={searchTeacherLogQuery}
                  onChange={(e) => setSearchTeacherLogQuery(e.target.value)}
                  style={{ maxWidth: "300px", padding: "8px 12px", fontSize: "0.85rem" }}
                />
              </div>

              {filteredTeacherLogs.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th style={{ width: "20%" }}>Waktu</th>
                        <th style={{ width: "20%" }}>Nama Guru</th>
                        <th style={{ width: "15%" }}>Aksi</th>
                        <th style={{ width: "45%" }}>Detail Aktivitas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTeacherLogs.map((log) => {
                        const date = new Date(log.timestamp);
                        const formattedDate = date.toLocaleString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        });
                        
                        let badgeColor = "rgba(100, 116, 139, 0.1)";
                        let textColor = "var(--text-secondary)";
                        if (log.aksi.includes("BUAT")) {
                          badgeColor = "rgba(16, 185, 129, 0.1)";
                          textColor = "var(--success)";
                        } else if (log.aksi.includes("HAPUS")) {
                          badgeColor = "rgba(239, 68, 68, 0.1)";
                          textColor = "var(--danger)";
                        } else if (log.aksi.includes("EDIT")) {
                          badgeColor = "rgba(59, 130, 246, 0.1)";
                          textColor = "var(--primary)";
                        } else if (log.aksi.includes("ARSIP") || log.aksi.includes("AKTIF")) {
                          badgeColor = "rgba(245, 158, 11, 0.1)";
                          textColor = "var(--warning)";
                        }

                        return (
                          <tr key={log.id}>
                            <td>{formattedDate}</td>
                            <td>
                              <strong style={{ color: "var(--text-primary)" }}>{log.namaGuru}</strong>
                              <br />
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>@{log.username}</span>
                            </td>
                            <td>
                              <span className="badge" style={{ backgroundColor: badgeColor, color: textColor, border: "none", fontWeight: "700" }}>
                                {log.aksi}
                              </span>
                            </td>
                            <td>{log.detail}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                  Belum ada log aktivitas guru yang tercatat.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANAJEMEN GURU */}
          {activeTab === "guru" && (
            <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <h4 style={{ margin: 0, fontWeight: "800" }}>Daftar Akun Guru Terdaftar</h4>
                  <button onClick={handleOpenAdd} className="btn btn-primary" style={{ padding: "6px 12px", fontSize: "0.85rem" }}>
                    ➕ Akun Guru Baru
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="🔍 Cari guru (nama, username, email)..."
                  className="form-input"
                  value={searchGuruQuery}
                  onChange={(e) => setSearchGuruQuery(e.target.value)}
                  style={{ maxWidth: "300px", padding: "8px 12px", fontSize: "0.85rem" }}
                />
              </div>

              {filteredGurus.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Nama Lengkap</th>
                        <th>Sekolah</th>
                        <th>Wali Kelas</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th style={{ textAlign: "center", width: "160px" }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGurus.map((g) => (
                        <tr key={g.username}>
                          <td style={{ fontWeight: "700" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {g.nama}
                              {g.is_locked && (
                                <span className="badge" style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", color: "var(--danger)", border: "none", fontSize: "0.75rem", padding: "2px 6px", fontWeight: "700" }} title={g.lock_message || "Read-Only Locked"}>
                                  🔒 Terkunci
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{g.sekolah?.nama || "-"}</td>
                          <td>{g.walikelas_tingkatan && g.walikelas_rombel_nama ? <code>{g.walikelas_tingkatan} {g.walikelas_rombel_nama}</code> : "-"}</td>
                          <td><code>{g.username}</code></td>
                          <td>{g.email}</td>
                          <td style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <button onClick={() => handleOpenEdit(g)} className="btn btn-secondary" style={{ padding: "6px 10px", fontSize: "0.8rem" }}>
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleGuruDelete(g.username, g.nama)}
                              className="btn btn-secondary"
                              style={{ padding: "6px 10px", fontSize: "0.8rem", color: "var(--danger)", borderColor: "rgba(239, 68, 68, 0.15)" }}
                            >
                              🗑️ Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                  Tidak ada guru yang ditemukan.
                </div>
              )}
            </div>
          )}
        </>
      )}
      </div>

      {/* CRUD Guru Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div className="glass-card modal-content-scroll" style={{ width: "100%", maxWidth: "420px", border: "1px solid var(--border-focus)", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: "1.4rem", fontWeight: "800", marginBottom: "20px" }}>
              {isEditing ? "✏️ Edit Akun Guru" : "➕ Registrasi Akun Guru Baru"}
            </h3>

            <form onSubmit={handleGuruSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Username</label>
                <input
                  type="text"
                  placeholder="Contoh: gurumatematika"
                  className="form-input"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  disabled={isEditing}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  placeholder="Contoh: Rahmat Hidayat, S.Pd."
                  className="form-input"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  placeholder="Contoh: rahmat@gmail.com"
                  className="form-input"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0, position: "relative" }}>
                <label className="form-label">Asal Sekolah</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="🔍 Cari sekolah (ketik nama atau NPSN)..."
                    className="form-input"
                    value={sekolahSearchQuery}
                    onChange={(e) => {
                      setSekolahSearchQuery(e.target.value);
                      if (!e.target.value.trim()) {
                        setFormSekolahId("");
                        setSekolahSearchResults([]);
                        setShowSekolahDropdown(false);
                        return;
                      }
                      fetch(`/api/sekolah/search?query=${encodeURIComponent(e.target.value)}`)
                        .then(res => res.json())
                        .then(data => {
                          setSekolahSearchResults(data);
                          setShowSekolahDropdown(true);
                        });
                    }}
                    onFocus={() => { if (sekolahSearchQuery.trim()) setShowSekolahDropdown(true); }}
                    onBlur={() => setTimeout(() => setShowSekolahDropdown(false), 200)}
                    style={{ width: "100%" }}
                  />
                  {showSekolahDropdown && sekolahSearchResults.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        backgroundColor: "var(--bg-secondary)",
                        border: "1px solid var(--border-focus)",
                        borderRadius: "var(--radius-sm)",
                        zIndex: 1000,
                        maxHeight: "180px",
                        overflowY: "auto",
                        boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
                        marginTop: "4px",
                        textAlign: "left"
                      }}
                    >
                      {sekolahSearchResults.map(s => (
                        <div
                          key={s.id}
                          onMouseDown={() => {
                            setFormSekolahId(s.id);
                            setSekolahSearchQuery(s.nama);
                            setShowSekolahDropdown(false);
                          }}
                          style={{
                            padding: "10px 12px",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            borderBottom: "1px solid var(--border-color)",
                            transition: "background-color 0.15s ease"
                          }}
                          className="sekolah-search-item"
                        >
                          <div style={{ fontWeight: "700" }}>{s.nama}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>NPSN: {s.npsn}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "12px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tingkatan Wali Kelas</label>
                  <select
                    className="form-input"
                    value={formWalikelasTingkatan}
                    onChange={(e) => setFormWalikelasTingkatan(e.target.value)}
                    style={{ appearance: "auto", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                  >
                    <option value="">Bukan Wali</option>
                    <option value="10">Kelas 10 (X)</option>
                    <option value="11">Kelas 11 (XI)</option>
                    <option value="12">Kelas 12 (XII)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nama/No. Rombel</label>
                  <input
                    type="text"
                    placeholder="Contoh: MIPA 1 atau 1"
                    className="form-input"
                    value={formWalikelasRombelNama}
                    onChange={(e) => setFormWalikelasRombelNama(e.target.value)}
                    disabled={!formWalikelasTingkatan}
                    required={!!formWalikelasTingkatan}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  {isEditing ? "Password Baru (Kosongkan jika tidak diubah)" : "Password"}
                </label>
                <input
                  type="password"
                  placeholder="Minimal 6 karakter..."
                  className="form-input"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  required={!isEditing}
                />
              </div>

              {isEditing && (
                <>
                  <div className="form-group" style={{ marginBottom: 0, marginTop: "4px" }}>
                    <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "700" }}>
                      <input
                        type="checkbox"
                        checked={formIsLocked}
                        onChange={(e) => setFormIsLocked(e.target.checked)}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      🔒 Kunci Akun (Read-Only)
                    </label>
                  </div>

                  {formIsLocked && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Pesan Pemberitahuan Kunci</label>
                      <textarea
                        placeholder="Contoh: Akun Anda ditangguhkan sementara. Silakan lakukan pembayaran untuk melanjutkan langganan."
                        className="form-input"
                        value={formLockMessage}
                        onChange={(e) => setFormLockMessage(e.target.value)}
                        rows={3}
                        style={{ 
                          resize: "vertical", 
                          fontSize: "0.85rem", 
                          backgroundColor: "var(--bg-secondary)", 
                          color: "var(--text-primary)", 
                          border: "1px solid var(--border-color)",
                          padding: "8px 12px",
                          borderRadius: "6px"
                        }}
                      />
                    </div>
                  )}
                </>
              )}

              {errorMsg && (
                <div style={{ color: "var(--danger)", fontSize: "0.85rem", padding: "6px 0" }}>
                  ⚠️ {errorMsg}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? "Simpan Perubahan" : "Buat Akun"}
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
        .sekolah-search-item:hover {
          background-color: var(--bg-tertiary) !important;
        }
      `}</style>
    </>
  );
}
