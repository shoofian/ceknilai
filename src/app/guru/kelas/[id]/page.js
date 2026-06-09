"use client";

import { useState, useEffect, use, useMemo, Fragment } from "react";
import Modal from '@/components/Modal';
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import RaporIntegrationModal from "@/components/RaporIntegrationModal";

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
  const [newAspects, setNewAspects] = useState([{ id: Date.now(), nama: "", bobot: "", isGroup: false, subKolom: [] }]);
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

  // State loading saat simpan aspek & bobot
  const [isSavingBobot, setIsSavingBobot] = useState(false);

  // States untuk Presensi
  const [presensiModalOpen, setPresensiModalOpen] = useState(false);
  const [isSavingPresensi, setIsSavingPresensi] = useState(false);
  // temporary settings while configuring
  const [presensiConfigTemp, setPresensiConfigTemp] = useState({ digunakan: false, bobot: 0 });

  // States untuk Pertemuan
  const [pertemuanModalOpen, setPertemuanModalOpen] = useState(false);
  const [isEditingPertemuan, setIsEditingPertemuan] = useState(false);
  const [selectedPertemuanId, setSelectedPertemuanId] = useState("");
  const [pertemuanNama, setPertemuanNama] = useState("");
  const [pertemuanTanggal, setPertemuanTanggal] = useState("");
  const [isSavingPertemuan, setIsSavingPertemuan] = useState(false);
  const [pertemuanMateri, setPertemuanMateri] = useState("");
  const [pertemuanKegiatan, setPertemuanKegiatan] = useState("");
  const [agendaCollapsed, setAgendaCollapsed] = useState(true);

  // State untuk profile guru
  const [guruProfile, setGuruProfile] = useState(null);

  // States untuk Bagikan Overview
  const [isGeneratingOverview, setIsGeneratingOverview] = useState(false);
  const [generatedOverviewImage, setGeneratedOverviewImage] = useState(null);

  // States untuk Catatan Siswa
  const [openCatatan, setOpenCatatan] = useState({}); // { [nisn]: boolean }
  const [expandedNama, setExpandedNama] = useState({}); // { [nisn]: boolean }
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

  // State untuk Integrasi E-Rapor
  const [raporModalOpen, setRaporModalOpen] = useState(false);

  const handleOpenHistory = (student) => {
    setSelectedHistorySiswa(student);
    setHistoryModalOpen(true);
  };

  // State tab aktif: 'nilai' | 'ranking' | 'analitik'
  const [activeTab, setActiveTab] = useState('nilai');
  const [showKehadiran, setShowKehadiran] = useState(false);

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
        if (col.isGroup && col.subKolom) {
          let subTotal = 0;
          let subFilled = 0;
          col.subKolom.forEach(sub => {
            const cellKey = `${student.nisn}-${sub.id}`;
            let sc = student.nilai[sub.id];
            if (temporaryScores[cellKey] !== undefined) {
              sc = temporaryScores[cellKey] === "" ? null : Number(temporaryScores[cellKey]);
            }
            if (sc !== undefined && sc !== null && sc !== "") {
              subTotal += Number(sc);
              subFilled++;
            }
          });
          if (subFilled === col.subKolom.length && col.subKolom.length > 0) {
            const avg = subTotal / subFilled;
            totalNilaiTerisi += avg * (col.bobot / 100);
            jumlahAspekTerisi++;
          } else if (subFilled > 0) {
            const avg = subTotal / subFilled;
            totalNilaiTerisi += avg * (col.bobot / 100);
          }
        } else {
          const cellKey = `${student.nisn}-${col.id}`;
          let sc = student.nilai[col.id];
          if (temporaryScores[cellKey] !== undefined) {
            sc = temporaryScores[cellKey] === "" ? null : Number(temporaryScores[cellKey]);
          }
          if (sc !== undefined && sc !== null && sc !== "") {
            totalNilaiTerisi += Number(sc) * (col.bobot / 100);
            jumlahAspekTerisi++;
          }
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
        if (col.isGroup && col.subKolom) {
          let subTotal = 0;
          let subFilled = 0;
          col.subKolom.forEach(sub => {
            const sc = student.nilai[sub.id];
            if (sc !== undefined && sc !== null && sc !== "") {
              subTotal += Number(sc);
              subFilled++;
            }
          });
          if (subFilled === col.subKolom.length && col.subKolom.length > 0) {
            const avg = subTotal / subFilled;
            total += avg * (col.bobot / 100);
            filledCount++;
          } else if (subFilled > 0) {
            const avg = subTotal / subFilled;
            total += avg * (col.bobot / 100);
          }
        } else {
          const sc = student.nilai[col.id];
          if (sc !== undefined && sc !== null && sc !== "") {
            total += Number(sc) * (col.bobot / 100);
            filledCount++;
          }
        }
      });
      
      // Hitung Presensi jika digunakan
      const presensiConfig = skema.presensi || { digunakan: false, bobot: 0 };
      const pertemuanList = skema.pertemuan || [];
      let complete = filledCount === kelas.kolomNilai.length;
      
      let attSummary = { H: 0, I: 0, S: 0, A: 0 };
      pertemuanList.forEach(p => {
        const val = student.nilai[`_presensi_${p.id}`];
        if (val && attSummary[val] !== undefined) {
          attSummary[val]++;
        }
      });

      if (presensiConfig.digunakan && presensiConfig.bobot > 0 && pertemuanList.length > 0) {
        let attCount = attSummary.H + attSummary.S + attSummary.I + attSummary.A;
        let attTotal = (attSummary.H * 100) + (attSummary.S * 50) + (attSummary.I * 50) + (attSummary.A * 0);
        
        // Poin kehadiran rata-rata (hanya dihitung berdasarkan jumlah pertemuan yg sudah diisi)
        const attAvg = attCount > 0 ? (attTotal / attCount) : 0;
        total += attAvg * (presensiConfig.bobot / 100);
        
        // Jika ada pertemuan, anggap "complete" jika setidaknya semua nilai akademik terisi
        // (atau bisa juga mewajibkan semua presensi terisi, tapi ini lebih fleksibel)
      }

      let predikat = "-";
      if (complete) {
        if (total >= skema.A) predikat = skema.statusA || "A";
        else if (total >= skema.B) predikat = skema.statusB || "B";
        else if (total >= skema.C) predikat = skema.statusC || "C";
        else predikat = skema.statusD || "D";
      }

      return { ...student, finalScore: parseFloat(total.toFixed(2)), complete, predikat, lulus: complete && total >= kkmVal, attSummary };
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
        .map(s => {
          let val = s.nilai[col.id];
          if (col.isGroup && col.subKolom) {
            let subTotal = 0;
            let subFilled = 0;
            col.subKolom.forEach(sub => {
              const sc = s.nilai[sub.id];
              if (sc !== undefined && sc !== null && sc !== "") {
                subTotal += Number(sc);
                subFilled++;
              }
            });
            val = subFilled > 0 ? (subTotal / subFilled) : null;
          }
          return { nama: s.nama, finalScore: s.finalScore, val };
        })
        .filter(s => s.val !== undefined && s.val !== null && s.val !== "");
        
      const avg = scores.length > 0
        ? parseFloat((scores.reduce((a, b) => a + Number(b.val), 0) / scores.length).toFixed(2))
        : null;
        
      const topStudent = scores.length > 0 
        ? scores.reduce((max, s) => Number(s.val) > Number(max.val) ? s : (Number(s.val) === Number(max.val) && s.finalScore > max.finalScore ? s : max), scores[0]) 
        : null;

      return { ...col, avg, filled: scores.length, topStudent: topStudent?.nama || "-" };
    });

    // Problematic Students for Wali Kelas Report
    const problematicStudents = studentScores.map(s => {
      const issues = [];
      kelas.kolomNilai.forEach(col => {
        let val = s.nilai[col.id];
        let isEmpty = false;
        
        if (col.isGroup && col.subKolom) {
          let subTotal = 0;
          let subFilled = 0;
          col.subKolom.forEach(sub => {
            const sc = s.nilai[sub.id];
            if (sc !== undefined && sc !== null && sc !== "") {
              subTotal += Number(sc);
              subFilled++;
            }
          });
          val = subFilled > 0 ? (subTotal / subFilled) : null;
          if (subFilled === 0) isEmpty = true;
        } else {
          if (val === undefined || val === null || val === "") isEmpty = true;
        }

        if (isEmpty) {
          issues.push({ aspek: col.nama, status: "Kosong (Belum Mengerjakan)" });
        } else if (Number(val) < kkmVal) {
          issues.push({ aspek: col.nama, status: "Di bawah KKM" });
        }
      });
      return { ...s, issues };
    }).filter(s => s.issues.length > 0);

    return { 
      kkmVal, ranked, classAvg, highest, lowest, passCount, passRate, gradeDist, 
      aspectAvg, completeCount: completeStudents.length, totalCount: studentScores.length,
      problematicStudents
    };
  }, [kelas?.siswa, kelas?.kolomNilai, kelas?.skemaPenilaian, temporaryScores]);

  const presensiStats = useMemo(() => {
    if (!kelas || !kelas.siswa) {
      return { totalH: 0, totalI: 0, totalS: 0, totalA: 0, avgAttendance: 0, totalPertemuan: 0 };
    }

    const pertemuanList = kelas.skemaPenilaian?.pertemuan || [];
    const totalP = pertemuanList.length;
    let totalH = 0, totalI = 0, totalS = 0, totalA = 0;
    
    kelas.siswa.forEach(siswa => {
      pertemuanList.forEach(p => {
        const status = siswa.nilai[`_presensi_${p.id}`];
        if (status === 'H') totalH++;
        else if (status === 'I') totalI++;
        else if (status === 'S') totalS++;
        else if (status === 'A') totalA++;
      });
    });

    const totalPossible = kelas.siswa.length * totalP;
    const avgAttendance = totalPossible > 0 ? Math.round((totalH / totalPossible) * 100) : 0;

    return { totalH, totalI, totalS, totalA, avgAttendance, totalPertemuan: totalP };
  }, [kelas]);

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
  const toggleNamaExpand = (studentNisn) => {
    setExpandedNama(prev => ({
      ...prev,
      [studentNisn]: !prev[studentNisn]
    }));
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
        if (data.siswa && Array.isArray(data.siswa)) {
          data.siswa.sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
        }
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
    // Fetch guru profile
    fetch('/api/profil')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setGuruProfile(data);
      })
      .catch(err => console.error("Error fetching guru profile:", err));
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

  // === DYNAMIC WEIGHT COMPUTATIONS ===  // Derived values for validation
  const totalBobot = (kelas ? kelas.kolomNilai.reduce((sum, col) => sum + (Number(col.bobot) || 0), 0) : 0) 
    + newAspects.filter(a => a.nama.trim() !== "").reduce((sum, a) => sum + (Number(a.bobot) || 0), 0)
    + (kelas?.skemaPenilaian?.presensi?.digunakan ? Number(kelas.skemaPenilaian.presensi.bobot) || 0 : 0);

  // === HANDLERS BAGIKAN OVERVIEW ===
  const handleDownloadOverview = async () => {
    const element = document.getElementById(`export-class-dashboard-${classId}`);
    if (!element) return;
    
    setIsGeneratingOverview(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2, 
        backgroundColor: "#0f172a",
        logging: false,
        useCORS: true
      });
      
      const image = canvas.toDataURL("image/png");
      setGeneratedOverviewImage({ url: image, filename: `Overview_Kelas_${kelas?.namaKelas?.replace(/\s+/g, '_')}_${kelas?.mataPelajaran?.replace(/\s+/g, '_')}.png` });
    } catch (err) {
      console.error(err);
      alert("Gagal memproses gambar. Silakan coba kembali.");
    } finally {
      setIsGeneratingOverview(false);
    }
  };

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

  const handleOpenAddPertemuan = () => {
    setIsEditingPertemuan(false);
    setSelectedPertemuanId("");
    setPertemuanNama(`Pertemuan ${(kelas.skemaPenilaian?.pertemuan?.length || 0) + 1}`);
    setPertemuanTanggal(new Date().toISOString().split('T')[0]);
    setPertemuanMateri("");
    setPertemuanKegiatan("");
    setPertemuanModalOpen(true);
  };

  const handleOpenEditPertemuan = (pertemuan) => {
    setIsEditingPertemuan(true);
    setSelectedPertemuanId(pertemuan.id);
    setPertemuanNama(pertemuan.nama);
    setPertemuanTanggal(pertemuan.tanggal || new Date().toISOString().split('T')[0]);
    setPertemuanMateri(pertemuan.materi || "");
    setPertemuanKegiatan(pertemuan.kegiatan || pertemuan.keterangan || "");
    setPertemuanModalOpen(true);
  };

  const handleSavePertemuan = async () => {
    if (!pertemuanNama.trim()) {
      alert("Nama pertemuan harus diisi.");
      return;
    }
    if (!pertemuanTanggal) {
      alert("Tanggal pertemuan harus diisi.");
      return;
    }

    setIsSavingPertemuan(true);
    let updatedPertemuan = [];

    if (isEditingPertemuan) {
      // Update existing
      updatedPertemuan = (kelas.skemaPenilaian?.pertemuan || []).map(p => 
        p.id === selectedPertemuanId 
          ? { ...p, nama: pertemuanNama.trim(), tanggal: pertemuanTanggal, materi: pertemuanMateri.trim(), kegiatan: pertemuanKegiatan.trim() } 
          : p
      );
    } else {
      // Add new
      const newPertemuan = { 
        id: Date.now().toString(), 
        nama: pertemuanNama.trim(), 
        tanggal: pertemuanTanggal,
        materi: pertemuanMateri.trim(),
        kegiatan: pertemuanKegiatan.trim()
      };
      updatedPertemuan = [...(kelas.skemaPenilaian?.pertemuan || []), newPertemuan];
    }

    const updatedSkema = { ...kelas.skemaPenilaian, pertemuan: updatedPertemuan };

    try {
      const response = await fetch(`/api/kelas/${kelas.id}`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ skemaPenilaian: updatedSkema }) 
      });

      if (response.ok) {
        setKelas({ ...kelas, skemaPenilaian: updatedSkema });
        setPertemuanModalOpen(false);
      } else {
        alert("Gagal menyimpan pertemuan.");
      }
    } catch (e) {
      console.error("Error saving pertemuan", e);
      alert("Terjadi kesalahan.");
    } finally {
      setIsSavingPertemuan(false);
    }
  };

  const handleSaveScore = async (studentNisn, colId, value) => {
    try {
      await fetch(`/api/kelas/${classId}/siswa/${studentNisn}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nilai: {
            [colId]: value === "" ? null : value
          }
        }),
      });
    } catch (err) {
      console.error("Score save failed", err);
    }
  };

  const handleBulkPresensi = async (pertemuanId, status) => {
    if (!kelas || !kelas.siswa) return;

    // 1. Update state secara lokal langsung agar responsif
    const updatedSiswa = kelas.siswa.map(s => ({
      ...s,
      nilai: {
        ...s.nilai,
        [`_presensi_${pertemuanId}`]: status === "" ? null : status
      }
    }));
    
    setKelas({ ...kelas, siswa: updatedSiswa });
    setPertemuanModalOpen(false);

    // 2. Simpan paralel ke backend Supabase
    try {
      const savePromises = kelas.siswa.map(s => 
        fetch(`/api/kelas/${classId}/siswa/${s.nisn}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nilai: {
              [`_presensi_${pertemuanId}`]: status === "" ? null : status
            }
          })
        })
      );
      await Promise.all(savePromises);
    } catch (err) {
      console.error("Bulk presensi failed", err);
      alert("Beberapa data presensi gagal disimpan ke server. Silakan muat ulang halaman.");
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
      setNewAspects([...updated, { id: Date.now() + Math.random(), nama: "", bobot: "", isGroup: false, subKolom: [] }]);
    }
  };
  
  const handleRemoveNewAspect = (id) => {
    if (newAspects.length > 1) {
      setNewAspects(newAspects.filter(a => a.id !== id));
    } else {
      setNewAspects([{ id: Date.now(), nama: "", bobot: "", isGroup: false, subKolom: [] }]);
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
          ...(kelas?.skemaPenilaian || {}),
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
    // Simpan sebagai string mentah agar field bisa dikosongkan tanpa otomatis jadi 0
    const updatedKolom = kelas.kolomNilai.map(col => {
      if (col.id === colId) {
        return { ...col, bobot: value === "" ? "" : value };
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

  const toggleAspectVisibility = (colId) => {
    const currentHidden = kelas.skemaPenilaian?.hiddenAspek || [];
    let newHidden;
    if (currentHidden.includes(colId)) {
      newHidden = currentHidden.filter(id => id !== colId);
    } else {
      newHidden = [...currentHidden, colId];
    }
    setKelas({
      ...kelas,
      skemaPenilaian: {
        ...(kelas.skemaPenilaian || {}),
        hiddenAspek: newHidden
      }
    });
  };

  const saveAllBobot = async () => {
    if (totalBobot !== 100) {
      alert(`⚠️ Peringatan: Total bobot persentase saat ini adalah ${totalBobot}%. Agar penghitungan nilai akhir siswa akurat, pastikan totalnya pas 100%.`);
    }

    setIsSavingBobot(true);
    try {
      // Buat aspek-aspek baru terlebih dahulu
      const validNewAspects = newAspects.filter(a => a.nama.trim() !== "");
      let updatedKolomNilai = [...kelas.kolomNilai]; // Salin state lama

      for (const aspect of validNewAspects) {
        const res = await fetch(`/api/kelas/${classId}/kolom`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nama: aspect.nama.trim(), bobot: Number(aspect.bobot) || 0, isGroup: aspect.isGroup, subKolom: aspect.subKolom }),
        });
        if (!res.ok) {
           const data = await res.json();
           throw new Error(data.error || "Gagal membuat aspek baru");
        }
        const data = await res.json();
        updatedKolomNilai.push(data.kolom); // Masukkan aspek yang baru dibuat ke daftar sinkronisasi
      }

      // Perbarui seluruh konfigurasi secara massal — konversi bobot ke Number sebelum dikirim
      const kolomToSave = updatedKolomNilai.map(col => ({ ...col, bobot: Number(col.bobot) || 0 }));
      const response = await fetch(`/api/kelas/${classId}/kolom`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kolomNilai: kolomToSave }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gagal memperbarui bobot.");
      }

      // Perbarui skemaPenilaian (termasuk hiddenAspek)
      const skemaResponse = await fetch(`/api/kelas/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skemaPenilaian: kelas.skemaPenilaian || {} }),
      });
      if (!skemaResponse.ok) {
        const data = await skemaResponse.json();
        throw new Error(data.error || "Gagal menyimpan konfigurasi tampilan aspek");
      }

      setNewAspects([{ id: Date.now(), nama: "", bobot: "", isGroup: false, subKolom: [] }]); // Reset form tambah
      await fetchClassDetail();
    } catch (err) {
      console.error("Update weights failed", err);
      alert(err.message || "Gagal menyimpan.");
    } finally {
      setIsSavingBobot(false);
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
      if (col.isGroup && col.subKolom?.length > 0) {
        col.subKolom.forEach(sub => {
          headers.push(`${col.nama} - ${sub.nama}`);
        });
      } else {
        headers.push(`${col.nama} (${col.bobot}%)`);
      }
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
          if (col.isGroup && col.subKolom?.length > 0) {
            let subTotal = 0;
            let subFilled = 0;
            col.subKolom.forEach(sub => {
              const val = siswa.nilai[sub.id];
              row.push(val !== null && val !== undefined ? val : "");
              if (val !== null && val !== undefined && val !== "") {
                subTotal += Number(val);
                subFilled++;
              }
            });
            if (subFilled > 0) {
              totalNilaiTerisi += (subTotal / subFilled) * (col.bobot / 100);
            }
          } else {
            const val = siswa.nilai[col.id];
            row.push(val !== null && val !== undefined ? val : "");
            if (val !== null && val !== undefined && val !== "") {
              totalNilaiTerisi += Number(val) * (col.bobot / 100);
            }
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
      kelas.kolomNilai.forEach(col => {
        if (col.isGroup && col.subKolom?.length > 0) {
          col.subKolom.forEach(() => placeholder.push(""));
        } else {
          placeholder.push("");
        }
      });
      placeholder.push(""); // Nilai Akhir
      placeholder.push(""); // Predikat
      rows.push(placeholder);
    }
    
    const ws = XLSX.utils.aoa_to_sheet(rows);
    
    // Atur lebar kolom agar rapi dan tidak terpotong (wch = width in characters)
    const colWidths = [
      { wch: 18 }, // NISN
      { wch: 28 }, // Nama
      { wch: 25 }, // Tanggal Lahir
    ];
    kelas.kolomNilai.forEach(col => {
      if (col.isGroup && col.subKolom?.length > 0) {
        col.subKolom.forEach(() => colWidths.push({ wch: 16 }));
      } else {
        colWidths.push({ wch: 16 });
      }
    });
    colWidths.push({ wch: 14 }); // Nilai Akhir
    colWidths.push({ wch: 18 }); // Predikat
    
    ws['!cols'] = colWidths;
    
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
            if (col.isGroup && col.subKolom?.length > 0) {
              col.subKolom.forEach(sub => {
                const headerName = `${col.nama} - ${sub.nama}`;
                const headerCol = headers.find(h => h === headerName || h.startsWith(`${headerName} (`));
                const colIdx = headerCol ? headers.indexOf(headerCol) : -1;
                
                if (colIdx !== -1 && cols[colIdx] !== "" && cols[colIdx] !== undefined && cols[colIdx] !== null) {
                  const parsedVal = Number(cols[colIdx]);
                  nilaiObj[headerName] = isNaN(parsedVal) ? null : parsedVal;
                } else {
                  nilaiObj[headerName] = null;
                }
              });
            } else {
              const headerCol = headers.find(h => h === col.nama || h.startsWith(`${col.nama} (`));
              const colIdx = headerCol ? headers.indexOf(headerCol) : -1;
              
              if (colIdx !== -1 && cols[colIdx] !== "" && cols[colIdx] !== undefined && cols[colIdx] !== null) {
                const parsedVal = Number(cols[colIdx]);
                nilaiObj[col.nama] = isNaN(parsedVal) ? null : parsedVal;
              } else {
                nilaiObj[col.nama] = null;
              }
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
      <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-secondary)", padding: "4px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", width: "fit-content", flexWrap: "wrap" }}>
        {[{ id: "nilai", label: "📊 Buku Nilai" }, { id: "presensi", label: "📅 Presensi" }, { id: "ranking", label: "🏆 Peringkat" }, { id: "analitik", label: "📈 Analitik" }, { id: "tindak-lanjut", label: "📢 Tindak Lanjut" }].map(tab => (
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
              {/* Header Tab Analitik */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>Ringkasan Analitik</h3>
                <button
                  onClick={handleDownloadOverview}
                  disabled={isGeneratingOverview}
                  className="btn btn-primary"
                  style={{
                    padding: "8px 16px",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    opacity: isGeneratingOverview ? 0.7 : 1,
                    cursor: isGeneratingOverview ? "wait" : "pointer"
                  }}
                >
                  {isGeneratingOverview ? "📸 Memproses..." : "📸 Bagikan Overview"}
                </button>
              </div>

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

      {/* ============= TINDAK LANJUT TAB ============= */}
      {activeTab === "tindak-lanjut" && (
        <div className="glass-card animate-fade-in" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>
            <div>
              <h4 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)" }}>📢 Laporan Tindak Lanjut Wali Kelas</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px", maxWidth: "600px" }}>
                Daftar siswa yang memiliki nilai kosong atau di bawah KKM ({analyticsData?.kkmVal}). Laporan ini aman dibagikan karena tidak menampilkan angka nilai secara spesifik.
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "8px" }}>
                <input type="checkbox" id="showKehadiranToggle" checked={showKehadiran} onChange={(e) => setShowKehadiran(e.target.checked)} style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--primary)" }} />
                <label htmlFor="showKehadiranToggle" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer", fontWeight: "600" }}>Tampilkan Kehadiran</label>
              </div>
              <button onClick={() => {
                const text = `*Laporan Kendala Akademik (Otomatis)*\nMata Pelajaran: ${kelas.mataPelajaran}\nKelas: ${kelas.nama}\nGuru Pengampu: ${guruProfile?.nama || "-"}\nKKM: ${analyticsData?.kkmVal}\n\n` + 
                (analyticsData?.problematicStudents.length === 0 ? "Semua siswa telah tuntas dan melampaui KKM. 🎉" : 
                analyticsData?.problematicStudents.map((s, idx) => `*${idx + 1}. ${s.nama}*\n_Status Nilai Akhir: ${s.finalScore >= analyticsData?.kkmVal ? `Sudah Tuntas KKM ✅` : `Belum Tuntas ❌`}_` +
                (showKehadiran ? `\n_Kehadiran: H:${s.attSummary.H} I:${s.attSummary.I} S:${s.attSummary.S} A:${s.attSummary.A}_` : ``) +
                `\n${s.issues.map(i => `- ${i.aspek}: ${i.status}`).join('\n')}`).join('\n\n')) + 
                `\n\n_Mohon bantuan Bapak/Ibu Wali Kelas untuk mengingatkan siswa yang bersangkutan. Terima kasih._\n\n*Siswa dapat mengecek detail nilai masing-masing secara privat melalui: ceknilaimu.vercel.app*`;
                navigator.clipboard.writeText(text);
                alert("Teks laporan berhasil disalin! Silakan paste di WhatsApp Wali Kelas.");
              }} className="btn btn-outline" style={{ fontSize: "0.85rem", padding: "8px 16px" }}>
                📋 Salin Teks WhatsApp
              </button>
              <button onClick={async () => {
                const element = document.getElementById("laporan-wali-kelas-export");
                if (!element) return;
                
                // Backup styles before modifying
                const originalStyle = element.getAttribute("style");
                // Temporarily increase size and padding to make the image look like a neat ticket
                element.style.padding = "40px";
                element.style.width = "800px";
                
                const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#0f172a" });
                
                // Restore styles
                element.setAttribute("style", originalStyle);
                
                const link = document.createElement("a");
                link.download = `Laporan_Wali_Kelas_${kelas.nama.replace(/\s+/g, "_")}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
              }} className="btn btn-primary" style={{ fontSize: "0.85rem", padding: "8px 16px" }}>
                📸 Unduh Gambar
              </button>
            </div>
          </div>

          <div id="laporan-wali-kelas-export" style={{ backgroundColor: "#0f172a", padding: "24px", borderRadius: "var(--radius-md)", color: "#f8fafc", width: "100%", maxWidth: "800px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "24px", borderBottom: "1px dashed rgba(255,255,255,0.2)", paddingBottom: "16px" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "800", margin: "0 0 8px 0", color: "#38bdf8" }}>Laporan Kendala Akademik</h2>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#94a3b8", marginBottom: "6px" }}>{kelas.mataPelajaran} • Kelas {kelas.nama}</p>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>Guru Pengampu: <strong style={{ color: "#cbd5e1" }}>{guruProfile?.nama || "-"}</strong> • KKM: <strong style={{ color: "#cbd5e1" }}>{analyticsData?.kkmVal}</strong></p>
            </div>

            {analyticsData?.problematicStudents.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <span style={{ fontSize: "3rem" }}>🎉</span>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginTop: "16px", color: "#10b981" }}>Luar Biasa! Semua Siswa Tuntas</h3>
                <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "8px" }}>Tidak ada siswa dengan nilai kosong atau di bawah KKM.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {analyticsData?.problematicStudents.map((s, i) => (
                  <div key={s.nisn} style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: "16px", borderRadius: "8px", borderLeft: "4px solid #ef4444" }}>
                    <h4 style={{ fontSize: "1.1rem", fontWeight: "800", margin: "0 0 12px 0", color: "#f8fafc" }}>{i + 1}. {s.nama}</h4>
                    
                    {/* Final Score Status Ribbon */}
                    <div style={{ 
                      display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "6px", marginBottom: "16px", fontSize: "0.85rem", fontWeight: "600",
                      backgroundColor: s.finalScore >= analyticsData?.kkmVal ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                      color: s.finalScore >= analyticsData?.kkmVal ? "#34d399" : "#fca5a5",
                      border: `1px solid ${s.finalScore >= analyticsData?.kkmVal ? "rgba(52, 211, 153, 0.2)" : "rgba(248, 113, 113, 0.2)"}`
                    }}>
                      <span>{s.finalScore >= analyticsData?.kkmVal ? "✅" : "⚠️"}</span>
                      <span>Status Nilai Akhir: {s.finalScore >= analyticsData?.kkmVal ? "Aman (Tuntas KKM)" : "Kurang (Belum Tuntas)"}</span>
                    </div>

                    {/* Aspects List */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingLeft: "4px" }}>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Rincian Kendala Aspek:</div>
                      {showKehadiran && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", backgroundColor: "rgba(0,0,0,0.2)", padding: "8px 12px", borderRadius: "4px", marginBottom: "4px" }}>
                          <span style={{ color: "#e2e8f0", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ color: "#64748b" }}>•</span> Kehadiran
                          </span>
                          <span style={{ fontWeight: "700", fontSize: "0.75rem", color: "#94a3b8" }}>
                            H: {s.attSummary.H} | I: {s.attSummary.I} | S: {s.attSummary.S} | <span style={{color: s.attSummary.A > 0 ? "#fca5a5" : "inherit"}}>A: {s.attSummary.A}</span>
                          </span>
                        </div>
                      )}
                      {s.issues.map((issue, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", backgroundColor: "rgba(0,0,0,0.2)", padding: "8px 12px", borderRadius: "4px" }}>
                          <span style={{ color: "#e2e8f0", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ color: "#64748b" }}>•</span> {issue.aspek}
                          </span>
                          <span style={{ 
                            fontWeight: "700", fontSize: "0.75rem",
                            color: issue.status.includes("Kosong") ? "#fcd34d" : "#fca5a5"
                          }}>
                            {issue.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px dashed rgba(255,255,255,0.2)", textAlign: "center", fontSize: "0.75rem", color: "#64748b" }}>
              <p style={{ margin: "0 0 8px 0", color: "#94a3b8", fontSize: "0.85rem" }}>Siswa dapat mengecek detail nilai masing-masing secara privat melalui: <strong style={{ color: "#38bdf8" }}>ceknilaimu.vercel.app</strong></p>
              Dihasilkan otomatis oleh CekNilai App • {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      )}

      {/* ============= PRESENSI TAB ============= */}
      {activeTab === "presensi" && (
        <div className="glass-card animate-fade-in" style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h4 style={{ fontSize: "1.25rem", fontWeight: "800" }}>📅 Tabel Presensi (Kehadiran)</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                Kelola kehadiran siswa. Klik pada sel untuk mengubah status: <strong style={{color:"var(--success)"}}>H</strong> (Hadir), <strong style={{color:"var(--warning)"}}>I</strong> (Izin), <strong style={{color:"#3b82f6"}} >S</strong> (Sakit), <strong style={{color:"var(--danger)"}}>A</strong> (Alpa).
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button onClick={() => {
                setPresensiConfigTemp(kelas.skemaPenilaian?.presensi || { digunakan: false, bobot: 0 });
                setPresensiModalOpen(true);
              }} className="btn btn-outline" style={{ fontSize: "0.85rem", padding: "8px 16px" }}>
                ⚙️ Pengaturan Presensi
              </button>
              <button onClick={handleOpenAddPertemuan} className="btn btn-primary" style={{ fontSize: "0.85rem", padding: "8px 16px" }}>
                ➕ Tambah Pertemuan
              </button>
            </div>
          </div>

          {/* Ringkasan Statistik Presensi */}
          {kelas.skemaPenilaian?.pertemuan?.length > 0 && (
            <div className="presensi-stats-grid">
              <div className="glass-card presensi-stats-card">
                <div style={{ fontSize: "1.8rem" }}>📅</div>
                <div>
                  <div style={{ fontSize: "1.3rem", fontWeight: "800", color: "var(--primary)", lineHeight: 1.2 }}>{presensiStats.totalPertemuan}</div>
                  <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginTop: "2px" }}>Total Pertemuan</div>
                </div>
              </div>

              <div className="glass-card presensi-stats-card">
                <div style={{ fontSize: "1.8rem" }}>📈</div>
                <div>
                  <div style={{ fontSize: "1.3rem", fontWeight: "800", color: presensiStats.avgAttendance >= 85 ? "var(--success)" : "var(--warning)", lineHeight: 1.2 }}>{presensiStats.avgAttendance}%</div>
                  <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginTop: "2px" }}>Rata-Rata Kehadiran</div>
                </div>
              </div>

              <div className="glass-card presensi-stats-card presensi-accum-card">
                <div style={{ fontSize: "1.8rem" }}>📊</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                    <div>
                      <span style={{ fontSize: "1.05rem", fontWeight: "800", color: "var(--success)" }}>{presensiStats.totalH}</span>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginLeft: "4px", fontWeight: "600" }}>Hadir</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "1.05rem", fontWeight: "800", color: "var(--warning)" }}>{presensiStats.totalI}</span>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginLeft: "4px", fontWeight: "600" }}>Izin</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "1.05rem", fontWeight: "800", color: "#3b82f6" }}>{presensiStats.totalS}</span>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginLeft: "4px", fontWeight: "600" }}>Sakit</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "1.05rem", fontWeight: "800", color: "var(--danger)" }}>{presensiStats.totalA}</span>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginLeft: "4px", fontWeight: "600" }}>Alpa</span>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginTop: "4px" }}>Akumulasi Kehadiran Kelas</div>
                </div>
              </div>
            </div>
          )}

          {/* Collapsible Jurnal Agenda Pembelajaran */}
          {kelas.skemaPenilaian?.pertemuan?.length > 0 && (
            <div className="glass-card" style={{ padding: "16px 20px", margin: "0 24px 12px 24px", backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }} onClick={() => setAgendaCollapsed(!agendaCollapsed)}>
                <h5 style={{ fontSize: "0.95rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                  📖 Jurnal Agenda Pembelajaran ({kelas.skemaPenilaian.pertemuan.filter(p => p.materi || p.kegiatan || p.keterangan).length}/{kelas.skemaPenilaian.pertemuan.length} Terisi)
                </h5>
                <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: "800", display: "flex", alignItems: "center", gap: "4px" }}>
                  {agendaCollapsed ? "📖 Buka Jurnal" : "✕ Tutup Jurnal"}
                </span>
              </div>
              
              {!agendaCollapsed && (
                <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px", borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
                  {kelas.skemaPenilaian.pertemuan.map((p, idx) => {
                    const currentKegiatan = p.kegiatan || p.keterangan || "";
                    return (
                      <div key={p.id} style={{ display: "flex", gap: "16px", alignItems: "flex-start", padding: "10px 12px", borderBottom: idx === kelas.skemaPenilaian.pertemuan.length - 1 ? "none" : "1px dashed var(--border-color)", flexWrap: "wrap" }}>
                        <div style={{ minWidth: "120px", flex: "0 0 auto" }}>
                          <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{p.nama}</strong>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>{p.tanggal}</div>
                        </div>
                        
                        <div style={{ flex: "1 1 200px", fontSize: "0.85rem", alignSelf: "center", display: "flex", flexDirection: "column", gap: "6px" }}>
                          {p.materi ? (
                            <div>
                              <span style={{ fontWeight: "700", color: "var(--text-primary)" }}>📚 Materi: </span>
                              <span style={{ color: "var(--text-primary)" }}>{p.materi}</span>
                            </div>
                          ) : (
                            <div style={{ fontStyle: "italic", color: "var(--text-muted)" }}>📚 Materi belum diisi</div>
                          )}
                          {currentKegiatan ? (
                            <div>
                              <span style={{ fontWeight: "700", color: "var(--text-secondary)" }}>📝 Kegiatan: </span>
                              <span style={{ color: "var(--text-secondary)" }}>{currentKegiatan}</span>
                            </div>
                          ) : (
                            <div style={{ fontStyle: "italic", color: "var(--text-muted)" }}>📝 Kegiatan belum diisi</div>
                          )}
                        </div>

                        <button 
                          onClick={() => handleOpenEditPertemuan(p)} 
                          className="btn btn-secondary" 
                          style={{ padding: "6px 12px", fontSize: "0.75rem", borderColor: "var(--border-color)", flex: "0 0 auto", marginLeft: "auto" }}
                        >
                          ✏️ Tulis
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Hint scroll horizontal pada mobile */}
          {kelas.skemaPenilaian?.pertemuan?.length > 0 && (
            <div className="mobile-scroll-hint">
              ↔️ Geser tabel ke kanan untuk melihat rekap kehadiran
            </div>
          )}

          <div className="table-container" style={{ margin: 0, borderRadius: 0, borderRight: "none", borderLeft: "none", overflowX: "auto" }}>
            <table className="premium-table" style={{ width: "100%", minWidth: "600px" }}>
              <thead>
                <tr>
                  <th className="sticky-nama" style={{ width: "250px", position: "sticky", left: 0, zIndex: 22, backgroundColor: "var(--bg-tertiary)" }}>Nama Siswa</th>
                  {(kelas.skemaPenilaian?.pertemuan || []).map((p, idx) => (
                    <th key={p.id} style={{ minWidth: "120px", textAlign: "center", backgroundColor: "var(--bg-tertiary)", position: "relative" }}>
                      <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-primary)" }}>{p.nama}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "500", marginTop: "2px" }}>{p.tanggal}</div>
                      {p.materi && (
                        <div 
                          onClick={() => handleOpenEditPertemuan(p)}
                          title={`Materi: ${p.materi}`} 
                          style={{ 
                            fontSize: "0.68rem", 
                            backgroundColor: "rgba(59, 130, 246, 0.08)", 
                            color: "var(--primary)", 
                            padding: "2px 6px", 
                            borderRadius: "4px", 
                            marginTop: "4px", 
                            display: "inline-flex", 
                            alignItems: "center",
                            gap: "4px",
                            cursor: "pointer",
                            maxWidth: "110px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontWeight: "600",
                            marginLeft: "auto",
                            marginRight: "auto"
                          }}
                        >
                          📚 {p.materi}
                        </div>
                      )}
                      {(p.kegiatan || p.keterangan) && (
                        <div 
                          onClick={() => handleOpenEditPertemuan(p)}
                          title={`Kegiatan: ${p.kegiatan || p.keterangan}`} 
                          style={{ 
                            fontSize: "0.68rem", 
                            backgroundColor: "rgba(16, 185, 129, 0.08)", 
                            color: "var(--success)", 
                            padding: "2px 6px", 
                            borderRadius: "4px", 
                            marginTop: "4px", 
                            display: "inline-flex", 
                            alignItems: "center",
                            gap: "4px",
                            cursor: "pointer",
                            maxWidth: "110px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontWeight: "600",
                            marginLeft: "auto",
                            marginRight: "auto"
                          }}
                        >
                          📝 {p.kegiatan || p.keterangan}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "8px" }}>
                        <button onClick={() => handleOpenEditPertemuan(p)} style={{ background: "rgba(59, 130, 246, 0.1)", borderRadius: "4px", padding: "2px 6px", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: "0.7rem", fontWeight: "bold" }}>Ubah</button>
                        <button onClick={async () => {
                          if(!confirm(`Hapus ${p.nama}? Seluruh data kehadiran untuk pertemuan ini akan ikut terhapus.`)) return;
                          const updatedSkema = { ...kelas.skemaPenilaian, pertemuan: kelas.skemaPenilaian.pertemuan.filter(pt => pt.id !== p.id) };
                          setKelas({ ...kelas, skemaPenilaian: updatedSkema });
                          try {
                             await fetch(`/api/kelas/${kelas.id}`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ skemaPenilaian: updatedSkema }) });
                          } catch(e) {}
                        }} style={{ background: "rgba(239, 68, 68, 0.1)", borderRadius: "4px", padding: "2px 6px", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "0.7rem", fontWeight: "bold" }}>Hapus</button>
                      </div>
                    </th>
                  ))}
                  {(!kelas.skemaPenilaian?.pertemuan || kelas.skemaPenilaian.pertemuan.length === 0) && (
                    <th style={{ color: "var(--text-muted)", fontWeight: "500", fontStyle: "italic", textAlign: "center" }}>Belum ada pertemuan. Klik "Tambah Pertemuan".</th>
                  )}
                  {kelas.skemaPenilaian?.pertemuan?.length > 0 && (
                    <>
                      <th style={{ minWidth: "60px", textAlign: "center", backgroundColor: "var(--bg-tertiary)", color: "var(--success)" }}>H</th>
                      <th style={{ minWidth: "60px", textAlign: "center", backgroundColor: "var(--bg-tertiary)", color: "var(--warning)" }}>I</th>
                      <th style={{ minWidth: "60px", textAlign: "center", backgroundColor: "var(--bg-tertiary)", color: "#3b82f6" }}>S</th>
                      <th style={{ minWidth: "60px", textAlign: "center", backgroundColor: "var(--bg-tertiary)", color: "var(--danger)" }}>A</th>
                      <th style={{ minWidth: "90px", textAlign: "center", backgroundColor: "var(--bg-secondary)", color: "var(--primary)", fontWeight: "800" }}>% Hadir</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {kelas.siswa.length === 0 ? (
                  <tr>
                    <td colSpan={(kelas.skemaPenilaian?.pertemuan?.length || 0) + 1} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                      Belum ada siswa di kelas ini.
                    </td>
                  </tr>
                ) : kelas.siswa.map((siswa, sIdx) => (
                  <tr key={siswa.nisn}>
                    <td 
                      className={`sticky-nama ${expandedNama[siswa.nisn] ? 'expanded-active' : ''}`}
                      onClick={() => toggleNamaExpand(siswa.nisn)}
                      title="Klik untuk melihat nama lengkap"
                      style={{ position: "sticky", left: 0, zIndex: 12, fontWeight: "600", backgroundColor: "var(--bg-primary)", cursor: "pointer" }}
                    >
                      {siswa.nama}
                    </td>
                    {(kelas.skemaPenilaian?.pertemuan || []).map(p => {
                      const val = siswa.nilai[`_presensi_${p.id}`] || "";
                      return (
                        <td key={p.id} style={{ textAlign: "center", padding: "6px" }}>
                          <button 
                            onClick={() => {
                              const nextVal = val === "" ? "H" : val === "H" ? "I" : val === "I" ? "S" : val === "S" ? "A" : "";
                              const newSiswa = [...kelas.siswa];
                              newSiswa[sIdx].nilai[`_presensi_${p.id}`] = nextVal;
                              setKelas({ ...kelas, siswa: newSiswa });
                              
                              // Trigger auto save reusing handleSaveScore logic
                              handleSaveScore(siswa.nisn, `_presensi_${p.id}`, nextVal);
                            }}
                            title="Klik untuk mengubah"
                            style={{
                              width: "42px", height: "42px", borderRadius: "10px", border: val === "" ? "1px dashed var(--border-color)" : "none", fontWeight: "800", cursor: "pointer", fontSize: "1.1rem",
                              backgroundColor: val === 'H' ? "var(--success)" : val === 'I' ? "var(--warning)" : val === 'S' ? "#3b82f6" : val === 'A' ? "var(--danger)" : "transparent",
                              color: val === "" ? "var(--text-muted)" : "#fff",
                              transition: "all 0.2s"
                            }}>
                            {val || "-"}
                          </button>
                        </td>
                      )
                    })}
                    {(!kelas.skemaPenilaian?.pertemuan || kelas.skemaPenilaian.pertemuan.length === 0) && (
                      <td></td>
                    )}
                    {kelas.skemaPenilaian?.pertemuan?.length > 0 && (() => {
                      let countH = 0, countI = 0, countS = 0, countA = 0;
                      (kelas.skemaPenilaian?.pertemuan || []).forEach(p => {
                        const status = siswa.nilai[`_presensi_${p.id}`];
                        if (status === 'H') countH++;
                        else if (status === 'I') countI++;
                        else if (status === 'S') countS++;
                        else if (status === 'A') countA++;
                      });
                      const totalP = kelas.skemaPenilaian.pertemuan.length;
                      const persentase = totalP > 0 ? Math.round((countH / totalP) * 100) : 0;
                      return (
                        <>
                          <td style={{ textAlign: "center", fontWeight: "700", color: "var(--success)", backgroundColor: "rgba(16, 185, 129, 0.02)" }}>{countH}</td>
                          <td style={{ textAlign: "center", fontWeight: "700", color: "var(--warning)", backgroundColor: "rgba(245, 158, 11, 0.02)" }}>{countI}</td>
                          <td style={{ textAlign: "center", fontWeight: "700", color: "#3b82f6", backgroundColor: "rgba(59, 130, 246, 0.02)" }}>{countS}</td>
                          <td style={{ textAlign: "center", fontWeight: "700", color: "var(--danger)", backgroundColor: "rgba(239, 68, 68, 0.02)" }}>{countA}</td>
                          <td style={{ textAlign: "center", fontWeight: "800", color: "var(--primary)", backgroundColor: "rgba(59, 130, 246, 0.05)", fontSize: "1rem" }}>
                            {persentase}%
                          </td>
                        </>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: "20px", fontSize: "0.85rem", color: "var(--text-secondary)", justifyContent: "center", marginTop: "10px", flexWrap: "wrap", padding: "0 20px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}><div style={{ width: "16px", height: "16px", borderRadius: "4px", backgroundColor: "var(--success)" }}></div> Hadir (100)</span>
            <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}><div style={{ width: "16px", height: "16px", borderRadius: "4px", backgroundColor: "#3b82f6" }}></div> Sakit (50)</span>
            <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}><div style={{ width: "16px", height: "16px", borderRadius: "4px", backgroundColor: "var(--warning)" }}></div> Izin (50)</span>
            <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}><div style={{ width: "16px", height: "16px", borderRadius: "4px", backgroundColor: "var(--danger)" }}></div> Alpa (0)</span>
          </div>
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
            {(() => {
              const hasGroups = kelas.kolomNilai.some(col => col.isGroup && col.subKolom?.length > 0);
              return (
                <table className="premium-table" style={{ width: "100%", minWidth: "800px" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 20 }}>
                    <tr>
                      <th rowSpan={hasGroups ? 2 : 1} style={{ width: "140px", minWidth: "140px", cursor: "pointer", userSelect: "none", position: "sticky", top: 0, backgroundColor: "var(--bg-tertiary)", zIndex: 21 }} onClick={() => handleSort('nisn')}>
                        NISN {sortConfig.key === 'nisn' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                      </th>
                      <th className="sticky-nama" rowSpan={hasGroups ? 2 : 1} style={{ width: "240px", minWidth: "240px", position: "sticky", left: 0, top: 0, zIndex: 22, backgroundColor: "var(--bg-tertiary)", boxShadow: "4px 0 8px rgba(0,0,0,0.05)", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort('nama')}>
                        Nama Siswa {sortConfig.key === 'nama' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                      </th>
                      <th rowSpan={hasGroups ? 2 : 1} style={{ width: "140px", minWidth: "140px", position: "sticky", top: 0, backgroundColor: "var(--bg-tertiary)", zIndex: 21 }}>Tanggal Lahir</th>
                      
                      {/* Dynamic Headers based on columns */}
                      {kelas.kolomNilai.map(col => {
                        if (col.isGroup && col.subKolom?.length > 0) {
                          return (
                            <th key={col.id} colSpan={col.subKolom.length} style={{ textAlign: "center", position: "sticky", top: 0, backgroundColor: "var(--bg-tertiary)", zIndex: 21, borderBottom: "1px solid var(--border-color)", paddingBottom: "4px" }}>
                              {col.nama} ({col.bobot}%)
                            </th>
                          );
                        }
                        return (
                          <th key={col.id} rowSpan={hasGroups ? 2 : 1} style={{ textAlign: "center", minWidth: "100px", position: "sticky", top: 0, backgroundColor: "var(--bg-tertiary)", zIndex: 21 }}>
                            {col.nama} ({col.bobot}%)
                          </th>
                        );
                      })}

                      <th rowSpan={hasGroups ? 2 : 1} style={{ textAlign: "center", width: "140px", backgroundColor: "var(--bg-tertiary)", cursor: "pointer", userSelect: "none", position: "sticky", top: 0, zIndex: 21 }} onClick={() => handleSort('finalScore')}>
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
                      <th rowSpan={hasGroups ? 2 : 1} style={{ textAlign: "center", width: "80px", position: "sticky", top: 0, backgroundColor: "var(--bg-tertiary)", zIndex: 21 }}>Aksi</th>
                    </tr>
                    {hasGroups && (
                      <tr>
                        {kelas.kolomNilai.map(col => {
                          if (col.isGroup && col.subKolom?.length > 0) {
                            return col.subKolom.map(sub => (
                              <th key={sub.id} style={{ textAlign: "center", minWidth: "80px", position: "sticky", top: "45px", backgroundColor: "var(--bg-tertiary)", zIndex: 21, fontSize: "0.75rem", padding: "6px 8px", color: "var(--text-secondary)", fontWeight: "600" }}>
                                {sub.nama}
                              </th>
                            ));
                          }
                          return null;
                        })}
                      </tr>
                    )}
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
                        <td 
                          className={`sticky-nama ${expandedNama[student.nisn] ? 'expanded-active' : ''}`}
                          onClick={() => toggleNamaExpand(student.nisn)}
                          title="Klik untuk melihat nama lengkap"
                          style={{ width: "240px", minWidth: "240px", fontWeight: "700", position: "sticky", left: 0, zIndex: 5, backgroundColor: "var(--bg-secondary)", boxShadow: "4px 0 8px rgba(0,0,0,0.05)", cursor: "pointer" }}
                        >
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
                          const colsToRender = col.isGroup && col.subKolom?.length > 0 ? col.subKolom : [col];
                          
                          return colsToRender.map(sub => {
                            const cellKey = `${student.nisn}-${sub.id}`;
                            const currentStatus = saveStatus[cellKey] || "idle";

                            return (
                              <td key={sub.id} style={{ textAlign: "center", position: "relative" }}>
                                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", position: "relative", width: "80px" }}>
                                  <input
                                    id={`grade-${student.nisn}-${sub.id}`}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={temporaryScores[cellKey] !== undefined ? temporaryScores[cellKey] : (student.nilai[sub.id] !== null && student.nilai[sub.id] !== undefined ? student.nilai[sub.id] : "")}
                                    onChange={(e) => setTemporaryScores(prev => ({ ...prev, [cellKey]: e.target.value }))}
                                    onBlur={(e) => handleGradeBlur(student.nisn, sub.id, e.target.value)}
                                    onWheel={(e) => e.target.blur()}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleGradeBlur(student.nisn, sub.id, e.target.value);
                                        const currentRowIdx = sortedStudents.findIndex(s => s.nisn === student.nisn);
                                        const nextStudent = sortedStudents[currentRowIdx + 1];
                                        if (nextStudent) {
                                          const nextInput = document.getElementById(`grade-${nextStudent.nisn}-${sub.id}`);
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
                          });
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
          );
        })()}
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
                      <th style={{ textAlign: "center", padding: "8px 10px", fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", width: "120px" }}>Tampilkan Ke Siswa</th>
                      <th style={{ textAlign: "center", padding: "8px 10px", fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", width: "100px" }}>Bobot (%)</th>
                      <th style={{ textAlign: "center", padding: "8px 10px", fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", width: "60px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {kelas.kolomNilai.map((col) => (
                      <Fragment key={col.id}>
                        <tr style={{ borderBottom: col.isGroup ? "none" : "1px solid var(--border-color)", backgroundColor: col.isGroup ? "rgba(245, 158, 11, 0.05)" : "transparent" }}>
                          <td style={{ padding: "6px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {col.isGroup && <span style={{ fontSize: "0.75rem", color: "var(--warning)", fontWeight: "700", border: "1px solid var(--warning)", padding: "2px 4px", borderRadius: "4px" }}>GRUP</span>}
                              <input type="text" className="form-input" value={col.nama} onChange={(e) => handleColumnNameChange(col.id, e.target.value)} style={{ padding: "5px 8px", fontSize: "0.88rem", fontWeight: col.isGroup ? "700" : "400" }} />
                            </div>
                          </td>
                          <td style={{ padding: "6px 10px", textAlign: "center" }}>
                            <button
                              onClick={() => toggleAspectVisibility(col.id)}
                              className="btn btn-secondary"
                              style={{
                                padding: "4px 8px",
                                fontSize: "0.75rem",
                                borderColor: kelas.skemaPenilaian?.hiddenAspek?.includes(col.id) ? "var(--danger)" : "var(--success)",
                                color: kelas.skemaPenilaian?.hiddenAspek?.includes(col.id) ? "var(--danger)" : "var(--success)",
                                backgroundColor: kelas.skemaPenilaian?.hiddenAspek?.includes(col.id) ? "rgba(239, 68, 68, 0.05)" : "rgba(16, 185, 129, 0.05)"
                              }}
                              title={kelas.skemaPenilaian?.hiddenAspek?.includes(col.id) ? "Nilai tersembunyi bagi siswa" : "Nilai ditampilkan bagi siswa"}
                            >
                              {kelas.skemaPenilaian?.hiddenAspek?.includes(col.id) ? "🔒 Tersembunyi" : "👁️ Tampil"}
                            </button>
                          </td>
                          <td style={{ padding: "6px 10px", textAlign: "center" }}>
                            <input type="text" inputMode="numeric" pattern="[0-9]*" className="form-input" value={col.bobot} min={0} max={100} onChange={(e) => { if (e.target.value === "" || /^\d*$/.test(e.target.value)) handleBobotChange(col.id, e.target.value); }} style={{ padding: "5px 8px", fontSize: "0.88rem", textAlign: "center", fontWeight: col.isGroup ? "700" : "400" }} />
                          </td>
                          <td style={{ padding: "6px 10px", textAlign: "center" }}>
                            <button onClick={() => handleDeleteKolom(col.id, col.nama)} className="btn btn-secondary" style={{ color: "var(--danger)", padding: "3px 8px" }} title="Hapus aspek">🗑️</button>
                          </td>
                        </tr>
                        {col.isGroup && col.subKolom && col.subKolom.map((sub, sIdx) => (
                          <tr key={sub.id} style={{ borderBottom: sIdx === col.subKolom.length - 1 ? "1px solid var(--border-color)" : "none", backgroundColor: "rgba(245, 158, 11, 0.02)" }}>
                            <td style={{ padding: "4px 10px 4px 30px", position: "relative" }}>
                              <div style={{ position: "absolute", left: "14px", top: "-10px", bottom: "16px", width: "10px", borderLeft: "2px solid rgba(245, 158, 11, 0.3)", borderBottom: "2px solid rgba(245, 158, 11, 0.3)", borderRadius: "0 0 0 6px" }}></div>
                              <input type="text" className="form-input" value={sub.nama} onChange={(e) => {
                                const newCols = kelas.kolomNilai.map(c => c.id === col.id ? { ...c, subKolom: c.subKolom.map(s => s.id === sub.id ? { ...s, nama: e.target.value } : s) } : c);
                                setKelas({ ...kelas, kolomNilai: newCols });
                              }} style={{ padding: "3px 8px", fontSize: "0.8rem" }} />
                            </td>
                            <td colSpan={3} style={{ padding: "4px 10px", textAlign: "left", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span>Rata-rata otomatis</span>
                                <button onClick={() => {
                                  if(!confirm(`Hapus sub-aspek ${sub.nama}?`)) return;
                                  const newCols = kelas.kolomNilai.map(c => c.id === col.id ? { ...c, subKolom: c.subKolom.filter(s => s.id !== sub.id) } : c);
                                  setKelas({ ...kelas, kolomNilai: newCols });
                                }} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "0.8rem", padding: "0" }}>✖</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {col.isGroup && (
                          <tr style={{ borderBottom: "1px solid var(--border-color)", backgroundColor: "rgba(245, 158, 11, 0.02)" }}>
                            <td colSpan={4} style={{ padding: "4px 10px 8px 30px" }}>
                              <button onClick={() => {
                                const newCols = kelas.kolomNilai.map(c => c.id === col.id ? { ...c, subKolom: [...(c.subKolom || []), { id: `${c.id}-sub-new-${Date.now()}`, nama: "" }] } : c);
                                setKelas({ ...kelas, kolomNilai: newCols });
                              }} className="btn btn-secondary" style={{ fontSize: "0.75rem", padding: "3px 8px", color: "var(--primary)" }}>+ Tambah Sub-Aspek</button>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                    {/* Baris tambah baru (Seamless) */}
                    {newAspects.map((aspect, index) => (
                      <Fragment key={aspect.id}>
                        <tr style={{ borderTop: index === 0 ? "2px dashed var(--border-color)" : "none", backgroundColor: "rgba(59,130,246,0.03)" }}>
                          <td style={{ padding: "8px 10px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              <input type="text" className="form-input" placeholder="+ Nama aspek baru" value={aspect.nama} onChange={(e) => handleNewAspectChange(aspect.id, 'nama', e.target.value)} style={{ padding: "5px 8px", fontSize: "0.88rem" }} />
                              {aspect.nama && (
                                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                                  <input type="checkbox" checked={aspect.isGroup} onChange={(e) => handleNewAspectChange(aspect.id, 'isGroup', e.target.checked)} style={{ accentColor: "var(--primary)", width: "14px", height: "14px" }} />
                                  Jadikan Kelompok Nilai (Sub-Aspek)
                                </label>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center", verticalAlign: "top" }}>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>Otomatis Tampil</span>
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center", verticalAlign: "top" }}>
                            <input type="text" inputMode="numeric" pattern="[0-9]*" className="form-input" placeholder="%" value={aspect.bobot} min={1} max={100} onChange={(e) => { if (e.target.value === "" || /^\d*$/.test(e.target.value)) handleNewAspectChange(aspect.id, 'bobot', e.target.value); }} style={{ padding: "5px 8px", fontSize: "0.88rem", textAlign: "center" }} />
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center", verticalAlign: "top" }}>
                            {index !== newAspects.length - 1 ? (
                              <button onClick={() => handleRemoveNewAspect(aspect.id)} className="btn btn-secondary" style={{ color: "var(--danger)", padding: "3px 8px", fontSize: "0.8rem", minWidth: "30px" }} title="Batal tambah">✖</button>
                            ) : (
                              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", cursor: "default" }}>✧</span>
                            )}
                          </td>
                        </tr>
                        {aspect.isGroup && aspect.subKolom && aspect.subKolom.map((sub, sIdx) => (
                          <tr key={sub.id} style={{ backgroundColor: "rgba(59,130,246,0.02)" }}>
                            <td style={{ padding: "4px 10px 4px 30px", position: "relative" }}>
                              <div style={{ position: "absolute", left: "14px", top: "-10px", bottom: "16px", width: "10px", borderLeft: "2px solid rgba(59, 130, 246, 0.3)", borderBottom: "2px solid rgba(59, 130, 246, 0.3)", borderRadius: "0 0 0 6px" }}></div>
                              <input type="text" className="form-input" placeholder="Nama sub-aspek (misal: KD 1)" value={sub.nama} onChange={(e) => {
                                const newSub = aspect.subKolom.map(s => s.id === sub.id ? { ...s, nama: e.target.value } : s);
                                handleNewAspectChange(aspect.id, 'subKolom', newSub);
                              }} style={{ padding: "3px 8px", fontSize: "0.8rem" }} />
                            </td>
                            <td colSpan={3} style={{ padding: "4px 10px", textAlign: "left", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              <button onClick={() => {
                                const newSub = aspect.subKolom.filter(s => s.id !== sub.id);
                                handleNewAspectChange(aspect.id, 'subKolom', newSub);
                              }} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "0.8rem", padding: "0" }}>✖</button>
                            </td>
                          </tr>
                        ))}
                        {aspect.isGroup && (
                          <tr style={{ backgroundColor: "rgba(59,130,246,0.02)", borderBottom: "1px solid rgba(59,130,246,0.1)" }}>
                            <td colSpan={4} style={{ padding: "4px 10px 10px 30px" }}>
                              <button onClick={() => {
                                const newSub = [...(aspect.subKolom || []), { id: Date.now()+Math.random(), nama: "" }];
                                handleNewAspectChange(aspect.id, 'subKolom', newSub);
                              }} className="btn btn-secondary" style={{ fontSize: "0.75rem", padding: "3px 8px", color: "var(--primary)" }}>+ Tambah Sub-Aspek</button>
                            </td>
                          </tr>
                        )}
                      </Fragment>
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
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <button onClick={handleOpenDuplicate} className="btn btn-secondary" style={{ padding: "5px 12px", fontSize: "0.82rem" }} title="Salin Aspek & Bobot dari Kelas Lain" disabled={isSavingBobot}>
                      📋 Salin dari Kelas Lain
                    </button>
                    <button
                      onClick={saveAllBobot}
                      className="btn btn-primary"
                      style={{ padding: "5px 16px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "7px", minWidth: "110px", justifyContent: "center" }}
                      disabled={isSavingBobot}
                    >
                      {isSavingBobot ? (
                        <>
                          <span style={{
                            display: "inline-block",
                            width: "13px",
                            height: "13px",
                            border: "2px solid rgba(255,255,255,0.4)",
                            borderTopColor: "#fff",
                            borderRadius: "50%",
                            animation: "spin 0.7s linear infinite",
                            flexShrink: 0
                          }} />
                          Menyimpan...
                        </>
                      ) : (
                        <>💾 Simpan</>
                      )}
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

          <button 
            onClick={() => setRaporModalOpen(true)} 
            className="btn btn-primary" 
            style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.9rem", marginTop: "4px" }}
            disabled={kelas.kolomNilai.length === 0 || kelas.siswa.length === 0}
          >
            🔌 Integrasi E-Rapor
          </button>

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

      {/* Off-Screen Dashboard for Overview Kelas Export (1080x1920 - 16:9 Portrait) */}
      <div id={`export-class-dashboard-${classId}`} style={{
        position: "absolute", left: "-9999px", top: 0, width: "1080px", height: "1920px", overflow: "hidden",
        backgroundColor: "#0f172a", padding: "80px 100px", 
        boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "40px",
        color: "#f8fafc", fontFamily: "sans-serif"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "10px", borderBottom: "2px solid #334155", paddingBottom: "24px" }}>
          <div>
            <h2 style={{ fontSize: "3.2rem", fontWeight: "900", color: "#10b981", margin: 0, letterSpacing: "-1px" }}>OVERVIEW KELAS</h2>
            <p style={{ fontSize: "1.4rem", color: "#94a3b8", margin: "8px 0 0 0", fontWeight: "600" }}>
              Tahun Ajaran {kelas?.tahunAjaran || ""} &bull; Semester {kelas?.semester || "Ganjil"}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h3 style={{ fontSize: "2.6rem", fontWeight: "900", margin: 0, letterSpacing: "-1.5px", background: "linear-gradient(135deg, #f8fafc 30%, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>CekNilai</h3>
            <p style={{ fontSize: "1rem", color: "#64748b", margin: "4px 0 0 0", fontWeight: "700", letterSpacing: "1px" }}>ANALYTICS REPORT</p>
          </div>
        </div>

        {/* SECTION 1: Identitas & Top Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }}>
          <div style={{ backgroundColor: "#1e293b", padding: "30px 40px", borderRadius: "24px", border: "1px solid #334155", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <p style={{ color: "#94a3b8", fontSize: "1.1rem", margin: "0 0 4px 0", fontWeight: "700", letterSpacing: "1px" }}>NAMA KELAS</p>
                <p style={{ fontSize: "2.2rem", fontWeight: "800", margin: 0, color: "#f8fafc" }}>{kelas?.nama || "-"}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: "#94a3b8", fontSize: "1.1rem", margin: "0 0 4px 0", fontWeight: "700", letterSpacing: "1px" }}>MATA PELAJARAN</p>
                <p style={{ fontSize: "1.8rem", fontWeight: "700", margin: 0, color: "#38bdf8" }}>{kelas?.mataPelajaran || "-"}</p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <p style={{ color: "#94a3b8", fontSize: "1.1rem", margin: "0 0 4px 0", fontWeight: "700", letterSpacing: "1px" }}>GURU PENGAMPU</p>
                <p style={{ fontSize: "1.6rem", fontWeight: "700", margin: 0, color: "#e2e8f0" }}>{guruProfile?.nama || kelas?.userId || "Guru Pengampu"}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: "#94a3b8", fontSize: "1.1rem", margin: "0 0 4px 0", fontWeight: "700", letterSpacing: "1px" }}>TOTAL SISWA</p>
                <p style={{ fontSize: "2.2rem", fontWeight: "800", margin: 0, color: "#f8fafc" }}>{analyticsData?.totalCount ?? 0}</p>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: "#1e293b", padding: "30px 40px", borderRadius: "24px", border: "1px solid #334155", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", position: "relative", overflow: "hidden" }}>
             <div style={{ position: "absolute", right: "-20px", top: "-20px", fontSize: "8rem", opacity: 0.05 }}>📊</div>
             <p style={{ color: "#38bdf8", fontSize: "1.2rem", margin: "0 0 10px 0", fontWeight: "800", letterSpacing: "1.5px", textTransform: "uppercase" }}>Rata-Rata Kelas</p>
             <h1 style={{ fontSize: "6rem", fontWeight: "900", margin: 0, lineHeight: 1, color: "#10b981" }}>{analyticsData?.classAvg ?? "-"}</h1>
             <p style={{ color: "#94a3b8", fontSize: "1.1rem", margin: "16px 0 0 0", fontWeight: "600" }}>Dari {analyticsData?.completeCount ?? 0} siswa bernilai lengkap</p>
          </div>
        </div>

        {/* SECTION 2: Kelulusan & Nilai Ekstrem */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Donut Chart Kelulusan */}
          <div style={{ backgroundColor: "#1e293b", padding: "30px 40px", borderRadius: "24px", border: "1px solid #334155", display: "flex", alignItems: "center", gap: "30px" }}>
             {(() => {
               const pass = analyticsData?.passCount ?? 0;
               const total = analyticsData?.completeCount || 1; // avoid div by 0
               const fail = total - pass;
               const passPct = Math.round((pass / total) * 100);
               const failPct = 100 - passPct;
               const R = 70;
               const C = 2 * Math.PI * R;
               const passDash = (passPct / 100) * C;
               return (
                 <>
                   <div style={{ position: "relative", width: "160px", height: "160px" }}>
                     <svg width="160" height="160" viewBox="0 0 160 160">
                        {/* Circle Background */}
                        <circle cx="80" cy="80" r={R} fill="none" stroke="#f43f5e" strokeWidth="16" />
                        {/* Circle Pass */}
                        <circle cx="80" cy="80" r={R} fill="none" stroke="#10b981" strokeWidth="16" strokeDasharray={`${passDash} ${C}`} strokeLinecap="round" transform="rotate(-90 80 80)" />
                     </svg>
                     <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: "2rem", fontWeight: "900", color: "#f8fafc", lineHeight: 1 }}>{passPct}%</span>
                        <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: "700" }}>LULUS</span>
                     </div>
                   </div>
                   <div style={{ flex: 1 }}>
                     <p style={{ color: "#38bdf8", fontSize: "1.1rem", margin: "0 0 16px 0", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase" }}>Tingkat Kelulusan</p>
                     <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                       <div style={{ width: "16px", height: "16px", borderRadius: "4px", backgroundColor: "#10b981" }}></div>
                       <div style={{ flex: 1, fontSize: "1.1rem", fontWeight: "700", color: "#e2e8f0" }}>Lulus (≥ {kelas?.kkm ?? 75})</div>
                       <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#10b981" }}>{pass}</div>
                     </div>
                     <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                       <div style={{ width: "16px", height: "16px", borderRadius: "4px", backgroundColor: "#f43f5e" }}></div>
                       <div style={{ flex: 1, fontSize: "1.1rem", fontWeight: "700", color: "#e2e8f0" }}>Belum Lulus</div>
                       <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#f43f5e" }}>{fail}</div>
                     </div>
                   </div>
                 </>
               );
             })()}
          </div>

          {/* Extremes */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ backgroundColor: "#1e293b", padding: "26px 30px", borderRadius: "24px", border: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center", flex: 1 }}>
               <div>
                 <p style={{ color: "#eab308", fontSize: "1rem", margin: "0 0 6px 0", fontWeight: "700", letterSpacing: "1px" }}>NILAI TERTINGGI</p>
                 <h3 style={{ fontSize: "2.5rem", fontWeight: "900", margin: 0, color: "#f8fafc" }}>{analyticsData?.highest?.finalScore ?? "-"}</h3>
                 <p style={{ color: "#94a3b8", fontSize: "1.1rem", margin: "6px 0 0 0", fontWeight: "600" }}>{analyticsData?.highest?.nama ?? ""}</p>
               </div>
               <div style={{ fontSize: "3rem" }}>🏆</div>
            </div>
            <div style={{ backgroundColor: "#1e293b", padding: "26px 30px", borderRadius: "24px", border: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center", flex: 1 }}>
               <div>
                 <p style={{ color: "#f43f5e", fontSize: "1rem", margin: "0 0 6px 0", fontWeight: "700", letterSpacing: "1px" }}>NILAI TERENDAH</p>
                 <h3 style={{ fontSize: "2.5rem", fontWeight: "900", margin: 0, color: "#f8fafc" }}>{analyticsData?.lowest?.finalScore ?? "-"}</h3>
                 <p style={{ margin: "6px 0 0 0", height: "1.1rem" }}></p>
               </div>
               <div style={{ fontSize: "3rem" }}>📉</div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Radar Chart & Predikat */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", flex: 1 }}>
           
           {/* Radar Chart: Rata-rata per Aspek */}
           <div style={{ backgroundColor: "#1e293b", padding: "30px", borderRadius: "24px", border: "1px solid #334155", display: "flex", flexDirection: "column", alignItems: "center" }}>
             <p style={{ color: "#38bdf8", fontSize: "1.2rem", margin: "0 0 20px 0", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase", alignSelf: "flex-start", paddingLeft: "10px" }}>Rata-Rata per Aspek</p>
             {(() => {
                const aspects = analyticsData?.aspectAvg || [];
                if (aspects.length < 3) {
                  return (
                    <div style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column", gap: "16px", justifyContent: "center" }}>
                      {aspects.map(aspect => (
                        <div key={aspect.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", backgroundColor: "#0f172a", borderRadius: "16px", border: "1px solid #334155" }}>
                           <div>
                             <div style={{ fontSize: "1.3rem", fontWeight: "700", color: "#f8fafc" }}>{aspect.nama}</div>
                             <div style={{ fontSize: "1rem", color: "#94a3b8", fontWeight: "600", marginTop: "4px" }}>Bobot {aspect.bobot}%</div>
                           </div>
                           <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                             <div style={{ fontSize: "2.5rem", fontWeight: "900", lineHeight: 1, color: aspect.avg >= (kelas?.kkm ?? 75) ? "#10b981" : "#f43f5e" }}>
                               {aspect.avg}
                             </div>
                             <div style={{ fontSize: "0.85rem", color: "#eab308", fontWeight: "700" }}>🏆 {aspect.topStudent}</div>
                           </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                const N = aspects.length;
                const CX = 170, CY = 160, R = 100; // Smaller radius to fit tighter column
                const toXY = (i, val) => {
                  const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
                  const r = (val / 100) * R;
                  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
                };
                const gridLevels = [20, 40, 60, 80, 100];
                
                // Helper to abbreviate long aspect names (e.g., "Ujian Tengah Semester" -> "UTS")
                const abbreviate = (name) => {
                  if (name.length <= 12) return name;
                  const words = name.split(/[\s_-]+/);
                  if (words.length > 1) {
                     return words.map(w => w.charAt(0).toUpperCase() + (/\d+/.test(w) ? w.replace(/\D/g, '') : '')).join("");
                  }
                  return name.substring(0, 10) + "..";
                };

                return (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, width: "100%" }}>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
                      <svg width="340" height="320" viewBox="0 0 340 320" xmlns="http://www.w3.org/2000/svg">
                        {/* Grid polygons */}
                        {gridLevels.map(level => (
                          <polygon
                            key={level}
                            points={Array.from({ length: N }, (_, i) => {
                              const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
                              const r = (level / 100) * R;
                              return `${CX + r * Math.cos(angle)},${CY + r * Math.sin(angle)}`;
                            }).join(" ")}
                            fill="none" stroke={level === 100 ? "#475569" : "#1e3a5f"} strokeWidth={level === 100 ? "1.5" : "1"}
                          />
                        ))}
                        {/* Grid lines */}
                        {aspects.map((_, i) => {
                          const [x, y] = toXY(i, 100);
                          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#334155" strokeWidth="1" />;
                        })}
                        {/* Data polygon */}
                        <polygon
                          points={aspects.map((col, i) => toXY(i, col.avg).join(",")).join(" ")}
                          fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth="3"
                        />
                        {/* Data points */}
                        {aspects.map((col, i) => {
                          const [x, y] = toXY(i, col.avg);
                          return <circle key={i} cx={x} cy={y} r="6" fill="#10b981" stroke="#f8fafc" strokeWidth="2.5" />;
                        })}
                        {/* Data labels (values) */}
                        {aspects.map((col, i) => {
                          const [x, y] = toXY(i, col.avg);
                          const offsetY = y < CY ? -14 : 22;
                          return <text key={i} x={x} y={y + offsetY} fill="#38bdf8" fontSize="16" fontWeight="800" textAnchor="middle">{col.avg}</text>;
                        })}
                        {/* Axis labels (names) */}
                        {aspects.map((col, i) => {
                          const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
                          const lr = R + 25; // Label radius
                          const lx = CX + lr * Math.cos(angle);
                          const ly = CY + lr * Math.sin(angle);
                          const label = abbreviate(col.nama);
                          return (
                            <text key={i} x={lx} y={ly} fill="#cbd5e1" fontSize="12" fontWeight="700" textAnchor="middle" dominantBaseline="middle">
                              {label}
                            </text>
                          );
                        })}
                      </svg>
                    </div>

                    {/* Top Achievers per Aspect */}
                    <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", width: "100%", padding: "10px 0 0 0" }}>
                      {aspects.slice(0, 10).map(col => (
                         <div key={col.id} style={{ display: "flex", flexDirection: "column", gap: "6px", backgroundColor: "#0f172a", padding: "12px 14px", borderRadius: "10px", border: "1px solid #334155" }}>
                            <div style={{ fontSize: "0.95rem", color: "#94a3b8", fontWeight: "700", whiteSpace: "normal", wordBreak: "break-word", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {col.nama}
                            </div>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", width: "100%" }}>
                              <span style={{ fontSize: "1.1rem", marginTop: "1px" }}>🏆</span>
                              <div style={{ fontSize: "1.1rem", color: "#eab308", fontWeight: "800", whiteSpace: "normal", wordBreak: "break-word", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1, lineHeight: "1.3" }}>
                                {col.topStudent}
                              </div>
                            </div>
                         </div>
                      ))}
                    </div>
                  </div>
                );
             })()}
           </div>

           {/* Bar Chart: Distribusi Predikat */}
           <div style={{ backgroundColor: "#1e293b", padding: "30px", borderRadius: "24px", border: "1px solid #334155", display: "flex", flexDirection: "column" }}>
             <p style={{ color: "#38bdf8", fontSize: "1.2rem", margin: "0 0 30px 0", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase" }}>Distribusi Predikat</p>
             <div style={{ display: "flex", flexDirection: "column", gap: "36px", flex: 1 }}>
                {analyticsData?.gradeDist && Object.entries(analyticsData.gradeDist).map(([pred, count]) => {
                  const maxCount = Math.max(...Object.values(analyticsData.gradeDist), 1);
                  const pct = Math.round((count / maxCount) * 100);
                  const color = pred === 'A' || pred === 'B' ? '#10b981' : pred === 'C' ? '#f59e0b' : '#f43f5e';
                  return (
                    <div key={pred} style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                       <div style={{ width: "50px", height: "50px", borderRadius: "12px", backgroundColor: "rgba(15,23,42,0.5)", border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", fontWeight: "900", color }}>
                         {pred}
                       </div>
                       <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                           <span style={{ fontSize: "1rem", color: "#94a3b8", fontWeight: "700" }}>
                             {pred === 'A' ? "Sangat Baik" : pred === 'B' ? "Baik" : pred === 'C' ? "Cukup" : "Kurang"}
                           </span>
                           <span style={{ fontSize: "1.4rem", fontWeight: "900", color: "#f8fafc" }}>{count} <span style={{ fontSize: "1rem", fontWeight: "600", color: "#64748b" }}>siswa</span></span>
                         </div>
                         <div style={{ width: "100%", backgroundColor: "#0f172a", height: "16px", borderRadius: "8px", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: "8px", position: "relative" }}>
                              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)" }}></div>
                            </div>
                         </div>
                       </div>
                    </div>
                  );
                })}
             </div>
           </div>
        </div>
        
        {/* Footer / Watermark */}
        <div style={{ textAlign: "center", marginTop: "auto", borderTop: "1px solid #334155", paddingTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#64748b", fontSize: "1rem", fontWeight: "600", letterSpacing: "1px" }}>
            Di-generate otomatis dari CekNilai App
          </div>
          <div style={{ color: "#475569", fontSize: "0.9rem", fontWeight: "600", fontFamily: "monospace" }}>
            ID: {classId.substring(0, 8).toUpperCase()} / {new Date().toLocaleDateString('id-ID')}
          </div>
        </div>
      </div>
      
      {/* Modal Download Generated Overview */}
      {generatedOverviewImage && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} className="animate-fade-in">
          <div className="glass-card" style={{ width: "95%", maxWidth: "600px", padding: "30px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", maxHeight: "90vh", overflowY: "auto", border: "1px solid rgba(255,255,255,0.1)", background: "var(--bg-primary)" }}>
            <button onClick={() => setGeneratedOverviewImage(null)} style={{ position: "absolute", top: "15px", right: "15px", background: "rgba(255,255,255,0.1)", border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", cursor: "pointer", color: "var(--text-primary)", transition: "all 0.2s" }}>✕</button>
            
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "3rem", marginBottom: "10px" }}>✅</div>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "800", margin: "0 0 8px 0" }}>Overview Berhasil Dibuat!</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>Klik tombol unduh di bawah untuk menyimpannya ke perangkat Anda.</p>
            </div>
            
            <div style={{ width: "100%", borderRadius: "12px", overflowY: "auto", overflowX: "hidden", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.4)", maxHeight: "40vh" }}>
              <img src={generatedOverviewImage.url} alt="Overview Kelas" style={{ width: "100%", height: "auto", display: "block" }} />
            </div>
            
            <div style={{ display: "flex", gap: "12px", width: "100%" }}>
              <button onClick={() => setGeneratedOverviewImage(null)} className="btn btn-secondary" style={{ flex: 1, padding: "12px", fontSize: "0.95rem" }}>Tutup</button>
              <a href={generatedOverviewImage.url} download={generatedOverviewImage.filename} className="btn btn-primary" style={{ flex: 2, padding: "12px", fontSize: "0.95rem", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }} onClick={() => setTimeout(() => setGeneratedOverviewImage(null), 500)}>
                ⬇️ Unduh Gambar (PNG)
              </a>
            </div>
          </div>
        </div>
      )}

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
        
        .presensi-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          padding: 0 24px;
          margin-bottom: 12px;
        }

        .presensi-stats-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background-color: var(--bg-tertiary);
          border: 1px solid var(--border-color);
        }

        .presensi-accum-card {
          grid-column: span 2;
        }

        .mobile-scroll-hint {
          display: none;
        }
        
        @media (max-width: 1024px) {
          .presensi-stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
          }
        }

        @media (max-width: 768px) {
          .sticky-nama {
            position: sticky !important;
            left: 0 !important;
            max-width: 130px !important;
            min-width: 130px !important;
            width: 130px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            background-color: var(--bg-primary) !important;
            box-shadow: 4px 0 8px rgba(0,0,0,0.08) !important;
            z-index: 10 !important;
            transition: all 0.2s ease;
          }
          
          .sticky-nama.expanded-active {
            max-width: 250px !important;
            min-width: 250px !important;
            width: 250px !important;
            white-space: normal !important;
            word-break: break-word !important;
            z-index: 15 !important;
            overflow: visible !important;
          }

          th.sticky-nama {
            background-color: var(--bg-tertiary) !important;
            z-index: 11 !important;
          }
          
          .mobile-scroll-hint {
            display: block;
            font-size: 0.72rem;
            color: var(--text-muted);
            text-align: center;
            margin-top: 4px;
            margin-bottom: 12px;
            font-style: italic;
          }
        }

        @media (max-width: 576px) {
          .presensi-stats-grid {
            grid-template-columns: 1fr;
            padding: 0 16px;
            gap: 12px;
          }
          .presensi-accum-card {
            grid-column: span 1;
          }
          .presensi-stats-card {
            padding: 12px 16px;
            gap: 12px;
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

      {/* Presensi Settings Modal */}
      {presensiModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px", backdropFilter: "blur(4px)" }}>
          <div className="glass-card" style={{ width: "100%", maxWidth: "500px", padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800" }}>⚙️ Pengaturan Presensi</h3>
              <button onClick={() => setPresensiModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", backgroundColor: "var(--bg-tertiary)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                <input 
                  type="checkbox" 
                  id="gunakanPresensi"
                  checked={presensiConfigTemp.digunakan}
                  onChange={(e) => setPresensiConfigTemp({...presensiConfigTemp, digunakan: e.target.checked})}
                  style={{ width: "20px", height: "20px", marginTop: "2px", accentColor: "var(--primary)" }}
                />
                <div>
                  <label htmlFor="gunakanPresensi" style={{ fontWeight: "700", fontSize: "1rem", cursor: "pointer", color: "var(--text-primary)" }}>Gunakan Presensi sebagai Aspek Nilai Akhir</label>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                    Jika diaktifkan, rata-rata poin kehadiran akan menyumbang persentase pada Nilai Akhir siswa.
                  </p>
                </div>
              </div>

              {presensiConfigTemp.digunakan && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-secondary)" }}>Bobot Presensi (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={presensiConfigTemp.bobot || ""}
                    onChange={(e) => setPresensiConfigTemp({...presensiConfigTemp, bobot: Number(e.target.value)})}
                    className="input-field"
                    placeholder="Contoh: 10"
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Saran: Jika bobot presensi 10%, pastikan sisa 90% dibagi ke aspek akademik lainnya agar total pas 100%.</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
              <button onClick={() => setPresensiModalOpen(false)} className="btn btn-secondary">Batal</button>
              <button 
                onClick={async () => {
                  setIsSavingPresensi(true);
                  const updatedSkema = { ...kelas.skemaPenilaian, presensi: presensiConfigTemp };
                  try {
                    const response = await fetch(`/api/kelas/${kelas.id}`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ skemaPenilaian: updatedSkema }) });
                    if (response.ok) {
                      setKelas({ ...kelas, skemaPenilaian: updatedSkema });
                      setPresensiModalOpen(false);
                    } else {
                      alert("Gagal menyimpan pengaturan presensi.");
                    }
                  } catch (e) {
                    console.error(e);
                    alert("Terjadi kesalahan.");
                  } finally {
                    setIsSavingPresensi(false);
                  }
                }} 
                className="btn btn-primary"
                disabled={isSavingPresensi || (presensiConfigTemp.digunakan && (!presensiConfigTemp.bobot || presensiConfigTemp.bobot <= 0))}
              >
                {isSavingPresensi ? "Menyimpan..." : "Simpan Pengaturan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tambah/Edit Pertemuan Modal */}
      {pertemuanModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px", backdropFilter: "blur(4px)" }}>
          <div className="glass-card" style={{ width: "100%", maxWidth: "450px", padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--text-primary)" }}>
                {isEditingPertemuan ? "✏️ Edit Pertemuan" : "📅 Tambah Pertemuan Baru"}
              </h3>
              <button onClick={() => setPertemuanModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-secondary)" }}>Nama Pertemuan</label>
                <input
                  type="text"
                  value={pertemuanNama}
                  onChange={(e) => setPertemuanNama(e.target.value)}
                  className="input-field"
                  placeholder="Contoh: Pertemuan 1"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    fontSize: "0.95rem"
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-secondary)" }}>Tanggal Pertemuan</label>
                <input
                  type="date"
                  value={pertemuanTanggal}
                  onChange={(e) => setPertemuanTanggal(e.target.value)}
                  className="input-field"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    fontSize: "0.95rem"
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-secondary)" }}>Materi Pembelajaran (Opsional)</label>
                <input
                  type="text"
                  value={pertemuanMateri}
                  onChange={(e) => setPertemuanMateri(e.target.value)}
                  className="input-field"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    fontSize: "0.95rem"
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-secondary)" }}>Kegiatan Pembelajaran (Opsional)</label>
                <textarea
                  value={pertemuanKegiatan}
                  onChange={(e) => setPertemuanKegiatan(e.target.value)}
                  className="input-field"
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    fontSize: "0.95rem",
                    resize: "vertical"
                  }}
                />
              </div>

              {isEditingPertemuan && (
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-secondary)" }}>⚡ Presensi Massal (Bulk)</label>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>Ubah status kehadiran seluruh siswa di pertemuan ini sekaligus.</p>
                  <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                    {[
                      { val: 'H', label: 'Hadir', color: 'var(--success)' },
                      { val: 'I', label: 'Izin', color: 'var(--warning)' },
                      { val: 'S', label: 'Sakit', color: '#3b82f6' },
                      { val: 'A', label: 'Alpa', color: 'var(--danger)' },
                      { val: '', label: 'Kosongkan', color: 'var(--text-muted)' }
                    ].map(item => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => {
                          if (confirm(`Ubah status kehadiran SEMUA siswa di ${pertemuanNama} menjadi "${item.label}"?`)) {
                            handleBulkPresensi(selectedPertemuanId, item.val);
                          }
                        }}
                        className="btn"
                        style={{
                          flex: "1 1 auto",
                          padding: "8px 10px",
                          fontSize: "0.75rem",
                          fontWeight: "800",
                          backgroundColor: "var(--bg-tertiary)",
                          border: "1px solid var(--border-color)",
                          color: item.color,
                          cursor: "pointer",
                          borderRadius: "var(--radius-sm)",
                          transition: "all 0.2s"
                        }}
                      >
                        {item.val || "∅"} {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
              <button onClick={() => setPertemuanModalOpen(false)} className="btn btn-secondary">Batal</button>
              <button 
                onClick={handleSavePertemuan} 
                className="btn btn-primary"
                disabled={isSavingPertemuan || !pertemuanNama.trim() || !pertemuanTanggal}
              >
                {isSavingPertemuan ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      <RaporIntegrationModal
        isOpen={raporModalOpen}
        onClose={() => setRaporModalOpen(false)}
        kelas={kelas}
        students={sortedStudents}
      />

    </>
  );
}
