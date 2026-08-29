"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuperadminPanel() {
  const [activeTab, setActiveTab] = useState("dashboard"); // default to dashboard
  const [viewMode, setViewMode] = useState("tabs");
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState("");

  // Load viewMode from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedViewMode = localStorage.getItem('ceknilai_view_mode');
      if (savedViewMode) {
        setViewMode(savedViewMode);
        if (savedViewMode === "tabs") {
          setActiveTab("logs");
        } else {
          setActiveTab("dashboard");
        }
      } else {
        setActiveTab("logs");
      }
    }
  }, []);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('ceknilai_view_mode', mode);
    if (mode === 'dashboard') {
      setActiveTab('dashboard');
    } else {
      if (activeTab === 'dashboard') setActiveTab('logs');
    }
  };

  // Global School Context for Bank Data & Ekskul
  const [globalTargetSekolahId, setGlobalTargetSekolahId] = useState("");
  const [globalSearchSekolahTerm, setGlobalSearchSekolahTerm] = useState("");
  const [globalSekolahResults, setGlobalSekolahResults] = useState([]);
  const [globalIsSearchingSekolah, setGlobalIsSearchingSekolah] = useState(false);
  const [globalShowSekolahDropdown, setGlobalShowSekolahDropdown] = useState(false);
  const [globalSearchTimeout, setGlobalSearchTimeout] = useState(null);

  const handleGlobalSearchSekolah = async (e) => {
    const val = e.target.value;
    setGlobalSearchSekolahTerm(val);
    setGlobalTargetSekolahId(""); // Reset ID if user types something new
    
    if (globalSearchTimeout) clearTimeout(globalSearchTimeout);
    
    if (!val.trim()) {
      setGlobalSekolahResults([]);
      return;
    }

    setGlobalSearchTimeout(setTimeout(async () => {
      setGlobalIsSearchingSekolah(true);
      try {
        const res = await fetch(`/api/sekolah/search?query=${encodeURIComponent(val)}`);
        if (res.ok) {
          const data = await res.json();
          setGlobalSekolahResults(data);
        }
      } catch (err) {
        console.error("Gagal mencari sekolah:", err);
      } finally {
        setGlobalIsSearchingSekolah(false);
      }
    }, 500));
  };

  // Data States
  const [logs, setLogs] = useState([]);
  const [gurus, setGurus] = useState([]);
  const [teacherLogs, setTeacherLogs] = useState([]);
  const [financeLogs, setFinanceLogs] = useState([]);

  // Search/Filter States
  const [searchLogQuery, setSearchLogQuery] = useState("");
  const [searchGuruQuery, setSearchGuruQuery] = useState("");
  const [searchTeacherLogQuery, setSearchTeacherLogQuery] = useState("");

  // CRUD Guru Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSavingGuru, setIsSavingGuru] = useState(false);
  
  // Guru Form Fields
  const [formUsername, setFormUsername] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formIsLocked, setFormIsLocked] = useState(false);
  const [formLockMessage, setFormLockMessage] = useState("");
  const [formSekolahId, setFormSekolahId] = useState("");
  const [formIsAdminSekolah, setFormIsAdminSekolah] = useState(false);
  const [formWalikelasTingkatan, setFormWalikelasTingkatan] = useState("");
  const [formWalikelasRombelNama, setFormWalikelasRombelNama] = useState("");
  
  // Smart Search States
  const [sekolahSearchQuery, setSekolahSearchQuery] = useState("");
  const [sekolahSearchResults, setSekolahSearchResults] = useState([]);
  const [showSekolahDropdown, setShowSekolahDropdown] = useState(false);

  // Points Adjustment States
  const [pointsModalOpen, setPointsModalOpen] = useState(false);
  const [pointsTargetUsername, setPointsTargetUsername] = useState("");
  const [pointsAmount, setPointsAmount] = useState("");
  const [pointsReason, setPointsReason] = useState("");
  const [savingPoints, setSavingPoints] = useState(false);

  // Operational Cost States
  const [opexModalOpen, setOpexModalOpen] = useState(false);
  const [opexCategory, setOpexCategory] = useState("Server & Hosting");
  const [opexAmount, setOpexAmount] = useState("");
  const [opexDate, setOpexDate] = useState("");
  const [opexDesc, setOpexDesc] = useState("");
  const [savingOpex, setSavingOpex] = useState(false);

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

      // Fetch Finance Logs
      const resFinanceLogs = await fetch("/api/superadmin/finance");
      if (resFinanceLogs.ok) {
        const dataFinanceLogs = await resFinanceLogs.json();
        setFinanceLogs(dataFinanceLogs);
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
    setFormIsAdminSekolah(false);
    setFormWalikelasTingkatan("");
    setFormWalikelasRombelNama("");
    setSekolahSearchQuery("");
    setErrorMsg("");
    setIsSavingGuru(false);
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
    setFormIsAdminSekolah(guru.is_admin_sekolah || false);
    setFormWalikelasTingkatan(guru.walikelas_tingkatan || "");
    setFormWalikelasRombelNama(guru.walikelas_rombel_nama || "");
    setSekolahSearchQuery(guru.sekolah?.nama || "");
    setErrorMsg("");
    setIsSavingGuru(false);
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
      username: formUsername,
      nama: formNama,
      email: formEmail,
      sekolah_id: formSekolahId || null,
      is_admin_sekolah: formIsAdminSekolah,
      walikelas_tingkatan: formWalikelasTingkatan || null,
      walikelas_rombel_nama: formWalikelasRombelNama || null,
      is_locked: formIsLocked,
      lock_message: formLockMessage || null
    };
    
    if (formPassword) {
      if (formPassword.length < 6) {
        setErrorMsg("Password minimal harus 6 karakter.");
        return;
      }
      payload.password = formPassword;
    }

    setIsSavingGuru(true);
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
    } finally {
      setIsSavingGuru(false);
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

  const calculateGuruPoints = (username) => {
    let balance = 0;
    const logsForGuru = financeLogs.filter(l => l.username?.toLowerCase() === username.toLowerCase());
    for (const log of logsForGuru) {
      if (log.aksi === 'REFERRAL_POINTS' || log.aksi === 'REDEEM_POINTS') {
        const match = log.detail.match(/POINTS:([+-]?\d+)/);
        if (match) {
          balance += parseInt(match[1], 10);
        }
      }
    }
    return balance;
  };

  const handleApprovePayment = async (logId, username) => {
    if (confirm(`Setujui konfirmasi pembayaran dan aktifkan akun guru @${username}?`)) {
      try {
        // Use POST to trigger unlock + auto referral points crediting
        const res = await fetch(`/api/superadmin/guru/${username}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logId })
        });

        if (res.ok) {
          const data = await res.json();
          alert(data.message || "Selesai! Akun guru berhasil diaktifkan.");
          fetchData();
        } else {
          const data = await res.json();
          alert(data.error || "Gagal mengaktifkan akun guru.");
        }
      } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan koneksi server.");
      }
    }
  };

  const handleCancelPayment = async (logId, username) => {
    if (confirm(`Apakah Anda yakin ingin membatalkan transaksi untuk @${username}?\nAkun guru akan kembali dikunci dan poin referral yang dikreditkan dari transaksi ini akan ditarik kembali.`)) {
      try {
        const res = await fetch("/api/superadmin/pembayaran/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logId, targetUsername: username })
        });

        if (res.ok) {
          alert("Pembayaran berhasil dibatalkan.");
          fetchData();
        } else {
          const data = await res.json();
          alert(data.error || "Gagal membatalkan pembayaran.");
        }
      } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan koneksi server.");
      }
    }
  };

  const handleDeletePendingPayment = async (logId, username) => {
    if (confirm(`Apakah Anda yakin ingin MENGHAPUS PERMANEN riwayat pembayaran pending ini untuk @${username}?\nGuru akan dapat mengunggah ulang bukti transfernya dari awal.`)) {
      try {
        const res = await fetch("/api/superadmin/pembayaran/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logId })
        });

        if (res.ok) {
          alert("Riwayat pembayaran pending berhasil dihapus.");
          fetchData();
        } else {
          const data = await res.json();
          alert(data.error || "Gagal menghapus pembayaran.");
        }
      } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan koneksi server.");
      }
    }
  };

  const handleLockGuru = async (username) => {
    const reason = prompt("Masukkan pesan alasan penguncian akun (misal: Langganan kedaluwarsa):");
    if (reason === null) return;

    try {
      const res = await fetch(`/api/superadmin/guru/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_locked: true,
          lock_message: reason.trim() || "Akun ditangguhkan sementara. Silakan hubungi admin."
        }),
      });

      if (res.ok) {
        alert("Selesai! Akun guru berhasil dikunci.");
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Gagal mengunci akun guru.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan koneksi server.");
    }
  };

  const handleCompleteRedeem = async (logId, username, detail) => {
    if (confirm(`Tandai permintaan penukaran hadiah ini sebagai SELESAI diproses?`)) {
      try {
        const cleanDetail = detail.split('|')[1]?.trim() || detail;
        const resPoints = await fetch("/api/superadmin/poin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetUsername: username,
            points: 0,
            description: `PROSES_SELESAI | Penukaran Hadiah: ${cleanDetail} telah diproses oleh Admin`
          })
        });

        if (resPoints.ok) {
          alert("Selesai! Permintaan penukaran hadiah ditandai selesai.");
          fetchData();
        } else {
          alert("Gagal memperbarui status penukaran.");
        }
      } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan.");
      }
    }
  };

  const handleOpexSubmit = async (e) => {
    e.preventDefault();
    if (!opexAmount || !opexDesc.trim() || !opexDate) {
      alert("Harap isi semua field.");
      return;
    }

    setSavingOpex(true);
    try {
      const res = await fetch("/api/superadmin/finance/operasional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: opexCategory,
          amount: opexAmount,
          date: opexDate,
          description: opexDesc.trim()
        })
      });

      if (res.ok) {
        setOpexModalOpen(false);
        setOpexAmount("");
        setOpexDesc("");
        setOpexDate("");
        alert("Biaya operasional berhasil dicatat.");
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Gagal menyimpan biaya operasional.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
    } finally {
      setSavingOpex(false);
    }
  };

  const handlePointsSubmit = async (e) => {
    e.preventDefault();
    if (!pointsAmount || !pointsReason.trim()) {
      alert("Harap isi jumlah poin dan alasan penyesuaian.");
      return;
    }

    setSavingPoints(true);
    try {
      const res = await fetch("/api/superadmin/poin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUsername: pointsTargetUsername,
          points: pointsAmount,
          description: pointsReason.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPointsModalOpen(false);
        setPointsAmount("");
        setPointsReason("");
        alert("Penyesuaian poin berhasil disimpan.");
        fetchData();
      } else {
        alert(data.error || "Gagal menyesuaikan poin.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan koneksi server.");
    } finally {
      setSavingPoints(false);
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

      {/* Global School Selector */}
      <div style={{ background: "var(--bg-secondary)", padding: "16px", borderRadius: "12px", display: "flex", flexWrap: "wrap", alignItems: "flex-end", border: "1px solid var(--border-color)", marginBottom: "8px" }}>
        <div style={{ flex: "1", minWidth: "250px", position: "relative" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: "600", display: "block", marginBottom: "4px" }}>
            🏫 Sekolah Aktif (Konteks Global) <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="Cari dan pilih sekolah untuk dikelola..."
            value={globalSearchSekolahTerm}
            onChange={handleGlobalSearchSekolah}
            onFocus={() => {
              if (!globalTargetSekolahId && globalSearchSekolahTerm.length === 0) {
                handleGlobalSearchSekolah({ target: { value: '' } });
              }
              setGlobalShowSekolahDropdown(true);
            }}
            onBlur={() => setTimeout(() => setGlobalShowSekolahDropdown(false), 200)}
            style={{ 
              borderColor: globalTargetSekolahId ? "var(--primary)" : "var(--border-color)",
              backgroundColor: globalTargetSekolahId ? "rgba(79, 70, 229, 0.05)" : "var(--bg-primary)"
            }}
          />
          {globalTargetSekolahId && (
            <div style={{ position: "absolute", right: "12px", top: "34px", color: "var(--primary)", fontSize: "0.8rem", fontWeight: "bold" }}>
              ✓ Terpilih
            </div>
          )}
          {globalShowSekolahDropdown && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              maxHeight: "200px",
              overflowY: "auto",
              zIndex: 10,
              marginTop: "4px"
            }}>
              {globalIsSearchingSekolah ? (
                <div style={{ padding: "12px", textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>Mencari...</div>
              ) : globalSekolahResults.length > 0 ? (
                globalSekolahResults.map((sek) => (
                  <div
                    key={sek.id}
                    onClick={() => {
                      setGlobalTargetSekolahId(sek.id);
                      setGlobalSearchSekolahTerm(sek.nama);
                      setGlobalShowSekolahDropdown(false);
                    }}
                    style={{ padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid var(--border-color)", fontSize: "0.85rem" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <div style={{ fontWeight: "600" }}>{sek.nama}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{sek.kecamatan}, {sek.kabupaten}</div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "12px", textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>Tidak ditemukan</div>
              )}
            </div>
          )}
        </div>
      </div>
         {/* View Mode Toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
        <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-secondary)", padding: "4px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
          <button
            onClick={() => handleViewModeChange('dashboard')}
            style={{
              padding: "6px 12px",
              fontSize: "0.8rem",
              borderRadius: "var(--radius-xs)",
              border: "none",
              fontWeight: viewMode === 'dashboard' ? "700" : "500",
              backgroundColor: viewMode === 'dashboard' ? "var(--bg-primary)" : "transparent",
              color: viewMode === 'dashboard' ? "var(--primary)" : "var(--text-muted)",
              boxShadow: viewMode === 'dashboard' ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            🗂️ Dasbor
          </button>
          <button
            onClick={() => handleViewModeChange('tabs')}
            style={{
              padding: "6px 12px",
              fontSize: "0.8rem",
              borderRadius: "var(--radius-xs)",
              border: "none",
              fontWeight: viewMode === 'tabs' ? "700" : "500",
              backgroundColor: viewMode === 'tabs' ? "var(--bg-primary)" : "transparent",
              color: viewMode === 'tabs' ? "var(--primary)" : "var(--text-muted)",
              boxShadow: viewMode === 'tabs' ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            📑 Tab
          </button>
        </div>
      </div>

      {/* Tabs */}
      {viewMode === 'tabs' ? (
        <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", overflowX: "auto", whiteSpace: "nowrap" }}>
          <button
            onClick={() => setActiveTab("logs")}
            className={`btn ${activeTab === "logs" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "8px 16px", borderRadius: "8px", flexShrink: 0 }}
          >
            📋 Log Aktivitas Siswa
          </button>
          <button
            onClick={() => setActiveTab("logs_guru")}
            className={`btn ${activeTab === "logs_guru" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "8px 16px", borderRadius: "8px", flexShrink: 0 }}
          >
            👨‍🏫 Log Aktivitas Guru
          </button>
          <button
            onClick={() => setActiveTab("guru")}
            className={`btn ${activeTab === "guru" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "8px 16px", borderRadius: "8px", flexShrink: 0 }}
          >
            🔑 Manajemen Akun Guru
          </button>
          <button
            onClick={() => setActiveTab("pembayaran")}
            className={`btn ${activeTab === "pembayaran" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "8px 16px", borderRadius: "8px", flexShrink: 0 }}
          >
            💳 Manajemen Pembayaran
          </button>
          <button
            onClick={() => setActiveTab("laporan")}
            className={`btn ${activeTab === "laporan" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "8px 16px", borderRadius: "8px", flexShrink: 0 }}
          >
            📈 Laporan Keuangan
          </button>
        </div>
      ) : null}

      {/* Back Button for Dashboard Mode */}
      {viewMode === 'dashboard' && activeTab !== 'dashboard' && (
        <div style={{ display: "flex", marginBottom: "16px" }}>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="btn"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)", fontWeight: "600", borderRadius: "var(--radius-md)" }}
          >
            ← Kembali ke Menu Superadmin
          </button>
        </div>
      )}

      {/* Dashboard Cards Content */}
      {activeTab === 'dashboard' && viewMode === 'dashboard' && (
        <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px", marginTop: "12px" }}>
          {[
            { id: "logs", icon: "📋", title: "Log Aktivitas Siswa", desc: "Pantau riwayat aksi dan aktivitas belajar siswa." },
            { id: "logs_guru", icon: "👨‍🏫", title: "Log Aktivitas Guru", desc: "Pantau pengisian nilai dan aktivitas guru pengampu." },
            { id: "guru", icon: "🔑", title: "Manajemen Akun Guru", desc: "Kelola daftar guru, akses, dan pendaftaran." },
            { id: "pembayaran", icon: "💳", title: "Manajemen Pembayaran", desc: "Kelola langganan, referral, dan status aktif akun." }
          ].map(menu => (
            <div 
              key={menu.id}
              onClick={() => setActiveTab(menu.id)}
              className="glass-card"
              style={{ padding: "24px", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "16px", border: "1px solid var(--border-color)" }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{ fontSize: "2.5rem", backgroundColor: "var(--bg-secondary)", width: "64px", height: "64px", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {menu.icon}
              </div>
              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: "1.05rem", fontWeight: "800", color: "var(--text-primary)", lineHeight: "1.2" }}>{menu.title}</h4>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.4" }}>{menu.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

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

                        let detailContent = log.detail;
                        if (log.aksi === 'EDIT_NILAI_PRESENSI') {
                          try {
                            const parsed = JSON.parse(log.detail);
                            detailContent = (
                              <div>
                                Memperbarui nilai/presensi untuk <strong>{parsed.siswa.length} siswa</strong> di kelas <strong>{parsed.kelasNama}</strong>.
                                <details style={{ marginTop: '8px', fontSize: '0.8rem' }}>
                                  <summary style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: '600' }}>Lihat Daftar Siswa</summary>
                                  <ul style={{ marginTop: '4px', paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                                    {parsed.siswa.map((s, i) => (
                                      <li key={i}>{s.nama} <code>({s.nisn})</code></li>
                                    ))}
                                  </ul>
                                </details>
                              </div>
                            );
                          } catch (e) {
                            detailContent = log.detail;
                          }
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
                                {log.aksi === 'EDIT_NILAI_PRESENSI' ? 'INPUT_NILAI' : log.aksi}
                              </span>
                            </td>
                            <td>{detailContent}</td>
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

          {/* TAB 4: MANAJEMEN GURU */}
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
                <div style={{ center: "center", padding: "40px", color: "var(--text-muted)" }}>
                  Tidak ada guru yang ditemukan.
                </div>
              )}
            </div>
          )}

          {activeTab === "pembayaran" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* Row 1: Konfirmasi Pembayaran & Redeem Poin */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
                
                {/* 1. Konfirmasi Pembayaran */}
                <div className="glass-card" style={{ padding: "24px" }}>
                  <h4 style={{ margin: "0 0 16px 0", fontWeight: "800" }}>💳 Konfirmasi Pembayaran</h4>
                  <div style={{ overflowY: "auto", maxHeight: "350px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {financeLogs.filter(l => l.aksi === "PAYMENT_PENDING").length === 0 ? (
                      <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        Belum ada konfirmasi pembayaran yang menunggu verifikasi.
                      </div>
                    ) : (
                      financeLogs
                        .filter(l => l.aksi === "PAYMENT_PENDING")
                        .map(log => {
                          const isLocked = gurus.find(g => g.username.toLowerCase() === log.username.toLowerCase())?.is_locked;
                          // Parse structured detail: PAKET:TAHUNAN | BUKTI:... | REFERRAL:username
                          const detail = log.detail || '';
                          const paketMatch = detail.match(/PAKET:(BULANAN|TAHUNAN)/);
                          const buktiMatch = detail.match(/BUKTI:(.+?)(?=\s*\|\s*REFERRAL:|$)/);
                          const referralMatch = detail.match(/REFERRAL:([a-z0-9_]+)/);
                          const paket = paketMatch ? paketMatch[1] : '-';
                          const bukti = buktiMatch ? buktiMatch[1].trim() : detail;
                          const referralCode = referralMatch ? referralMatch[1] : null;

                          return (
                            <div key={log.id} style={{ padding: "14px", border: "1px solid var(--border-color)", borderRadius: "8px", backgroundColor: "var(--bg-secondary)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                                <span style={{ fontWeight: "700", fontSize: "0.9rem" }}>{log.namaGuru} (@{log.username})</span>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                  {new Date(log.timestamp).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                </span>
                              </div>

                              {/* Parsed payment info */}
                              <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                                  <span style={{ fontSize: "0.72rem", fontWeight: "700", padding: "2px 8px", borderRadius: "6px", backgroundColor: paket === "TAHUNAN" ? "rgba(234,179,8,0.15)" : "rgba(99,102,241,0.1)", color: paket === "TAHUNAN" ? "#eab308" : "var(--primary)" }}>
                                    {paket === "TAHUNAN" ? "🎫 Paket Tahunan" : "🎟 Paket Bulanan"}
                                  </span>
                                  {referralCode && (
                                    <span style={{ fontSize: "0.72rem", fontWeight: "700", padding: "2px 8px", borderRadius: "6px", backgroundColor: "rgba(16,185,129,0.1)", color: "var(--success)" }}>
                                      🏷 Kode Referral: @{referralCode}
                                    </span>
                                  )}
                                </div>
                                <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                                  <strong>Bukti:</strong> {bukti}
                                </p>
                              </div>

                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", gap: "8px", flexWrap: "wrap" }}>
                                <span style={{ fontSize: "0.75rem", fontWeight: "600", color: isLocked ? "var(--danger)" : "var(--success)" }}>
                                  {isLocked ? "🔒 Akun Terkunci" : "✅ Akun Aktif (Menunggu Verifikasi)"}
                                </span>
                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                                  <button onClick={() => handleApprovePayment(log.id, log.username)} className="btn btn-primary" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>
                                    ✅ Verifikasi
                                  </button>
                                  <button onClick={() => handleLockGuru(log.username)} className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: "0.75rem", color: "var(--warning)", borderColor: "rgba(245, 158, 11, 0.15)" }}>
                                    🔒 Tolak/Kunci
                                  </button>
                                  <button onClick={() => handleDeletePendingPayment(log.id, log.username)} className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: "0.75rem", color: "var(--danger)", borderColor: "rgba(239, 68, 68, 0.15)" }}>
                                    🗑️ Hapus
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* 2. Permintaan Penukaran Poin (Redeem) */}
                <div className="glass-card" style={{ padding: "24px" }}>
                  <h4 style={{ margin: "0 0 16px 0", fontWeight: "800" }}>🎁 Permintaan Penukaran Poin</h4>
                  <div style={{ overflowY: "auto", maxHeight: "350px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {financeLogs.filter(l => l.aksi === "REDEEM_POINTS").length === 0 ? (
                      <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        Belum ada permintaan penukaran poin.
                      </div>
                    ) : (
                      financeLogs`n                          .filter(l => l.aksi === "REDEEM_POINTS")
                        .map(log => {
                          const isProcessed = financeLogs.some(
                            x => x.username.toLowerCase() === log.username.toLowerCase() && 
                            x.detail.includes("PROSES_SELESAI") && 
                            x.detail.includes(log.detail.split('|')[1]?.trim() || "")
                          );

                          return (
                            <div key={log.id} style={{ padding: "14px", border: "1px solid var(--border-color)", borderRadius: "8px", backgroundColor: "var(--bg-secondary)", opacity: isProcessed ? 0.75 : 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                                <span style={{ fontWeight: "700", fontSize: "0.9rem" }}>{log.namaGuru} (@{log.username})</span>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                  {new Date(log.timestamp).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                </span>
                              </div>
                              <p style={{ margin: "8px 0", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                                {log.detail}
                              </p>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                                <span style={{ fontSize: "0.75rem", fontWeight: "600", color: isProcessed ? "var(--success)" : "var(--warning)" }}>
                                  {isProcessed ? "✅ Selesai Diproses" : "⏳ Menunggu Proses"}
                                </span>
                                {!isProcessed && (
                                  <button onClick={() => handleCompleteRedeem(log.id, log.username, log.detail)} className="btn btn-primary" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>
                                    Tandai Selesai
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

              </div>

              {/* Row 2: Transaksi Terverifikasi */}
              <div className="glass-card" style={{ padding: "24px" }}>
                <h4 style={{ margin: "0 0 16px 0", fontWeight: "800" }}>✅ Transaksi Terverifikasi</h4>
                <div style={{ overflowY: "auto", maxHeight: "250px" }}>
                  {financeLogs.filter(l => l.aksi === "PAYMENT_APPROVED").length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      Belum ada transaksi terverifikasi.
                    </div>
                  ) : (
                    <table className="premium-table" style={{ width: "100%", margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Waktu</th>
                          <th>Guru</th>
                          <th>Paket</th>
                          <th>Rincian Pembayaran</th>
                          <th style={{ textAlign: "center" }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financeLogs`n                            .filter(l => l.aksi === "PAYMENT_APPROVED")
                          .map(log => {
                            const detail = log.detail || '';
                            const paketMatch = detail.match(/PAKET:(BULANAN|TAHUNAN)/);
                            const buktiMatch = detail.match(/BUKTI:(.+?)(?=\s*\|\s*REFERRAL:|$)/);
                            const paket = paketMatch ? paketMatch[1] : '-';
                            const bukti = buktiMatch ? buktiMatch[1].trim() : detail;

                            return (
                              <tr key={log.id}>
                                <td style={{ fontSize: "0.78rem" }}>
                                  {new Date(log.timestamp).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </td>
                                <td style={{ fontWeight: "700" }}>{log.namaGuru} (@{log.username})</td>
                                <td>
                                  <span style={{ fontSize: "0.72rem", fontWeight: "700", padding: "2px 8px", borderRadius: "6px", backgroundColor: paket === "TAHUNAN" ? "rgba(234,179,8,0.15)" : "rgba(99,102,241,0.1)", color: paket === "TAHUNAN" ? "#eab308" : "var(--primary)" }}>
                                    {paket === "TAHUNAN" ? "👑 Tahunan" : "📦 Bulanan"}
                                  </span>
                                </td>
                                <td style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{bukti}</td>
                                <td style={{ textAlign: "center" }}>
                                  <button
                                    onClick={() => handleCancelPayment(log.id, log.username)}
                                    className="btn btn-secondary"
                                    style={{ padding: "4px 10px", fontSize: "0.75rem", color: "var(--danger)", borderColor: "rgba(239, 68, 68, 0.15)" }}
                                  >
                                    ❌ Batalkan Verifikasi
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Row 3: Manajemen Saldo Poin Guru */}
              <div className="glass-card" style={{ padding: "24px" }}>
                <h4 style={{ margin: "0 0 16px 0", fontWeight: "800" }}>👤 Saldo Poin & Penyesuaian Guru</h4>
                <div style={{ overflowX: "auto" }}>
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Nama Lengkap</th>
                        <th>Username</th>
                        <th style={{ textAlign: "center", width: "150px" }}>Saldo Poin</th>
                        <th style={{ textAlign: "center", width: "200px" }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gurus.map(g => {
                        const pts = calculateGuruPoints(g.username);
                        return (
                          <tr key={g.username}>
                            <td style={{ fontWeight: "700" }}>{g.nama}</td>
                            <td><code>{g.username}</code></td>
                            <td style={{ textAlign: "center", fontWeight: "800", color: "var(--primary)" }}>{pts} Poin</td>
                            <td style={{ textAlign: "center" }}>
                              <button 
                                onClick={() => {
                                  setPointsTargetUsername(g.username);
                                  setPointsAmount("");
                                  setPointsReason("");
                                  setPointsModalOpen(true);
                                }} 
                                className="btn btn-secondary" 
                                style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                              >
                                ➕/➖ Atur Poin Manual
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

            {activeTab === "laporan" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                  <div className="glass-card" style={{ padding: "24px", textAlign: "center", borderTop: "4px solid var(--success)" }}>
                    <h4 style={{ margin: "0 0 8px 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>Pendapatan Kotor (Gross)</h4>
                    <div style={{ fontSize: "2rem", fontWeight: "900", color: "var(--text-primary)" }}>
                      Rp {
                        financeLogs
                          .filter(l => l.aksi === "PAYMENT_APPROVED")
                          .reduce((sum, l) => sum + (l.detail.includes("PAKET:TAHUNAN") ? 149000 : (l.detail.includes("PAKET:BULANAN") ? 15000 : 0)), 0)
                          .toLocaleString('id-ID')
                      }
                    </div>
                  </div>
                  
                  <div className="glass-card" style={{ padding: "24px", textAlign: "center", borderTop: "4px solid var(--danger)" }}>
                    <h4 style={{ margin: "0 0 8px 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>Biaya Mitra (Redeem Guru)</h4>
                    <div style={{ fontSize: "2rem", fontWeight: "900", color: "var(--text-primary)" }}>
                      Rp {
                        financeLogs
                          .filter(l => l.aksi === "REDEEM_POINTS" && l.detail.includes("PROSES_SELESAI") && l.detail.toLowerCase().includes("tunai"))
                          .reduce((sum, l) => sum + 1000000, 0)
                          .toLocaleString('id-ID')
                      }
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: "24px", textAlign: "center", borderTop: "4px solid var(--warning)" }}>
                    <h4 style={{ margin: "0 0 8px 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>Biaya Operasional</h4>
                    <div style={{ fontSize: "2rem", fontWeight: "900", color: "var(--text-primary)" }}>
                      Rp {
                        financeLogs
                          .filter(l => l.aksi === "BIAYA_OPERASIONAL")
                          .reduce((sum, l) => {
                            const match = l.detail.match(/NOMINAL:(\d+)/);
                            return sum + (match ? parseInt(match[1], 10) : 0);
                          }, 0)
                          .toLocaleString('id-ID')
                      }
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: "24px", textAlign: "center", borderTop: "4px solid var(--primary)" }}>
                    <h4 style={{ margin: "0 0 8px 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>Laba Bersih (Net Profit)</h4>
                    <div style={{ fontSize: "2rem", fontWeight: "900", color: "var(--text-primary)" }}>
                      Rp {
                        (() => {
                          const gross = financeLogs
                            .filter(l => l.aksi === "PAYMENT_APPROVED")
                            .reduce((sum, l) => sum + (l.detail.includes("PAKET:TAHUNAN") ? 149000 : (l.detail.includes("PAKET:BULANAN") ? 15000 : 0)), 0);
                          const mitra = financeLogs
                            .filter(l => l.aksi === "REDEEM_POINTS" && l.detail.includes("PROSES_SELESAI") && l.detail.toLowerCase().includes("tunai"))
                            .reduce((sum, l) => sum + 1000000, 0);
                          const opex = financeLogs
                            .filter(l => l.aksi === "BIAYA_OPERASIONAL")
                            .reduce((sum, l) => {
                              const match = l.detail.match(/NOMINAL:(\d+)/);
                              return sum + (match ? parseInt(match[1], 10) : 0);
                            }, 0);
                          return (gross - mitra - opex).toLocaleString('id-ID');
                        })()
                      }
                    </div>
                  </div>
                </div>

                {/* Section: Transaksi Sistem (Uang Masuk / Keluar Guru) */}
                <div className="glass-card" style={{ padding: "24px" }}>
                  <h4 style={{ margin: "0 0 16px 0", fontWeight: "800" }}>📜 Histori Transaksi Sistem (Uang Masuk & Keluar)</h4>
                  <div style={{ overflowX: "auto", maxHeight: "300px" }}>
                    <table className="premium-table" style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th>Waktu</th>
                          <th>Tipe</th>
                          <th>Guru</th>
                          <th>Detail / Keterangan</th>
                          <th style={{ textAlign: "right" }}>Nominal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financeLogs
                          .filter(l => l.aksi === "PAYMENT_APPROVED" || (l.aksi === "REDEEM_POINTS" && l.detail.includes("PROSES_SELESAI") && l.detail.toLowerCase().includes("tunai")))
                          .map((log) => {
                            const date = new Date(log.timestamp).toLocaleString('id-ID');
                            const isIncome = log.aksi === "PAYMENT_APPROVED";
                            let nominal = 0;
                            if (isIncome) {
                              nominal = log.detail.includes("PAKET:TAHUNAN") ? 149000 : (log.detail.includes("PAKET:BULANAN") ? 15000 : 0);
                            } else {
                              nominal = -1000000;
                            }

                            return (
                              <tr key={log.id}>
                                <td>{date}</td>
                                <td>
                                  <span style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "bold", backgroundColor: isIncome ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: isIncome ? "var(--success)" : "var(--danger)" }}>
                                    {isIncome ? "INCOME" : "EXPENSE"}
                                  </span>
                                </td>
                                <td><strong>{log.namaGuru}</strong><br /><span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>@{log.username}</span></td>
                                <td style={{ fontSize: "0.85rem", maxWidth: "300px", whiteSpace: "normal" }}>{log.detail}</td>
                                <td style={{ textAlign: "right", fontWeight: "bold", color: isIncome ? "var(--success)" : "var(--danger)" }}>
                                  {isIncome ? "+" : ""}Rp {Math.abs(nominal).toLocaleString('id-ID')}
                                </td>
                              </tr>
                            );
                        })}
                        {financeLogs.filter(l => l.aksi === "PAYMENT_APPROVED" || (l.aksi === "REDEEM_POINTS" && l.detail.includes("PROSES_SELESAI") && l.detail.toLowerCase().includes("tunai"))).length === 0 && (
                          <tr><td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)" }}>Tidak ada data finansial</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section: Biaya Operasional (Manual) */}
                <div className="glass-card" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                    <h4 style={{ margin: 0, fontWeight: "800" }}>🏢 Biaya Operasional Manual</h4>
                    <button onClick={() => setOpexModalOpen(true)} className="btn btn-primary" style={{ padding: "6px 16px", fontSize: "0.85rem" }}>
                      ➕ Tambah Pengeluaran
                    </button>
                  </div>
                  <div style={{ overflowX: "auto", maxHeight: "300px" }}>
                    <table className="premium-table" style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th>Waktu Input</th>
                          <th>Tanggal Opex</th>
                          <th>Kategori</th>
                          <th>Keterangan</th>
                          <th style={{ textAlign: "right" }}>Nominal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financeLogs
                          .filter(l => l.aksi === "BIAYA_OPERASIONAL")
                          .map((log) => {
                            const dateInput = new Date(log.timestamp).toLocaleString('id-ID');
                            const matchCategory = log.detail.match(/KATEGORI:(.*?)\s*\|/);
                            const matchDate = log.detail.match(/TANGGAL:(.*?)\s*\|/);
                            const matchAmount = log.detail.match(/NOMINAL:(\d+)/);
                            const matchDesc = log.detail.match(/KETERANGAN:(.*)/);

                            const category = matchCategory ? matchCategory[1].trim() : "-";
                            const dateOpex = matchDate ? matchDate[1].trim() : "-";
                            const amount = matchAmount ? parseInt(matchAmount[1], 10) : 0;
                            const desc = matchDesc ? matchDesc[1].trim() : "-";

                            return (
                              <tr key={log.id}>
                                <td>{dateInput}</td>
                                <td style={{ fontWeight: "600" }}>{dateOpex}</td>
                                <td>
                                  <span style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "bold", backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}>
                                    {category}
                                  </span>
                                </td>
                                <td style={{ fontSize: "0.85rem", maxWidth: "300px", whiteSpace: "normal" }}>{desc}</td>
                                <td style={{ textAlign: "right", fontWeight: "bold", color: "var(--danger)" }}>
                                  -Rp {amount.toLocaleString('id-ID')}
                                </td>
                              </tr>
                            );
                        })}
                        {financeLogs.filter(l => l.aksi === "BIAYA_OPERASIONAL").length === 0 && (
                          <tr><td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)" }}>Belum ada pengeluaran operasional manual yang dicatat</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
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
                <label className="form-label">Asal Sekolah <span style={{ fontWeight: "500", color: "var(--text-muted)", fontSize: "0.75rem" }}>(opsional)</span></label>
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
                  <label className="form-label">Tingkatan Wali Kelas <span style={{ fontWeight: "500", color: "var(--text-muted)", fontSize: "0.75rem" }}>(opsional)</span></label>
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

              <div className="form-group" style={{ marginBottom: 0, marginTop: "4px" }}>
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "700" }}>
                  <input
                    type="checkbox"
                    checked={formIsAdminSekolah}
                    onChange={(e) => setFormIsAdminSekolah(e.target.checked)}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  👑 Berikan akses Admin Sekolah
                </label>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px", marginLeft: "24px" }}>
                  Admin Sekolah dapat mengonfigurasi identitas sekolah, ekstrakurikuler, dan bank siswa untuk sekolahnya masing-masing.
                </p>
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
                      <label className="form-label">Pesan Pemberitahuan Kunci <span style={{ fontWeight: "500", color: "var(--text-muted)", fontSize: "0.75rem" }}>(opsional)</span></label>
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
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary" disabled={isSavingGuru}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSavingGuru}>
                  {isSavingGuru ? (
                    <>
                      <span className="btn-spinner" />
                      Memproses...
                    </>
                  ) : isEditing ? (
                    "Simpan Perubahan"
                  ) : (
                    "Buat Akun"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Opex Modal */}
      {opexModalOpen && (
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
          <div className="glass-card modal-content-scroll" style={{ width: "100%", maxWidth: "400px", border: "1px solid var(--border-focus)", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: "1.3rem", fontWeight: "800", marginBottom: "16px" }}>
              🏢 Tambah Pengeluaran (Opex)
            </h3>
            
            <form onSubmit={handleOpexSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Kategori Biaya</label>
                <select className="form-input" value={opexCategory} onChange={(e) => setOpexCategory(e.target.value)} required>
                  <option value="Server & Hosting">Server & Hosting</option>
                  <option value="Iklan & Marketing">Iklan & Marketing</option>
                  <option value="Langganan AI">Langganan AI</option>
                  <option value="Operasional Lainnya">Operasional Lainnya</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tanggal Pengeluaran</label>
                <input
                  type="date"
                  className="form-input"
                  value={opexDate}
                  onChange={(e) => setOpexDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nominal (Rp)</label>
                <input
                  type="number"
                  placeholder="Contoh: 150000"
                  className="form-input"
                  value={opexAmount}
                  onChange={(e) => setOpexAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Keterangan Tambahan</label>
                <textarea
                  placeholder="Contoh: Biaya server Vultr Agustus 2026"
                  className="form-input"
                  value={opexDesc}
                  onChange={(e) => setOpexDesc(e.target.value)}
                  rows={2}
                  required
                  style={{ resize: "none" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" onClick={() => setOpexModalOpen(false)} className="btn btn-secondary" disabled={savingOpex}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingOpex}>
                  {savingOpex ? "Menyimpan..." : "Simpan Pengeluaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Points Adjustment Modal */}
      {pointsModalOpen && (
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
          <div className="glass-card modal-content-scroll" style={{ width: "100%", maxWidth: "400px", border: "1px solid var(--border-focus)", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: "1.3rem", fontWeight: "800", marginBottom: "16px" }}>
              ⚙️ Penyesuaian Poin Manual
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
              Menyesuaikan poin untuk guru <strong>@{pointsTargetUsername}</strong>. Poin akan langsung tercatat di riwayat mutasi poin guru tersebut.
            </p>

            <form onSubmit={handlePointsSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Jumlah Poin (Gunakan minus untuk mengurangi)</label>
                <input
                  type="number"
                  placeholder="Contoh: 30 atau -20"
                  className="form-input"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Keterangan Penyesuaian</label>
                <textarea
                  placeholder="Contoh: Bonus pendaftaran seminar CekNilai atau Koreksi poin ganda"
                  className="form-input"
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                  rows={3}
                  required
                  style={{ resize: "none" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" onClick={() => setPointsModalOpen(false)} className="btn btn-secondary" disabled={savingPoints}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingPoints}>
                  {savingPoints ? "Menyimpan..." : "Simpan Poin"}
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

