"use client";

import { useState, useEffect } from "react";

export default function ProfilGuru() {
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

  useEffect(() => {
    const fetchProfil = async () => {
      try {
        const response = await fetch("/api/profil");
        if (response.ok) {
          const data = await response.json();
          setNama(data.nama);
          setUsername(data.username);
          setEmail(data.email);
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

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    const payload = {
      nama: nama.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim()
    };

    // Validasi penggantian password jika diisi
    if (newPassword || oldPassword || confirmPassword) {
      if (!oldPassword) {
        setErrorMsg("Harap masukkan password lama untuk mengubah password.");
        setSubmitting(false);
        return;
      }
      if (newPassword.length < 6) {
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
              <label className="form-label">Password Lama</label>
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
                <label className="form-label">Password Baru</label>
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
                <label className="form-label">Konfirmasi Password Baru</label>
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
              {submitting ? "Menyimpan..." : isLocked ? "🔒 Akun Terkunci" : "💾 Perbarui Profil Akun"}
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
    </div>
  );
}
