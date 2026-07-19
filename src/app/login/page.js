"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginGuru() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Cek apakah guru sudah login sebelumnya, jika ya langsung arahkan ke /guru
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        if (response.ok) {
          const data = await response.json();
          if (data.loggedIn) {
            router.push("/guru/kelas");
          }
        }
      } catch (err) {
        console.error("Error checking session", err);
      }
    };
    checkSession();
  }, [router]);

  // Load Google Identity Services script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Google Sign-In Callback setup
  useEffect(() => {
    window.handleGoogleCallback = async (response) => {
      try {
        setLoading(true);
        setError("");
        
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ credential: response.credential }),
        });
        
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Gagal masuk dengan Google");
        }
        
        router.push("/guru/kelas");
      } catch (err) {
        setError(err.message || "Gagal masuk menggunakan akun Google Anda.");
      } finally {
        setLoading(false);
      }
    };

    return () => {
      delete window.handleGoogleCallback;
    };
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Username dan password harus diisi.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal masuk");
      }

      router.push("/guru/kelas");
    } catch (err) {
      setError(err.message || "Username atau password salah.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!nama.trim() || !email.trim() || !username.trim() || !password) {
      setError("Semua bidang formulir harus diisi.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nama, email, username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal membuat akun");
      }

      router.push("/guru/kelas");
    } catch (err) {
      setError(err.message || "Gagal membuat akun baru. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-primary)" }} className="animate-fade-in">
      
      {/* Top navbar with back option */}
      <header className="header" style={{ borderBottom: "none", backgroundColor: "transparent" }}>
        <Link href="/" className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
          ⬅️ Kembali ke Portal Siswa
        </Link>
      </header>

      {/* Main login card container */}
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "420px", display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Logo & Header */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, var(--primary), var(--primary-hover))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                color: "#ffffff",
                fontSize: "1.6rem",
                margin: "0 auto 12px auto",
                boxShadow: "0 8px 16px var(--primary-glow)",
                fontFamily: "var(--font-heading)"
              }}
            >
              N
            </div>
            <h2 style={{ fontSize: "1.6rem", fontWeight: "800", letterSpacing: "-0.03em" }}>
              {mode === "login" ? "Masuk Sebagai Guru" : "Daftar Akun Guru Baru"}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: "4px" }}>
              Kelola kelas, siswa, kolom nilai, dan unduh laporan.
            </p>
          </div>

          {/* Tab Switcher */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)" }}>
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              style={{
                flex: 1,
                padding: "8px 0 10px 0",
                background: "none",
                border: "none",
                borderBottom: mode === "login" ? "3px solid var(--primary)" : "none",
                fontWeight: mode === "login" ? "800" : "500",
                color: mode === "login" ? "var(--text-primary)" : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "0.9rem"
              }}
            >
              🔐 Masuk
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); }}
              style={{
                flex: 1,
                padding: "8px 0 10px 0",
                background: "none",
                border: "none",
                borderBottom: mode === "register" ? "3px solid var(--primary)" : "none",
                fontWeight: mode === "register" ? "800" : "500",
                color: mode === "register" ? "var(--text-primary)" : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "0.9rem"
              }}
            >
              📝 Buat Akun
            </button>
          </div>

          {/* Form */}
          <form onSubmit={mode === "login" ? handleLogin : handleRegister} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {mode === "register" && (
              <>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="nama">Nama Lengkap</label>
                  <input
                    id="nama"
                    type="text"
                    placeholder="Masukkan nama lengkap Anda"
                    className="form-input"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="nama@sekolah.sch.id"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="Masukkan username unik"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="form-input"
                  style={{ paddingRight: "45px" }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "1.1rem",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? "👁️" : "🙈"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--danger-glow)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "var(--danger)", fontSize: "0.82rem", textAlign: "center" }}>
                ❌ {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px", marginTop: "4px" }} disabled={loading}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                  <span className="spinner" style={{ width: "16px", height: "16px", border: "2px solid #ffffff", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
                  Memproses...
                </span>
              ) : (
                mode === "login" ? "🔐 Masuk Sekarang" : "📝 Selesaikan Pendaftaran"
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "8px 0" }}>
            <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-color)" }} />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>ATAU</span>
            <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-color)" }} />
          </div>

          {/* Google Login Component */}
          {googleClientId ? (
            <>
              <div 
                id="g_id_onload"
                data-client_id={googleClientId}
                data-context="signin"
                data-ux_mode="popup"
                data-callback="handleGoogleCallback"
                data-auto_prompt="false"
              />
              <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                <div 
                  className="g_id_signin"
                  data-type="standard"
                  data-shape="rectangular"
                  data-theme="outline"
                  data-text="signin_with"
                  data-size="large"
                  data-logo_alignment="left"
                  data-width="380"
                />
              </div>
            </>
          ) : (
            <button 
              type="button" 
              onClick={() => alert("Google Sign-In belum dikonfigurasi di server. Silakan atur NEXT_PUBLIC_GOOGLE_CLIENT_ID di file .env Anda.")}
              className="btn"
              style={{ 
                width: "100%", 
                padding: "10px 14px", 
                border: "1px solid var(--border-color)", 
                backgroundColor: "transparent", 
                color: "var(--text-primary)", 
                fontWeight: "600",
                fontSize: "0.85rem",
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                gap: "10px",
                cursor: "pointer",
                borderRadius: "var(--radius-md)"
              }}
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 48 48">
                <g>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.5 24c0-1.63-.15-3.2-.43-4.75H24v9h12.75c-.55 2.37-1.93 4.39-3.99 5.76l6.23 4.83C42.66 35.12 46.5 30.12 46.5 24z"></path>
                  <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z"></path>
                  <path fill="#34A853" d="M24 46c5.94 0 11.27-1.97 15.03-5.33l-6.23-4.83c-2.07 1.42-4.71 2.27-7.8 2.27-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 46 24 46z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </g>
              </svg>
              Masuk dengan Google
            </button>
          )}

          {/* Promo Section */}
          <div style={{ marginTop: "8px", textAlign: "center", borderTop: "1px dashed var(--border-color)", paddingTop: "16px" }}>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: "600" }}>
              Tertarik menggunakan sistem ini di sekolah/kelas Anda?
            </p>
            <a 
              href="https://wa.me/6285157544004"
              target="_blank"
              rel="noopener noreferrer"
              className="btn" 
              style={{ padding: "6px 16px", fontSize: "0.8rem", borderRadius: "var(--radius-lg)", border: "none", backgroundColor: "#25D366", color: "#fff", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
              </svg>
              Hubungi Kami via WhatsApp
            </a>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
