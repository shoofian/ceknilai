"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import OnboardingGuide from "@/components/OnboardingGuide";
import PromoModal from "@/components/PromoModal";
import { useConfirm } from "@/components/ConfirmProvider";

export default function GuruLayout({ children }) {
  const { confirmAsync, alertAsync, promptAsync } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [guru, setGuru] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isPopup, setIsPopup] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [kelasViewMode, setKelasViewMode] = useState('tabs');
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(false);
  const [pendingPayments, setPendingPayments] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  // Deteksi ukuran layar desktop dan simpan status minimize sidebar
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth > 1024);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);

    try {
      const savedCollapsed = localStorage.getItem("ceknilai_sidebar_collapsed");
      if (savedCollapsed !== null) {
        setSidebarCollapsed(savedCollapsed === "true");
      }
    } catch (e) {}

    // Shortcut keyboard Ctrl+B / Cmd+B untuk minimize/expand sidebar di PC
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
        const tag = e.target?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea" && !e.target?.isContentEditable) {
          e.preventDefault();
          toggleSidebarCollapsed();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", checkDesktop);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("ceknilai_sidebar_collapsed", String(next));
      } catch (e) {}
      return next;
    });
  };

  const isEffectiveCollapsed = sidebarCollapsed && isDesktop;

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

  const handleSetViewMode = async (mode) => {
    setKelasViewMode(mode);
    localStorage.setItem('ceknilai_view_mode', mode);
    window.dispatchEvent(new Event('ceknilai_view_mode_changed'));
  };

  // Toggle dark mode dan simpan ke localStorage
  const toggleDark = async () => {
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
            
            // If superadmin, fetch pending payments count
            if (["superadmin", "shoofian"].includes(data.user.username.toLowerCase())) {
              fetch("/api/superadmin/finance")
                .then(res => res.json())
                .then(logs => {
                  if (Array.isArray(logs)) {
                    const pendingCount = logs.filter(log => log.aksi === 'PAYMENT_PENDING').length;
                    setPendingPayments(pendingCount);
                  }
                })
                .catch(err => console.error("Failed to fetch pending payments", err));
            }
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
    if (await confirmAsync("Apakah Anda yakin ingin keluar dari sistem?")) {
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
    { icon: "📚", name: "Daftar Kelas", path: "/guru/kelas" },
  ];

  // Cetak Laporan is now hidden from sidebar navigation as it is accessible as a modal preview inside Kelola Kelas.
  
  if (guru) {
    navItems.push({ icon: "👨‍🏫", name: "Wali Kelas", path: "/guru/walikelas" });
    if (guru.walikelas_tingkatan && guru.walikelas_rombel_nama) {
      navItems.push({ icon: "📄", name: "e-Rapor", path: "/guru/erapor" });
    }
  }

  if (guru && ["superadmin", "shoofian"].includes(guru.username.toLowerCase())) {
    navItems.push({ 
      icon: "🛡️",
      name: "Superadmin Panel", 
      path: "/guru/superadmin",
      badge: pendingPayments > 0 ? pendingPayments : null
    });
  }
  
  // Add "Konfigurasi Sekolah" for Superadmin OR Admin Sekolah
  if (guru && (["superadmin", "shoofian"].includes(guru.username.toLowerCase()) || guru.is_admin_sekolah)) {
    navItems.push({ icon: "🏫", name: "Konfigurasi Sekolah", path: "/guru/sekolah" });
  }

  navItems.push({
    icon: "💬",
    name: "Chat Bantuan (WA)",
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
      <aside className={`sidebar ${sidebarOpen ? "active" : ""} ${isEffectiveCollapsed ? "collapsed" : ""} no-print`}>
        {/* Logo and Brand */}
        <div style={{
          height: "var(--header-height)",
          display: "flex",
          alignItems: "center",
          justifyContent: isEffectiveCollapsed ? "center" : "space-between",
          padding: isEffectiveCollapsed ? "0" : "0 16px 0 20px",
          borderBottom: "1px solid var(--border-color)",
          transition: "var(--transition)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, overflow: "hidden" }}>
            <div
              onClick={toggleSidebarCollapsed}
              style={{
                width: "34px",
                height: "34px",
                minWidth: "34px",
                borderRadius: "8px",
                background: "var(--theme-gradient, linear-gradient(135deg, var(--primary), var(--primary-hover)))",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontWeight: "800",
                color: "#ffffff",
                fontSize: "1.05rem",
                boxShadow: "0 2px 8px var(--theme-glow, rgba(0,0,0,0.15))",
                cursor: "pointer",
                transition: "transform 0.2s"
              }}
              title={isEffectiveCollapsed ? "Perluas Sidebar" : "CekNilai Guru"}
            >
              N
            </div>
            {!isEffectiveCollapsed && (
              <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
                <h2 style={{ fontSize: "1.05rem", fontWeight: "800", margin: 0 }}>CekNilai</h2>
                <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: "500", margin: 0 }}>PANEL KONTROL GURU</p>
              </div>
            )}
          </div>

          {!isEffectiveCollapsed && (
            <button
              onClick={toggleSidebarCollapsed}
              className="hide-on-mobile"
              title="Perkecil Sidebar (Ctrl+B)"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "6px",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "var(--transition)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--primary)";
                e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="11 17 6 12 11 7"></polyline>
                <polyline points="18 17 13 12 18 7"></polyline>
              </svg>
            </button>
          )}
        </div>

        {/* User Quick Info */}
        <div style={{
          padding: isEffectiveCollapsed ? "16px 0" : "20px 24px",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          alignItems: isEffectiveCollapsed ? "center" : "flex-start",
          gap: "4px",
          transition: "var(--transition)"
        }} title={`${guru?.nama || "Guru"} (${guru?.email || ""})`}>
          {isEffectiveCollapsed ? (
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "var(--primary-glow)",
              border: "1px solid var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.95rem",
              fontWeight: "700",
              color: "var(--primary)"
            }}>
              {guru?.nama ? guru.nama.charAt(0).toUpperCase() : "👤"}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", overflow: "hidden" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{guru?.nama}</span>
                {guru?.is_locked && <span title="Akun Terkunci (Read-Only)" style={{ fontSize: "0.85rem", cursor: "help" }}>🔒</span>}
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{guru?.email}</p>
            </>
          )}
        </div>

        {/* Nav Links */}
        <nav style={{
          flex: 1,
          padding: isEffectiveCollapsed ? "20px 8px" : "20px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          overflowY: "auto",
          overflowX: "hidden"
        }}>
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
                  title={item.name}
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isEffectiveCollapsed ? "center" : "flex-start",
                    padding: isEffectiveCollapsed ? "12px 0" : "12px 16px",
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
                  <span style={{ fontSize: isEffectiveCollapsed ? "1.25rem" : "1.1rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{item.icon}</span>
                  {!isEffectiveCollapsed && (
                    <span style={{ marginLeft: "10px", whiteSpace: "nowrap" }}>{item.name}</span>
                  )}
                </a>
              );
            }

            return (
              <Link
                key={item.path}
                href={item.path}
                className="btn"
                title={item.name}
                onClick={() => setSidebarOpen(false)}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isEffectiveCollapsed ? "center" : "flex-start",
                  padding: isEffectiveCollapsed ? "12px 0" : "12px 16px",
                  fontSize: "0.9rem",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: isActive ? "0 2px 10px var(--theme-glow, rgba(0,0,0,0.1))" : "none",
                  backgroundColor: isActive ? "var(--sidebar-active-bg, var(--primary-glow))" : "transparent",
                  color: isActive ? "var(--primary)" : "var(--text-secondary)",
                  borderLeft: isActive ? "3px solid var(--sidebar-active-border, var(--primary))" : "3px solid transparent",
                  fontWeight: isActive ? "700" : "500",
                  transition: "var(--transition)",
                  textDecoration: "none"
                }}
              >
                <span style={{ fontSize: isEffectiveCollapsed ? "1.25rem" : "1.1rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{item.icon}</span>
                {!isEffectiveCollapsed && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, marginLeft: "10px", overflow: "hidden" }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</span>
                    {item.badge && (
                      <span style={{ 
                        backgroundColor: "var(--danger)", 
                        color: "white", 
                        borderRadius: "12px", 
                        padding: "2px 8px", 
                        fontSize: "0.75rem", 
                        fontWeight: "bold",
                        boxShadow: "0 2px 4px rgba(239, 68, 68, 0.4)",
                        marginLeft: "8px",
                        flexShrink: 0
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
                {isEffectiveCollapsed && item.badge && (
                  <span style={{
                    position: "absolute",
                    top: "6px",
                    right: "12px",
                    minWidth: "16px",
                    height: "16px",
                    padding: "0 4px",
                    borderRadius: "8px",
                    backgroundColor: "var(--danger)",
                    color: "#ffffff",
                    fontSize: "0.65rem",
                    fontWeight: "800",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 0 2px var(--bg-secondary)"
                  }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions: Dark mode toggle + Logout */}
        <div style={{
          padding: isEffectiveCollapsed ? "16px 8px" : "16px 12px",
          borderTop: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}>
          {/* Dark Mode Toggle Button */}
          {isEffectiveCollapsed ? (
            <button
              onClick={toggleDark}
              title={isDark ? "Beralih ke Light Mode" : "Beralih ke Dark Mode"}
              className="btn btn-secondary"
              style={{
                width: "100%",
                justifyContent: "center",
                fontSize: "1.15rem",
                padding: "10px 0"
              }}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          ) : (
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
          )}

          {isEffectiveCollapsed ? (
            <button
              onClick={handleLogout}
              title="Keluar Sistem"
              className="btn btn-secondary"
              style={{
                width: "100%",
                justifyContent: "center",
                color: "var(--danger)",
                border: "1px solid rgba(239, 68, 68, 0.15)",
                backgroundColor: "var(--danger-glow)",
                fontSize: "1.15rem",
                padding: "10px 0"
              }}
            >
              🚪
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ width: "100%", justifyContent: "center", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.15)", backgroundColor: "var(--danger-glow)" }}
            >
              🚪 Keluar Sistem
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className={`main-content ${isEffectiveCollapsed ? "sidebar-collapsed" : ""}`} style={{ minWidth: 0 }}>
        {/* Top Header - Desktop Only */}
        <header className="header desktop-header no-print" style={{ margin: "-32px -32px 32px -32px", borderTop: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={toggleSidebarCollapsed}
              title={isEffectiveCollapsed ? "Perluas Sidebar (Ctrl+B)" : "Perkecil Sidebar (Ctrl+B)"}
              className="btn btn-secondary"
              style={{
                width: "36px",
                height: "36px",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "var(--transition)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--primary)";
                e.currentTarget.style.borderColor = "var(--primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.borderColor = "var(--border-color)";
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
                {isEffectiveCollapsed ? (
                  <polyline points="13 10 15 12 13 14"></polyline>
                ) : (
                  <polyline points="15 10 13 12 15 14"></polyline>
                )}
              </svg>
            </button>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0 }}>Panel Guru &bull; Penilaian Digital</h3>
          </div>
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
          {/* Dynamic Trial / Premium Expiry Banner */}
          {!trialBannerDismissed && !guru?.is_locked && (() => {
            const isPremium = !!guru?.premium_until;
            const expiryDate = isPremium ? new Date(guru.premium_until) : new Date("2026-08-31T23:59:59");
            const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
            
            // Only show banner if not premium, OR if premium but expiring in <= 7 days
            if (isPremium && daysLeft > 7) return null;

            return (
              <div
                className="trial-banner"
                style={{
                  background: "linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.05)",
                  position: "relative"
                }}
              >
                <div style={{ fontSize: "20px", flexShrink: 0 }}>⏳</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: "700", fontSize: "0.85rem", color: "#d97706", marginBottom: "2px" }}>
                    {isPremium ? "Masa Aktif Langganan" : "Uji Coba Gratis"} berakhir <strong>{expiryDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                  </div>
                  <p className="hide-on-mobile" style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                    Setelah tanggal tersebut, fitur pembuatan kelas dan pengisian nilai akan dibatasi. Silakan lakukan perpanjangan/aktivasi.
                  </p>
                </div>
                <Link href="/guru/masa-aktif" className="btn btn-primary" style={{ padding: "6px 12px", fontSize: "0.78rem", backgroundColor: "#d97706", borderColor: "#d97706", whiteSpace: "nowrap", flexShrink: 0 }}>
                  💳 Aktivasi
                </Link>
                <button
                  onClick={() => setTrialBannerDismissed(true)}
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "6px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    color: "var(--text-muted)",
                    padding: "4px",
                    lineHeight: 1
                  }}
                  aria-label="Tutup pemberitahuan"
                >
                  ✕
                </button>
              </div>
            );
          })()}
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

      {/* Bottom Navigation (Mobile Only) — Kontekstual per halaman */}
      <nav className="bottom-nav hide-on-desktop no-print">
        {pathname.match(/^\/guru\/kelas\/[^/]+$/) ? (
          /* === Detail Kelas / Buku Nilai === */
          <>
            <Link href="/guru/kelas" className="bottom-nav-item">
              <span className="icon">◀</span>
              <span className="label">Kelas</span>
            </Link>
            <button onClick={() => window.dispatchEvent(new CustomEvent('ceknilai:kelola-siswa'))} className="bottom-nav-item">
              <span className="icon">👥</span>
              <span className="label">Siswa</span>
            </button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('ceknilai:kelola-komponen'))} className="bottom-nav-item">
              <span className="icon">📊</span>
              <span className="label">Komponen</span>
            </button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('ceknilai:cetak-ekspor'))} className="bottom-nav-item">
              <span className="icon">🖨️</span>
              <span className="label">Ekspor</span>
            </button>
            <button onClick={() => setSidebarOpen(true)} className="bottom-nav-item">
              <span className="icon">☰</span>
              <span className="label">Menu</span>
            </button>
          </>
        ) : pathname === '/guru/kelas' ? (
          /* === Manajemen Kelas === */
          <>
            <Link href="/guru" className={`bottom-nav-item ${pathname === '/guru' ? 'active' : ''}`}>
              <span className="icon">🏠</span>
              <span className="label">Dasbor</span>
            </Link>
            <button onClick={() => window.dispatchEvent(new CustomEvent('ceknilai:tambah-kelas'))} className="bottom-nav-item">
              <span className="icon">➕</span>
              <span className="label">Tambah</span>
            </button>
            <Link href="/guru/arsip" className="bottom-nav-item">
              <span className="icon">📁</span>
              <span className="label">Arsip</span>
            </Link>
            <button onClick={() => setSidebarOpen(true)} className="bottom-nav-item">
              <span className="icon">☰</span>
              <span className="label">Menu</span>
            </button>
          </>
        ) : (
          /* === Default (Dasbor, dll) === */
          <>
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
          </>
        )}
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
