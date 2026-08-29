"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import OnboardingGuide from "@/components/OnboardingGuide";
import PromoModal from "@/components/PromoModal";

export default function GuruLayout({ children }) {
  const [loading, setLoading] = useState(true);
  const [guru, setGuru] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isPopup, setIsPopup] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [kelasViewMode, setKelasViewMode] = useState('tabs');
  const router = useRouter();
  const pathname = usePathname();

  // Inisialisasi mode dari localStorage saat pertama mount dan cek status popup
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = saved ? saved === "dark" : prefersDark;
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);

    // Check active 5-minute theme trial preview
    try {
      const previewData = sessionStorage.getItem("theme_preview");
      if (previewData) {
        const parsed = JSON.parse(previewData);
        if (parsed && parsed.expiresAt > Date.now()) {
          const key = parsed.id.replace('theme_', '');
          document.documentElement.setAttribute("data-theme", key);
          if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            setIsPopup(params.get("popup") === "true");
          }
          return;
        } else {
          sessionStorage.removeItem("theme_preview");
        }
      }
    } catch (e) {}

    const savedColorTheme = localStorage.getItem("color_theme");
    if (savedColorTheme && savedColorTheme !== 'default') {
      document.documentElement.setAttribute("data-theme", savedColorTheme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }

    if (typeof window !== "undefined") {
      setKelasViewMode(localStorage.getItem("ceknilai_view_mode") || "tabs");
      const params = new URLSearchParams(window.location.search);
      setIsPopup(params.get("popup") === "true");
    }
  }, [pathname]);

  const handleSetViewMode = (mode) => {
    setKelasViewMode(mode);
    localStorage.setItem('ceknilai_view_mode', mode);
    window.dispatchEvent(new Event('ceknilai_view_mode_changed'));
  };

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
    { name: "📚 Daftar Kelas", path: "/guru/kelas" },
  ];

  // Cetak Laporan is now hidden from sidebar navigation as it is accessible as a modal preview inside Kelola Kelas.
  
  if (guru) {
    navItems.push({ name: "👨‍🏫 Wali Kelas", path: "/guru/walikelas" });
    if (guru.walikelas_tingkatan && guru.walikelas_rombel_nama) {
      navItems.push({ name: "📄 e-Rapor", path: "/guru/erapor" });
    }
  }

    if (guru && ["superadmin", "shoofian"].includes(guru.username.toLowerCase())) {
      navItems.push({ name: "🛡️ Superadmin Panel", path: "/guru/superadmin" });
    }
    
    // Add "Konfigurasi Sekolah" for Superadmin OR Admin Sekolah
    if (guru && (["superadmin", "shoofian"].includes(guru.username.toLowerCase()) || guru.is_admin_sekolah)) {
      navItems.push({ name: "🏫 Konfigurasi Sekolah", path: "/guru/sekolah" });
    }

    navItems.push({
    name: "💬 Chat Bantuan (WA)",
    path: "https://wa.me/6285157544004?text=Halo%20Admin,%20saya%20butuh%20bantuan%20mengenai%20Cek%20Nilai.",
    isExternal: true
  });

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

  if (isPopup) {
    return (
      <div className="popup-layout" style={{ padding: "20px 0", backgroundColor: "var(--bg-primary)", minHeight: "100vh" }}>
        {children}
      </div>
    );
  }

  return (
    <div className="app-container" style={{ position: "relative" }}>
      {/* Background Ambient Theme Glow */}
      <div className="theme-ambient-glow" />

      {/* Click away listener overlay for Profile Dropdown */}
      {profileDropdownOpen && (
        <div 
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 80 }}
          onClick={() => setProfileDropdownOpen(false)}
        />
      )}

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
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
          {/* Profile Dropdown - Mobile */}
          <div style={{ position: "relative" }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "var(--primary-glow)",
              border: "1px solid var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
              cursor: "pointer"
            }} title="Profil Saya" onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}>
              👤
            </div>
            
            {profileDropdownOpen && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "8px",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-lg)",
                zIndex: 100,
                width: "200px",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden"
              }}>
                <div onClick={() => { setProfileDropdownOpen(false); router.push('/guru/profil'); }} style={{ padding: "12px 16px", cursor: "pointer", color: "var(--text-primary)", fontSize: "0.85rem", fontWeight: "600", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "8px" }}>
                  👤 Edit Profil
                </div>
                <div onClick={() => { setProfileDropdownOpen(false); router.push('/guru/masa-aktif'); }} style={{ padding: "12px 16px", cursor: "pointer", color: "var(--text-primary)", fontSize: "0.85rem", fontWeight: "600", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "8px" }}>
                  👑 Masa Aktif
                </div>
                <div onClick={() => { setProfileDropdownOpen(false); router.push('/guru/hadiah'); }} style={{ padding: "12px 16px", cursor: "pointer", color: "var(--text-primary)", fontSize: "0.85rem", fontWeight: "600", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "8px" }}>
                  🎁 Referral
                </div>
                <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tampilan Kelas</span>
                  <div style={{ display: "flex", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", padding: "4px", gap: "4px", border: "1px solid var(--border-color)" }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleSetViewMode('dashboard'); }}
                      style={{ flex: 1, padding: "6px", fontSize: "0.8rem", borderRadius: "var(--radius-xs)", border: "none", backgroundColor: kelasViewMode === 'dashboard' ? 'var(--bg-primary)' : 'transparent', color: kelasViewMode === 'dashboard' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: kelasViewMode === 'dashboard' ? '700' : '500', cursor: "pointer", boxShadow: kelasViewMode === 'dashboard' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: "all 0.2s" }}
                    >
                      🗂️ Dasbor
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleSetViewMode('tabs'); }}
                      style={{ flex: 1, padding: "6px", fontSize: "0.8rem", borderRadius: "var(--radius-xs)", border: "none", backgroundColor: kelasViewMode === 'tabs' ? 'var(--bg-primary)' : 'transparent', color: kelasViewMode === 'tabs' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: kelasViewMode === 'tabs' ? '700' : '500', cursor: "pointer", boxShadow: kelasViewMode === 'tabs' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: "all 0.2s" }}
                    >
                      📑 Tab
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay no-print"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 99,
          }}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarOpen ? "active" : ""} no-print`}>
        {/* Logo and Brand */}
        <div style={{ height: "var(--header-height)", display: "flex", alignItems: "center", gap: "10px", padding: "0 24px", borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--theme-gradient, linear-gradient(135deg, var(--primary), var(--primary-hover)))", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "800", color: "#ffffff", fontSize: "1.05rem", boxShadow: "0 2px 8px var(--theme-glow, rgba(0,0,0,0.15))" }}>
            N
          </div>
          <div>
            <h2 style={{ fontSize: "1.05rem", fontWeight: "800" }}>CekNilai</h2>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: "500" }}>PANEL KONTROL GURU</p>
          </div>
        </div>

        {/* User Quick Info */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-primary)" }}>{guru?.nama}</span>
            {guru?.is_locked && <span title="Akun Terkunci (Read-Only)" style={{ fontSize: "0.85rem", cursor: "help" }}>🔒</span>}
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>{guru?.email}</p>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: "20px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {navItems.map((item) => {
            const isActive = !item.isExternal && (pathname === item.path || (item.path !== "/guru" && pathname.startsWith(item.path)));

            if (item.isExternal) {
              return (
                <a
                  key={item.name}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    padding: "12px 16px",
                    fontSize: "0.9rem",
                    borderRadius: "var(--radius-sm)",
                    boxShadow: "none",
                    backgroundColor: "transparent",
                    color: "var(--text-secondary)",
                    fontWeight: "500",
                    transition: "var(--transition)",
                    textDecoration: "none"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--success)";
                    e.currentTarget.style.backgroundColor = "var(--success-glow)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {item.name}
                </a>
              );
            }

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
                  boxShadow: isActive ? "0 2px 10px var(--theme-glow, rgba(0,0,0,0.1))" : "none",
                  backgroundColor: isActive ? "var(--sidebar-active-bg, var(--primary-glow))" : "transparent",
                  color: isActive ? "var(--primary)" : "var(--text-secondary)",
                  borderLeft: isActive ? "3px solid var(--sidebar-active-border, var(--primary))" : "3px solid transparent",
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
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>

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
            
            {/* Profile Dropdown - Desktop Header */}
            <div style={{ position: "relative" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "var(--primary-glow)",
                border: "1px solid var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.1rem",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                transition: "transform 0.2s"
              }} title="Profil Saya"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                onMouseOver={e => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
              >
                👤
              </div>
              
              {profileDropdownOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "8px",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-lg)",
                  zIndex: 100,
                  width: "200px",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden"
                }}>
                  <div onClick={() => { setProfileDropdownOpen(false); router.push('/guru/profil'); }} style={{ padding: "12px 16px", cursor: "pointer", color: "var(--text-primary)", fontSize: "0.85rem", fontWeight: "600", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "8px" }} onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"} onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}>
                    👤 Edit Profil
                  </div>
                  <div onClick={() => { setProfileDropdownOpen(false); router.push('/guru/masa-aktif'); }} style={{ padding: "12px 16px", cursor: "pointer", color: "var(--text-primary)", fontSize: "0.85rem", fontWeight: "600", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "8px" }} onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"} onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}>
                    👑 Masa Aktif
                  </div>
                  <div onClick={() => { setProfileDropdownOpen(false); router.push('/guru/hadiah'); }} style={{ padding: "12px 16px", cursor: "pointer", color: "var(--text-primary)", fontSize: "0.85rem", fontWeight: "600", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "8px" }} onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"} onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}>
                    🎁 Referral
                  </div>
                  <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tampilan Kelas</span>
                    <div style={{ display: "flex", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", padding: "4px", gap: "4px", border: "1px solid var(--border-color)" }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleSetViewMode('dashboard'); }}
                        style={{ flex: 1, padding: "6px", fontSize: "0.8rem", borderRadius: "var(--radius-xs)", border: "none", backgroundColor: kelasViewMode === 'dashboard' ? 'var(--bg-primary)' : 'transparent', color: kelasViewMode === 'dashboard' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: kelasViewMode === 'dashboard' ? '700' : '500', cursor: "pointer", boxShadow: kelasViewMode === 'dashboard' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: "all 0.2s" }}
                      >
                        🗂️ Dasbor
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleSetViewMode('tabs'); }}
                        style={{ flex: 1, padding: "6px", fontSize: "0.8rem", borderRadius: "var(--radius-xs)", border: "none", backgroundColor: kelasViewMode === 'tabs' ? 'var(--bg-primary)' : 'transparent', color: kelasViewMode === 'tabs' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: kelasViewMode === 'tabs' ? '700' : '500', cursor: "pointer", boxShadow: kelasViewMode === 'tabs' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: "all 0.2s" }}
                      >
                        📑 Tab
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Children Render */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {guru?.is_locked && (
            <div 
              style={{ 
                background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: "12px",
                padding: "16px 20px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                boxShadow: "0 4px 20px rgba(239, 68, 68, 0.05)",
                backdropFilter: "blur(4px)"
              }}
            >
              <div style={{ fontSize: "2rem", display: "flex", alignItems: "center" }}>🔒</div>
              <div style={{ flex: 1 }}>
                <h5 style={{ margin: "0 0 4px 0", color: "#f87171", fontWeight: "800", fontSize: "0.95rem" }}>Akun Sedang Dikunci (Read-Only)</h5>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.5" }}>
                  {guru.lock_message || "Akun Anda sementara dikunci oleh superadmin. Anda hanya dapat membaca data dan tidak dapat membuat, mengubah, atau menghapus data."}
                </p>
              </div>
            </div>
          )}
          {children}
          <OnboardingGuide />
          <PromoModal guru={guru} />
        </div>
      </div>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="bottom-nav hide-on-desktop no-print">
        <Link href="/guru" className={`bottom-nav-item ${pathname === '/guru' ? 'active' : ''}`}>
          <span className="icon">🏠</span>
          <span className="label">Dasbor</span>
        </Link>
        <Link href="/guru/kelas" className={`bottom-nav-item ${pathname.startsWith('/guru/kelas') ? 'active' : ''}`}>
          <span className="icon">📚</span>
          <span className="label">Kelas</span>
        </Link>
        <button onClick={() => setSidebarOpen(true)} className="bottom-nav-item">
          <span className="icon">☰</span>
          <span className="label">Menu</span>
        </button>
      </nav>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
