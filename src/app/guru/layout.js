"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function GuruLayout({ children }) {
  const [loading, setLoading] = useState(true);
  const [guru, setGuru] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Inisialisasi mode dari localStorage saat pertama mount
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = saved ? saved === "dark" : prefersDark;
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  // Toggle dark mode dan simpan ke localStorage
  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  // Validasi sesi autentikasi guru
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/session");
        if (response.ok) {
          const data = await response.json();
          if (data.loggedIn) {
            setGuru(data.user);
            setLoading(false);
          } else {
            router.push("/login");
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

  const handleLogout = async () => {
    if (confirm("Apakah Anda yakin ingin keluar dari sistem?")) {
      try {
        const response = await fetch("/api/auth/logout", {
          method: "POST",
        });
        if (response.ok) {
          router.push("/login");
        }
      } catch (err) {
        console.error("Logout failed", err);
      }
    }
  };

  const navItems = [
    { name: "🏠 Beranda", path: "/guru" },
    { name: "📚 Daftar Kelas", path: "/guru/kelas" },
    { name: "📁 Arsip Kelas", path: "/guru/arsip" },
    { name: "🖨️ Cetak Laporan", path: "/guru/laporan" },
    { name: "👤 Profil Saya", path: "/guru/profil" },
  ];

  if (guru && ["superadmin", "shoofian"].includes(guru.username.toLowerCase())) {
    navItems.push({ name: "🛡️ Superadmin Panel", path: "/guru/superadmin" });
  }

  navItems.push({ name: "🌐 Portal Siswa", path: "/" });

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <span className="spinner" style={{ width: "40px", height: "40px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", fontWeight: "500" }}>Memuat Sistem...</p>
        </div>
        <style jsx global>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Mobile Top Header */}
      <div className="mobile-header no-print">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-primary)" }}
          >
            {sidebarOpen ? "✕" : "☰"}
          </button>
          <span style={{ fontWeight: "800", fontSize: "1.1rem" }}>CekNilai Guru</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Dark mode toggle - mobile */}
          <button
            onClick={toggleDark}
            title={isDark ? "Beralih ke Light Mode" : "Beralih ke Dark Mode"}
            style={{
              background: "none",
              border: "1px solid var(--border-color)",
              borderRadius: "999px",
              cursor: "pointer",
              padding: "4px 10px",
              fontSize: "1rem",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              lineHeight: 1,
            }}
          >
            {isDark ? "☀️" : "🌙"}
          </button>
          <span className="badge badge-primary" style={{ fontSize: "0.75rem" }}>
            {guru?.nama?.split(",")[0] || "Guru"}
          </span>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarOpen ? "active" : ""} no-print`}>
        {/* Logo and Brand */}
        <div style={{ height: "var(--header-height)", display: "flex", alignItems: "center", gap: "10px", padding: "0 24px", borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, var(--primary), var(--primary-hover))", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "800", color: "#ffffff", fontSize: "1.05rem" }}>
            N
          </div>
          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: "800" }}>CekNilai</h2>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: "500" }}>PANEL KONTROL GURU</p>
          </div>
        </div>

        {/* User Quick Info */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "4px" }}>
          <p style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-primary)" }}>{guru?.nama}</p>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{guru?.email}</p>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: "20px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== "/guru" && pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                className="btn"
                onClick={() => setSidebarOpen(false)}
                style={{
                  justifyContent: "flex-start",
                  padding: "12px 16px",
                  fontSize: "0.9rem",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "none",
                  backgroundColor: isActive ? "var(--primary-glow)" : "transparent",
                  color: isActive ? "var(--primary)" : "var(--text-secondary)",
                  fontWeight: isActive ? "700" : "500",
                  transition: "var(--transition)"
                }}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions: Dark mode toggle + Logout */}
        <div style={{ padding: "16px 12px", borderTop: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Dark Mode Toggle Button */}
          <button
            onClick={toggleDark}
            title={isDark ? "Beralih ke Light Mode" : "Beralih ke Dark Mode"}
            className="btn btn-secondary"
            style={{
              width: "100%",
              justifyContent: "space-between",
              fontSize: "0.88rem",
              padding: "10px 16px",
            }}
          >
            <span>{isDark ? "☀️  Light Mode" : "🌙  Dark Mode"}</span>
            {/* Toggle pill */}
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              width: "40px",
              height: "22px",
              borderRadius: "999px",
              backgroundColor: isDark ? "var(--primary)" : "var(--border-color)",
              padding: "2px",
              flexShrink: 0,
            }}>
              <span style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                transform: isDark ? "translateX(18px)" : "translateX(0px)",
                transition: "transform 0.25s ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }} />
            </span>
          </button>

          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ width: "100%", justifyContent: "center", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.15)", backgroundColor: "var(--danger-glow)" }}
          >
            🚪 Keluar Sistem
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="main-content" style={{ minWidth: 0 }}>
        {/* Top Header - Desktop Only */}
        <header className="header desktop-header no-print" style={{ margin: "-32px -32px 32px -32px", borderTop: "none" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Panel Guru &bull; Penilaian Digital</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Login sebagai: <strong>{guru?.username}</strong></span>
            <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>Superadmin Verified</span>

            {/* Dark Mode Toggle - Desktop Header */}
            <button
              onClick={toggleDark}
              title={isDark ? "Beralih ke Light Mode" : "Beralih ke Dark Mode"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-color)",
                borderRadius: "999px",
                cursor: "pointer",
                padding: "5px 14px 5px 10px",
                fontSize: "0.82rem",
                fontWeight: "600",
                color: "var(--text-secondary)",
              }}
            >
              <span style={{ fontSize: "1rem" }}>{isDark ? "☀️" : "🌙"}</span>
              <span>{isDark ? "Light" : "Dark"}</span>
            </button>
          </div>
        </header>

        {/* Children Render */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
