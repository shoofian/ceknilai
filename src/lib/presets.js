export const ASPEK_PRESETS = [
  {
    id: "kurikulum-merdeka-standar",
    nama: "📘 Kurikulum Merdeka (Standar 50/50)",
    deskripsi: "50% Sumatif Lingkup Materi (TP) + 50% Sumatif Akhir Semester (SAS)",
    kolomNilai: [
      {
        id: "aspect_tp",
        nama: "Sumatif Lingkup Materi (TP)",
        bobot: 50,
        isGroup: true,
        hitungMetode: "rata-rata",
        subKolom: [
          { id: "tp_1", nama: "TP 1 / Bab 1", bobot: 0 },
          { id: "tp_2", nama: "TP 2 / Bab 2", bobot: 0 },
          { id: "tp_3", nama: "TP 3 / Bab 3", bobot: 0 }
        ]
      },
      {
        id: "aspect_sas",
        nama: "Sumatif Akhir Semester (SAS)",
        bobot: 50,
        isGroup: false,
        subKolom: []
      }
    ]
  },
  {
    id: "kurikulum-merdeka-lengkap",
    nama: "📗 Kurikulum Merdeka (Lengkap + Projek)",
    deskripsi: "30% Formatif & Projek + 30% Sumatif TP + 20% STS + 20% SAS",
    kolomNilai: [
      {
        id: "aspect_projek",
        nama: "Formatif & Projek",
        bobot: 30,
        isGroup: true,
        hitungMetode: "rata-rata",
        subKolom: [
          { id: "prj_1", nama: "Tugas & Unjuk Kerja", bobot: 0 },
          { id: "prj_2", nama: "Projek / Praktik", bobot: 0 }
        ]
      },
      {
        id: "aspect_tp",
        nama: "Sumatif Lingkup Materi (TP)",
        bobot: 30,
        isGroup: true,
        hitungMetode: "rata-rata",
        subKolom: [
          { id: "tp_1", nama: "Sumatif Bab 1", bobot: 0 },
          { id: "tp_2", nama: "Sumatif Bab 2", bobot: 0 }
        ]
      },
      {
        id: "aspect_sts",
        nama: "Sumatif Tengah Semester (STS)",
        bobot: 20,
        isGroup: false,
        subKolom: []
      },
      {
        id: "aspect_sas",
        nama: "Sumatif Akhir Semester (SAS)",
        bobot: 20,
        isGroup: false,
        subKolom: []
      }
    ]
  },
  {
    id: "k13-standar",
    nama: "📙 Kurikulum 2013 (K13 Standar)",
    deskripsi: "40% Nilai Harian (NH) + 30% UTS + 30% UAS",
    kolomNilai: [
      {
        id: "aspect_nh",
        nama: "Nilai Harian (NH)",
        bobot: 40,
        isGroup: true,
        hitungMetode: "rata-rata",
        subKolom: [
          { id: "uh_1", nama: "Ulangan Harian 1", bobot: 0 },
          { id: "uh_2", nama: "Ulangan Harian 2", bobot: 0 },
          { id: "tugas_1", nama: "Tugas 1", bobot: 0 }
        ]
      },
      {
        id: "aspect_uts",
        nama: "Ujian Tengah Semester (UTS)",
        bobot: 30,
        isGroup: false,
        subKolom: []
      },
      {
        id: "aspect_uas",
        nama: "Ujian Akhir Semester (UAS)",
        bobot: 30,
        isGroup: false,
        subKolom: []
      }
    ]
  },
  {
    id: "equal-weight",
    nama: "⚖️ Bobot Rata (3 Komponen Seimbang)",
    deskripsi: "33% Tugas & Harian + 33% UTS + 34% UAS",
    kolomNilai: [
      {
        id: "aspect_tugas",
        nama: "Tugas & Harian",
        bobot: 33,
        isGroup: false,
        subKolom: []
      },
      {
        id: "aspect_uts",
        nama: "UTS",
        bobot: 33,
        isGroup: false,
        subKolom: []
      },
      {
        id: "aspect_uas",
        nama: "UAS",
        bobot: 34,
        isGroup: false,
        subKolom: []
      }
    ]
  }
];
