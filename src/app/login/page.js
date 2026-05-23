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
