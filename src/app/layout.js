import "./globals.css";
import { ClientProviders } from "@/components/ClientProviders";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

export const metadata = {
  title: "Cek Nilai - Sistem Penilaian Online Guru & Siswa",
  description: "Aplikasi penilaian online interaktif untuk membantu guru mengelola nilai kelas, bobot presentase, dan membantu siswa melihat hasil belajar secara transparan.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CekNilai",
  },
  icons: {
    icon: "/icon-192x192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b82f6",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh", margin: 0 }}>
        <ClientProviders>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {children}
          </div>
          <PwaInstallPrompt />
          <footer className="no-print" style={{ textAlign: "center", padding: "16px", color: "var(--text-secondary)", fontSize: "0.85rem", borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-primary)" }}>
            Powered by <strong style={{ color: "var(--primary)" }}>NIAL</strong>
          </footer>
        </ClientProviders>
      </body>
    </html>
  );
}
