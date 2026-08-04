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
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (walikelasTingkatan && !walikelasRombelNama.trim()) {
      setErrorMsg("Nama/No. Rombel perwalian harus diisi jika tingkatan wali kelas ditentukan.");
      setSuccessMsg("");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!walikelasTingkatan && walikelasRombelNama.trim()) {
      setErrorMsg("Tingkatan wali kelas harus diisi jika Rombel perwalian ditentukan.");
      setSuccessMsg("");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (detectLevelInRombel(walikelasTingkatan, walikelasRombelNama)) {
      setErrorMsg("Format Rombel tidak sesuai. Cukup tulis nama rombel saja (contoh: \"MIPA 1\", bukan \"XI MIPA 1\" atau \"11 MIPA 1\").");
      setSuccessMsg("");
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (newPassword.trim().length < 6) {
        setErrorMsg("Password baru minimal harus 6 karakter.");
        setSubmitting(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg("Konfirmasi password baru tidak cocok.");
        setSubmitting(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Refresh page component to sync sidebar data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setErrorMsg(data.error || "Gagal memperbarui profil.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Terjadi kesalahan koneksi server.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
      
      {/* Title */}
      <div className="page-title-section">
        <h1 className="page-title">Profil Saya</h1>
        <p className="page-subtitle">Perbarui data profil pribadi Anda dan amankan akun dengan mengubah kata sandi.</p>
      </div>

      {/* Notification Messages */}
      {errorMsg && (
        <div style={{ padding: "16px", borderRadius: "var(--radius-md)", backgroundColor: "var(--danger-glow)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "var(--danger)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>❌</span> <strong>Gagal:</strong> {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: "16px", borderRadius: "var(--radius-md)", backgroundColor: "var(--success-glow)", border: "1px solid rgba(16, 185, 129, 0.2)", color: "var(--success)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <strong>Berhasil:</strong> {successMsg}
        </div>
      )}

      <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Main Grid Layout for Forms */}
        <div className="profile-grid">
          
          {/* Section 1: Profil Dasar & Akun */}
          <div className="glass-card profile-section">
            <h4 className="section-header">👤 Informasi Akun</h4>
            
            <div className="form-group">
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

            <div className="form-row">
              <div className="form-group">
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

              <div className="form-group">
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

            <div className="form-group" style={{ position: "relative" }}>
              <label className="form-label">Asal Sekolah</label>
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
              />
              {showSekolahDropdown && sekolahSearchQuery.trim().length > 0 && (
                <div className="autocomplete-dropdown">
                  {sekolahSearchResults.length > 0 ? (
                    sekolahSearchResults.map(s => (
                      <div
                        key={s.id}
                        onMouseDown={() => {
                          setSekolahId(s.id);
                          setSekolahSearchQuery(s.nama);
                          setShowSekolahDropdown(false);
                        }}
                        className="autocomplete-item"
                      >
                        <div style={{ fontWeight: "700" }}>{s.nama}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>NPSN: {s.npsn}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "12px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      Tidak ditemukan hasil yang cocok.
                    </div>
                  )}
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setRegisterModalOpen(true);
                      setRegisterError("");
                      setShowSekolahDropdown(false);
                    }}
                    className="autocomplete-add-new"
                  >
                    ❓ Sekolah saya tidak muncul. <strong>Daftarkan Baru &rarr;</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Data Laporan */}
          <div className="glass-card profile-section">
            <h4 className="section-header">🏫 Data Cetak Laporan</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Alamat Sekolah</label>
                <input
                  type="text"
                  placeholder="Jl. Raya Pendidikan No. 12"
                  className="form-input"
                  value={alamatSekolah}
                  onChange={(e) => setAlamatSekolah(e.target.value)}
                  disabled={isLocked}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Telepon Sekolah</label>
                <input
                  type="text"
                  placeholder="(021) 123456"
                  className="form-input"
                  value={telpSekolah}
                  onChange={(e) => setTelpSekolah(e.target.value)}
                  disabled={isLocked}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nama Kepala Sekolah</label>
                <input
                  type="text"
                  placeholder="Nama beserta gelar"
                  className="form-input"
                  value={namaKepsek}
                  onChange={(e) => setNamaKepsek(e.target.value)}
                  disabled={isLocked}
                />
              </div>

              <div className="form-group">
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

            <div className="form-row">
              <div className="form-group">
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
              <div className="form-group">
                <label className="form-label">NIP Guru <span className="label-optional">(opsional)</span></label>
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
          </div>

          {/* Section 3: Wali Kelas */}
          <div className="glass-card profile-section">
            <h4 className="section-header">👨‍🏫 Perwalian (Wali Kelas)</h4>
            
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Tingkatan <span className="label-optional">(opsional)</span></label>
                <select
                  className="form-input select-styled"
                  value={walikelasTingkatan}
                  onChange={(e) => {
                    setWalikelasTingkatan(e.target.value);
                    if (!e.target.value) setWalikelasRombelNama("");
                  }}
                  disabled={isLocked}
                >
                  <option value="">Bukan Wali</option>
                  <option value="10">Kelas 10 (X)</option>
                  <option value="11">Kelas 11 (XI)</option>
                  <option value="12">Kelas 12 (XII)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nama/No. Rombel</label>
                <input
                  type="text"
                  placeholder="MIPA 1 / 1"
                  className="form-input"
                  value={walikelasRombelNama}
                  onChange={(e) => setWalikelasRombelNama(e.target.value)}
                  disabled={isLocked || !walikelasTingkatan}
                  required={!!walikelasTingkatan}
                />
                {detectLevelInRombel(walikelasTingkatan, walikelasRombelNama) && (
                  <p className="form-warning">
                    Cukup nama rombel, misal "MIPA 1" bukan "{walikelasTingkatan} MIPA 1"
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Tahun Pelajaran</label>
                <select
                  className="form-input select-styled"
                  value={walikelasTahunAjaran}
                  onChange={(e) => setWalikelasTahunAjaran(e.target.value)}
                  disabled={isLocked || !walikelasTingkatan}
                  required={!!walikelasTingkatan}
                >
                  <option value="2024/2025">2024/2025</option>
                  <option value="2025/2026">2025/2026</option>
                  <option value="2026/2027">2026/2027</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Keamanan */}
          <div className="glass-card profile-section">
            <h4 className="section-header">🔒 Keamanan Akun</h4>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "16px" }}>
              Biarkan kosong jika Anda tidak ingin mengubah kata sandi Anda.
            </p>

            <div className="form-group">
              <label className="form-label">Password Lama <span className="label-optional">(opsional)</span></label>
              <input
                type="password"
                placeholder="Masukkan kata sandi saat ini"
                className="form-input"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                disabled={isLocked}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password Baru <span className="label-optional">(opsional)</span></label>
                <input
                  type="password"
                  placeholder="Minimal 6 karakter"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLocked}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Konfirmasi Password <span className="label-optional">(opsional)</span></label>
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
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
          <button 
            type="submit" 
            className="btn btn-primary btn-lg" 
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
              "💾 Simpan Perubahan"
            )}
          </button>
        </div>

      </form>

      {/* Modal Daftarkan Sekolah Baru */}
      {registerModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <h3 className="modal-title">
              🏫 Daftarkan Sekolah Baru
            </h3>
            <p className="modal-desc">
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

              <div className="modal-actions">
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
                  onClick={async () => {
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
        /* Responsive Grid for Forms */
        .profile-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        
        .profile-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .section-header {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--primary);
          border-bottom: 2px solid var(--border-color);
          padding-bottom: 12px;
          margin-bottom: 8px;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        
        .form-row-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1.2fr;
          gap: 12px;
        }

        .label-optional {
          font-weight: 500;
          color: var(--text-muted);
          font-size: 0.75rem;
        }
        
        .form-warning {
          color: var(--danger);
          font-size: 0.75rem;
          margin: 6px 0 0 0;
          line-height: 1.4;
        }

        .select-styled {
          appearance: auto;
          background-color: var(--bg-secondary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }

        .btn-lg {
          padding: 14px 32px;
          font-size: 1rem;
          font-weight: 700;
          box-shadow: 0 4px 12px var(--primary-glow);
        }

        /* Autocomplete Styles */
        .autocomplete-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-focus);
          border-radius: var(--radius-sm);
          z-index: 1000;
          max-height: 250px;
          overflow-y: auto;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }

        .autocomplete-item {
          padding: 12px 14px;
          cursor: pointer;
          font-size: 0.85rem;
          border-bottom: 1px solid var(--border-color);
          transition: background-color 0.15s ease;
        }

        .autocomplete-item:hover {
          background-color: var(--bg-tertiary);
        }
        
        .autocomplete-add-new {
          padding: 12px 14px;
          cursor: pointer;
          font-size: 0.85rem;
          background-color: rgba(79, 70, 229, 0.05);
          color: var(--primary);
          text-align: center;
          transition: all 0.2s ease;
        }
        
        .autocomplete-add-new:hover {
          background-color: var(--primary);
          color: white;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-content {
          width: 100%;
          max-width: 450px;
          border: 1px solid var(--border-focus);
          box-shadow: 0 24px 50px rgba(0,0,0,0.4);
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .modal-title {
          font-size: 1.35rem;
          font-weight: 800;
          margin-bottom: 12px;
          color: var(--text-primary);
        }

        .modal-desc {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-bottom: 20px;
          line-height: 1.6;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 16px;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .profile-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
        
        @media (max-width: 640px) {
          .form-row, .form-row-3 {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          
          .btn-lg {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
