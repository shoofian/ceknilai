import "./globals.css";
import WhatsAppWidget from "@/components/WhatsAppWidget";

export const metadata = {
  title: "Cek Nilai - Sistem Penilaian Online Guru & Siswa",
  description: "Aplikasi penilaian online interaktif untuk membantu guru mengelola nilai kelas, bobot presentase, dan membantu siswa melihat hasil belajar secara transparan.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh", margin: 0 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {children}
        </div>
        <footer className="no-print" style={{ textAlign: "center", padding: "16px", color: "var(--text-secondary)", fontSize: "0.85rem", borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-primary)" }}>
          Powered by <strong style={{ color: "var(--primary)" }}>Memofy Studio</strong>
        </footer>
        <WhatsAppWidget />
      </body>
    </html>
  );
}
