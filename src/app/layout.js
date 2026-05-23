import "./globals.css";

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
      <body>
        {children}
      </body>
    </html>
  );
}
