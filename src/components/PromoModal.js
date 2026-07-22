"use client";

import { useState, useEffect } from "react";

export default function PromoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    try {
      const hasSeen = localStorage.getItem("has_seen_promo_referral_v1");
      if (!hasSeen) {
        // Tampilkan modal setelah sedikit delay agar animasi smooth saat pertama kali dibuka
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.error("LocalStorage error:", e);
    }
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      try {
        localStorage.setItem("has_seen_promo_referral_v1", "true");
      } catch (e) {
        console.error("LocalStorage save error:", e);
      }
      setIsOpen(false);
      setIsClosing(false);
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
        zIndex: 9999,
        padding: "16px",
        opacity: isClosing ? 0 : 1,
        transition: "opacity 0.25s ease-in-out",
      }}
      onClick={handleClose}
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
          maxWidth: "560px",
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
          onClick={handleClose}
          aria-label="Tutup Promosi"
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
            background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 35%, #312e81 70%, #4338ca 100%)",
            padding: "32px 24px 28px 24px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            color: "#ffffff",
          }}
        >
          {/* Background Decorative Pattern Elements */}
          <div
            style={{
              position: "absolute",
              top: "-40px",
              right: "-40px",
              width: "160px",
              height: "160px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(234, 179, 8, 0.25) 0%, rgba(0,0,0,0) 70%)",
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
              background: "radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(0,0,0,0) 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Exclusive Badge */}
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
            🔥 FITUR & KESEMPATAN SPESIAL
          </div>

          {/* Main Headline */}
          <h2
            style={{
              margin: "0 0 8px 0",
              fontSize: "1.65rem",
              fontWeight: 800,
              lineHeight: 1.25,
              fontFamily: "var(--font-heading)",
              background: "linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Raih Uang Tunai Hingga <span style={{ color: "#facc15", WebkitTextFillColor: "#facc15" }}>Jutaan Rupiah!</span> 💸
          </h2>

          <p
            style={{
              margin: 0,
              fontSize: "0.92rem",
              color: "#e2e8f0",
              lineHeight: 1.5,
              opacity: 0.95,
              maxWidth: "460px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Ajak rekan guru & teman menggunakan <strong>CekNilai</strong>. Kumpulkan poin referral dan tukarkan dengan berbagai keuntungan melimpah!
          </p>
        </div>

        {/* Body Content / Marketing Highlights */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          
          {/* Highlight 1: Uang Tunai Jutaan Rupiah */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              padding: "14px 16px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(234, 179, 8, 0.08) 0%, rgba(245, 158, 11, 0.03) 100%)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                flexShrink: 0,
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
              }}
            >
              💵
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h4 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Tukar Poin Jadi Uang Tunai
                </h4>
                <span
                  style={{
                    backgroundColor: "#ef4444",
                    color: "#ffffff",
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: "20px",
                    textTransform: "uppercase",
                  }}
                >
                  s.d. Jutaan Rp
                </span>
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                Tukarkan akumulasi poin referral kamu langsung menjadi <strong>saldo uang tunai (E-Wallet / Transfer Bank)</strong> tanpa batasan maksimal penukaran!
              </p>
            </div>
          </div>

          {/* Highlight 2: Masa Aktif Gratis */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              padding: "14px 16px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.03) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #10b981, #059669)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                flexShrink: 0,
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
              }}
            >
              🎁
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Perpanjangan Masa Aktif Gratis
              </h4>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                Dapatkan bonus perpanjangan masa aktif akun & fitur premium secara <strong>100% GRATIS</strong> setiap ada pengguna baru yang mendaftar via link milikmu.
              </p>
            </div>
          </div>

          {/* Highlight 3: Program Referral Simpel */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              padding: "14px 16px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.03) 100%)",
              border: "1px solid rgba(59, 130, 246, 0.25)",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                flexShrink: 0,
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
              }}
            >
              🤝
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Program Referral Mudah & Instan
              </h4>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                Bagikan kode unik atau tautan khusus ke rekan guru/teman. Poin bonus akan otomatis terkumpul langsung di akun kamu secara otomatis.
              </p>
            </div>
          </div>

          {/* Highlight 4: Kejutan Hadiah Lainnya */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              padding: "14px 16px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(124, 58, 237, 0.03) 100%)",
              border: "1px solid rgba(139, 92, 246, 0.25)",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                flexShrink: 0,
                boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
              }}
            >
              🚀
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Bonus & Surprise Rewards Mendatang
              </h4>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                Nantikan berbagai kejutan menarik seperti <strong>Voucher Belanja, Gadget, dan Mystery Box</strong> yang siap dibagikan untuk member aktif!
              </p>
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              onClick={handleClose}
              style={{
                width: "100%",
                padding: "14px 20px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)",
                color: "#ffffff",
                fontSize: "1rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 8px 20px rgba(37, 99, 235, 0.35)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 25px rgba(37, 99, 235, 0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(37, 99, 235, 0.35)";
              }}
            >
              <span>💰</span> Saya Mengerti & Mulai Sekarang
            </button>

            <button
              onClick={handleClose}
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: "12px",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: "0.85rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                textAlign: "center",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              Nanti Saja
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
