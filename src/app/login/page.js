"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginGuru() {
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
            router.push("/guru");
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

      // Berhasil masuk, arahkan ke dashboard guru
      router.push("/guru");
    } catch (err) {
      setError(err.message || "Username atau password salah.");
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
        <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "420px", display: "flex", flexDirection: "column", gap: "24px" }}>
          
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
                margin: "0 auto 16px auto",
                boxShadow: "0 8px 16px var(--primary-glow)",
                fontFamily: "var(--font-heading)"
              }}
            >
              N
            </div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: "800", letterSpacing: "-0.03em" }}>Masuk Sebagai Guru</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "6px" }}>
              Kelola kelas, siswa, kolom nilai, dan unduh laporan.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="Masukkan username Anda"
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
                  autoComplete="current-password"
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
              <div style={{ padding: "12px 16px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--danger-glow)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "var(--danger)", fontSize: "0.85rem", textAlign: "center" }}>
                ❌ {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "14px", marginTop: "8px" }} disabled={loading}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                  <span className="spinner" style={{ width: "16px", height: "16px", border: "2px solid #ffffff", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
                  Memverifikasi...
                </span>
              ) : (
                "🔐 Masuk Sekarang"
              )}
            </button>
          </form>

          {/* Promo Section */}
          <div style={{ marginTop: "16px", textAlign: "center", borderTop: "1px dashed var(--border-color)", paddingTop: "24px" }}>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "12px", fontWeight: "600" }}>
              Tertarik menggunakan sistem ini di sekolah/kelas Anda?
            </p>
            <a 
              href="https://wa.me/6285157544004"
              target="_blank"
              rel="noopener noreferrer"
              className="btn" 
              style={{ padding: "8px 20px", fontSize: "0.9rem", borderRadius: "var(--radius-lg)", border: "none", backgroundColor: "#25D366", color: "#fff", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
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
