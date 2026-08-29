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
      
      {/* Navbar Portal (matches student page) */}
      <nav className="header no-print">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, var(--primary), var(--success))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "800",
              color: "#ffffff",
              fontSize: "1.2rem",
              fontFamily: "var(--font-heading)"
            }}
          >
            N
          </div>
          <div>
            <h1 style={{ fontSize: "1.2rem", fontWeight: "800", letterSpacing: "-0.02em" }}>CekNilai</h1>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Sistem Penilaian Online</p>
          </div>
        </div>
        <Link 
          href="/" 
          className="btn btn-secondary" 
          style={{ 
            padding: "8px 16px", 
            fontSize: "0.85rem", 
            display: "inline-flex", 
            alignItems: "center", 
            gap: "6px" 
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
          Portal Siswa
        </Link>
      </nav>

      {/* Main Content Area (uses identical layout as student page) */}
      <main style={{ flex: 1, padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        
        <div className="portal-hero-container">
          
          {/* Left Column: Branding */}
          <div className="portal-info-panel">
            <span style={{ display: "inline-block", width: "max-content", padding: "6px 12px", borderRadius: "99px", background: "var(--primary-glow)", border: "1px solid rgba(59, 130, 246, 0.2)", fontSize: "0.78rem", fontWeight: "700", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              🔑 Area Pendidik
            </span>
            <h2 style={{ fontSize: "clamp(1.75rem, 5vw, 2.8rem)", fontWeight: "800", letterSpacing: "-0.04em", lineHeight: 1.15, background: "linear-gradient(135deg, var(--text-primary) 30%, var(--primary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Kelola Kelas dan Skema Penilaian Anda
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
              <span>Powered by</span>
              <span style={{ fontWeight: "700", color: "var(--text-secondary)" }}>Memofy Studio</span>
            </div>
          </div>

          {/* Right Column: Card Form */}
          <div className="portal-form-panel">
            <div className="glass-card shadow-lg animate-fade-in" style={{ width: "100%", padding: "24px", border: "1px solid var(--border-color)" }}>
              
              <div style={{ marginBottom: "24px", textAlign: "center" }}>
                <h3 style={{ fontSize: "1.4rem", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  {mode === "login" ? "Login Akun Guru" : "Daftar Guru Baru"}
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  {mode === "login" ? "Masukkan detail login untuk mengelola nilai." : "Daftar mandiri untuk memulai sistem penilaian."}
                </p>
              </div>

              {/* Modern Tab Switcher */}
              <div 
                style={{ 
                  display: "flex", 
                  backgroundColor: "var(--bg-tertiary)", 
                  padding: "4px", 
                  borderRadius: "var(--radius-sm)", 
                  marginBottom: "24px"
                }}
              >
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); }}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    background: mode === "login" ? "var(--bg-secondary)" : "none",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: mode === "login" ? "800" : "600",
                    color: mode === "login" ? "var(--primary)" : "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    boxShadow: mode === "login" ? "var(--shadow-sm)" : "none",
                    transition: "var(--transition)"
                  }}
                >
                  🔐 Masuk
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("register"); setError(""); }}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    background: mode === "register" ? "var(--bg-secondary)" : "none",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: mode === "register" ? "800" : "600",
                    color: mode === "register" ? "var(--primary)" : "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    boxShadow: mode === "register" ? "var(--shadow-sm)" : "none",
                    transition: "var(--transition)"
                  }}
                >
                  📝 Daftar
                </button>
              </div>

              {/* Form Fields */}
              <form onSubmit={mode === "login" ? handleLogin : handleRegister} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                
                {mode === "register" && (
                  <>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="nama" style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "6px" }}>Nama Lengkap</label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </span>
                        <input
                          id="nama"
                          type="text"
                          placeholder="Nama lengkap beserta gelar"
                          className="form-input"
                          style={{ paddingLeft: "42px" }}
                          value={nama}
                          onChange={(e) => setNama(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="email" style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "6px" }}>Alamat Email</label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        </span>
                        <input
                          id="email"
                          type="email"
                          placeholder="contoh@sekolah.sch.id"
                          className="form-input"
                          style={{ paddingLeft: "42px" }}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="username" style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "6px" }}>Username</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </span>
                    <input
                      id="username"
                      type="text"
                      placeholder="Masukkan username"
                      className="form-input"
                      style={{ paddingLeft: "42px" }}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label className="form-label" htmlFor="password" style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: 0 }}>Password</label>
                    {mode === "login" && (
                      <span 
                        style={{ fontSize: "0.75rem", color: "var(--text-muted)", cursor: "pointer" }}
                        onClick={() => alert("Lupa password? Silakan hubungi admin sekolah Anda.")}
                      >
                        Lupa password?
                      </span>
                    )}
                  </div>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                    </span>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimal 6 karakter"
                      className="form-input"
                      style={{ paddingLeft: "42px", paddingRight: "45px" }}
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
                        right: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: "40px",
                        height: "40px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)"
                      }}
                      title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--danger-glow)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "var(--danger)", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "8px" }} className="animate-fade-in">
                    <span style={{ fontSize: "1.1rem" }}>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ 
                    width: "100%", 
                    padding: "14px", 
                    marginTop: "6px",
                    fontSize: "0.95rem",
                    fontWeight: "800",
                    borderRadius: "var(--radius-sm)",
                    boxShadow: "0 4px 12px var(--primary-glow)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }} 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner" style={{ width: "18px", height: "18px", border: "2.5px solid #ffffff", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
                      Mengautentikasi...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                      {mode === "login" ? "Masuk ke Dashboard" : "Daftar Akun Baru"}
                    </>
                  )}
                </button>
              </form>

              {/* Promo WhatsApp Section */}
              <div style={{ marginTop: "24px", textAlign: "center", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "10px", fontWeight: "600" }}>
                  Ingin mengimplementasikan sistem ini di sekolah Anda?
                </p>
                <a 
                  href="https://wa.me/6285157544004"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp-login" 
                  style={{ 
                    width: "100%",
                    padding: "10px 16px", 
                    fontSize: "0.85rem", 
                    borderRadius: "var(--radius-sm)", 
                    border: "none", 
                    backgroundColor: "#25D366", 
                    color: "#fff", 
                    fontWeight: "700", 
                    display: "inline-flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    gap: "8px", 
                    textDecoration: "none",
                    transition: "var(--transition)",
                    boxShadow: "0 4px 10px rgba(37, 211, 102, 0.2)"
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                  </svg>
                  Hubungi via WhatsApp
                </a>
              </div>
            </div>
          </div>

        </div>

      </main>



      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .portal-hero-container {
          display: flex;
          width: 100%;
          max-width: 960px;
          gap: 48px;
          align-items: center;
          margin: 20px auto 40px auto;
        }
        .portal-info-panel {
          flex: 1.1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .portal-form-panel {
          flex: 0.9;
          width: 100%;
          max-width: 440px;
        }
        .btn-whatsapp-login:hover {
          background-color: #128C7E !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 14px rgba(37, 211, 102, 0.3) !important;
        }
        @media (max-width: 900px) {
          .portal-hero-container {
            flex-direction: column;
            gap: 36px;
            margin-top: 10px;
            margin-bottom: 20px;
          }
          .portal-info-panel {
            text-align: center;
            align-items: center;
          }
          .portal-steps-list {
            display: none !important;
          }
          .portal-form-panel {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
