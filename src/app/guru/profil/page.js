"use client";

import { useState, useEffect } from "react";

export default function ProfilGuru() {
  const detectLevelInRombel = (tingkatan, rombel) => {
    if (!rombel) return false;
    const r = rombel.toUpperCase().trim();
    return /^(10|11|12|X|XI|XII)\b/i.test(r) || r.startsWith("KELAS");
  };

  const [loading, setLoading] = useState(true);
  const [nama, setNama] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  
  // Password states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Feedback states
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [sekolahId, setSekolahId] = useState("");
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [newSekolahNama, setNewSekolahNama] = useState("");
  const [newSekolahNpsn, setNewSekolahNpsn] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // Smart search states
  const [sekolahSearchQuery, setSekolahSearchQuery] = useState("");
  const [sekolahSearchResults, setSekolahSearchResults] = useState([]);
  const [showSekolahDropdown, setShowSekolahDropdown] = useState(false);

  // Wali Kelas selection states
  const [walikelasTingkatan, setWalikelasTingkatan] = useState("");
  const [walikelasRombelNama, setWalikelasRombelNama] = useState("");
  const [walikelasTahunAjaran, setWalikelasTahunAjaran] = useState("2025/2026");

  // Report config states (Global)
  const [alamatSekolah, setAlamatSekolah] = useState("");
  const [telpSekolah, setTelpSekolah] = useState("");
  const [kotaCetak, setKotaCetak] = useState("");
  const [namaKepsek, setNamaKepsek] = useState("");
  const [nipKepsek, setNipKepsek] = useState("");
  const [nipGuru, setNipGuru] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAlamatSekolah(localStorage.getItem("rep_alamatSekolah") || "");
      setTelpSekolah(localStorage.getItem("rep_telpSekolah") || "");
      setKotaCetak(localStorage.getItem("rep_kotaCetak") || "");
      setNamaKepsek(localStorage.getItem("rep_namaKepsek") || "");
      setNipKepsek(localStorage.getItem("rep_nipKepsek") || "");
      setNipGuru(localStorage.getItem("rep_nipGuru") || "");
    }
  }, []);

  useEffect(() => {
    const fetchProfil = async () => {
      try {
        const response = await fetch("/api/profil");
        if (response.ok) {
          const data = await response.json();
          setNama(data.nama);
          setUsername(data.username);
          setEmail(data.email);
          setSekolahId(data.sekolah_id || "");
          setSekolahSearchQuery(data.sekolah?.nama || "");
          setWalikelasTingkatan(data.walikelas_tingkatan || "");
          setWalikelasRombelNama(data.walikelas_rombel_nama || "");
          setWalikelasTahunAjaran(data.tahun_ajaran || "2025/2026");
          setIsLocked(!!data.is_locked);
        }
      } catch (err) {
        console.error("Gagal memuat profil", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfil();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!nama.trim() || !username.trim() || !email.trim()) {
      setErrorMsg("Nama, username, dan email harus diisi.");
      setSuccessMsg("");
      return;
    }

    if (walikelasTingkatan && !walikelasRombelNama.trim()) {
      setErrorMsg("Nama/No. Rombel perwalian harus diisi jika tingkatan wali kelas ditentukan.");
      setSuccessMsg("");
      return;
    }
    if (!walikelasTingkatan && walikelasRombelNama.trim()) {
      setErrorMsg("Tingkatan wali kelas harus diisi jika Rombel perwalian ditentukan.");
      setSuccessMsg("");
      return;
    }
    if (detectLevelInRombel(walikelasTingkatan, walikelasRombelNama)) {
      setErrorMsg("Format Rombel tidak sesuai. Cukup tulis nama rombel saja (contoh: \"MIPA 1\", bukan \"XI MIPA 1\" atau \"11 MIPA 1\").");
      setSuccessMsg("");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    const cleanRombel = walikelasRombelNama.trim().toUpperCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").replace(/\b0+(\d+)\b/g, "$1");
    const payload = {
      nama: nama.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim(),
      sekolah_id: sekolahId || null,
      walikelas_tingkatan: walikelasTingkatan ? Number(walikelasTingkatan) : null,
      walikelas_rombel_nama: walikelasTingkatan && cleanRombel ? cleanRombel : null,
      tahun_ajaran: walikelasTahunAjaran
    };

    // Validasi penggantian password jika diisi
    if (newPassword.trim() || confirmPassword.trim()) {
      if (!oldPassword.trim()) {
        setErrorMsg("Harap masukkan password lama untuk mengubah password.");
        setSubmitting(false);
        return;
      }
      if (newPassword.trim().length < 6) {
        setErrorMsg("Password baru minimal harus 6 karakter.");
        setSubmitting(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg("Konfirmasi password baru tidak cocok.");
        setSubmitting(false);
        return;
      }
      payload.oldPassword = oldPassword;
      payload.newPassword = newPassword;
    }

    try {
      const response = await fetch("/api/profil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessMsg("🎉 Profil Anda berhasil diperbarui!");
        
        // Save report config to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("rep_namaSekolah", sekolahSearchQuery.trim());
          localStorage.setItem("rep_alamatSekolah", alamatSekolah.trim());
          localStorage.setItem("rep_telpSekolah", telpSekolah.trim());
          localStorage.setItem("rep_kotaCetak", kotaCetak.trim());
          localStorage.setItem("rep_namaKepsek", namaKepsek.trim());
          localStorage.setItem("rep_nipKepsek", nipKepsek.trim());
          localStorage.setItem("rep_nipGuru", nipGuru.trim());
        }

        // Reset password fields
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        
        // Update local state if username changes
        setNama(data.user.nama);
        setUsername(data.user.username);
        setEmail(data.user.email);
        
        // Refresh page component to sync sidebar data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setErrorMsg(data.error || "Gagal memperbarui profil.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Terjadi kesalahan koneksi server.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="spinner" style={{ width: "30px", height: "30px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Title */}
      <div className="page-title-section">
        <h1 className="page-title">Profil Saya</h1>
        <p className="page-subtitle">Perbarui data profil pribadi Anda dan amankan akun dengan mengubah kata sandi.</p>
      </div>

      <div className="grid-cols-2" style={{ gridTemplateColumns: "1.2fr 0.8fr", alignItems: "start" }}>
        
        {/* Left Side: Profile & Password Form */}
        <div className="glass-card">
          <h4 style={{ fontSize: "1.2rem", fontWeight: "800", marginBottom: "24px", display: "flex", alignItems: "center", gap: "8px" }}>
            👤 Sunting Profil & Akun
          </h4>

          <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Nama Lengkap */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nama Lengkap & Gelar</label>
              <input
                type="text"
                placeholder="Contoh: Budi Santoso, S.Pd."
                className="form-input"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
                disabled={isLocked}
              />
            </div>

            {/* Grid for Username and Email */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="grid-cols-1">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Username</label>
                <input
                  type="text"
                  placeholder="Username"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLocked}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Alamat Email</label>
                <input
                  type="email"
                  placeholder="budi@sekolah.sch.id"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLocked}
                />
              </div>
            </div>

            {/* Asal Sekolah */}
            <div className="form-group" style={{ marginBottom: 0, position: "relative" }}>
              <label className="form-label">Asal Sekolah</label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    type="text"
                    placeholder="🔍 Cari asal sekolah (ketik nama atau NPSN)..."
                    className="form-input"
                    value={sekolahSearchQuery}
                    onChange={(e) => {
                      setSekolahSearchQuery(e.target.value);
                      if (!e.target.value.trim()) {
                        setSekolahId("");
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
                    disabled={isLocked}
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
                        marginTop: "4px"
                      }}
                    >
                      {sekolahSearchResults.map(s => (
                        <div
                          key={s.id}
                          onMouseDown={() => {
                            setSekolahId(s.id);
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
                <button
                  type="button"
                  onClick={() => { setRegisterModalOpen(true); setRegisterError(""); }}
                  className="btn btn-secondary"
                  disabled={isLocked}
                  style={{ whiteSpace: "nowrap", padding: "12px 16px", fontSize: "0.85rem" }}
                  title="Daftarkan Sekolah Baru"
                >
                  ➕ Daftar Baru
                </button>
              </div>
            </div>

            {/* Wali Rombel */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: "12px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tingkatan Wali Kelas <span style={{ fontWeight: "500", color: "var(--text-muted)", fontSize: "0.75rem" }}>(opsional)</span></label>
                <select
                  className="form-input"
                  value={walikelasTingkatan}
                  onChange={(e) => {
                    setWalikelasTingkatan(e.target.value);
                    if (!e.target.value) setWalikelasRombelNama("");
                  }}
                  disabled={isLocked}
                  style={{ appearance: "auto", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                >
                  <option value="">Bukan Wali</option>
                  <option value="10">Kelas 10 (X)</option>
                  <option value="11">Kelas 11 (XI)</option>
                  <option value="12">Kelas 12 (XII)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama/No. Rombel Wali</label>
                <input
                  type="text"
                  placeholder="Contoh: MIPA 1 atau 1"
                  className="form-input"
                  value={walikelasRombelNama}
                  onChange={(e) => setWalikelasRombelNama(e.target.value)}
                  disabled={isLocked || !walikelasTingkatan}
                  required={!!walikelasTingkatan}
                />
                {detectLevelInRombel(walikelasTingkatan, walikelasRombelNama) && (
                  <p style={{ color: "var(--danger)", fontSize: "0.75rem", margin: "4px 0 0 0" }}>
                    ⚠️ Cukup tulis nama rombel saja (contoh: "MIPA 1", bukan "XI MIPA 1" atau "{walikelasTingkatan} MIPA 1").
                  </p>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tahun Pelajaran Wali</label>
                <select
                  className="form-input"
                  value={walikelasTahunAjaran}
                  onChange={(e) => setWalikelasTahunAjaran(e.target.value)}
                  disabled={isLocked || !walikelasTingkatan}
                  required={!!walikelasTingkatan}
                  style={{ appearance: "auto", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                >
                  <option value="2024/2025">2024/2025</option>
                  <option value="2025/2026">2025/2026</option>
                  <option value="2026/2027">2026/2027</option>
                </select>
              </div>
            </div>
 
            {/* Divider */}
            <div style={{ height: "1px", backgroundColor: "var(--border-color)", margin: "10px 0" }}></div>

            {/* LAPORAN & SEKOLAH HEADER */}
            <div>
              <h5 style={{ fontSize: "0.95rem", fontWeight: "700" }}>🏫 Informasi Sekolah & Kepala Sekolah (Laporan)</h5>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Pengaturan nama sekolah, alamat, dan data kepala sekolah untuk cetak laporan hasil belajar (KHS).
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="grid-cols-1">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Alamat Sekolah</label>
                <input
                  type="text"
                  placeholder="Contoh: Jl. Raya Pendidikan No. 12"
                  className="form-input"
                  value={alamatSekolah}
                  onChange={(e) => setAlamatSekolah(e.target.value)}
                  disabled={isLocked}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Telepon Sekolah</label>
                <input
                  type="text"
                  placeholder="Contoh: (021) 123456"
                  className="form-input"
                  value={telpSekolah}
                  onChange={(e) => setTelpSekolah(e.target.value)}
                  disabled={isLocked}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="grid-cols-1">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Kota Penerbitan Laporan</label>
                <input
                  type="text"
                  placeholder="Contoh: Jakarta"
                  className="form-input"
                  value={kotaCetak}
                  onChange={(e) => setKotaCetak(e.target.value)}
                  disabled={isLocked}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">NIP Guru Pengampu <span style={{ fontWeight: "500", color: "var(--text-muted)", fontSize: "0.75rem" }}>(opsional)</span></label>
                <input
                  type="text"
                  placeholder="NIP Anda"
                  className="form-input"
                  value={nipGuru}
                  onChange={(e) => setNipGuru(e.target.value)}
                  disabled={isLocked}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="grid-cols-1">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Kepala Sekolah</label>
                <input
                  type="text"
                  placeholder="Nama Kepala Sekolah beserta gelar"
                  className="form-input"
                  value={namaKepsek}
                  onChange={(e) => setNamaKepsek(e.target.value)}
                  disabled={isLocked}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  placeholder="NIP Kepala Sekolah"
                  className="form-input"
                  value={nipKepsek}
                  onChange={(e) => setNipKepsek(e.target.value)}
                  disabled={isLocked}
                />
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", backgroundColor: "var(--border-color)", margin: "10px 0" }}></div>

            {/* PASSWORD CHANGES HEADER */}
            <div>
              <h5 style={{ fontSize: "0.95rem", fontWeight: "700" }}>🔒 Ubah Kata Sandi (Opsional)</h5>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Biarkan bidang di bawah ini kosong jika Anda tidak berniat mengubah kata sandi.
              </p>
            </div>

            {/* Password input fields */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Password Lama <span style={{ fontWeight: "500", color: "var(--text-muted)", fontSize: "0.75rem" }}>(opsional)</span></label>
              <input
                type="password"
                placeholder="Masukkan kata sandi saat ini"
                className="form-input"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                disabled={isLocked}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="grid-cols-1">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Password Baru <span style={{ fontWeight: "500", color: "var(--text-muted)", fontSize: "0.75rem" }}>(opsional)</span></label>
                <input
                  type="password"
                  placeholder="Minimal 6 karakter"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLocked}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Konfirmasi Password Baru <span style={{ fontWeight: "500", color: "var(--text-muted)", fontSize: "0.75rem" }}>(opsional)</span></label>
                <input
                  type="password"
                  placeholder="Ulangi password baru"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLocked}
                />
              </div>
            </div>

            {/* Notification messages */}
            {errorMsg && (
              <div style={{ padding: "12px 16px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--danger-glow)", border: "1px solid rgba(239, 68, 68, 0.15)", color: "var(--danger)", fontSize: "0.85rem" }}>
                ❌ {errorMsg}
              </div>
            )}

            {successMsg && (
              <div style={{ padding: "12px 16px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--success-glow)", border: "1px solid rgba(16, 185, 129, 0.15)", color: "var(--success)", fontSize: "0.85rem" }}>
                {successMsg}
              </div>
            )}

            {/* Submit */}
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ 
                width: "fit-content", 
                padding: "12px 30px", 
                alignSelf: "flex-end",
                opacity: isLocked ? 0.6 : 1,
                cursor: isLocked ? "not-allowed" : "pointer"
              }} 
              disabled={isLocked || submitting}
            >
              {submitting ? (
                <>
                  <span className="btn-spinner" />
                  Menyimpan...
                </>
              ) : isLocked ? (
                "🔒 Akun Terkunci"
              ) : (
                "💾 Perbarui Profil Akun"
              )}
            </button>

          </form>
        </div>

        {/* Right Side: Account Verification / Information info box */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h4 style={{ fontSize: "1.15rem", fontWeight: "700" }}>ℹ️ Informasi Akun Guru</h4>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "0.85rem", lineHeight: "1.6" }}>
            <p>
              Akun guru ini dikelola secara terpusat oleh <strong>Superadmin SMA Digital</strong>.
            </p>
            <p>
              Mengubah username akan memengaruhi tautan login Anda. Pastikan Anda mengingat kredensial baru Anda sebelum keluar dari sistem!
            </p>
            
            <div style={{ backgroundColor: "var(--bg-tertiary)", padding: "16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", marginTop: "10px" }}>
              <h5 style={{ fontWeight: "700", marginBottom: "6px" }}>🔒 Catatan Keamanan:</h5>
              <ul style={{ paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "4px", color: "var(--text-secondary)" }}>
                <li>Gunakan kombinasi kata sandi yang kuat (huruf, angka, simbol).</li>
                <li>Jangan pernah membagikan kredensial login Anda kepada siapapun.</li>
                <li>Selalu lakukan logout jika mengakses sistem di komputer publik/bersama.</li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* Modal Daftarkan Sekolah Baru */}
      {registerModalOpen && (
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
          <div className="glass-card" style={{ width: "100%", maxWidth: "400px", border: "1px solid var(--border-focus)", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "800", marginBottom: "16px" }}>
              🏫 Daftarkan Sekolah Baru
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "16px", lineHeight: "1.5" }}>
              Silakan masukkan nama resmi sekolah (tanpa singkatan SMAN/SMKN/SMPN/SDN) dan 8 digit nomor NPSN resmi.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Sekolah Resmi</label>
                <input
                  type="text"
                  placeholder="Contoh: SMA Negeri 4 Berau"
                  className="form-input"
                  value={newSekolahNama}
                  onChange={(e) => setNewSekolahNama(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">NPSN Sekolah (8 Digit)</label>
                <input
                  type="text"
                  maxLength={8}
                  placeholder="Contoh: 30404228"
                  className="form-input"
                  value={newSekolahNpsn}
                  onChange={(e) => setNewSekolahNpsn(e.target.value)}
                />
              </div>

              {registerError && (
                <div style={{ color: "var(--danger)", fontSize: "0.85rem" }}>
                  ⚠️ {registerError}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={isRegistering}
                >
                  Batal
                </button>
                <button
                  disabled={isRegistering}
                  onMouseDown={async () => {
                    if (!newSekolahNama.trim() || !newSekolahNpsn.trim()) {
                      setRegisterError("Semua kolom wajib diisi.");
                      return;
                    }
                    if (!/^\d{8}$/.test(newSekolahNpsn.trim())) {
                      setRegisterError("NPSN harus berupa 8 digit angka.");
                      return;
                    }
                    setIsRegistering(true);
                    try {
                      const res = await fetch("/api/sekolah/register", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ nama: newSekolahNama, npsn: newSekolahNpsn })
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setSekolahId(data.sekolah.id);
                        setSekolahSearchQuery(data.sekolah.nama);
                        setRegisterModalOpen(false);
                        setNewSekolahNama("");
                        setNewSekolahNpsn("");
                      } else {
                        setRegisterError(data.error || "Gagal mendaftarkan sekolah.");
                      }
                    } catch (err) {
                      console.error(err);
                      setRegisterError("Kesalahan koneksi ke server.");
                    } finally {
                      setIsRegistering(false);
                    }
                  }}
                  className="btn btn-primary"
                >
                  {isRegistering ? (
                    <>
                      <span className="btn-spinner" />
                      Mendaftarkan...
                    </>
                  ) : (
                    "Daftarkan"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        .sekolah-search-item:hover {
          background-color: var(--bg-tertiary) !important;
        }
      `}</style>
    </div>
  );
}
