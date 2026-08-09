"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ManajemenSekolahPanel from "@/components/ManajemenSekolahPanel";

export default function KonfigurasiSekolahPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [currentUserData, setCurrentUserData] = useState(null);

  // Global School Context for Bank Data & Ekskul (for superadmin)
  const [globalTargetSekolahId, setGlobalTargetSekolahId] = useState("");
  const [globalSearchSekolahTerm, setGlobalSearchSekolahTerm] = useState("");
  const [globalSekolahResults, setGlobalSekolahResults] = useState([]);
  const [globalIsSearchingSekolah, setGlobalIsSearchingSekolah] = useState(false);
  const [globalShowSekolahDropdown, setGlobalShowSekolahDropdown] = useState(false);
  const [globalSearchTimeout, setGlobalSearchTimeout] = useState(null);

  const SUPERADMIN_USERNAMES = ["superadmin", "shoofian"];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/profil"); // Or another endpoint to get guru profile
        if (res.ok) {
          const user = await res.json();
          if (!user || !user.username) {
            router.push("/login");
            return;
          }
          
          const isSA = SUPERADMIN_USERNAMES.includes(user.username.toLowerCase());
          setIsSuperadmin(isSA);
          setCurrentUserData(user);

          if (isSA) {
            setAuthorized(true);
            // Wait for superadmin to search and select
          } else if (user.is_admin_sekolah) {
            setAuthorized(true);
            setGlobalTargetSekolahId(user.sekolah_id || "");
          } else {
            router.push("/guru"); // Not authorized
          }
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Auth check failed", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleGlobalSearchSekolah = async (e) => {
    const val = e.target.value;
    setGlobalSearchSekolahTerm(val);
    setGlobalTargetSekolahId(""); // Reset ID if user types something new
    
    if (globalSearchTimeout) clearTimeout(globalSearchTimeout);
    
    if (!val.trim()) {
      setGlobalSekolahResults([]);
      return;
    }

    setGlobalSearchTimeout(setTimeout(async () => {
      setGlobalIsSearchingSekolah(true);
      try {
        const res = await fetch(`/api/sekolah/search?query=${encodeURIComponent(val)}`);
        if (res.ok) {
          const data = await res.json();
          setGlobalSekolahResults(data);
        }
      } catch (err) {
        console.error("Gagal mencari sekolah:", err);
      } finally {
        setGlobalIsSearchingSekolah(false);
      }
    }, 500));
  };

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Memuat profil akses...</div>;
  }

  if (!authorized) {
    return null; // Will redirect
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <h1 className="page-title">🏫 Konfigurasi Sekolah</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>
        Atur identitas sekolah, ekstrakurikuler, dan sinkronisasi bank data siswa.
      </p>

      {isSuperadmin && (
        <div className="glass-card" style={{ marginBottom: "20px", overflow: "visible" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.4rem" }}>🔍</span> Pencarian Global Sekolah (Khusus Superadmin)
          </h2>
          <div style={{ position: "relative" }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ketik nama atau NPSN sekolah..."
              value={globalSearchSekolahTerm}
              onChange={handleGlobalSearchSekolah}
              onFocus={() => setGlobalShowSekolahDropdown(true)}
              onBlur={() => setTimeout(() => setGlobalShowSekolahDropdown(false), 200)}
            />
            {globalIsSearchingSekolah && (
              <span style={{ position: "absolute", right: "12px", top: "10px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Mencari...
              </span>
            )}

            {globalShowSekolahDropdown && globalSekolahResults.length > 0 && (
              <div style={{ 
                position: "absolute", 
                top: "100%", 
                left: 0, 
                right: 0, 
                background: "var(--bg-secondary)", 
                border: "1px solid var(--border-color)", 
                borderRadius: "var(--radius-md)", 
                boxShadow: "var(--shadow-lg)",
                marginTop: "4px",
                zIndex: 100,
                maxHeight: "300px",
                overflowY: "auto"
              }}>
                {globalSekolahResults.map(s => (
                  <div 
                    key={s.id}
                    onMouseDown={() => { // Using onMouseDown instead of onClick to beat onBlur
                      setGlobalSearchSekolahTerm(s.nama);
                      setGlobalTargetSekolahId(s.id);
                      setGlobalShowSekolahDropdown(false);
                    }}
                    style={{ 
                      padding: "12px 16px", 
                      borderBottom: "1px solid var(--border-color)", 
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>{s.nama}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>NPSN: {s.npsn} - {s.kabupaten_kota}</div>
                  </div>
                ))}
              </div>
            )}
            
            {globalShowSekolahDropdown && globalSearchSekolahTerm && !globalIsSearchingSekolah && globalSekolahResults.length === 0 && (
              <div style={{ 
                position: "absolute", 
                top: "100%", 
                left: 0, 
                right: 0, 
                background: "var(--bg-secondary)", 
                border: "1px solid var(--border-color)", 
                borderRadius: "var(--radius-md)", 
                padding: "12px 16px",
                color: "var(--text-secondary)",
                marginTop: "4px",
                zIndex: 100
              }}>
                Tidak ada sekolah yang cocok.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Render school management panel if we have a target school */}
      {globalTargetSekolahId ? (
        <div className="glass-card animate-fade-in" style={{ padding: 0 }}>
          <ManajemenSekolahPanel targetSekolahId={globalTargetSekolahId} />
        </div>
      ) : isSuperadmin ? (
        <div className="glass-card" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
          <span style={{ fontSize: "2rem", display: "block", marginBottom: "16px" }}>🏫</span>
          Silakan cari dan pilih sekolah di atas untuk mengonfigurasi.
        </div>
      ) : (
        <div className="glass-card" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
          <span style={{ fontSize: "2rem", display: "block", marginBottom: "16px" }}>⚠️</span>
          Anda terdaftar sebagai Admin Sekolah, tetapi belum ditautkan ke profil sekolah mana pun. Silakan hubungi Superadmin.
        </div>
      )}
    </div>
  );
}
