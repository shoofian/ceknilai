"use client";

import { useState, useEffect } from "react";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Cek apakah sudah berjalan di mode standalone (sudah diinstall)
    const isApp = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (isApp) {
      setIsStandalone(true);
      return;
    }

    // Cek apakah user pernah menutup banner dalam 7 hari terakhir
    const dismissedTime = localStorage.getItem("pwa_install_dismissed");
    if (dismissedTime && Date.now() - Number(dismissedTime) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    // Deteksi iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    if (isIosDevice) {
      // Di iOS Safari tidak ada event beforeinstallprompt, kita tampilkan panduan setelah delay singkat
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Android / Desktop Chrome / Edge
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      localStorage.setItem("pwa_install_dismissed", String(Date.now()));
    } catch (e) {}
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div
      className="pwa-install-banner no-print animate-fade-in"
      style={{
        position: "fixed",
        bottom: "80px",
        left: "16px",
        right: "16px",
        maxWidth: "420px",
        margin: "0 auto",
        backgroundColor: "var(--bg-primary)",
        border: "1px solid var(--border-color)",
        borderRadius: "16px",
        padding: "14px 16px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2), 0 0 0 1px var(--border-color)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <img
          src="/icon-192x192.png"
          alt="CekNilai Logo"
          style={{ width: "42px", height: "42px", borderRadius: "10px", objectFit: "cover", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: "800", fontSize: "0.95rem", color: "var(--text-primary)" }}>
            Install Aplikasi CekNilai
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.3 }}>
            Akses cepat tanpa browser & bekerja lebih nyaman di HP Anda.
          </div>
        </div>
        <button
          onClick={handleDismiss}
          style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.1rem", cursor: "pointer", padding: "4px", lineHeight: 1 }}
          title="Tutup"
        >
          ✕
        </button>
      </div>

      {isIos ? (
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", backgroundColor: "var(--bg-secondary)", padding: "8px 12px", borderRadius: "8px", border: "1px dashed var(--border-color)" }}>
          Ketuk tombol Bagikan <strong>(Share ⎋)</strong> di Safari lalu pilih <strong>&quot;Tambahkan ke Layar Utama&quot; (+)</strong>.
        </div>
      ) : (
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            onClick={handleDismiss}
            style={{
              padding: "6px 12px",
              fontSize: "0.82rem",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              backgroundColor: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Nanti Saja
          </button>
          <button
            onClick={handleInstallClick}
            className="btn btn-primary"
            style={{
              padding: "6px 16px",
              fontSize: "0.82rem",
              borderRadius: "8px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            📥 Install Sekarang
          </button>
        </div>
      )}
    </div>
  );
}
