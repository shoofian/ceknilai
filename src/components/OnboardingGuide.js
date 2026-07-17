import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function OnboardingGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasNoClasses, setHasNoClasses] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkClasses = async () => {
      try {
        const response = await fetch("/api/kelas?archived=all");
        if (response.ok) {
          const classes = await response.json();
          const count = classes.length;
          setHasNoClasses(count === 0);

          // Tampilkan otomatis jika tidak ada kelas dan belum pernah ditutup permanen
          const dismissed = localStorage.getItem("onboarding_dismissed");
          if (count === 0 && dismissed !== "true") {
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error("Gagal memeriksa data kelas untuk panduan", err);
      }
    };

    // Jalankan pengecekan hanya jika berada di area guru
    if (pathname && pathname.startsWith("/guru")) {
      checkClasses();
    }
  }, [pathname]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleDismissPermanently = () => {
    localStorage.setItem("onboarding_dismissed", "true");
    setIsOpen(false);
  };

  const handleResetDismiss = () => {
    localStorage.removeItem("onboarding_dismissed");
    setCurrentStep(0);
    setIsOpen(true);
  };

  const handleNavigateToClass = () => {
    setIsOpen(false);
    router.push("/guru/kelas");
  };

  const steps = [
    {
      title: "Buat Kelas Pertama Anda 🏫",
      subtitle: "Langkah 1: Tentukan Preferensi Pembuatan Kelas",
      description: "Sebelum menginput nilai, Anda harus memiliki minimal satu kelas aktif. Di menu 'Daftar Kelas', Anda memiliki 3 pilihan cara pembuatan kelas:",
      options: [
        {
          title: "✍️ Cara Manual (Ketik Form)",
          desc: "Sangat cocok untuk membuat kelas satu per satu secara cepat. Cukup masukkan nama rombel, mata pelajaran, dan tahun ajaran."
        },
        {
          title: "📥 Unggah Berkas Dapodik (CSV)",
          desc: "Tinggal unggah file ekspor Dapodik Anda, sistem akan otomatis membaca semua daftar rombel dan tingkatan tanpa perlu mengetik ulang."
        },
        {
          title: "📂 Impor Massal Excel/CSV",
          desc: "Unduh format template, isi daftar kelas yang Anda miliki secara massal, lalu unggah untuk membuat banyak kelas sekaligus."
        }
      ],
      tip: "Pilih menu 'Daftar Kelas' di navigasi sebelah kiri, lalu klik tombol tambah kelas yang sesuai dengan preferensi data Anda."
    },
    {
      title: "Atur Kolom Nilai & Bobot Persen 📊",
      subtitle: "Langkah 2: Tentukan Komponen Penilaian",
      description: "Setelah kelas berhasil dibuat, masuklah ke kelas tersebut (klik 'Kelola Nilai'). Hal pertama yang perlu Anda lakukan adalah mengatur skema nilai:",
      options: [
        {
          title: "➕ Buat Kolom Nilai",
          desc: "Tambahkan komponen nilai yang akan Anda gunakan seperti Tugas, Kuis, UTS, UAS, atau Nilai Praktik."
        },
        {
          title: "⚖️ Atur Persentase Bobot",
          desc: "Masukkan persentase bobot tiap kolom (misal: Tugas 30%, UTS 30%, UAS 40%). Total bobot harus tepat 100%."
        },
        {
          title: "🎯 Tentukan Nilai KKM",
          desc: "Atur Kriteria Ketuntasan Minimal sebagai standar nilai kelulusan siswa pada mata pelajaran ini."
        }
      ],
      tip: "Skema penilaian yang teratur memastikan sistem menghitung nilai akhir siswa secara otomatis, adil, dan proporsional."
    },
    {
      title: "Masukkan Daftar Siswa 👥",
      subtitle: "Langkah 3: Tambahkan Siswa ke Dalam Kelas",
      description: "Anda tidak perlu menginput data siswa berulang kali. Silakan pilih opsi penambahan siswa yang paling praktis:",
      options: [
        {
          title: "👤 Input Manual Cepat",
          desc: "Masukkan Nama Lengkap dan Nomor NISN siswa satu per satu langsung ke dalam form kelas."
        },
        {
          title: "🔗 Hubungkan dengan Rombel Dapodik",
          desc: "Jika Anda telah mengunggah file Dapodik di awal, Anda cukup menautkan rombel kelas ini dengan rombel Dapodik untuk menarik semua nama siswa secara instan."
        },
        {
          title: "📤 Unggah Berkas Siswa CSV/Excel",
          desc: "Gunakan fitur impor siswa dengan mengunduh template spreadsheet kami, isi data siswa Anda, dan upload."
        }
      ],
      tip: "Siswa yang berhasil diinput akan langsung memiliki baris penilaian di tabel kelas."
    },
    {
      title: "Input Nilai & Publikasi Akses Siswa 🌐",
      subtitle: "Langkah 4: Kelola dan Bagikan Hasil Belajar",
      description: "Sekarang semua persiapan telah selesai! Anda bisa melakukan hal-hal berikut untuk pengelolaan nilai sehari-hari:",
      options: [
        {
          title: "✏️ Input Nilai Langsung (Inline Edit)",
          desc: "Klik langsung pada kotak nilai di tabel siswa, ketik nilainya, lalu tekan Enter atau klik di luar untuk menyimpan secara real-time."
        },
        {
          title: "⬇️ Ekspor/Impor Nilai via Excel",
          desc: "Ingin bekerja offline? Unduh format nilai kelas, isi di Excel komputer Anda, lalu unggah kembali untuk sinkronisasi nilai massal."
        },
        {
          title: "🔍 Portal Pencarian Siswa Mandiri",
          desc: "Siswa tidak perlu login ke akun Anda. Mereka dapat mencari nilainya sendiri di halaman utama web menggunakan Nama/NISN secara transparan."
        }
      ],
      tip: "Anda juga dapat mencetak laporan nilai dalam format fisik yang rapi menggunakan fitur cetak laporan kelas."
    }
  ];

  // Jangan render apa pun jika modal sedang ditutup dan bukan kondisi menampilkan tombol bantuan
  if (!isOpen) {
    // Selalu tampilkan tombol bantuan mengambang di pojok kanan bawah dashboard guru
    if (pathname && pathname.startsWith("/guru")) {
      return (
        <button
          onClick={handleResetDismiss}
          className="no-print"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "90px",
            backgroundColor: "var(--primary)",
            color: "#ffffff",
            border: "none",
            borderRadius: "50px",
            padding: "12px 20px",
            fontSize: "0.9rem",
            fontWeight: "600",
            boxShadow: "var(--shadow-lg), 0 0 15px var(--primary-glow)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            zIndex: 99,
            transition: "var(--transition)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.backgroundColor = "var(--primary-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.backgroundColor = "var(--primary)";
          }}
        >
          <span>💡</span> Panduan Memulai {hasNoClasses && <span style={{ width: "8px", height: "8px", backgroundColor: "var(--danger)", borderRadius: "50%", display: "inline-block" }}></span>}
        </button>
      );
    }
    return null;
  }

  const activeStepData = steps[currentStep];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(9, 13, 22, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        padding: "20px",
      }}
      onClick={handleClose}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: "100%",
          maxWidth: "680px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-lg)",
          padding: "32px",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          position: "relative",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "none",
            border: "none",
            fontSize: "1.2rem",
            cursor: "pointer",
            color: "var(--text-muted)",
          }}
          title="Tutup Sementara"
        >
          ✕
        </button>

        {/* Progress Tracker Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: "700",
                color: "var(--primary)",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              Panduan Memulai CekNilai
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600" }}>
              Langkah {currentStep + 1} dari {steps.length}
            </span>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              height: "6px",
              backgroundColor: "var(--bg-tertiary)",
              borderRadius: "3px",
              overflow: "hidden",
              width: "100%",
            }}
          >
            <div
              style={{
                height: "100%",
                backgroundColor: "var(--primary)",
                width: `${((currentStep + 1) / steps.length) * 100}%`,
                transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </div>

          {/* Dots Indicator */}
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "4px" }}>
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                style={{
                  width: idx === currentStep ? "24px" : "8px",
                  height: "8px",
                  borderRadius: "4px",
                  backgroundColor: idx === currentStep ? "var(--primary)" : "var(--border-color)",
                  border: "none",
                  cursor: "pointer",
                  transition: "var(--transition)",
                  padding: 0,
                }}
                title={`Pindah ke langkah ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <h2 style={{ fontSize: "1.6rem", fontWeight: "800", color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              {activeStepData.title}
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "4px", fontWeight: "600" }}>
              {activeStepData.subtitle}
            </p>
          </div>

          <p style={{ fontSize: "0.95rem", color: "var(--text-primary)", lineHeight: "1.6" }}>
            {activeStepData.description}
          </p>

          {/* Step Option Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {activeStepData.options.map((opt, index) => (
              <div
                key={index}
                style={{
                  padding: "14px 18px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-tertiary)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  transition: "var(--transition)",
                }}
              >
                <h4 style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)" }}>
                  {opt.title}
                </h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  {opt.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Helpful Tip Alert */}
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--primary-glow)",
              borderLeft: "4px solid var(--primary)",
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              lineHeight: "1.5",
              display: "flex",
              gap: "10px",
              alignItems: "start",
            }}
          >
            <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>💡</span>
            <div>
              <strong>Tips Praktis:</strong> {activeStepData.tip}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "8px",
            borderTop: "1px solid var(--border-color)",
            paddingTop: "20px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            {hasNoClasses && (
              <button
                onClick={handleDismissPermanently}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: "6px 0",
                }}
                title="Jangan tampilkan panduan otomatis lagi ketika masuk"
              >
                Jangan Tampilkan Lagi
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {currentStep > 0 ? (
              <button
                onClick={handlePrev}
                className="btn btn-secondary"
                style={{ padding: "10px 16px", fontSize: "0.9rem" }}
              >
                ← Kembali
              </button>
            ) : (
              hasNoClasses && (
                <button
                  onClick={handleNavigateToClass}
                  className="btn btn-secondary"
                  style={{ padding: "10px 16px", fontSize: "0.9rem", color: "var(--primary)", borderColor: "var(--primary-glow)" }}
                >
                  Buka Daftar Kelas 🏫
                </button>
              )
            )}

            <button
              onClick={handleNext}
              className="btn btn-primary"
              style={{
                padding: "10px 20px",
                fontSize: "0.9rem",
                fontWeight: "600",
                boxShadow: "var(--shadow-md)",
              }}
            >
              {currentStep < steps.length - 1 ? "Lanjut →" : "Selesai & Mulai! 🎉"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
