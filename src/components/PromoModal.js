"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PromoModal({ guru }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!guru) return;

    try {
      const username = guru?.username || guru?.id || "guru_user";
      const guruKey = `has_seen_promo_advanced_features_v2_${username}`;
      const globalKey = "has_seen_promo_advanced_features_v2";

      const hasSeenGuru = localStorage.getItem(guruKey);
      const hasSeenGlobal = localStorage.getItem(globalKey);
      const hasCookie = typeof document !== "undefined" && document.cookie.includes(`${guruKey}=true`);

      // Hanya tampilkan jika belum pernah dilihat sama sekali
      if (!hasSeenGuru && !hasSeenGlobal && !hasCookie) {
        const timer = setTimeout(() => {
          setIsOpen(true);
          
          // LANGSUNG KUNCI STATUS PERNAH DILIHAT (Seketika saat modal tampil)
          try {
            localStorage.setItem(guruKey, "true");
            localStorage.setItem(globalKey, "true");
            if (typeof document !== "undefined") {
              document.cookie = `${guruKey}=true; max-age=31536000; path=/`;
            }
          } catch (err) {
            console.error("Storage lock error:", err);
          }

        }, 600);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.error("LocalStorage error:", e);
    }
  }, [guru]);

  const handleClose = (targetUrl) => {
    setIsClosing(true);
    setTimeout(() => {
      try {
        const username = guru?.username || guru?.id || "guru_user";
        const guruKey = `has_seen_promo_advanced_features_v2_${username}`;
        const globalKey = "has_seen_promo_advanced_features_v2";

        localStorage.setItem(guruKey, "true");
        localStorage.setItem(globalKey, "true");
        if (typeof document !== "undefined") {
          document.cookie = `${guruKey}=true; max-age=31536000; path=/`;
        }
      } catch (e) {
        console.error("LocalStorage save error:", e);
      }
      setIsOpen(false);
      setIsClosing(false);

      if (targetUrl) {
        router.push(targetUrl);
      }
    }, 250);
  };

  if (!isOpen) return null;

  return (
    <div
      className="promo-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "16px",
        opacity: isClosing ? 0 : 1,
        transition: "opacity 0.25s ease-in-out",
      }}
      onClick={() => handleClose()}
    >
      <style jsx global>{`
        @keyframes promoPopIn {
          0% {
            opacity: 0;
            transform: scale(0.92) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes badgeShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div
        className="promo-modal-card"
        style={{
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--bg-secondary, #ffffff)",
          color: "var(--text-primary, #0f172a)",
          borderRadius: "24px",
          border: "1px solid var(--border-color, #e2e8f0)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          position: "relative",
          animation: "promoPopIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          transform: isClosing ? "scale(0.95) translateY(10px)" : "scale(1) translateY(0)",
          transition: "transform 0.25s ease-in-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tombol Tutup (X) */}
        <button
          onClick={() => handleClose()}
          aria-label="Tutup Pengumuman"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            color: "#ffffff",
            fontSize: "18px",
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.35)";
            e.currentTarget.style.transform = "rotate(90deg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
            e.currentTarget.style.transform = "rotate(0deg)";
          }}
        >
          ✕
        </button>

        {/* Header Visual Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #2e1065 0%, #4c1d95 40%, #6d28d9 75%, #7c3aed 100%)",
            padding: "32px 24px 26px 24px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            color: "#ffffff",
          }}
        >
          {/* Decorative Pattern Circles */}
          <div
            style={{
              position: "absolute",
              top: "-40px",
              right: "-40px",
              width: "160px",
              height: "160px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(0,0,0,0) 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-30px",
              left: "-30px",
              width: "140px",
              height: "140px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(167, 139, 250, 0.3) 0%, rgba(0,0,0,0) 70%)",
              pointerEvents: "none",
            }}
          />

          {/* New Feature Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 16px",
              borderRadius: "50px",
              background: "linear-gradient(90deg, #f59e0b, #eab308, #f59e0b)",
              backgroundSize: "200% auto",
              animation: "badgeShimmer 3s linear infinite",
              color: "#0f172a",
              fontWeight: 800,
              fontSize: "0.78rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: "14px",
              boxShadow: "0 4px 14px rgba(245, 158, 11, 0.4)",
            }}
          >
            🚀 PEMBARUAN DITAMBAHKAN
          </div>

          {/* Main Headline */}
          <h2
            style={{
              margin: "0 0 8px 0",
              fontSize: "1.65rem",
              fontWeight: 800,
              lineHeight: 1.25,
              fontFamily: "var(--font-heading)",
              color: "#ffffff"
            }}
          >
            Fitur & Pengaturan Lanjutan Kini <span style={{ color: "#facc15" }}>Lebih Lengkap!</span> ✨
          </h2>

          <p
            style={{
              margin: 0,
              fontSize: "0.88rem",
              color: "#e9d5ff",
              lineHeight: 1.5,
              opacity: 0.95,
              maxWidth: "480px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Akses seluruh alat kalkulasi khusus, program remedial, bonus keaktifan, dan aturan MaxCap kelas dengan jauh lebih praktis di menu <strong>🛠️ Operasi Data</strong>!
          </p>
        </div>

        {/* Body Content / Feature Highlights */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          
          {/* Highlight 1: Remedial & Pengayaan */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              padding: "12px 14px",
              borderRadius: "14px",
              background: "var(--bg-primary, #f8fafc)",
              border: "1px solid var(--border-color, #e2e8f0)",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                flexShrink: 0,
                fontWeight: "700"
              }}
            >
              🔴
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Program Remedial & Pengayaan Bertahap
              </h4>
              <p style={{ margin: "3px 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                Simpan nilai murni awal siswa, masukkan nilai tes remedial kapan saja secara individu bertahap, dan cetak Berita Acara resmi.
              </p>
            </div>
          </div>

          {/* Highlight 2: Fitur Bonus Keaktifan */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              padding: "12px 14px",
              borderRadius: "14px",
              background: "var(--bg-primary, #f8fafc)",
              border: "1px solid var(--border-color, #e2e8f0)",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "rgba(245, 158, 11, 0.12)",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                flexShrink: 0,
                fontWeight: "700"
              }}
            >
              ⭐
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Fitur Poin Bonus Keaktifan (1 ⭐ = +1 Poin)
              </h4>
              <p style={{ margin: "3px 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                Berikan apresiasi poin keaktifan bagi siswa yang proaktif di kelas. Fitur ini opsional dan secara default non-aktif.
              </p>
            </div>
          </div>

          {/* Highlight 3: Normalisasi & MaxCap */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              padding: "12px 14px",
              borderRadius: "14px",
              background: "var(--bg-primary, #f8fafc)",
              border: "1px solid var(--border-color, #e2e8f0)",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "rgba(124, 58, 237, 0.12)",
                color: "#7c3aed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                flexShrink: 0,
                fontWeight: "700"
              }}
            >
              📐
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Normalisasi Nilai & Aturan MaxCap Kelas
              </h4>
              <p style={{ margin: "3px 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                Sesuaikan skala nilai kelas secara otomatis (Linear, Min-Max 60–100, Scale to Max) serta tentukan batas nilai tertinggi (MaxCap).
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              onClick={() => handleClose("/guru/kelas")}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                color: "#ffffff",
                fontSize: "0.92rem",
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 6px 18px rgba(124, 58, 237, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
            >
              <span>🧪 Coba Fitur Baru Di Kelasku Now!</span>
            </button>

            <button
              onClick={() => handleClose()}
              style={{
                width: "100%",
                padding: "8px",
                background: "transparent",
                color: "var(--text-muted, #64748b)",
                fontSize: "0.8rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              Mengerti, Tutup Pengumuman Ini
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
