"use client";

import { useState, useEffect, use, useMemo, Fragment } from "react";
import Modal from '@/components/Modal';
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

export default function DetailKelas({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const classId = params.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [kelas, setKelas] = useState(null);
  
  // State Onboarding
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  
  // States untuk Siswa
  const [siswaModalOpen, setSiswaModalOpen] = useState(false);
  const [isEditingSiswa, setIsEditingSiswa] = useState(false);
  const [oldNisn, setOldNisn] = useState("");
  const [nisn, setNisn] = useState("");
  const [namaSiswa, setNamaSiswa] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [siswaError, setSiswaError] = useState("");

  // States untuk Kolom Nilai
  const [kolomModalOpen, setKolomModalOpen] = useState(false);
  const [newAspects, setNewAspects] = useState([{ id: Date.now(), nama: "", bobot: "" }]);
  const [kolomError, setKolomError] = useState("");
  
  // Status penyimpanan otomatis tabel nilai
  const [saveStatus, setSaveStatus] = useState({}); // { [nisn-colId]: 'idle' | 'saving' | 'saved' }


  // States untuk Rentang Nilai
  const [rangeModalOpen, setRangeModalOpen] = useState(false);
  const [gradeA, setGradeA] = useState(85);
  const [gradeB, setGradeB] = useState(75);
  const [gradeC, setGradeC] = useState(65);
  const [gradeD, setGradeD] = useState(50);
  const [kkm, setKkm] = useState(75);
  // Label status untuk setiap rentang
  const [statusA, setStatusA] = useState('A');
  const [statusB, setStatusB] = useState('B');
  const [statusC, setStatusC] = useState('C');
  const [statusD, setStatusD] = useState('D');


  // States untuk Impor CSV
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewList, setPreviewList] = useState([]);
  const [importing, setImporting] = useState(false);

  // States untuk Catatan Siswa
  const [openCatatan, setOpenCatatan] = useState({}); // { [nisn]: boolean }
  const [catatanDraft, setCatatanDraft] = useState({}); // { [nisn]: string }
  const [savingCatatan, setSavingCatatan] = useState({}); // { [nisn]: boolean }
  const [temporaryScores, setTemporaryScores] = useState({}); // For real-time updates while typing

  // States untuk Fitur Duplikasi Aspek
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [fetchingClasses, setFetchingClasses] = useState(false);

  // States untuk Log Aktifitas Siswa
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedHistorySiswa, setSelectedHistorySiswa] = useState(null);

  const handleOpenHistory = (student) => {
    setSelectedHistorySiswa(student);
    setHistoryModalOpen(true);
  };

  // State tab aktif: 'nilai' | 'ranking' | 'analitik'
  const [activeTab, setActiveTab] = useState('nilai');

  // States untuk Sort Tabel
  const [sortConfig, setSortConfig] = useState({ key: 'nama', direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedStudents = useMemo(() => {
    if (!kelas?.siswa) return [];
    
    // First map with computed final scores
    const mapped = kelas.siswa.map(student => {
      let totalNilaiTerisi = 0;
      let jumlahAspekTerisi = 0;
      
      kelas.kolomNilai.forEach(col => {
        const cellKey = `${student.nisn}-${col.id}`;
        let sc = student.nilai[col.id];
        if (temporaryScores[cellKey] !== undefined) {
          sc = temporaryScores[cellKey] === "" ? null : Number(temporaryScores[cellKey]);
        }
        if (sc !== undefined && sc !== null && sc !== "") {
          totalNilaiTerisi += Number(sc) * (col.bobot / 100);
          jumlahAspekTerisi++;
        }
      });
      return {
        ...student,
        finalScore: totalNilaiTerisi,
        isSelesai: jumlahAspekTerisi === kelas.kolomNilai.length,
        jumlahAspekTerisi
      };
    });

    if (sortConfig.key) {
      mapped.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        // Handle string comparison nicely
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return mapped;
  }, [kelas?.siswa, kelas?.kolomNilai, temporaryScores, sortConfig]);

  // === COMPUTED ANALYTICS & RANKING ===
  const analyticsData = useMemo(() => {
    if (!kelas || !kelas.siswa || kelas.siswa.length === 0 || kelas.kolomNilai.length === 0) return null;

    const skema = kelas.skemaPenilaian || { A: 85, B: 75, C: 65, D: 50, kkm: 75 };
    const kkmVal = skema.kkm ?? 75;

    // Calculate full score for each student
    const studentScores = kelas.siswa.map(student => {
      let total = 0;
      let filledCount = 0;
      kelas.kolomNilai.forEach(col => {
        const sc = student.nilai[col.id];
        if (sc !== undefined && sc !== null && sc !== "") {
          total += Number(sc) * (col.bobot / 100);
          filledCount++;
        }
      });
      const complete = filledCount === kelas.kolomNilai.length;

      let predikat = "-";
      if (complete) {
        if (total >= skema.A) predikat = skema.statusA || "A";
        else if (total >= skema.B) predikat = skema.statusB || "B";
        else if (total >= skema.C) predikat = skema.statusC || "C";
        else predikat = skema.statusD || "D";
      }

      return { ...student, finalScore: parseFloat(total.toFixed(2)), complete, predikat, lulus: complete && total >= kkmVal };
    });

    // Ranking: sort descending by finalScore (only complete)
    const ranked = [...studentScores]
      .sort((a, b) => b.finalScore - a.finalScore)
      .map((s, idx) => ({ ...s, rank: idx + 1 }));

    const completeStudents = studentScores.filter(s => s.complete);
    const classAvg = completeStudents.length > 0
      ? parseFloat((completeStudents.reduce((sum, s) => sum + s.finalScore, 0) / completeStudents.length).toFixed(2))
      : null;
    const highest = completeStudents.length > 0 ? completeStudents.reduce((max, s) => s.finalScore > max.finalScore ? s : max, completeStudents[0]) : null;
    const lowest = completeStudents.length > 0 ? completeStudents.reduce((min, s) => s.finalScore < min.finalScore ? s : min, completeStudents[0]) : null;
    const passCount = completeStudents.filter(s => s.lulus).length;
    const passRate = completeStudents.length > 0 ? Math.round((passCount / completeStudents.length) * 100) : 0;

    // Grade distribution
    const gradeDist = { A: 0, B: 0, C: 0, D: 0 };
    completeStudents.forEach(s => {
      if (s.finalScore >= skema.A) gradeDist.A++;
      else if (s.finalScore >= skema.B) gradeDist.B++;
      else if (s.finalScore >= skema.C) gradeDist.C++;
      else gradeDist.D++;
    });

    // Per-aspect averages
    const aspectAvg = kelas.kolomNilai.map(col => {
      const scores = kelas.siswa
        .map(s => s.nilai[col.id])
        .filter(v => v !== undefined && v !== null && v !== "");
      const avg = scores.length > 0
        ? parseFloat((scores.reduce((a, b) => a + Number(b), 0) / scores.length).toFixed(2))
        : null;
      return { ...col, avg, filled: scores.length };
    });

    return { ranked, classAvg, highest, lowest, passCount, passRate, gradeDist, aspectAvg, completeCount: completeStudents.length, totalCount: kelas.siswa.length, kkmVal };
  }, [kelas?.siswa, kelas?.kolomNilai, kelas?.skemaPenilaian, temporaryScores]);

  const toggleCatatanRow = (studentNisn) => {
    setOpenCatatan(prev => {
      const isOpen = !prev[studentNisn];
      if (isOpen && catatanDraft[studentNisn] === undefined) {
        const student = kelas?.siswa.find(s => s.nisn === studentNisn);
        setCatatanDraft(drafts => ({
          ...drafts,
          [studentNisn]: student?.catatan || ""
        }));
      }
      return { ...prev, [studentNisn]: isOpen };
    });
  };

  const saveCatatan = async (studentNisn) => {
    const draftText = catatanDraft[studentNisn] || "";
    setSavingCatatan(prev => ({ ...prev, [studentNisn]: true }));
    try {
      const response = await fetch(`/api/kelas/${classId}/siswa/${studentNisn}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catatan: draftText })
      });
      if (response.ok) {
        fetchClassDetail();
        // Tutup baris catatan setelah berhasil menyimpan
        setOpenCatatan(prev => ({ ...prev, [studentNisn]: false }));
      } else {
        alert("Gagal menyimpan catatan.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
    } finally {
      setSavingCatatan(prev => ({ ...prev, [studentNisn]: false }));
    }
  };

  const fetchClassDetail = async () => {
    try {
      const response = await fetch(`/api/kelas/${classId}`);
      if (response.ok) {
        const data = await response.json();
        setKelas(data);
// Initialize grade range states from class skemaPenilaian or defaults
        if (data.skemaPenilaian) {
          setGradeA(data.skemaPenilaian.A ?? 85);
          setGradeB(data.skemaPenilaian.B ?? 75);
          setGradeC(data.skemaPenilaian.C ?? 65);
          setGradeD(data.skemaPenilaian.D ?? 50);
          setKkm(data.skemaPenilaian.kkm ?? 75);
          setStatusA(data.skemaPenilaian.statusA ?? 'A');
          setStatusB(data.skemaPenilaian.statusB ?? 'B');
          setStatusC(data.skemaPenilaian.statusC ?? 'C');
          setStatusD(data.skemaPenilaian.statusD ?? 'D');
        }

      } else {
        alert("Gagal memuat detail kelas.");
        router.push("/guru/kelas");
      }
    } catch (err) {
      console.error("Error loading class detail", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassDetail();
  }, [classId]);

  // Efek untuk memunculkan onboarding modal
  useEffect(() => {
    if (kelas && Array.isArray(kelas.siswa) && kelas.siswa.length === 0 && Array.isArray(kelas.kolomNilai) && kelas.kolomNilai.length === 0) {
      const seen = sessionStorage.getItem(`onboarding_seen_${classId}`);
      if (!seen) {
        setOnboardingModalOpen(true);
        sessionStorage.setItem(`onboarding_seen_${classId}`, 'true');
      }
    }
  }, [kelas, classId]);

  // === DYNAMIC WEIGHT COMPUTATIONS ===
  const totalBobot = (kelas ? kelas.kolomNilai.reduce((sum, col) => sum + col.bobot, 0) : 0) + newAspects.filter(a => a.nama.trim() !== "").reduce((sum, a) => sum + (Number(a.bobot) || 0), 0);

  // === HANDLERS SISWA ===
  const handleOpenAddSiswa = () => {
    setIsEditingSiswa(false);
    setNisn("");
    setOldNisn(null);
    setNamaSiswa("");
    setTanggalLahir("");
    setSiswaError("");
    setSiswaModalOpen(true);
  };

  const handleTogglePublish = async () => {
    const newStatus = !kelas.isNilaiAkhirGenerated;
    const confirmMsg = newStatus 
      ? "🚀 Apakah Anda yakin ingin MENAMPILKAN dan MEMPUBLIKASIKAN Nilai Akhir? Siswa akan bisa melihat nilai akhir aktual dan status kelulusan mereka." 
      : "🔒 Apakah Anda yakin ingin MENARIK KEMBALI Nilai Akhir? Nilai akhir akan kembali disembunyikan dari siswa.";
      
    if (confirm(confirmMsg)) {
      try {
        const response = await fetch(`/api/kelas/${classId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isNilaiAkhirGenerated: newStatus }),
        });
        
        if (response.ok) {
           fetchClassDetail();
        } else {
           const data = await response.json();
           alert(data.error || "Gagal mengubah status publikasi.");
        }
      } catch (err) {
        console.error("Toggle publish failed", err);
        alert("Terjadi kesalahan sistem.");
      }
    }
  };

  const handleOpenEditSiswa = (siswa) => {
    setIsEditingSiswa(true);
    setOldNisn(siswa.nisn);
    setNisn(siswa.nisn);
    setNamaSiswa(siswa.nama);
    setTanggalLahir(siswa.tanggalLahir);
    setSiswaError("");
    setSiswaModalOpen(true);
  };

  const handleSiswaSubmit = async (e) => {
    e.preventDefault();
    if (!nisn.trim() || !namaSiswa.trim() || !tanggalLahir) {
      setSiswaError("Semua bidang harus diisi.");
      return;
    }

    try {
      let response;
      if (isEditingSiswa) {
        response = await fetch(`/api/kelas/${classId}/siswa/${oldNisn}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nama: namaSiswa.trim(), tanggalLahir }),
        });
      } else {
        response = await fetch(`/api/kelas/${classId}/siswa`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nisn: nisn.trim(), nama: namaSiswa.trim(), tanggalLahir }),
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal memproses data siswa");
      }

      setSiswaModalOpen(false);
      fetchClassDetail();
    } catch (err) {
      setSiswaError(err.message || "Terjadi kesalahan.");
    }
  };

  const handleDeleteSiswa = async (studentNisn, studentName) => {
    if (confirm(`Apakah Anda yakin ingin menghapus siswa "${studentName}" (NISN: ${studentNisn}) dari kelas ini? Semua nilainya akan terhapus.`)) {
      try {
        const response = await fetch(`/api/kelas/${classId}/siswa/${studentNisn}`, {
          method: "DELETE",
        });
        if (response.ok) {
          fetchClassDetail();
        } else {
          const data = await response.json();
          alert(data.error || "Gagal menghapus siswa.");
        }
      } catch (err) {
        console.error("Delete student failed", err);
      }
    }
  };

  // === HANDLERS KOLOM NILAI ===

  const handleNewAspectChange = (id, field, value) => {
    const updated = newAspects.map(a => a.id === id ? { ...a, [field]: value } : a);
    setNewAspects(updated);

    // Auto-add new empty row if the last row is typed into
    if (id === newAspects[newAspects.length - 1].id && field === "nama" && value.trim() !== "") {
      setNewAspects([...updated, { id: Date.now() + Math.random(), nama: "", bobot: "" }]);
    }
  };
  
  const handleRemoveNewAspect = (id) => {
    if (newAspects.length > 1) {
      setNewAspects(newAspects.filter(a => a.id !== id));
    } else {
      setNewAspects([{ id: Date.now(), nama: "", bobot: "" }]);
    }
  };

  const handleOpenDuplicate = async () => {
    setFetchingClasses(true);
    setDuplicateModalOpen(true);
    try {
      const res = await fetch("/api/kelas");
      if (res.ok) {
        const data = await res.json();
        setAvailableClasses(data.filter(c => c.id !== classId));
      } else {
        alert("Gagal memuat daftar kelas");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
    } finally {
      setFetchingClasses(false);
    }
  };

  const handleDuplicateFromClass = (sourceClass) => {
    if (confirm(`⚠️ PERHATIAN!\nApakah Anda yakin ingin menyalin aspek dari kelas "${sourceClass.nama}"?\nAspek penilaian yang ada di tabel saat ini akan TERHAPUS dan tertiban (overwrite) dengan yang baru.`)) {
      const copiedColumns = sourceClass.kolomNilai.map(col => ({
        ...col,
        id: 'col-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5)
      }));
      setKelas({ ...kelas, kolomNilai: copiedColumns });
      setNewAspects([{ id: Date.now(), nama: "", bobot: "" }]); // Bersihkan newAspects
      setDuplicateModalOpen(false);
    }
  };

  const handleDeleteKolom = async (colId, colName) => {
    if (confirm(`⚠️ PERINGATAN!\nApakah Anda yakin ingin menghapus kolom nilai "${colName}"?\nSemua nilai siswa pada aspek ini akan DIHAPUS secara permanen!`)) {
      try {
        const response = await fetch(`/api/kelas/${classId}/kolom?id=${colId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          fetchClassDetail();
        } else {
          const data = await response.json();
          alert(data.error || "Gagal menghapus kolom.");
        }
      } catch (err) {
        console.error("Delete column failed", err);
      }
    }
  };

  // Save grade range and KKM configuration
  const handleSaveRange = async () => {
    // Validate grade ordering
    if (gradeA < gradeB || gradeB < gradeC || gradeC < gradeD) {
      alert('Pastikan nilai A ≥ B ≥ C ≥ D.');
      return;
    }
    try {
      const payload = {
        skemaPenilaian: {
          A: gradeA,
          B: gradeB,
          C: gradeC,
          D: gradeD,
          kkm: kkm,
          statusA: statusA.trim() || 'A',
          statusB: statusB.trim() || 'B',
          statusC: statusC.trim() || 'C',
          statusD: statusD.trim() || 'D',
        },
      };
      const response = await fetch(`/api/kelas/${classId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyimpan skema penilaian');
      }
      alert('Skema penilaian berhasil disimpan!');
      setRangeModalOpen(false);
      fetchClassDetail();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Terjadi kesalahan saat menyimpan skema penilaian.');
    }
  };


  // === BATCH UPDATE BOBOT PERSENTASE ===
  const handleBobotChange = (colId, value) => {
    const updatedKolom = kelas.kolomNilai.map(col => {
      if (col.id === colId) {
        return { ...col, bobot: Number(value) };
      }
      return col;
    });
    setKelas({ ...kelas, kolomNilai: updatedKolom });
  };

  const handleColumnNameChange = (colId, value) => {
    const updatedKolom = kelas.kolomNilai.map(col => {
      if (col.id === colId) {
        return { ...col, nama: value };
      }
      return col;
    });
    setKelas({ ...kelas, kolomNilai: updatedKolom });
  };

  const saveAllBobot = async () => {
    if (totalBobot !== 100) {
      alert(`⚠️ Peringatan: Total bobot persentase saat ini adalah ${totalBobot}%. Agar penghitungan nilai akhir siswa akurat, pastikan totalnya pas 100%.`);
    }

    try {
      // Buat aspek-aspek baru terlebih dahulu
      const validNewAspects = newAspects.filter(a => a.nama.trim() !== "");
      let updatedKolomNilai = [...kelas.kolomNilai]; // Salin state lama

      for (const aspect of validNewAspects) {
        const res = await fetch(`/api/kelas/${classId}/kolom`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nama: aspect.nama.trim(), bobot: Number(aspect.bobot) || 0 }),
        });
        if (!res.ok) {
           const data = await res.json();
           throw new Error(data.error || "Gagal membuat aspek baru");
        }
        const data = await res.json();
        updatedKolomNilai.push(data.kolom); // Masukkan aspek yang baru dibuat ke daftar sinkronisasi
      }

      // Perbarui seluruh konfigurasi secara massal
      const response = await fetch(`/api/kelas/${classId}/kolom`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kolomNilai: updatedKolomNilai }),
      });

      if (response.ok) {
        alert("✅ Perubahan kolom nilai dan bobot persentase berhasil disimpan!");
        setNewAspects([{ id: Date.now(), nama: "", bobot: "" }]); // Reset form tambah
        fetchClassDetail();
      } else {
        const data = await response.json();
        alert(data.error || "Gagal memperbarui bobot.");
      }
    } catch (err) {
      console.error("Update weights failed", err);
      alert(err.message || "Gagal menyimpan.");
    }
  };

  // === SPREADSHEET AUTO SAVE ON BLUR ===
  const handleGradeBlur = async (studentNisn, colId, value) => {
    const key = `${studentNisn}-${colId}`;
    
    // Jangan lakukan apa-apa jika nilainya kosong dan awalnya memang kosong
    const student = kelas.siswa.find(s => s.nisn === studentNisn);
    const originalValue = student.nilai[colId];
    
    const parsedValue = value === "" ? null : Number(value);
    
    if (parsedValue === originalValue) {
      setTemporaryScores(prev => { const next = { ...prev }; delete next[key]; return next; });
      return;
    }

    if (parsedValue !== null && (isNaN(parsedValue) || parsedValue < 0 || parsedValue > 100)) {
      alert("Nilai harus berupa angka di antara 0 sampai 100!");
      return;
    }

    setSaveStatus(prev => ({ ...prev, [key]: "saving" }));

    try {
      const response = await fetch(`/api/kelas/${classId}/siswa/${studentNisn}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nilai: {
            [colId]: parsedValue
          }
        }),
      });

      if (response.ok) {
        setSaveStatus(prev => ({ ...prev, [key]: "saved" }));
        
        // Perbarui state lokal nilai siswa secara langsung agar nilai akhir terhitung otomatis tanpa re-fetch lambat
        const updatedSiswa = kelas.siswa.map(s => {
          if (s.nisn === studentNisn) {
            return {
              ...s,
              nilai: {
                ...s.nilai,
                [colId]: parsedValue
              }
            };
          }
          return s;
        });
        setKelas({ ...kelas, siswa: updatedSiswa });

        setTemporaryScores(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });

        // Kembalikan ke status idle setelah 1.5 detik
        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, [key]: "idle" }));
        }, 1500);
      } else {
        setSaveStatus(prev => ({ ...prev, [key]: "failed" }));
      }
    } catch (err) {
      console.error("Grade update failed", err);
      setSaveStatus(prev => ({ ...prev, [key]: "failed" }));
    }
  };

  // === DYNAMIC EXCEL TEMPLATE EXPORTER ===
  const downloadExcelTemplate = () => {
    // Susun header
    const headers = ["NISN", "Nama", "Tanggal Lahir (YYYY-MM-DD)"];
    kelas.kolomNilai.forEach(col => {
      headers.push(`${col.nama} (${col.bobot}%)`);
    });
    headers.push("Nilai Akhir");
    headers.push("Predikat");
    
    // Susun baris berdasarkan siswa yang sudah ada
    const rows = [headers];
    if (kelas.siswa.length > 0) {
      kelas.siswa.forEach(siswa => {
        const row = [siswa.nisn, siswa.nama, siswa.tanggalLahir];
        let totalNilaiTerisi = 0;
        kelas.kolomNilai.forEach(col => {
          const val = siswa.nilai[col.id];
          row.push(val !== null && val !== undefined ? val : "");
          if (val !== null && val !== undefined && val !== "") {
            totalNilaiTerisi += Number(val) * (col.bobot / 100);
          }
        });
        
        row.push(Number(totalNilaiTerisi.toFixed(2)));
        
        // Calculate predikat
        const A = gradeA || 85;
        const B = gradeB || 75;
        const C = gradeC || 65;
        let predikat = statusD || 'D';
        if (totalNilaiTerisi >= A) predikat = statusA || 'A';
        else if (totalNilaiTerisi >= B) predikat = statusB || 'B';
        else if (totalNilaiTerisi >= C) predikat = statusC || 'C';
        
        row.push(predikat);
        rows.push(row);
      });
    } else {
      // Row contoh jika kelas masih kosong
      const placeholder = ["1234567890", "Aditya Pratama", "2010-01-15"];
      kelas.kolomNilai.forEach(() => placeholder.push(""));
      placeholder.push(""); // Nilai Akhir
      placeholder.push(""); // Predikat
      rows.push(placeholder);
    }
    
    const ws = XLSX.utils.aoa_to_sheet(rows);
    
    // Atur lebar kolom agar rapi dan tidak terpotong (wch = width in characters)
    ws['!cols'] = [
      { wch: 18 }, // NISN
      { wch: 28 }, // Nama
      { wch: 25 }, // Tanggal Lahir
      ...kelas.kolomNilai.map(() => ({ wch: 16 })), // Kolom-kolom aspek nilai
      { wch: 14 }, // Nilai Akhir
      { wch: 18 }  // Predikat
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daftar Nilai Siswa");
    
    XLSX.writeFile(wb, `Ekspor_Nilai_${kelas.nama.replace(/\s+/g, "_")}.xlsx`);
  };
 
  // === DYNAMIC EXCEL PARSER ===
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert worksheet to a 2D array (header: 1 returns array of arrays, defval: "" to handle empty cells)
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        
        if (rows.length === 0) {
          alert("Berkas Excel kosong!");
          return;
        }
        
        // Parse header
        const headers = rows[0].map(h => String(h).trim());
        const nisnIdx = headers.indexOf("NISN");
        const namaIdx = headers.indexOf("Nama");
        const tglIdx = headers.indexOf("Tanggal Lahir (YYYY-MM-DD)");
        
        if (nisnIdx === -1 || namaIdx === -1 || tglIdx === -1) {
          alert("Format berkas Excel tidak valid! Harus mempunyai kolom header: NISN, Nama, Tanggal Lahir (YYYY-MM-DD)");
          return;
        }
        
        const parsedSiswa = [];
        
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i];
          if (!cols || cols.length === 0 || !cols[nisnIdx]) continue;
          
          const nisnVal = String(cols[nisnIdx]).trim();
          const namaVal = String(cols[namaIdx]).trim();
          const tglVal = String(cols[tglIdx]).trim();
          
          if (!nisnVal || !namaVal || !tglVal) continue;
          
          const nilaiObj = {};
          kelas.kolomNilai.forEach(col => {
            const headerCol = headers.find(h => h === col.nama || h.startsWith(`${col.nama} (`));
            const colIdx = headerCol ? headers.indexOf(headerCol) : -1;
            
            if (colIdx !== -1 && cols[colIdx] !== "" && cols[colIdx] !== undefined && cols[colIdx] !== null) {
              const parsedVal = Number(cols[colIdx]);
              nilaiObj[col.nama] = isNaN(parsedVal) ? null : parsedVal;
            } else {
              nilaiObj[col.nama] = null;
            }
          });
          
          parsedSiswa.push({
            nisn: nisnVal,
            nama: namaVal,
            tanggalLahir: tglVal,
            nilai: nilaiObj
          });
        }
        
        if (parsedSiswa.length === 0) {
          alert("Tidak ada data siswa yang berhasil di-parse!");
          return;
        }
        
        setPreviewList(parsedSiswa);
        setPreviewModalOpen(true);
        
        // Reset file input agar bisa upload file yang sama lagi jika butuh
        e.target.value = null;
      } catch (parseError) {
        console.error(parseError);
        alert("Gagal membaca file Excel. Pastikan format file benar.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    setImporting(true);
    try {
      const response = await fetch(`/api/kelas/${classId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siswaList: previewList }),
      });
      
      const data = await response.json();
      if (response.ok) {
        alert(data.message || "Impor data berhasil!");
        setPreviewModalOpen(false);
        fetchClassDetail();
      } else {
        alert(data.error || "Gagal mengimpor data.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan koneksi server saat mengimpor.");
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="spinner" style={{ width: "30px", height: "30px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
      </div>
    );
  }

  return (
    <>
      <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "40px" }}>
      
      {/* Breadcrumbs */}
      <div style={{ display: "flex", gap: "8px", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "500" }}>
        <Link href="/guru/kelas">📚 Daftar Kelas</Link>
        <span>/</span>
        <span style={{ color: "var(--text-primary)" }}>{kelas.nama}</span>
      </div>

      {/* Main Header Card */}
      <div className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px", borderLeft: "5px solid var(--primary)" }}>
        <div style={{ flex: "1 1 min-content" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", lineHeight: "1.2" }}>
            {kelas.nama}
            {kelas.isNilaiAkhirGenerated ? (
              <span className="badge badge-success" style={{ fontSize: "0.75rem", padding: "4px 8px" }}>🚀 NILAI AKHIR PUBLIK</span>
            ) : (
              <span className="badge badge-warning" style={{ fontSize: "0.75rem", padding: "4px 8px" }}>🔒 NILAI AKHIR DRAFT</span>
            )}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
            <p style={{ color: "var(--text-secondary)", margin: 0, fontWeight: "500", fontSize: "0.9rem" }}>
              {kelas.mataPelajaran} &bull; {kelas.tahunAjaran} ({kelas.semester || "Ganjil"}) &bull; {kelas.siswa.length} Siswa
            </p>
            <div style={{ padding: "4px 10px", backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", fontWeight: "600" }}>
              <span>Kode Kelas: <span style={{ fontFamily: "monospace", color: "var(--primary)" }}>{kelas.id}</span></span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(kelas.id);
                  alert("Kode Kelas disalin!");
                }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", padding: "2px" }}
                title="Salin Kode Kelas"
              >
                📋
              </button>
            </div>
          </div>
        </div>

        {/* Weights overview */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", flex: "0 0 auto" }}>
          <div style={{ textAlign: "right", backgroundColor: "var(--bg-tertiary)", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "700" }}>TOTAL PERSENTASE BOBOT</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end", marginTop: "4px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "1.5rem", fontWeight: "800", color: totalBobot === 100 ? "var(--success)" : "var(--warning)", lineHeight: "1" }}>
                {totalBobot}%
              </span>
              <span className={`badge ${totalBobot === 100 ? "badge-success" : "badge-warning"}`} style={{ fontSize: "0.65rem" }}>
                {totalBobot === 100 ? "Lengkap" : "Harus 100%"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Aspek Penilaian Belum Diatur */}
      {kelas.kolomNilai.length === 0 && (
        <div style={{
          padding: "24px",
          borderRadius: "var(--radius-sm)",
          backgroundColor: "var(--warning-glow)",
          border: "1px dashed rgba(245, 158, 11, 0.3)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          boxShadow: "0 4px 12px rgba(245, 158, 11, 0.05)"
        }} className="animate-fade-in">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "1.6rem", display: "flex", alignItems: "center" }}>⚠️</span>
            <div>
              <h4 style={{ fontSize: "1.05rem", fontWeight: "800", color: "var(--warning)" }}>
                Aspek Penilaian Belum Dikonfigurasi
              </h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                Kelas ini belum memiliki aspek atau kolom nilai (seperti UTS, UAS, Tugas) sehingga penilaian belum dapat diisi.
              </p>
            </div>
          </div>
          
          <div style={{ height: "1px", backgroundColor: "rgba(245, 158, 11, 0.15)", margin: "4px 0" }}></div>
          
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>
              💡 <strong>Langkah cepat:</strong> Gunakan tombol "Atur Aspek & Bobot Nilai" di bagian bawah untuk menambahkan kolom aspek baru.
            </span>
            <button
              onClick={() => {
                setKolomModalOpen(true);
                const configCard = document.getElementById("konfigurasi-kelas");
                if (configCard) {
                  configCard.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="btn"
              style={{
                padding: "8px 18px",
                fontSize: "0.85rem",
                backgroundColor: "var(--warning)",
                color: "#ffffff",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(245, 158, 11, 0.2)"
              }}
            >
              ⚙️ Mulai Atur Aspek Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-secondary)", padding: "4px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", width: "fit-content" }}>
        {[{ id: "nilai", label: "📊 Buku Nilai" }, { id: "ranking", label: "🏆 Peringkat" }, { id: "analitik", label: "📈 Analitik" }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="btn"
            style={{
              padding: "8px 18px",
              fontSize: "0.85rem",
              fontWeight: "700",
              borderRadius: "var(--radius-sm)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
              backgroundColor: activeTab === tab.id ? "var(--primary)" : "transparent",
              color: activeTab === tab.id ? "#ffffff" : "var(--text-secondary)",
              boxShadow: activeTab === tab.id ? "0 2px 8px rgba(59,130,246,0.35)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============= RANKING TAB ============= */}
      {activeTab === "ranking" && (
        <div className="glass-card animate-fade-in" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px 16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h4 style={{ fontSize: "1.25rem", fontWeight: "800" }}>🏆 Peringkat Siswa</h4>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>Urutan berdasarkan nilai akhir tertinggi. Hanya siswa dengan semua aspek terisi yang diperingkatkan.</p>
            </div>
          </div>
          {!analyticsData ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Tambah siswa dan aspek nilai terlebih dahulu untuk melihat peringkat.</div>
          ) : (
            <div className="table-container" style={{ margin: 0, borderRadius: 0, borderLeft: "none", borderRight: "none" }}>
              <table className="premium-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: "60px", textAlign: "center" }}>Rank</th>
                    <th>Nama Siswa</th>
                    <th style={{ textAlign: "center" }}>NISN</th>
                    <th style={{ textAlign: "center" }}>Nilai Akhir</th>
                    <th style={{ textAlign: "center" }}>Predikat</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.ranked.map((s) => (
                    <tr key={s.nisn} style={{ backgroundColor: s.rank === 1 ? "rgba(234,179,8,0.06)" : s.rank === 2 ? "rgba(148,163,184,0.05)" : s.rank === 3 ? "rgba(180,83,9,0.05)" : "" }}>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontWeight: "900", fontSize: "1.1rem", color: s.rank === 1 ? "#eab308" : s.rank === 2 ? "#94a3b8" : s.rank === 3 ? "#b45309" : "var(--text-muted)" }}>
                          {s.rank === 1 ? "🥇" : s.rank === 2 ? "🥈" : s.rank === 3 ? "🥉" : `#${s.rank}`}
                        </span>
                      </td>
                      <td style={{ fontWeight: "700" }}>{s.nama}</td>
                      <td style={{ textAlign: "center", fontFamily: "monospace", fontSize: "0.85rem" }}>{s.nisn}</td>
                      <td style={{ textAlign: "center" }}>
                        {s.complete ? (
                          <span style={{ fontWeight: "800", fontSize: "1.1rem", color: s.finalScore >= analyticsData.kkmVal ? "var(--success)" : "var(--danger)" }}>{s.finalScore}</span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontStyle: "italic" }}>Belum Lengkap</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`badge ${s.predikat === (kelas.skemaPenilaian?.statusA || "A") || s.predikat === (kelas.skemaPenilaian?.statusB || "B") ? "badge-success" : s.predikat === (kelas.skemaPenilaian?.statusC || "C") ? "badge-warning" : "badge-danger"}`} style={{ fontSize: "0.7rem" }}>
                          {s.predikat}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {s.complete ? (
                          <span className={`badge ${s.lulus ? "badge-success" : "badge-danger"}`} style={{ fontSize: "0.7rem" }}>{s.lulus ? "LULUS" : "TIDAK LULUS"}</span>
                        ) : (
                          <span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>–</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============= ANALITIK TAB ============= */}
      {activeTab === "analitik" && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {!analyticsData ? (
            <div className="glass-card" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Tambah siswa dan aspek nilai terlebih dahulu untuk melihat analitik.</div>
          ) : (
            <>
              {/* Stat Cards Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px" }}>
                {[{
                  label: "Rata-rata Kelas", value: analyticsData.classAvg !== null ? analyticsData.classAvg : "–", icon: "📊",
                  color: "var(--primary)", sub: `dari ${analyticsData.completeCount} siswa lengkap`
                }, {
                  label: "Persentase Lulus", value: `${analyticsData.passRate}%`, icon: "✅",
                  color: analyticsData.passRate >= 75 ? "var(--success)" : "var(--warning)", sub: `${analyticsData.passCount} dari ${analyticsData.completeCount} siswa`
                }, {
                  label: "Nilai Tertinggi", value: analyticsData.highest?.finalScore ?? "–", icon: "🏆",
                  color: "#eab308", sub: analyticsData.highest?.nama ?? ""
                }, {
                  label: "Nilai Terendah", value: analyticsData.lowest?.finalScore ?? "–", icon: "📉",
                  color: "var(--danger)", sub: analyticsData.lowest?.nama ?? ""
                }, {
                  label: "Total Siswa", value: analyticsData.totalCount, icon: "👥",
                  color: "var(--text-secondary)", sub: `${analyticsData.completeCount} nilai lengkap`
                }].map((card, i) => (
                  <div key={i} className="glass-card" style={{ textAlign: "center", padding: "20px 16px" }}>
                    <div style={{ fontSize: "1.8rem", marginBottom: "6px" }}>{card.icon}</div>
                    <div style={{ fontSize: "1.7rem", fontWeight: "900", color: card.color, lineHeight: 1 }}>{card.value}</div>
                    <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", marginTop: "6px", textTransform: "uppercase" }}>{card.label}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>{card.sub}</div>
                  </div>
                ))}
              </div>

              {/* Grade Distribution + Aspect Averages */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>

                {/* Grade Distribution */}
                <div className="glass-card">
                  <h5 style={{ fontSize: "1rem", fontWeight: "800", marginBottom: "16px" }}>📊 Distribusi Predikat</h5>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {[{ label: "Predikat A", key: "A", color: "#3b82f6" },
                      { label: "Predikat B", key: "B", color: "#10b981" },
                      { label: "Predikat C", key: "C", color: "#f59e0b" },
                      { label: "Predikat D", key: "D", color: "#ef4444" }].map(g => {
                        const count = analyticsData.gradeDist[g.key];
                        const pct = analyticsData.completeCount > 0 ? Math.round((count / analyticsData.completeCount) * 100) : 0;
                        return (
                          <div key={g.key}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "var(--text-secondary)" }}>{g.label} <span style={{ color: g.color }}>({kelas.skemaPenilaian?.[`status${g.key}`] || g.key})</span></span>
                              <span style={{ fontSize: "0.82rem", fontWeight: "800" }}>{count} siswa <span style={{ color: "var(--text-muted)" }}>({pct}%)</span></span>
                            </div>
                            <div style={{ height: "8px", backgroundColor: "var(--bg-tertiary)", borderRadius: "99px", overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", backgroundColor: g.color, borderRadius: "99px", transition: "width 0.6s ease" }} />
                            </div>
                          </div>
                        );
                    })}
                    {analyticsData.completeCount === 0 && <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Belum ada nilai lengkap.</p>}
                  </div>
                </div>

                {/* Per-Aspect Averages */}
                <div className="glass-card">
                  <h5 style={{ fontSize: "1rem", fontWeight: "800", marginBottom: "16px" }}>🎯 Rata-rata per Aspek</h5>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {analyticsData.aspectAvg.map((col) => {
                      const pct = col.avg !== null ? Math.min(col.avg, 100) : 0;
                      const isGood = col.avg !== null && col.avg >= analyticsData.kkmVal;
                      return (
                        <div key={col.id}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "var(--text-secondary)" }}>{col.nama} <span style={{ color: "var(--text-muted)", fontWeight: "500" }}>({col.bobot}%)</span></span>
                            <span style={{ fontSize: "0.82rem", fontWeight: "800", color: col.avg !== null ? (isGood ? "var(--success)" : "var(--danger)") : "var(--text-muted)" }}>
                              {col.avg !== null ? col.avg : "–"} <span style={{ fontWeight: "500", color: "var(--text-muted)" }}>({col.filled}/{analyticsData.totalCount})</span>
                            </span>
                          </div>
                          <div style={{ height: "8px", backgroundColor: "var(--bg-tertiary)", borderRadius: "99px", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", backgroundColor: isGood ? "var(--success)" : col.avg !== null ? "var(--danger)" : "transparent", borderRadius: "99px", transition: "width 0.6s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                    {analyticsData.aspectAvg.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Belum ada aspek nilai.</p>}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============= NILAI TAB (existing gradebook) ============= */}
      {activeTab !== "nilai" ? null : (
      <>
      {/* Table: Main Spreadsheet Gradebook */}
      <div className="glass-card" style={{ padding: "20px 0", overflow: "hidden" }}>
        
        <div style={{ padding: "0 24px 16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h4 style={{ fontSize: "1.25rem", fontWeight: "800" }}>📊 Buku Nilai Kelas</h4>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Ketikkan nilai langsung pada tabel. Nilai akan <strong>terkunci secara otomatis</strong> saat kursor berpindah (blur).
            </p>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--success)" }}></span>
            <span>Auto-saving diaktifkan</span>
          </div>
        </div>

        {kelas.siswa.length > 0 ? (
          <div className="table-container" style={{ margin: 0, borderRadius: 0, borderRight: "none", borderLeft: "none", maxHeight: "70vh", overflowY: "auto", overflowX: "auto" }}>
            <table className="premium-table" style={{ width: "100%", minWidth: "800px" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 20 }}>
                <tr>
                  <th style={{ width: "140px", minWidth: "140px", cursor: "pointer", userSelect: "none", position: "sticky", top: 0, backgroundColor: "var(--bg-tertiary)", zIndex: 21 }} onClick={() => handleSort('nisn')}>
                    NISN {sortConfig.key === 'nisn' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                  <th className="sticky-nama" style={{ width: "240px", minWidth: "240px", position: "sticky", left: 0, top: 0, zIndex: 22, backgroundColor: "var(--bg-tertiary)", boxShadow: "4px 0 8px rgba(0,0,0,0.05)", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort('nama')}>
                    Nama Siswa {sortConfig.key === 'nama' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                  <th style={{ width: "140px", minWidth: "140px", position: "sticky", top: 0, backgroundColor: "var(--bg-tertiary)", zIndex: 21 }}>Tanggal Lahir</th>
                  
                  {/* Dynamic Headers based on columns */}
                  {kelas.kolomNilai.map(col => (
                    <th key={col.id} style={{ textAlign: "center", minWidth: "100px", position: "sticky", top: 0, backgroundColor: "var(--bg-tertiary)", zIndex: 21 }}>
                      {col.nama} ({col.bobot}%)
                    </th>
                  ))}

                  <th style={{ textAlign: "center", width: "140px", backgroundColor: "var(--bg-tertiary)", cursor: "pointer", userSelect: "none", position: "sticky", top: 0, zIndex: 21 }} onClick={() => handleSort('finalScore')}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
                      <span>N. AKHIR {sortConfig.key === 'finalScore' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
                      <button 
                        onClick={handleTogglePublish}
                        className={`btn ${kelas.isNilaiAkhirGenerated ? "btn-secondary" : "btn-primary"}`}
                        style={{ 
                          padding: "4px 8px", 
                          fontSize: "0.65rem",
                          borderColor: kelas.isNilaiAkhirGenerated ? "var(--border-color)" : "transparent",
                          color: kelas.isNilaiAkhirGenerated ? "var(--text-primary)" : "#fff",
                          width: "100%",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {kelas.isNilaiAkhirGenerated ? "🔒 Batalkan" : "🚀 Tampilkan"}
                      </button>
                    </div>
                  </th>
                  <th style={{ textAlign: "center", width: "80px", position: "sticky", top: 0, backgroundColor: "var(--bg-tertiary)", zIndex: 21 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((student) => {
                  
                  // Nilai akhir sudah dihitung di useMemo
                  const finalScore = student.finalScore;
                  const isSelesai = student.isSelesai;
                  const jumlahAspekTerisi = student.jumlahAspekTerisi;

                  return (
                    <Fragment key={student.nisn}>
                      <tr>
                        <td style={{ width: "140px", minWidth: "140px", fontFamily: "monospace", fontSize: "0.85rem", fontWeight: "600" }}>
                          {student.nisn}
                        </td>
                        <td className="sticky-nama" style={{ width: "240px", minWidth: "240px", fontWeight: "700", position: "sticky", left: 0, zIndex: 5, backgroundColor: "var(--bg-secondary)", boxShadow: "4px 0 8px rgba(0,0,0,0.05)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>{student.nama}</span>
                            <button
                              onClick={() => toggleCatatanRow(student.nisn)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "2px",
                                fontSize: "0.95rem",
                                display: "inline-flex",
                                alignItems: "center",
                                opacity: student.catatan ? 1 : 0.4,
                                transition: "opacity 0.2s ease"
                              }}
                              title={student.catatan ? "Lihat/Edit Keterangan Tambahan" : "Tambah Keterangan Tambahan"}
                            >
                              💬
                            </button>
                            {student.catatan && (
                              <span 
                                style={{ 
                                  width: "6px", 
                                  height: "6px", 
                                  borderRadius: "50%", 
                                  backgroundColor: "var(--success)", 
                                  display: "inline-block" 
                                }}
                                title="Ada keterangan tambahan"
                              ></span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          {student.tanggalLahir}
                        </td>

                        {/* Dynamic Inputs for Grades */}
                        {kelas.kolomNilai.map(col => {
                          const cellKey = `${student.nisn}-${col.id}`;
                          const currentStatus = saveStatus[cellKey] || "idle";

                          return (
                            <td key={col.id} style={{ textAlign: "center", position: "relative" }}>
                              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", position: "relative", width: "80px" }}>
                                <input
                                  id={`grade-${student.nisn}-${col.id}`}
                                  type="number"
                                  value={temporaryScores[cellKey] !== undefined ? temporaryScores[cellKey] : (student.nilai[col.id] !== null && student.nilai[col.id] !== undefined ? student.nilai[col.id] : "")}
                                  onChange={(e) => setTemporaryScores(prev => ({ ...prev, [cellKey]: e.target.value }))}
                                  onBlur={(e) => handleGradeBlur(student.nisn, col.id, e.target.value)}
                                  onWheel={(e) => e.target.blur()}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleGradeBlur(student.nisn, col.id, e.target.value);
                                      const currentRowIdx = sortedStudents.findIndex(s => s.nisn === student.nisn);
                                      const nextStudent = sortedStudents[currentRowIdx + 1];
                                      if (nextStudent) {
                                        const nextInput = document.getElementById(`grade-${nextStudent.nisn}-${col.id}`);
                                        if (nextInput) {
                                          nextInput.focus();
                                          nextInput.select();
                                        }
                                      }
                                    }
                                  }}
                                  className="form-input"
                                  style={{
                                    padding: "6px 8px",
                                    fontSize: "0.85rem",
                                    textAlign: "center",
                                    border: currentStatus === "saved" 
                                      ? "1px solid var(--success)" 
                                      : currentStatus === "saving"
                                        ? "1px solid var(--primary)" 
                                        : currentStatus === "failed"
                                          ? "1px solid var(--danger)"
                                          : "1px solid var(--border-color)",
                                    backgroundColor: currentStatus === "saving" ? "rgba(59,130,246,0.05)" : "var(--bg-secondary)",
                                    transition: "all 0.15s ease"
                                  }}
                                  placeholder="-"
                                  min={0}
                                  max={100}
                                />

                                {/* Small status dots for auto-saving indicator */}
                                {currentStatus === "saving" && (
                                  <span style={{ position: "absolute", right: "-12px", width: "6px", height: "6px", backgroundColor: "var(--primary)", borderRadius: "50%", display: "inline-block", animation: "pulse 0.6s infinite" }} title="Menyimpan..."></span>
                                )}
                                {currentStatus === "saved" && (
                                  <span style={{ position: "absolute", right: "-12px", width: "6px", height: "6px", backgroundColor: "var(--success)", borderRadius: "50%", display: "inline-block" }} title="Tersimpan!"></span>
                                )}
                                {currentStatus === "failed" && (
                                  <span style={{ position: "absolute", right: "-12px", width: "6px", height: "6px", backgroundColor: "var(--danger)", borderRadius: "50%", display: "inline-block" }} title="Gagal Menyimpan"></span>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Weighted Final Score */}
                        <td style={{ textAlign: "center", fontWeight: "800", color: kelas.isNilaiAkhirGenerated ? "var(--primary)" : "var(--text-muted)", backgroundColor: "rgba(59,130,246,0.02)", padding: "10px 12px" }}>
                          {kelas.isNilaiAkhirGenerated ? (
                            <div>
                              {finalScore.toFixed(2)}
                              {!isSelesai && kelas.kolomNilai.length > 0 && (
                                <div style={{ fontSize: "0.62rem", color: "var(--text-secondary)", fontWeight: "600", marginTop: "2px", opacity: 0.8 }} title="Nilai kumulatif terisi">
                                  Aktual ({jumlahAspekTerisi}/{kelas.kolomNilai.length})
                                </div>
                              )}
                            </div>
                          ) : (
                            <div title="Belum ditampilkan" style={{ fontSize: "1.2rem" }}>🔒</div>
                          )}
                        </td>

                        {/* Row actions */}
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <div style={{ position: "relative" }}>
                              <button onClick={() => handleOpenHistory(student)} className="btn btn-secondary" style={{ padding: "6px 8px", fontSize: "0.75rem", opacity: (student.nilai && student.nilai._login_history && student.nilai._login_history.length > 0) ? 1 : 0.5 }} title="Lihat Riwayat Akses Siswa">
                                👁️
                              </button>
                              {student.nilai && student.nilai._login_history && student.nilai._login_history.length > 0 && (
                                <span style={{ position: "absolute", top: "-2px", right: "-2px", width: "8px", height: "8px", backgroundColor: "var(--success)", borderRadius: "50%", border: "1px solid var(--bg-primary)" }} title="Siswa sudah pernah melihat nilainya"></span>
                              )}
                            </div>
                            <button onClick={() => handleOpenEditSiswa(student)} className="btn btn-secondary" style={{ padding: "6px 8px", fontSize: "0.75rem" }} title="Edit Profil Siswa">
                              ✏️
                            </button>
                            <button onClick={() => handleDeleteSiswa(student.nisn, student.nama)} className="btn btn-secondary" style={{ padding: "6px 8px", fontSize: "0.75rem", color: "var(--danger)" }} title="Hapus Siswa">
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                      {openCatatan[student.nisn] && (
                        <tr style={{ backgroundColor: "rgba(59,130,246,0.02)" }}>
                          <td colSpan={5 + kelas.kolomNilai.length} style={{ padding: "12px 24px", borderBottom: "1px solid var(--border-color)" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "600px" }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                📝 Keterangan Tambahan / Catatan untuk {student.nama}
                              </label>
                              <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                                <textarea
                                  className="form-input"
                                  placeholder="Tulis bimbingan akademik, keterangan ketidakhadiran, atau umpan balik lainnya di sini..."
                                  value={catatanDraft[student.nisn] !== undefined ? catatanDraft[student.nisn] : (student.catatan || "")}
                                  onChange={(e) => setCatatanDraft({ ...catatanDraft, [student.nisn]: e.target.value })}
                                  rows={2}
                                  style={{ padding: "8px 12px", fontSize: "0.85rem", resize: "vertical", width: "100%", minHeight: "50px", margin: 0 }}
                                />
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button
                                    onClick={() => saveCatatan(student.nisn)}
                                    className="btn btn-primary"
                                    disabled={savingCatatan[student.nisn]}
                                    style={{ padding: "6px 12px", fontSize: "0.8rem", whiteSpace: "nowrap" }}
                                  >
                                    {savingCatatan[student.nisn] ? "Menyimpan..." : "💾 Simpan"}
                                  </button>
                                  <button
                                    onClick={() => setOpenCatatan({ ...openCatatan, [student.nisn]: false })}
                                    className="btn btn-secondary"
                                    style={{ padding: "6px 12px", fontSize: "0.8rem", whiteSpace: "nowrap" }}
                                  >
                                    Batal
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            Belum ada siswa di kelas ini. Klik "Tambah Siswa Manual" atau "Impor Nilai dari CSV" untuk mengisi data.
          </div>
        )}
      </div>

      {/* Grid: Left - Configuration Card, Right - Operations Card */}
      <div className="grid-cols-2" style={{ gridTemplateColumns: "1.4fr 0.6fr", alignItems: "start" }}>

        {/* LEFT COLUMN: glass-card konfigurasi kelas */}
        <div className="glass-card" id="konfigurasi-kelas" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <h4 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "4px" }}>⚙️ Konfigurasi Kelas</h4>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Kelola aspek penilaian, bobot, dan skema nilai.</p>
          </div>

          {/* Tombol-tombol konfigurasi */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* Button toggle Atur Aspek */}
            <button
              onClick={() => setKolomModalOpen(!kolomModalOpen)}
              className="btn btn-secondary"
              style={{ width: "100%", justifyContent: "space-between", fontSize: "0.9rem", padding: "11px 16px" }}
            >
              <span>⚙️ Atur Aspek &amp; Bobot Nilai</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{kolomModalOpen ? "▲ Tutup" : "▼ Buka"}</span>
            </button>

            {/* Inline card aspek — muncul di bawah tombolnya */}
            {kolomModalOpen && (
              <div className="animate-fade-in" style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", overflow: "hidden", backgroundColor: "var(--bg-secondary)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--bg-tertiary)", borderBottom: "2px solid var(--border-color)" }}>
                      <th style={{ textAlign: "left", padding: "8px 10px", fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Aspek</th>
                      <th style={{ textAlign: "center", padding: "8px 10px", fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", width: "100px" }}>Bobot (%)</th>
                      <th style={{ textAlign: "center", padding: "8px 10px", fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", width: "60px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {kelas.kolomNilai.map((col) => (
                      <tr key={col.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "6px 10px" }}>
                          <input type="text" className="form-input" value={col.nama} onChange={(e) => handleColumnNameChange(col.id, e.target.value)} style={{ padding: "5px 8px", fontSize: "0.88rem" }} />
                        </td>
                        <td style={{ padding: "6px 10px", textAlign: "center" }}>
                          <input type="number" className="form-input" value={col.bobot} min={0} max={100} onChange={(e) => handleBobotChange(col.id, e.target.value)} style={{ padding: "5px 8px", fontSize: "0.88rem", textAlign: "center" }} />
                        </td>
                        <td style={{ padding: "6px 10px", textAlign: "center" }}>
                          <button onClick={() => handleDeleteKolom(col.id, col.nama)} className="btn btn-secondary" style={{ color: "var(--danger)", padding: "3px 8px" }} title="Hapus aspek">🗑️</button>
                        </td>
                      </tr>
                    ))}
                    {/* Baris tambah baru (Seamless) */}
                    {newAspects.map((aspect, index) => (
                      <tr key={aspect.id} style={{ borderTop: index === 0 ? "2px dashed var(--border-color)" : "none", backgroundColor: "rgba(59,130,246,0.03)" }}>
                        <td style={{ padding: "8px 10px" }}>
                          <input type="text" className="form-input" placeholder="+ Nama aspek baru" value={aspect.nama} onChange={(e) => handleNewAspectChange(aspect.id, 'nama', e.target.value)} style={{ padding: "5px 8px", fontSize: "0.88rem" }} />
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          <input type="number" className="form-input" placeholder="%" value={aspect.bobot} min={1} max={100} onChange={(e) => handleNewAspectChange(aspect.id, 'bobot', e.target.value)} style={{ padding: "5px 8px", fontSize: "0.88rem", textAlign: "center" }} />
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          {index !== newAspects.length - 1 ? (
                            <button onClick={() => handleRemoveNewAspect(aspect.id)} className="btn btn-secondary" style={{ color: "var(--danger)", padding: "3px 8px", fontSize: "0.8rem", minWidth: "30px" }} title="Batal tambah">✖</button>
                          ) : (
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", cursor: "default" }}>✧</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {kolomError && (
                  <p style={{ color: "var(--danger)", fontSize: "0.82rem", margin: "0", padding: "6px 10px", backgroundColor: "var(--danger-glow)" }}>{kolomError}</p>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "700", color: totalBobot === 100 ? "var(--success)" : "var(--warning)" }}>
                      Total: {totalBobot}%
                    </span>
                    <span className={`badge ${totalBobot === 100 ? "badge-success" : "badge-warning"}`} style={{ fontSize: "0.62rem" }}>
                      {totalBobot === 100 ? "✓ Lengkap" : "Harus 100%"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button onClick={handleOpenDuplicate} className="btn btn-secondary" style={{ padding: "5px 12px", fontSize: "0.82rem" }} title="Salin Aspek & Bobot dari Kelas Lain">
                      📋 Salin dari Kelas Lain
                    </button>
                    <button onClick={saveAllBobot} className="btn btn-primary" style={{ padding: "5px 12px", fontSize: "0.82rem" }}>
                      💾 Simpan
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tombol Atur Rentang Nilai & KKM */}
            <button
              onClick={() => setRangeModalOpen(!rangeModalOpen)}
              className="btn btn-secondary"
              style={{ width: "100%", justifyContent: "space-between", fontSize: "0.9rem", padding: "11px 16px" }}
            >
              <span>📊 Atur Rentang Nilai &amp; KKM</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{rangeModalOpen ? "▲ Tutup" : "▼ Buka"}</span>
            </button>

            {/* Inline card rentang nilai — muncul di bawah tombolnya */}
            {rangeModalOpen && (
              <div className="animate-fade-in" style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", padding: "16px", backgroundColor: "var(--bg-secondary)", display: "flex", flexDirection: "column", gap: "14px", overflowX: "auto" }}>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0, minWidth: "300px" }}>
                  Atur ambang batas tiap peringkat dan label status sesuai keinginan Anda (contoh: <strong>Sangat Baik</strong>, <strong>Lulus</strong>, dll).
                </p>
                
                {/* Header grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1.2fr", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Peringkat</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Nilai ≥</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Label Status</span>
                </div>
                
                {/* A */}
                <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1.2fr", gap: "8px", alignItems: "center", backgroundColor: "var(--bg-tertiary)", padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(59,130,246,0.15)" }}>
                  <span style={{ fontWeight: "800", fontSize: "0.95rem", color: "var(--primary)" }}>🏆 A</span>
                  <input type="number" className="form-input" value={gradeA} min={0} max={100} onChange={e => setGradeA(Number(e.target.value))} style={{ padding: "4px 8px", fontSize: "0.85rem", textAlign: "center" }} />
                  <input type="text" className="form-input" value={statusA} onChange={e => setStatusA(e.target.value)} placeholder="Sangat Baik" maxLength={30} style={{ padding: "4px 8px", fontSize: "0.85rem" }} />
                </div>
                
                {/* B */}
                <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1.2fr", gap: "8px", alignItems: "center", backgroundColor: "var(--bg-tertiary)", padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(34,197,94,0.12)" }}>
                  <span style={{ fontWeight: "800", fontSize: "0.95rem", color: "var(--success)" }}>✅ B</span>
                  <input type="number" className="form-input" value={gradeB} min={0} max={100} onChange={e => setGradeB(Number(e.target.value))} style={{ padding: "4px 8px", fontSize: "0.85rem", textAlign: "center" }} />
                  <input type="text" className="form-input" value={statusB} onChange={e => setStatusB(e.target.value)} placeholder="Baik" maxLength={30} style={{ padding: "4px 8px", fontSize: "0.85rem" }} />
                </div>
                
                {/* C */}
                <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1.2fr", gap: "8px", alignItems: "center", backgroundColor: "var(--bg-tertiary)", padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(234,179,8,0.15)" }}>
                  <span style={{ fontWeight: "800", fontSize: "0.95rem", color: "var(--warning)" }}>⚠️ C</span>
                  <input type="number" className="form-input" value={gradeC} min={0} max={100} onChange={e => setGradeC(Number(e.target.value))} style={{ padding: "4px 8px", fontSize: "0.85rem", textAlign: "center" }} />
                  <input type="text" className="form-input" value={statusC} onChange={e => setStatusC(e.target.value)} placeholder="Cukup" maxLength={30} style={{ padding: "4px 8px", fontSize: "0.85rem" }} />
                </div>
                
                {/* D */}
                <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1.2fr", gap: "8px", alignItems: "center", backgroundColor: "var(--bg-tertiary)", padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(239,68,68,0.1)" }}>
                  <span style={{ fontWeight: "800", fontSize: "0.95rem", color: "var(--danger)" }}>❌ D</span>
                  <input type="number" className="form-input" value={gradeD} min={0} max={100} onChange={e => setGradeD(Number(e.target.value))} style={{ padding: "4px 8px", fontSize: "0.85rem", textAlign: "center" }} />
                  <input type="text" className="form-input" value={statusD} onChange={e => setStatusD(e.target.value)} placeholder="Kurang" maxLength={30} style={{ padding: "4px 8px", fontSize: "0.85rem" }} />
                </div>
                
                {/* KKM */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", backgroundColor: "var(--bg-tertiary)", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px dashed var(--border-color)", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: "700", fontSize: "0.82rem", whiteSpace: "nowrap" }}>🎯 KKM (Lulus ≥)</span>
                  <input type="number" className="form-input" value={kkm} min={0} max={100} onChange={e => setKkm(Number(e.target.value))} style={{ padding: "4px 8px", fontSize: "0.85rem", maxWidth: "70px", textAlign: "center" }} />
                </div>
                
                {/* Actions */}
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: "12px", marginTop: "4px" }}>
                  <button onClick={() => setRangeModalOpen(false)} className="btn btn-secondary" style={{ padding: "5px 12px", fontSize: "0.82rem" }}>Batal</button>
                  <button onClick={handleSaveRange} className="btn btn-primary" style={{ padding: "5px 12px", fontSize: "0.82rem" }}>💾 Simpan</button>
                </div>
              </div>
            )}
          </div>
        </div>{/* end LEFT COLUMN */}


        <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h4 style={{ fontSize: "1.15rem", fontWeight: "700" }}>🛠️ Operasi Data</h4>
          
          <button onClick={handleOpenAddSiswa} className="btn btn-secondary" style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.9rem" }}>
            👤 Tambah Siswa Manual
          </button>
          
          <button onClick={downloadExcelTemplate} className="btn btn-secondary" style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.9rem" }} disabled={kelas.kolomNilai.length === 0}>
            📥 Ekspor / Unduh Nilai Excel (.xlsx)
          </button>

          <label className="btn btn-secondary" style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.9rem", cursor: kelas.kolomNilai.length === 0 ? "not-allowed" : "pointer" }}>
            📤 Impor Nilai dari Excel
            <input
              type="file"
              accept=".xlsx, .xls"
              style={{ display: "none" }}
              onChange={handleExcelUpload}
              disabled={kelas.kolomNilai.length === 0}
            />
          </label>

          {kelas.kolomNilai.length === 0 && (
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>
              * Tambah minimal 1 Aspek Nilai terlebih dahulu untuk membuka fitur Template &amp; Impor Excel.
            </p>
          )}
        </div>

      </div>

      </>
      )}

      </div>

      {/* MODAL: ADD/EDIT STUDENT */}
      {siswaModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="glass-card animate-fade-in modal-content-scroll" style={{ width: "100%", maxWidth: "450px" }}>
            <h3 style={{ fontSize: "1.4rem", fontWeight: "800", marginBottom: "20px" }}>
              {isEditingSiswa ? "✏️ Edit Biodata Siswa" : "👤 Tambah Siswa Baru"}
            </h3>

            <form onSubmit={handleSiswaSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">NISN Siswa (10-digit)</label>
                <input
                  type="text"
                  placeholder="Contoh: 1234567890"
                  className="form-input"
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value)}
                  disabled={isEditingSiswa} // NISN bersifat unique key
                  maxLength={20}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  placeholder="Contoh: Aditya Pratama"
                  className="form-input"
                  value={namaSiswa}
                  onChange={(e) => setNamaSiswa(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tanggal Lahir</label>
                <input
                  type="date"
                  className="form-input"
                  value={tanggalLahir}
                  onChange={(e) => setTanggalLahir(e.target.value)}
                  required
                />
              </div>

              {siswaError && (
                <div style={{ padding: "10px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--danger-glow)", color: "var(--danger)", fontSize: "0.85rem" }}>
                  ❌ {siswaError}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setSiswaModalOpen(false)} className="btn btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}




      {/* MODAL: PREMIUM EXCEL IMPORT PREVIEW & CONFIRMATION */}
      {previewModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 250, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "800px", maxHeight: "85vh", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "800" }}>📤 Pratinjau Impor Data Excel</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                Berikut adalah data siswa dan nilai yang berhasil di-parse dari file Excel Anda. Klik <strong>Konfirmasi Impor</strong> untuk menyimpannya ke basis data kelas.
              </p>
            </div>

            {/* Table preview scrollable */}
            <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
              <table className="premium-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>NISN</th>
                    <th>Nama</th>
                    <th>Tanggal Lahir</th>
                    {kelas.kolomNilai.map(col => (
                      <th key={col.id} style={{ textAlign: "center" }}>{col.nama}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewList.map((ps, idx) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: "monospace", fontSize: "0.8rem", fontWeight: "600" }}>{ps.nisn}</td>
                      <td style={{ fontWeight: "700" }}>{ps.nama}</td>
                      <td>{ps.tanggalLahir}</td>
                      {kelas.kolomNilai.map(col => (
                        <td key={col.id} style={{ textAlign: "center", fontWeight: "700" }}>
                          {ps.nilai[col.nama] !== null && ps.nilai[col.nama] !== undefined ? ps.nilai[col.nama] : "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Confirm Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: "600" }}>
                Total: <strong>{previewList.length}</strong> record siswa siap diimpor.
              </span>
              
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => setPreviewModalOpen(false)} className="btn btn-secondary" disabled={importing}>
                  Batal
                </button>
                <button type="button" onClick={confirmImport} className="btn btn-success" disabled={importing}>
                  {importing ? "Mengimpor..." : "✅ Konfirmasi Impor"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global pulse CSS helper */}
      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 0.3; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0.3; transform: scale(0.9); }
        }
        
        @media (max-width: 768px) {
          .sticky-nama {
            position: static !important;
            box-shadow: none !important;
          }
        }
      `}</style>
      
      {/* MODAL: ACTIVITY LOG */}
      {historyModalOpen && selectedHistorySiswa && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "450px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800" }}>👁️ Riwayat Akses</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Siswa: <strong>{selectedHistorySiswa.nama}</strong> ({selectedHistorySiswa.nisn})
                </p>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {(!selectedHistorySiswa.nilai || !selectedHistorySiswa.nilai._login_history || selectedHistorySiswa.nilai._login_history.length === 0) ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "8px", opacity: 0.5 }}>😴</div>
                  Siswa ini belum pernah mengecek nilainya di portal.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column-reverse" }}>
                  {selectedHistorySiswa.nilai._login_history.map((timestamp, idx) => {
                    const dateObj = new Date(timestamp);
                    const formattedDate = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                    const formattedTime = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
                    
                    return (
                      <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px", borderBottom: idx === 0 ? "none" : "1px solid var(--border-color)" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--success)", marginTop: "6px" }}></div>
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-primary)" }}>{formattedDate}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Pukul {formattedTime}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
              <button onClick={() => setHistoryModalOpen(false)} className="btn btn-secondary">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Duplicate Modal */}
      {duplicateModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div className="glass-card" style={{ width: "100%", maxWidth: "500px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px", maxHeight: "85vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800" }}>📋 Salin dari Kelas Lain</h3>
              <button onClick={() => setDuplicateModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Pilih kelas sumber untuk menyalin konfigurasi aspek dan bobotnya. Tindakan ini akan <b style={{color: "var(--danger)"}}>meniban dan menghapus</b> aspek yang ada di tabel saat ini.</p>

            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", paddingRight: "4px" }}>
              {fetchingClasses ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
                  <span className="spinner" style={{ width: "24px", height: "24px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
                </div>
              ) : availableClasses.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", padding: "20px" }}>Belum ada kelas lain yang tersedia.</p>
              ) : (
                availableClasses.map(c => (
                  <div key={c.id} style={{ padding: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--bg-tertiary)" }}>
                    <div>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: "700" }}>{c.nama}</h4>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>{c.mataPelajaran} &bull; <span style={{color: "var(--primary)", fontWeight: "700"}}>{c.kolomNilai.length} Aspek</span></p>
                    </div>
                    <button 
                      onClick={() => handleDuplicateFromClass(c)}
                      className="btn btn-secondary" 
                      style={{ padding: "6px 12px", fontSize: "0.8rem", borderColor: c.kolomNilai.length === 0 ? "var(--border-color)" : "var(--primary)", color: c.kolomNilai.length === 0 ? "var(--text-muted)" : "var(--primary)" }}
                      disabled={c.kolomNilai.length === 0}
                    >
                      {c.kolomNilai.length === 0 ? "Kosong" : "Pilih"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Modal */}
      {onboardingModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px", backdropFilter: "blur(4px)" }}>
          <div className="glass-card" style={{ width: "100%", maxWidth: "600px", padding: "32px", display: "flex", flexDirection: "column", gap: "24px", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            
            {/* Header */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🎉</div>
              <h2 style={{ fontSize: "1.8rem", fontWeight: "800", background: "linear-gradient(135deg, var(--primary), var(--success))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Kelas Berhasil Dibuat!
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: "8px" }}>
                Ikuti 3 langkah mudah ini untuk mulai memberikan penilaian di kelas {kelas?.nama}.
              </p>
            </div>

            {/* Steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>
              
              {/* Step 1 */}
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", padding: "16px", backgroundColor: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", flexShrink: 0, boxShadow: "0 2px 8px var(--primary-glow)" }}>1</div>
                <div>
                  <h4 style={{ fontSize: "1.05rem", fontWeight: "700", marginBottom: "4px", color: "var(--text-primary)" }}>Atur Aspek Penilaian</h4>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                    Scroll ke bagian bawah dan klik <strong>"⚙️ Atur Aspek & Bobot Nilai"</strong>. Tentukan kolom penilaian (misal: UTS, UAS, Tugas) beserta persentase bobotnya hingga total 100%.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", padding: "16px", backgroundColor: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--success)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", flexShrink: 0, boxShadow: "0 2px 8px var(--success-glow)" }}>2</div>
                <div>
                  <h4 style={{ fontSize: "1.05rem", fontWeight: "700", marginBottom: "4px", color: "var(--text-primary)" }}>Tambahkan Siswa</h4>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                    Tambahkan siswa satu per satu, impor dari Excel, atau bagikan <strong>Kode Kelas ({kelas?.id})</strong> agar siswa dapat mendaftar mandiri via Portal Siswa.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", padding: "16px", backgroundColor: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--warning)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", flexShrink: 0, boxShadow: "0 2px 8px var(--warning-glow)" }}>3</div>
                <div>
                  <h4 style={{ fontSize: "1.05rem", fontWeight: "700", marginBottom: "4px", color: "var(--text-primary)" }}>Mulai Mengisi Nilai</h4>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                    Setelah aspek dan siswa siap, Anda bisa langsung mengetikkan nilai di tabel buku nilai. Semua perubahan akan tersimpan secara otomatis.
                  </p>
                </div>
              </div>

            </div>

            {/* Action */}
            <div style={{ marginTop: "16px" }}>
              <button 
                onClick={() => setOnboardingModalOpen(false)}
                className="btn btn-primary" 
                style={{ width: "100%", padding: "14px", fontSize: "1rem", borderRadius: "var(--radius-md)", justifyContent: "center", boxShadow: "0 4px 15px var(--primary-glow)" }}
              >
                Siap, Ayo Mulai! 🚀
              </button>
            </div>
            
          </div>
        </div>
      )}

    </>
  );
}
