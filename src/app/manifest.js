export default function manifest() {
  return {
    name: "CekNilai - Sistem Penilaian Guru & Siswa",
    short_name: "CekNilai",
    description: "Aplikasi penilaian online interaktif untuk membantu guru mengelola nilai kelas dan membantu siswa melihat hasil belajar.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3b82f6",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
