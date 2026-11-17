"use client";

import { useState, useEffect } from "react";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationManager({ nisn, studentName = "" }) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState("default");
  const [loading, setLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Cek apakah sudah pernah subscribe
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            setIsSubscribed(true);
          }
        });
      });
    }
  }, []);

  if (!isSupported || !nisn || dismissed) return null;

  const handleSubscribe = async () => {
    setLoading(true);
    setStatusMessage("");

    try {
      // 1. Minta izin notifikasi browser
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setStatusMessage("Izin notifikasi tidak diberikan. Buka pengaturan browser untuk mengizinkan.");
        setLoading(false);
        return;
      }

      // 2. Daftarkan Service Worker jika belum
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // 3. Ambil VAPID Public Key
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        throw new Error("VAPID public key belum dikonfigurasi.");
      }

      // 4. Buat Subscription
      const convertedVapidKey = urlBase64ToUint8Array(vapidKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // 5. Kirim ke Server
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nisn,
          subscription,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan langganan notifikasi");
      }

      setIsSubscribed(true);
      setStatusMessage("✅ Notifikasi aktif! Anda akan menerima pemberitahuan otomatis saat guru selesai menginput nilai baru.");
    } catch (err) {
      console.error("Gagal mengaktifkan notifikasi push:", err);
      setStatusMessage(`Gagal: ${err.message || "Terjadi kendala saat mendaftarkan notifikasi."}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="glass-card no-print animate-fade-in"
      style={{
        marginBottom: "20px",
        padding: "16px 20px",
        borderLeft: isSubscribed ? "4px solid var(--success)" : "4px solid var(--primary)",
        backgroundColor: isSubscribed ? "rgba(16, 185, 129, 0.04)" : "rgba(59, 130, 246, 0.04)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
        borderRadius: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: "1 1 300px" }}>
        <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>{isSubscribed ? "🔔" : "📲"}</span>
        <div>
          <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text-primary)" }}>
            {isSubscribed
              ? "Notifikasi Nilai Aktif di Perangkat Ini"
              : "Dapatkan Notifikasi Nilai Otomatis di HP"}
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
            {isSubscribed
              ? `Perangkat ini akan menerima pemberitahuan setiap pagi jika ada nilai baru untuk ${studentName || "Anda"}.`
              : "Aktifkan agar HP Anda otomatis menerima pemberitahuan setiap pagi jika ada nilai baru yang diinput guru."}
          </p>
          {statusMessage && (
            <div
              style={{
                marginTop: "8px",
                fontSize: "0.8rem",
                fontWeight: "600",
                color: statusMessage.startsWith("✅") ? "var(--success)" : "var(--danger)",
              }}
            >
              {statusMessage}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        {!isSubscribed ? (
          <>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              style={{
                background: "none",
                border: "none",
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "6px 10px",
              }}
            >
              Nanti Saja
            </button>
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={loading}
              className="btn btn-primary"
              style={{
                padding: "8px 16px",
                fontSize: "0.85rem",
                fontWeight: "700",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                borderRadius: "8px",
              }}
            >
              {loading ? "Mengaktifkan..." : "🔔 Aktifkan Notifikasi"}
            </button>
          </>
        ) : (
          <span
            style={{
              fontSize: "0.8rem",
              fontWeight: "700",
              color: "var(--success)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              padding: "4px 10px",
              borderRadius: "20px",
            }}
          >
            ✓ Terhubung
          </span>
        )}
      </div>
    </div>
  );
}
