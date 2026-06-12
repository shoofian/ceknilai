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
  const [nilaiKatrol, setNilaiKatrol] = useState("");
  const [siswaError, setSiswaError] = useState("");

  // States untuk Kolom Nilai
  const [kolomModalOpen, setKolomModalOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [newAspects, setNewAspects] = useState([{ id: Date.now(), nama: "", bobot: "", isGroup: false, subKolom: [] }]);
  const [kolomError, setKolomError] = useState("");
  const [activeAspectId, setActiveAspectId] = useState(null);
  const [initialHiddenAspek, setInitialHiddenAspek] = useState([]);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  
  // Status penyimpanan otomatis tabel nilai
  const [saveStatus, setSaveStatus] = useState({}); // { [nisn-colId]: 'idle' | 'saving' | 'saved' }


  // States untuk Status Nilai
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

  // States untuk Panduan Bantuan
  const [panduanModalOpen, setPanduanModalOpen] = useState(false);
  const [panduanActiveTab, setPanduanActiveTab] = useState("aspek"); // aspek, kkm, siswa, ekspor, erapor, katrol

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
  const [initialKolomNilai, setInitialKolomNilai] = useState([]);
  const [deletedKolomIds, setDeletedKolomIds] = useState([]);

  // States untuk Katrol Nilai Baru
  const [katrolModalOpen, setKatrolModalOpen] = useState(false);
  const [katrolSiswa, setKatrolSiswa] = useState(null);
  const [katrolValue, setKatrolValue] = useState("");
  const [isSavingKatrol, setIsSavingKatrol] = useState(false);

  useEffect(() => {
    if (kolomModalOpen && kelas) {
      setInitialKolomNilai(JSON.parse(JSON.stringify(kelas.kolomNilai)));
      setInitialHiddenAspek(JSON.parse(JSON.stringify(kelas.skemaPenilaian?.hiddenAspek || [])));
      setDeletedKolomIds([]);
      if (kelas.kolomNilai && kelas.kolomNilai.length > 0) {
        setActiveAspectId(kelas.kolomNilai[0].id);
        setNewAspects([]);
      } else {
        const newId = `new-aspect-${Date.now()}`;
        setNewAspects([{ id: newId, nama: "", bobot: "", isGroup: false, subKolom: [] }]);
        setActiveAspectId(newId);
      }
    }
  }, [kolomModalOpen]);

  const hasUnsavedChanges = () => {
    if (deletedKolomIds.length > 0) return true;

    const activeNewAspects = newAspects.filter(a => a.nama.trim() !== "" || (a.bobot !== "" && a.bobot !== 0) || (a.subKolom && a.subKolom.length > 0));
    if (activeNewAspects.length > 0) return true;

    if (kelas.kolomNilai.length !== initialKolomNilai.length) return true;
    for (let i = 0; i < kelas.kolomNilai.length; i++) {
      const col = kelas.kolomNilai[i];
      const initCol = initialKolomNilai.find(c => c.id === col.id);
      if (!initCol) return true;
      if (col.nama !== initCol.nama) return true;
      if (Number(col.bobot) !== Number(initCol.bobot)) return true;
      if (col.isGroup !== initCol.isGroup) return true;
      if (col.hitungMetode !== initCol.hitungMetode) return true;
      
      const sub = col.subKolom || [];
      const initSub = initCol.subKolom || [];
      if (sub.length !== initSub.length) return true;
      for (let j = 0; j < sub.length; j++) {
        const s = sub[j];
        const isSub = initSub.find(x => x.id === s.id);
        if (!isSub) return true;
        if (s.nama !== isSub.nama) return true;
        if (Number(s.bobot) !== Number(isSub.bobot)) return true;
      }
    }

    const currentHidden = kelas.skemaPenilaian?.hiddenAspek || [];
    if (JSON.stringify(currentHidden) !== JSON.stringify(initialHiddenAspek)) return true;

    return false;
  };

  const handleCloseKolomModal = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedConfirm(true);
    } else {
      forceCloseKolomModal();
    }
  };

  const forceCloseKolomModal = () => {
    setKolomModalOpen(false);
    setShowUnsavedConfirm(false);
    setFabOpen(false);
    setDeletedKolomIds([]);
    fetchClassDetail(); // Restore original database state
  };

  // States untuk Log Aktifitas Siswa
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedHistorySiswa, setSelectedHistorySiswa] = useState(null);

  // State untuk Integrasi E-Rapor
  const [raporModalOpen, setRaporModalOpen] = useState(false);

  // States untuk Gabung Aspek ke Kelompok
  const [selectedForGroup, setSelectedForGroup] = useState(new Set());
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeGroupName, setMergeGroupName] = useState("");
  const [isMerging, setIsMerging] = useState(false);

  const handleOpenHistory = (student) => {
    setSelectedHistorySiswa(student);
    setHistoryModalOpen(true);
  };

  const handleMergeToGroup = async () => {
    if (!mergeGroupName.trim()) {
      alert("Masukkan nama kelompok terlebih dahulu!");
      return;
    }
    if (selectedForGroup.size < 2) {
      alert("Pilih minimal 2 aspek untuk digabung!");
      return;
    }
    setIsMerging(true);
    try {
      const response = await fetch(`/api/kelas/${classId}/kolom/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName: mergeGroupName.trim(),
          colIds: Array.from(selectedForGroup)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menggabungkan aspek");
      setMergeModalOpen(false);
      setMergeGroupName("");
      setSelectedForGroup(new Set());
      await fetchClassDetail();
    } catch (err) {
      console.error("Merge failed", err);
      alert(err.message || "Terjadi kesalahan.");
    } finally {
      setIsMerging(false);
    }
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

  const getColScore = (student, col, tempScores = null) => {
    if (col.isGroup && col.subKolom) {
      let subTotal = 0;
      let subFilledCount = 0;
      let subFilledWeight = 0;
      
      col.subKolom.forEach(sub => {
        let sc = student.nilai[sub.id];
        if (tempScores) {
          const cellKey = `${student.nisn}-${sub.id}`;
          if (tempScores[cellKey] !== undefined) {
            sc = tempScores[cellKey] === "" ? null : Number(tempScores[cellKey]);
          }
        }
        if (sc !== undefined && sc !== null && sc !== "") {
          const scNum = Number(sc);
          if (col.hitungMetode === "persentase") {
            const subBobot = sub.bobot !== undefined && sub.bobot !== null ? Number(sub.bobot) : 0;
            subTotal += scNum * subBobot;
            subFilledWeight += subBobot;
          } else {
            subTotal += scNum;
          }
          subFilledCount++;
        }
      });
      
      if (subFilledCount === 0) return { score: null, isFilled: false, isAllFilled: false };
      
      const score = col.hitungMetode === "persentase"
        ? (subFilledWeight > 0 ? subTotal / subFilledWeight : 0)
        : (subTotal / subFilledCount);
        
      return {
        score,
        isFilled: true,
        isAllFilled: subFilledCount === col.subKolom.length
      };
    } else {
      let sc = student.nilai[col.id];
      if (tempScores) {
        const cellKey = `${student.nisn}-${col.id}`;
        if (tempScores[cellKey] !== undefined) {
          sc = tempScores[cellKey] === "" ? null : Number(tempScores[cellKey]);
        }
      }
      const isFilled = sc !== undefined && sc !== null && sc !== "";
      return {
        score: isFilled ? Number(sc) : null,
        isFilled,
        isAllFilled: isFilled
      };
    }
  };

  const sortedStudents = useMemo(() => {
    if (!kelas?.siswa) return [];
    
    // First map with computed final scores
    const mapped = kelas.siswa.map(student => {
      let totalNilaiTerisi = 0;
      let jumlahAspekTerisi = 0;
      
      kelas.kolomNilai.forEach(col => {
        const { score, isFilled, isAllFilled } = getColScore(student, col, temporaryScores);
        if (isFilled) {
          totalNilaiTerisi += score * (col.bobot / 100);
          if (isAllFilled) {
            jumlahAspekTerisi++;
          }
        }
      });
      const finalScore = totalNilaiTerisi + (Number(student.nilai?._katrol) || 0);
      return {
        ...student,
        finalScore: finalScore,
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
        const { score, isFilled, isAllFilled } = getColScore(student, col, null);
        if (isFilled) {
          total += score * (col.bobot / 100);
          if (isAllFilled) {
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
      
      // Tambahkan Nilai Katrol jika ada
      total += (Number(student.nilai?._katrol) || 0);

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
          const { score, isFilled } = getColScore(s, col, null);
          return { nama: s.nama, finalScore: s.finalScore, val: isFilled ? score : null };
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
        if (col.isGroup && col.subKolom?.length > 0) {
          // Untuk kolom grup: periksa tiap sub-aspek secara individual
          col.subKolom.forEach(sub => {
            const sc = s.nilai[sub.id];
            const isSFilled = sc !== undefined && sc !== null && sc !== "";
            const aspekLabel = `${col.nama} › ${sub.nama}`;
            if (!isSFilled) {
              issues.push({ aspek: aspekLabel, status: "Kosong (Belum Mengerjakan)" });
            } else if (Number(sc) < kkmVal) {
              issues.push({ aspek: aspekLabel, status: "Di bawah KKM" });
            }
          });
        } else {
          const { score, isFilled } = getColScore(s, col, null);
          if (!isFilled) {
            issues.push({ aspek: col.nama, status: "Kosong (Belum Mengerjakan)" });
          } else if (Number(score) < kkmVal) {
            issues.push({ aspek: col.nama, status: "Di bawah KKM" });
          }
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
    setNilaiKatrol("");
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
    setNilaiKatrol(siswa.nilai?._katrol !== undefined ? siswa.nilai._katrol : "");
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
          body: JSON.stringify({ 
            nama: namaSiswa.trim(), 
            tanggalLahir
          }),
        });
      } else {
        response = await fetch(`/api/kelas/${classId}/siswa`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            nisn: nisn.trim(), 
            nama: namaSiswa.trim(), 
            tanggalLahir
          }),
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
    const updated = newAspects.map(a => {
      if (a.id === id) {
        if (field === 'isGroup') {
          return {
            ...a,
            isGroup: value,
            subKolom: value ? (a.subKolom || []) : [],
            hitungMetode: value ? (a.hitungMetode || "rata-rata") : "rata-rata"
          };
        }
        return { ...a, [field]: value };
      }
      return a;
    });
    setNewAspects(updated);
  };
  
  const handleRemoveNewAspect = (id) => {
    const updated = newAspects.filter(a => a.id !== id);
    setNewAspects(updated);

    // Auto select another aspect if we deleted the active one
    if (activeAspectId === id) {
      if (kelas.kolomNilai.length > 0) {
        setActiveAspectId(kelas.kolomNilai[0].id);
      } else if (updated.length > 0) {
        setActiveAspectId(updated[0].id);
      } else {
        setActiveAspectId(null);
      }
    }
  };

  const handleAddBlankAspect = () => {
    const newId = `new-aspect-${Date.now()}`;
    const newAspect = { id: newId, nama: "", bobot: "", isGroup: false, subKolom: [] };
    setNewAspects(prev => [...prev, newAspect]);
    setActiveAspectId(newId);
  };

  const handleToggleGroupType = (col, nextIsGroup) => {
    // Jika centang dihilangkan dan ada sub-aspek di dalamnya
    if (!nextIsGroup && col.subKolom && col.subKolom.length > 0) {
      if (confirm(`Apakah Anda yakin ingin membongkar kelompok "${col.nama}"?\n\n${col.subKolom.length} sub-aspek di dalamnya akan otomatis dinaikkan menjadi aspek mandiri tingkat teratas agar nilai siswa tidak hilang.`)) {
        
        // Hitung pembagian bobot proporsional (integer) agar tidak memicu error tipe data integer di database (PostgreSQL)
        const B = Number(col.bobot) || 0;
        const N = col.subKolom.length;
        let distributedBobots = [];

        if (col.hitungMetode !== "persentase") {
          // Rata-rata: Bagi rata ke bilangan bulat terdekat
          const base = Math.floor(B / N);
          const remainder = B % N;
          distributedBobots = col.subKolom.map((_, idx) => base + (idx < remainder ? 1 : 0));
        } else {
          // Kustom/Persentase: Gunakan Largest Remainder Method
          const w = col.subKolom.map(sub => (Number(sub.bobot) || 0) / 100 * B);
          const f = w.map(val => Math.floor(val));
          const sumF = f.reduce((sum, val) => sum + val, 0);
          const remainder = B - sumF;
          const fracs = w.map((val, idx) => ({ idx, frac: val - f[idx] }));
          fracs.sort((a, b) => b.frac - a.frac);
          for (let i = 0; i < remainder; i++) {
            f[fracs[i % N].idx] += 1;
          }
          distributedBobots = f;
        }

        const promotedCols = col.subKolom.map((sub, idx) => {
          return {
            id: sub.id, // Pertahankan ID sub-aspek asli agar nilainya langsung terpeta otomatis
            nama: `${col.nama} - ${sub.nama || "Sub-Aspek"}`,
            bobot: distributedBobots[idx],
            isGroup: false,
            subKolom: [],
            hitungMetode: "rata-rata"
          };
        });

        // Ganti kolom kelompok dengan kumpulan kolom pecahan baru
        const updatedCols = [];
        for (const c of kelas.kolomNilai) {
          if (c.id === col.id) {
            updatedCols.push(...promotedCols);
          } else {
            updatedCols.push(c);
          }
        }

        setKelas({ ...kelas, kolomNilai: updatedCols });
        
        // Auto select the first promoted aspect
        if (promotedCols.length > 0) {
          setActiveAspectId(promotedCols[0].id);
        }

        alert(`💡 Berhasil membongkar kelompok!\nSub-aspek berikut kini menjadi aspek mandiri:\n` + promotedCols.map(p => `- ${p.nama} (${p.bobot}%)`).join("\n"));
        return;
      } else {
        // Batalkan uncheck
        return;
      }
    }

    const newCols = kelas.kolomNilai.map(c => {
      if (c.id === col.id) {
        return {
          ...c,
          isGroup: nextIsGroup,
          subKolom: nextIsGroup ? (c.subKolom || []) : [],
          hitungMetode: nextIsGroup ? (c.hitungMetode || "rata-rata") : "rata-rata"
        };
      }
      return c;
    });
    setKelas({ ...kelas, kolomNilai: newCols });
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

  const handleDeleteKolom = (colId, colName) => {
    const hasData = kelas.siswa.some(s => s.nilai[colId] !== undefined && s.nilai[colId] !== null && s.nilai[colId] !== "");
    if (hasData) {
      if (!confirm(`⚠️ PERINGATAN!\nAspek "${colName}" sudah memiliki data nilai siswa!\n\nJika dihapus, nilai siswa di aspek ini akan dihapus secara permanen saat Anda menekan Simpan.\n\nApakah Anda yakin ingin menghapus secara visual dari daftar?`)) {
        return;
      }
    } else {
      if (!confirm(`Apakah Anda yakin ingin menghapus aspek "${colName}"?`)) {
        return;
      }
    }
    
    // Remove locally
    const updated = kelas.kolomNilai.filter(c => c.id !== colId);
    setKelas({ ...kelas, kolomNilai: updated });
    
    // Add to deletion queue if it is an existing column from DB
    const isExisting = initialKolomNilai.some(c => c.id === colId);
    if (isExisting) {
      setDeletedKolomIds(prev => {
        if (!prev.includes(colId)) return [...prev, colId];
        return prev;
      });
    }

    // Auto select another aspect if we deleted the active one
    if (activeAspectId === colId) {
      if (updated.length > 0) {
        setActiveAspectId(updated[0].id);
      } else if (newAspects.length > 0) {
        setActiveAspectId(newAspects[0].id);
      } else {
        setActiveAspectId(null);
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
    // Validasi bobot kelompok sub-aspek kustom
    for (const col of kelas.kolomNilai) {
      if (col.isGroup && col.hitungMetode === "persentase") {
        const sum = (col.subKolom || []).reduce((s, sub) => s + (Number(sub.bobot) || 0), 0);
        if (sum !== 100) {
          alert(`⚠️ Gagal menyimpan: Aspek kelompok "${col.nama}" menggunakan Bobot Kustom, tetapi total bobot sub-aspeknya saat ini adalah ${sum}% (harus pas 100%).`);
          return;
        }
        // Pastikan tidak ada nama sub-aspek yang kosong
        if ((col.subKolom || []).some(sub => sub.nama.trim() === "")) {
          alert(`⚠️ Gagal menyimpan: Terdapat nama sub-aspek yang kosong pada kelompok "${col.nama}".`);
          return;
        }
      }
    }

    const validNewAspects = newAspects.filter(a => a.nama.trim() !== "");
    for (const aspect of validNewAspects) {
      if (aspect.isGroup && aspect.hitungMetode === "persentase") {
        const sum = (aspect.subKolom || []).reduce((s, sub) => s + (Number(sub.bobot) || 0), 0);
        if (sum !== 100) {
          alert(`⚠️ Gagal menyimpan: Aspek kelompok baru "${aspect.nama}" menggunakan Bobot Kustom, tetapi total bobot sub-aspeknya saat ini adalah ${sum}% (harus pas 100%).`);
          return;
        }
        if ((aspect.subKolom || []).some(sub => sub.nama.trim() === "")) {
          alert(`⚠️ Gagal menyimpan: Terdapat nama sub-aspek yang kosong pada kelompok baru "${aspect.nama}".`);
          return;
        }
      }
    }

    if (totalBobot !== 100) {
      alert(`⚠️ Peringatan: Total bobot persentase saat ini adalah ${totalBobot}%. Agar penghitungan nilai akhir siswa akurat, pastikan totalnya pas 100%.`);
    }

    // Safety check for data loss
    const changedToGroup = [];
    const changedToSingle = [];
    const deletedSubAspects = [];
    const deletedColumnsWithValues = [];

    // Detect deleted columns with values
    for (const colId of deletedKolomIds) {
      const initial = initialKolomNilai.find(c => c.id === colId);
      if (initial) {
        const hasData = kelas.siswa.some(s => s.nilai[colId] !== undefined && s.nilai[colId] !== null && s.nilai[colId] !== "");
        if (hasData) {
          deletedColumnsWithValues.push(initial.nama);
        }
      }
    }

    for (const col of kelas.kolomNilai) {
      const initial = initialKolomNilai.find(c => c.id === col.id);
      if (initial) {
        // 1. Single -> Group
        if (!initial.isGroup && col.isGroup) {
          const hasData = kelas.siswa.some(s => s.nilai[col.id] !== undefined && s.nilai[col.id] !== null && s.nilai[col.id] !== "");
          if (hasData) {
            changedToGroup.push(col.nama);
          }
        }
        // 2. Group -> Single
        if (initial.isGroup && !col.isGroup) {
          const subIds = (initial.subKolom || []).map(s => s.id);
          const hasData = kelas.siswa.some(s => subIds.some(sid => s.nilai[sid] !== undefined && s.nilai[sid] !== null && s.nilai[sid] !== ""));
          if (hasData) {
            changedToSingle.push(col.nama);
          }
        }
        // 3. Deleted Sub-columns inside group
        if (initial.isGroup && col.isGroup) {
          for (const initialSub of (initial.subKolom || [])) {
            const stillExists = (col.subKolom || []).some(s => s.id === initialSub.id);
            if (!stillExists) {
              const hasData = kelas.siswa.some(s => s.nilai[initialSub.id] !== undefined && s.nilai[initialSub.id] !== null && s.nilai[initialSub.id] !== "");
              if (hasData) {
                deletedSubAspects.push(`Sub-aspek "${initialSub.nama}" di kelompok "${col.nama}"`);
              }
            }
          }
        }
      }
    }

    if (changedToGroup.length > 0 || changedToSingle.length > 0 || deletedSubAspects.length > 0 || deletedColumnsWithValues.length > 0) {
      let warningMessage = "⚠️ PERINGATAN KESELAMATAN DATA NILAI!\n\n" +
        "Sistem mendeteksi adanya perubahan struktur aspek yang berpotensi menghilangkan nilai siswa yang sudah diisi:\n\n";

      if (deletedColumnsWithValues.length > 0) {
        warningMessage += `• Aspek berikut telah dihapus secara permanen: \n  - ${deletedColumnsWithValues.join("\n  - ")}\n` +
          "  (Seluruh nilai siswa di aspek ini akan dihapus secara permanen!)\n\n";
      }

      if (changedToGroup.length > 0) {
        warningMessage += `• Aspek tunggal berikut diubah menjadi kelompok: ${changedToGroup.join(", ")}\n` +
          "  (Nilai mandiri saat ini tidak akan terbaca karena nilai harus diisi ulang pada sub-aspek yang baru)\n\n";
      }

      if (changedToSingle.length > 0) {
        warningMessage += `• Aspek kelompok berikut diubah menjadi tunggal: ${changedToSingle.join(", ")}\n` +
          "  (Seluruh sub-aspek beserta nilainya di dalamnya akan dihapus secara permanen!)\n\n";
      }

      if (deletedSubAspects.length > 0) {
        warningMessage += `• Sub-aspek berikut telah dihapus: \n  - ${deletedSubAspects.join("\n  - ")}\n` +
          "  (Seluruh nilai siswa di sub-aspek tersebut akan dihapus secara permanen!)\n\n";
      }

      warningMessage += "Apakah Anda yakin ingin melanjutkan dan menyimpan perubahan ini?";
      
      if (!confirm(warningMessage)) {
        return; // Batalkan penyimpanan
      }
    }

    setIsSavingBobot(true);
    try {
      // Execute local delete queue first
      for (const colId of deletedKolomIds) {
        const resDelete = await fetch(`/api/kelas/${classId}/kolom?id=${colId}`, {
          method: "DELETE",
        });
        if (!resDelete.ok) {
          const deleteData = await resDelete.json();
          throw new Error(deleteData.error || `Gagal menghapus aspek ${colId}`);
        }
      }

      // Buat aspek-aspek baru terlebih dahulu
      const validNewAspects = newAspects.filter(a => a.nama.trim() !== "");
      let updatedKolomNilai = [...kelas.kolomNilai]; // Salin state lama

      for (const aspect of validNewAspects) {
        const res = await fetch(`/api/kelas/${classId}/kolom`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nama: aspect.nama.trim(), bobot: Number(aspect.bobot) || 0, isGroup: aspect.isGroup, hitungMetode: aspect.hitungMetode || 'rata-rata', subKolom: aspect.subKolom }),
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
        body: JSON.stringify({ 
          kolomNilai: kolomToSave,
          skemaPenilaian: kelas.skemaPenilaian || {}
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gagal memperbarui bobot.");
      }

      setDeletedKolomIds([]);
      setNewAspects([{ id: Date.now(), nama: "", bobot: "", isGroup: false, subKolom: [] }]); // Reset form tambah
      setKolomModalOpen(false); // Close modal on success
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
            col.subKolom.forEach(sub => {
              const val = siswa.nilai[sub.id];
              row.push(val !== null && val !== undefined ? val : "");
            });
          } else {
            const val = siswa.nilai[col.id];
            row.push(val !== null && val !== undefined ? val : "");
          }
          
          const { score, isFilled } = getColScore(siswa, col, null);
          if (isFilled) {
            totalNilaiTerisi += score * (col.bobot / 100);
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
                // Coba match header dengan format "NamaGrup - NamaSub"
                const headerName = `${col.nama} - ${sub.nama}`;
                const headerCol = headers.find(h => h === headerName || h.startsWith(`${headerName} (`));
                const colIdx = headerCol ? headers.indexOf(headerCol) : -1;

                if (colIdx !== -1 && cols[colIdx] !== "" && cols[colIdx] !== undefined && cols[colIdx] !== null) {
                  const parsedVal = Number(cols[colIdx]);
                  // Simpan dengan sub.id sebagai key agar API tidak perlu matching nama
                  nilaiObj[sub.id] = isNaN(parsedVal) ? null : parsedVal;
                } else {
                  nilaiObj[sub.id] = null;
                }
              });
            } else {
              const headerCol = headers.find(h => h === col.nama || h.startsWith(`${col.nama} (`));
              const colIdx = headerCol ? headers.indexOf(headerCol) : -1;

              if (colIdx !== -1 && cols[colIdx] !== "" && cols[colIdx] !== undefined && cols[colIdx] !== null) {
                const parsedVal = Number(cols[colIdx]);
                // Simpan dengan col.id sebagai key agar API tidak perlu matching nama
                nilaiObj[col.id] = isNaN(parsedVal) ? null : parsedVal;
              } else {
                nilaiObj[col.id] = null;
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
              💡 <strong>Langkah cepat:</strong> Klik tombol "Mulai Atur Aspek Sekarang" di sebelah kanan untuk menambahkan aspek/kolom baru.
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
                          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                            <span style={{ fontWeight: "800", fontSize: "1.1rem", color: s.finalScore >= analyticsData.kkmVal ? "var(--success)" : "var(--danger)" }}>{s.finalScore}</span>
                            {s.nilai?._katrol ? (
                              <span style={{ 
                                fontSize: "0.62rem", 
                                backgroundColor: "rgba(16, 185, 129, 0.15)", 
                                color: "#34d399", 
                                border: "1px solid rgba(16, 185, 129, 0.25)", 
                                padding: "0 4px", 
                                borderRadius: "3px",
                                fontWeight: "700" 
                              }} title="Nilai Katrol (Rahasia)">
                                🔒 {Number(s.nilai._katrol) > 0 ? `+${s.nilai._katrol}` : s.nilai._katrol}
                              </span>
                            ) : null}
                          </div>
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

                    {/* Rincian Kendala Aspek */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Rincian Kendala Aspek:</div>
                      {showKehadiran && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem", backgroundColor: "rgba(0,0,0,0.25)", padding: "7px 12px", borderRadius: "4px", marginBottom: "4px", borderLeft: "3px solid #475569" }}>
                          <span style={{ color: "#94a3b8", fontWeight: "600" }}>📋 Kehadiran</span>
                          <span style={{ fontWeight: "700", fontSize: "0.75rem", color: "#94a3b8" }}>
                            H: {s.attSummary.H} | I: {s.attSummary.I} | S: {s.attSummary.S} | <span style={{ color: s.attSummary.A > 0 ? "#fca5a5" : "inherit" }}>A: {s.attSummary.A}</span>
                          </span>
                        </div>
                      )}
                      {s.issues.map((issue, idx) => {
                        const isKosong = issue.status.includes("Kosong");
                        return (
                          <div key={idx} style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            fontSize: "0.82rem", padding: "7px 12px", borderRadius: "4px",
                            backgroundColor: isKosong ? "rgba(251,191,36,0.08)" : "rgba(239,68,68,0.12)",
                            borderLeft: `3px solid ${isKosong ? "#fbbf24" : "#ef4444"}`
                          }}>
                            <span style={{ color: "#e2e8f0", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ color: isKosong ? "#fbbf24" : "#ef4444" }}>•</span> {issue.aspek}
                            </span>
                            <span style={{ 
                              fontWeight: "700", fontSize: "0.75rem",
                              color: isKosong ? "#fcd34d" : "#fca5a5"
                            }}>
                              {issue.status}
                            </span>
                          </div>
                        );
                      })}
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

        {/* Panel Kontrol Kelas (Quick Actions) */}
        <div id="konfigurasi-kelas" style={{
          margin: "0 24px 20px 24px",
          padding: "16px",
          backgroundColor: "rgba(30, 41, 59, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}>

          {/* Section: Panduan & Bantuan — paling atas agar mudah ditemukan */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: "800", color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.08em", minWidth: "120px" }}>💡 Bantuan</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <button 
                onClick={() => { setPanduanActiveTab("aspek"); setPanduanModalOpen(true); }} 
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  fontSize: "0.82rem", fontWeight: "700",
                  padding: "7px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#fff",
                  boxShadow: "0 0 14px rgba(251, 191, 36, 0.45)",
                  transition: "box-shadow 0.2s, transform 0.15s"
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 22px rgba(251,191,36,0.7)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 14px rgba(251,191,36,0.45)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                💡 Panduan & Cara Penggunaan Fitur
              </button>
            </div>
          </div>

          {/* Border Divider */}
          <div style={{ height: "1px", backgroundColor: "rgba(255, 255, 255, 0.06)" }}></div>

          {/* Section: Konfigurasi */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: "800", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", minWidth: "120px" }}>⚙️ Konfigurasi</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <button 
                onClick={() => setKolomModalOpen(true)} 
                className="btn btn-outline" 
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", padding: "6px 12px", borderRadius: "6px" }}
              >
                ⚖️ Atur Aspek & Bobot
              </button>
              <button 
                onClick={() => setRangeModalOpen(true)} 
                className="btn btn-outline" 
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", padding: "6px 12px", borderRadius: "6px" }}
              >
                📊 Atur Status & KKM
              </button>
            </div>
          </div>

          {/* Border Divider */}
          <div style={{ height: "1px", backgroundColor: "rgba(255, 255, 255, 0.06)" }}></div>

          {/* Section: Operasi Data */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: "800", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", minWidth: "120px" }}>🛠️ Operasi Data</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
              <button 
                onClick={handleOpenAddSiswa} 
                className="btn btn-secondary" 
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", padding: "6px 12px", borderRadius: "6px" }}
              >
                👤 Tambah Siswa
              </button>
              <button 
                onClick={downloadExcelTemplate} 
                disabled={kelas.kolomNilai.length === 0} 
                className="btn btn-secondary" 
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", padding: "6px 12px", borderRadius: "6px" }}
              >
                📥 Ekspor Data Siswa
              </button>
              
              <label
                className={`btn btn-secondary ${kelas.kolomNilai.length === 0 ? "disabled" : ""}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  fontSize: "0.8rem", padding: "6px 12px", borderRadius: "6px",
                  cursor: kelas.kolomNilai.length === 0 ? "not-allowed" : "pointer",
                  opacity: kelas.kolomNilai.length === 0 ? 0.5 : 1,
                  margin: 0
                }}
              >
                <span>📤</span> Impor Data Siswa
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
                disabled={kelas.kolomNilai.length === 0 || kelas.siswa.length === 0} 
                className="btn btn-primary" 
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", padding: "6px 12px", borderRadius: "6px" }}
              >
                📋 Ekspor ke E-Rapor
              </button>
            </div>
          </div>
        </div>

        {(kelas.siswa.length > 0 || kelas.kolomNilai.length > 0) ? (
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
                  {kelas.siswa.length > 0 ? (
                    sortedStudents.map((student) => {
                      
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
                        <td 
                          onClick={() => {
                            if (kelas.isNilaiAkhirGenerated) {
                              setKatrolSiswa(student);
                              setKatrolValue(student.nilai?._katrol !== undefined && student.nilai?._katrol !== null ? student.nilai._katrol.toString() : "");
                              setKatrolModalOpen(true);
                            }
                          }}
                          style={{ 
                            textAlign: "center", 
                            fontWeight: "800", 
                            color: kelas.isNilaiAkhirGenerated ? "var(--primary)" : "var(--text-muted)", 
                            backgroundColor: "rgba(59,130,246,0.02)", 
                            padding: "10px 12px",
                            cursor: kelas.isNilaiAkhirGenerated ? "pointer" : "default",
                            position: "relative"
                          }}
                          title={kelas.isNilaiAkhirGenerated ? "Klik untuk penyesuaian nilai akhir (Katrol Rahasia)" : ""}
                        >
                          <style>{`
                            .final-score-cell:hover .hover-lock {
                              opacity: 0.75 !important;
                              color: var(--primary) !important;
                            }
                          `}</style>
                          {kelas.isNilaiAkhirGenerated ? (
                            <div>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }} className="final-score-cell">
                                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  {finalScore.toFixed(2)}
                                  {!student.nilai?._katrol && (
                                    <span style={{ fontSize: "0.68rem", opacity: 0.15, transition: "opacity 0.2s" }} className="hover-lock"> 🔒</span>
                                  )}
                                </span>
                                {student.nilai?._katrol ? (
                                  <span style={{ 
                                    fontSize: "0.62rem", 
                                    backgroundColor: "rgba(16, 185, 129, 0.15)", 
                                    color: "#34d399", 
                                    border: "1px solid rgba(16, 185, 129, 0.25)", 
                                    padding: "0 4px", 
                                    borderRadius: "3px",
                                    fontWeight: "700" 
                                  }} title="Nilai Katrol (Rahasia)">
                                    🔒 {Number(student.nilai._katrol) > 0 ? `+${student.nilai._katrol}` : student.nilai._katrol}
                                  </span>
                                ) : null}
                              </div>
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
                })
              ) : (
                <tr>
                  <td colSpan={5 + kelas.kolomNilai.reduce((sum, col) => sum + (col.isGroup && col.subKolom?.length > 0 ? col.subKolom.length : 1), 0)} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontStyle: "italic" }}>
                    Belum ada data siswa di kelas ini. Silakan klik tombol <strong>👤 Tambah Siswa</strong> pada Panel Kontrol untuk memulai pengisian nilai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        );
      })()}
    </div>
    ) : (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
        Belum ada siswa dan aspek nilai di kelas ini. Silakan atur aspek nilai atau tambah siswa terlebih dahulu.
      </div>
    )}
      </div>



      </>
      )}

      {/* ===== FAB + Dropdown Menu ===== */}
      {/* Backdrop klik-luar untuk tutup FAB */}
      {fabOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 148 }}
          onClick={() => setFabOpen(false)}
        />
      )}

      <div style={{ position: "fixed", bottom: "28px", right: "28px", zIndex: 150, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>

        {/* Dropdown menu */}
        {fabOpen && (
          <div
            className="animate-fade-in"
            style={{
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "14px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
              overflow: "hidden",
              minWidth: "240px",
              backdropFilter: "blur(12px)",
            }}
          >
            {/* Grup Konfigurasi */}
            <div style={{ padding: "8px 14px 4px", fontSize: "0.65rem", fontWeight: "800", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>⚙️ Konfigurasi</div>
            {[
              { icon: "⚖️", label: "Atur Aspek & Bobot Nilai", onClick: () => { setKolomModalOpen(true); setFabOpen(false); } },
              { icon: "📊", label: "Atur Status & KKM", onClick: () => { setRangeModalOpen(true); setFabOpen(false); } },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  width: "100%", padding: "10px 16px",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-primary)", fontSize: "0.88rem", fontWeight: "600",
                  textAlign: "left", transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <span style={{ fontSize: "1rem", width: "20px", textAlign: "center" }}>{item.icon}</span>
                {item.label}
              </button>
            ))}

            {/* Divider */}
            <div style={{ height: "1px", backgroundColor: "var(--border-color)", margin: "4px 0" }} />

            {/* Grup Operasi Data */}
            <div style={{ padding: "4px 14px", fontSize: "0.65rem", fontWeight: "800", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>🛠️ Operasi Data</div>
            {[
              { icon: "👤", label: "Tambah Siswa Manual", onClick: () => { handleOpenAddSiswa(); setFabOpen(false); }, disabled: false },
              { icon: "📥", label: "Ekspor Data Siswa (.xlsx)", onClick: () => { downloadExcelTemplate(); setFabOpen(false); }, disabled: kelas.kolomNilai.length === 0 },
              { icon: "🔌", label: "Ekspor ke E-Rapor", onClick: () => { setRaporModalOpen(true); setFabOpen(false); }, disabled: kelas.kolomNilai.length === 0 || kelas.siswa.length === 0, accent: true },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                disabled={item.disabled}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  width: "100%", padding: "10px 16px",
                  background: "none", border: "none",
                  cursor: item.disabled ? "not-allowed" : "pointer",
                  color: item.disabled ? "var(--text-muted)" : item.accent ? "var(--primary)" : "var(--text-primary)",
                  fontSize: "0.88rem", fontWeight: item.accent ? "700" : "600",
                  textAlign: "left", opacity: item.disabled ? 0.5 : 1, transition: "background 0.15s",
                }}
                onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <span style={{ fontSize: "1rem", width: "20px", textAlign: "center" }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
            {/* Tombol Impor Excel (pakai label karena file input) */}
            <label
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                width: "100%", padding: "10px 16px",
                cursor: kelas.kolomNilai.length === 0 ? "not-allowed" : "pointer",
                color: kelas.kolomNilai.length === 0 ? "var(--text-muted)" : "var(--text-primary)",
                fontSize: "0.88rem", fontWeight: "600",
                opacity: kelas.kolomNilai.length === 0 ? 0.5 : 1,
                transition: "background 0.15s",
                marginBottom: "4px",
              }}
              onMouseEnter={e => { if (kelas.kolomNilai.length > 0) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
            >
              <span style={{ fontSize: "1rem", width: "20px", textAlign: "center" }}>📤</span>
              Impor Nilai dari Excel
              <input
                type="file"
                accept=".xlsx, .xls"
                style={{ display: "none" }}
                onChange={(e) => { handleExcelUpload(e); setFabOpen(false); }}
                disabled={kelas.kolomNilai.length === 0}
              />
            </label>
          </div>
        )}

        {/* Tombol FAB utama */}
        <button
          id="fab-konfigurasi"
          onClick={() => setFabOpen(prev => !prev)}
          style={{
            width: "54px", height: "54px",
            borderRadius: "50%",
            background: fabOpen
              ? "linear-gradient(135deg, #ef4444, #dc2626)"
              : "linear-gradient(135deg, var(--primary), #7c3aed)",
            border: "none",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.35rem",
            boxShadow: fabOpen
              ? "0 4px 20px rgba(239,68,68,0.5), 0 0 0 4px rgba(239,68,68,0.15)"
              : "0 4px 20px rgba(59,130,246,0.5), 0 0 0 4px rgba(59,130,246,0.15)",
            transition: "all 0.2s ease",
            transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
          title={fabOpen ? "Tutup menu" : "Konfigurasi & Operasi Data"}
        >
          {fabOpen ? "✕" : "⚙️"}
        </button>
      </div>

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
                      col.isGroup && col.subKolom?.length > 0
                        ? col.subKolom.map(sub => (
                            <th key={sub.id} style={{ textAlign: "center" }}>{col.nama} - {sub.nama}</th>
                          ))
                        : <th key={col.id} style={{ textAlign: "center" }}>{col.nama}</th>
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
                        col.isGroup && col.subKolom?.length > 0
                          ? col.subKolom.map(sub => (
                              <td key={sub.id} style={{ textAlign: "center", fontWeight: "700" }}>
                                {ps.nilai[sub.id] !== null && ps.nilai[sub.id] !== undefined ? ps.nilai[sub.id] : "-"}
                              </td>
                            ))
                          : <td key={col.id} style={{ textAlign: "center", fontWeight: "700" }}>
                              {ps.nilai[col.id] !== null && ps.nilai[col.id] !== undefined ? ps.nilai[col.id] : "-"}
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

      {/* ============= MODAL PANDUAN PENGGUNAAN FITUR ============= */}
      {panduanModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: "16px" }}>
          <div className="glass-card animate-fade-in modal-content-scroll" style={{ width: "100%", maxWidth: "850px", height: "85vh", display: "flex", flexDirection: "column", gap: 0, overflow: "hidden", padding: 0 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)", backgroundColor: "var(--bg-primary)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.4rem" }}>📖</span>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--primary)", margin: 0 }}>Panduan Fitur & Dokumentasi</h3>
              </div>
              <button onClick={() => setPanduanModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}>✕</button>
            </div>

            {/* Inline CSS untuk layout responsif Modal Panduan */}
            <style>{`
              @media (max-width: 768px) {
                .panduan-layout {
                  flex-direction: column !important;
                }
                .panduan-sidebar {
                  width: 100% !important;
                  border-right: none !important;
                  border-bottom: 1px solid var(--border-color) !important;
                  flex-direction: row !important;
                  overflow-x: auto !important;
                  white-space: nowrap !important;
                  padding: 10px 16px !important;
                  gap: 8px !important;
                }
                .panduan-sidebar button {
                  width: auto !important;
                  flex-shrink: 0 !important;
                  padding: 8px 12px !important;
                }
                .panduan-body {
                  padding: 16px !important;
                }
                .panduan-grid {
                  grid-template-columns: 1fr !important;
                  gap: 16px !important;
                }
              }
            `}</style>

            {/* Main Content Area */}
            <div className="panduan-layout" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* Sidebar Navigation */}
              <div className="panduan-sidebar" style={{ width: "200px", borderRight: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", padding: "16px 8px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                {[
                  { id: "aspek", label: "⚖️ Aspek & Bobot" },
                  { id: "kkm", label: "📊 Status & KKM" },
                  { id: "siswa", label: "👤 Tambah Siswa" },
                  { id: "ekspor", label: "📤 Ekspor & Impor" },
                  { id: "erapor", label: "📋 Ekspor ke E-Rapor" },
                  { id: "katrol", label: "🔒 Nilai Katrol" }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setPanduanActiveTab(item.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      width: "100%", padding: "10px 12px", borderRadius: "6px",
                      background: panduanActiveTab === item.id ? "rgba(59, 130, 246, 0.15)" : "none",
                      border: "none", cursor: "pointer",
                      color: panduanActiveTab === item.id ? "#60a5fa" : "var(--text-secondary)",
                      fontSize: "0.82rem", fontWeight: "700", textAlign: "left",
                      transition: "all 0.15s"
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Guide Contents */}
              <div className="panduan-body" style={{ flex: 1, padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
                {panduanActiveTab === "aspek" && (
                  <>
                    <div>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: "800", marginBottom: "8px", color: "#60a5fa" }}>⚖️ Fitur: Atur Aspek & Bobot Nilai</h4>
                      <p style={{ fontSize: "0.85rem", lineHeight: "1.5", color: "var(--text-secondary)" }}>
                        Fitur ini digunakan untuk mengonfigurasi komponen penilaian mata pelajaran Anda (seperti Tugas, UTS, UAS, atau Kehadiran) lengkap dengan porsi bobot masing-masing komponen. Total keseluruhan bobot wajib berjumlah <strong>100%</strong> agar penilaian dapat dikalkulasi secara valid.
                      </p>
                    </div>
 
                    <div className="panduan-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <h5 style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>📋 Tahapan Penggunaan:</h5>
                        <ol style={{ fontSize: "0.8rem", color: "var(--text-secondary)", paddingLeft: "16px", lineHeight: "1.6", margin: 0 }}>
                          <li>Klik tombol <strong>⚖️ Atur Aspek & Bobot</strong> pada Panel Kontrol.</li>
                          <li>Tentukan nama komponen (misal: "Tugas Mandiri") dan isi bobotnya (misal: "20").</li>
                          <li>Jika aspek tersebut merupakan kelompok/grup (misal: grup "Tugas" yang memiliki sub-komponen "Tugas 1, Tugas 2"), nyalakan opsi <strong>Grup Aspek</strong> lalu tambahkan sub-aspek di bawahnya.</li>
                          <li>Tentukan metode perhitungan grup aspek: <strong>Rata-rata Otomatis</strong> (mengkalkulasi rata-rata sub-aspek) atau <strong>Persentase</strong> (setiap sub-aspek memiliki bobot tersendiri dalam grup tersebut).</li>
                          <li>Pastikan total bobot dari seluruh aspek utama bernilai 100%, lalu klik <strong>Simpan Perubahan</strong>.</li>
                        </ol>
                      </div>
                      <div>
                        <h5 style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>💡 Contoh Penggunaan:</h5>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                          Mata pelajaran Informatika diatur memiliki 3 aspek utama:<br />
                          1. <strong>Tugas (Grup - Rata-rata)</strong>: Bobot 30% (Sub-aspek: Tugas 1, Tugas 2).<br />
                          2. <strong>UTS (Tunggal)</strong>: Bobot 30%.<br />
                          3. <strong>UAS (Tunggal)</strong>: Bobot 40%.<br />
                          Total bobot aspek utama: 30% + 30% + 40% = 100%.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {panduanActiveTab === "kkm" && (
                  <>
                    <div>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: "800", marginBottom: "8px", color: "#34d399" }}>📊 Fitur: Atur Status Nilai & KKM</h4>
                      <p style={{ fontSize: "0.85rem", lineHeight: "1.5", color: "var(--text-secondary)" }}>
                        Fitur ini digunakan untuk menetapkan standar kelulusan Kriteria Ketuntasan Minimal (KKM) serta batas rentang nilai untuk menentukan predikat (A, B, C, D) yang akan didapatkan siswa berdasarkan Nilai Akhir mereka.
                      </p>
                    </div>

                    <div className="panduan-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <h5 style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>📋 Tahapan Penggunaan:</h5>
                        <ol style={{ fontSize: "0.8rem", color: "var(--text-secondary)", paddingLeft: "16px", lineHeight: "1.6", margin: 0 }}>
                          <li>Klik tombol <strong>📊 Atur Status & KKM</strong> pada Panel Kontrol.</li>
                          <li>Masukkan batas nilai minimal KKM (misalnya: 75). Siswa dengan Nilai Akhir di bawah KKM ini otomatis dinyatakan "Belum Tuntas".</li>
                          <li>Atur batas nilai minimal untuk predikat A, B, C, dan D (misalnya: A &ge; 85, B &ge; 75, C &ge; 65, D &ge; 50). Batasan harus berurutan secara logis (A &gt; B &gt; C &gt; D).</li>
                          <li>Anda juga dapat memodifikasi penamaan label predikat/status jika diinginkan (misal predikat A berlabel "Sangat Baik").</li>
                          <li>Klik <strong>Simpan Pengaturan</strong> untuk menerapkan perubahan.</li>
                        </ol>
                      </div>
                      <div>
                        <h5 style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>💡 Contoh Penggunaan:</h5>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                          Jika KKM diatur 75 and KKM Predikat B diatur 75:<br />
                          - Siswa mendapat Nilai Akhir <strong>74.5</strong>: Predikat C (Belum Tuntas).<br />
                          - Siswa mendapat Nilai Akhir <strong>78.0</strong>: Predikat B (Lulus/Tuntas).<br />
                          - Siswa mendapat Nilai Akhir <strong>88.0</strong>: Predikat A (Lulus/Tuntas).
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {panduanActiveTab === "siswa" && (
                  <>
                    <div>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: "800", marginBottom: "8px", color: "#fb7185" }}>👤 Fitur: Tambah Siswa Manual</h4>
                      <p style={{ fontSize: "0.85rem", lineHeight: "1.5", color: "var(--text-secondary)" }}>
                        Fitur ini digunakan oleh guru untuk menambahkan profil siswa ke dalam kelas secara satu per satu secara langsung (manual), atau mengoreksi biodata siswa yang sudah ada.
                      </p>
                    </div>

                    <div className="panduan-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <h5 style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>📋 Tahapan Penggunaan:</h5>
                        <ol style={{ fontSize: "0.8rem", color: "var(--text-secondary)", paddingLeft: "16px", lineHeight: "1.6", margin: 0 }}>
                          <li>Klik tombol <strong>👤 Tambah Siswa</strong> pada Panel Kontrol.</li>
                          <li>Masukkan <strong>NISN Siswa</strong> (10 digit numerik unik).</li>
                          <li>Ketikkan <strong>Nama Lengkap Siswa</strong> secara benar.</li>
                          <li>Pilih <strong>Tanggal Lahir</strong> siswa (ini akan menjadi password default bagi siswa untuk mengakses portal pencarian nilai mereka).</li>
                          <li>Klik <strong>Simpan</strong>. Data siswa baru akan langsung muncul di baris spreadsheet.</li>
                          <li>Untuk mengedit, klik tombol pensil <code>✏️</code> pada baris siswa yang bersangkutan.</li>
                        </ol>
                      </div>
                      <div>
                        <h5 style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>💡 Contoh Penggunaan:</h5>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                          Menambahkan siswa bernama <strong>Aditya Pratama</strong> dengan NISN <strong>1020304050</strong> dan tanggal lahir <strong>20 Mei 2010</strong>.<br />
                          Setelah disimpan, Aditya dapat melihat rincian nilainya secara mandiri di portal siswa dengan memasukkan NISN dan tanggal lahir tersebut.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {panduanActiveTab === "ekspor" && (
                  <>
                    <div>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: "800", marginBottom: "8px", color: "#38bdf8" }}>📤 Fitur: Ekspor & Impor Data Siswa (.xlsx)</h4>
                      <p style={{ fontSize: "0.85rem", lineHeight: "1.5", color: "var(--text-secondary)" }}>
                        Fitur impor-ekspor ini mempermudah guru untuk memproses nilai siswa dalam jumlah banyak sekaligus menggunakan aplikasi spreadsheet desktop (seperti Microsoft Excel atau Google Sheets).
                      </p>
                    </div>

                    <div className="panduan-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <h5 style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>📥 Cara Ekspor Data:</h5>
                        <ol style={{ fontSize: "0.8rem", color: "var(--text-secondary)", paddingLeft: "16px", lineHeight: "1.6", margin: 0 }}>
                          <li>Klik tombol <strong>📥 Ekspor Data Siswa</strong> pada Panel Kontrol.</li>
                          <li>Sistem otomatis mendownload file spreadsheet yang memuat NISN, Nama, dan kolom aspek penilaian yang telah Anda buat sebelumnya.</li>
                          <li>Buka file tersebut di Excel dan Anda dapat mengisi nilai siswa secara luring (offline) dengan lebih nyaman.</li>
                        </ol>
                      </div>
                      <div>
                        <h5 style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>📤 Cara Impor Data Kembali:</h5>
                        <ol style={{ fontSize: "0.8rem", color: "var(--text-secondary)", paddingLeft: "16px", lineHeight: "1.6", margin: 0 }}>
                          <li>Setelah mengisi nilai di Excel offline, klik tombol <strong>📤 Impor Data Siswa</strong> pada Panel Kontrol.</li>
                          <li>Pilih file Excel yang telah Anda isi nilainya tadi.</li>
                          <li>Sistem akan menampilkan <strong>Pratinjau Impor</strong> yang menunjukkan data nilai lama vs data nilai baru.</li>
                          <li>Periksa kebenaran data, lalu klik <strong>Konfirmasi & Simpan Impor</strong>. Seluruh nilai di spreadsheet akan diperbarui seketika.</li>
                        </ol>
                      </div>
                    </div>

                    <div style={{ backgroundColor: "rgba(56, 189, 248, 0.05)", border: "1px solid rgba(56, 189, 248, 0.15)", borderRadius: "8px", padding: "12px", fontSize: "0.78rem" }}>
                      <strong>⚠️ Catatan Penting:</strong> Pastikan Anda tidak mengubah struktur nama kolom (Header) UTS, UAS, atau Tugas di file Excel hasil ekspor. Struktur baris NISN siswa juga harus tetap dipertahankan agar pencocokan data saat impor tidak gagal.
                    </div>
                  </>
                )}

                {panduanActiveTab === "erapor" && (
                  <>
                    <div>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: "800", marginBottom: "8px", color: "#a78bfa" }}>📋 Fitur: Ekspor ke E-Rapor Sekolah</h4>
                      <p style={{ fontSize: "0.85rem", lineHeight: "1.5", color: "var(--text-secondary)" }}>
                        Fitur ini membantu guru memindahkan nilai akhir semester dari CekNilai ke format template e-Rapor resmi (dari kementerian) secara otomatis, lengkap dengan deskripsi ketercapaian Tujuan Pembelajaran (TP).
                      </p>
                    </div>

                    <div className="panduan-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <h5 style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>📋 Tahapan Penggunaan:</h5>
                        <ol style={{ fontSize: "0.8rem", color: "var(--text-secondary)", paddingLeft: "16px", lineHeight: "1.6", margin: 0 }}>
                          <li>Unduh template file Excel e-Rapor kosongan dari aplikasi e-Rapor resmi sekolah Anda.</li>
                          <li>Klik tombol <strong>📋 Ekspor ke E-Rapor</strong> pada Panel Kontrol CekNilai.</li>
                          <li>Unggah file template e-Rapor yang telah Anda unduh tadi ke area upload yang tersedia.</li>
                          <li>Petakan setiap kolom TP di e-Rapor dengan kolom aspek di CekNilai (misal: TP 1 diambil dari aspek UTS, TP 2 diambil dari Tugas).</li>
                          <li>Klik <strong>Isi & Unduh Rapor Excel</strong>. Nilai dan capaian kompetensi terisi otomatis di file e-Rapor Anda.</li>
                        </ol>
                      </div>
                      <div>
                        <h5 style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>💡 Keunggulan Integrasi:</h5>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                          Sistem mendeteksi secara otomatis NISN siswa dan memetakan nilai rapor dengan aman. Jika ada nilai rapor siswa di bawah 100 namun semua aspek KKM tercapai, sistem secara cerdas akan memberikan status ketercapaian optimal secara otomatis agar template valid diunggah kembali ke sistem sekolah.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {panduanActiveTab === "katrol" && (
                  <>
                    <div>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: "800", marginBottom: "8px", color: "#fcd34d" }}>🔒 Fitur: Nilai Katrol Rahasia</h4>
                      <p style={{ fontSize: "0.85rem", lineHeight: "1.5", color: "var(--text-secondary)" }}>
                        Nilai Katrol adalah nilai penyesuaian khusus yang diberikan oleh guru kepada siswa tertentu untuk mendongkrak Nilai Akhir mereka tanpa memodifikasi nilai akademik aslinya. Fitur ini bersifat rahasia (hanya diketahui oleh guru pengampu).
                      </p>
                    </div>

                    <div className="panduan-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <h5 style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>📋 Tahapan Penggunaan:</h5>
                        <ol style={{ fontSize: "0.8rem", color: "var(--text-secondary)", paddingLeft: "16px", lineHeight: "1.6", margin: 0 }}>
                          <li>Klik tombol pensil <code>✏️</code> (Edit Profil Siswa) pada baris siswa yang nilainya ingin Anda dongkrak.</li>
                          <li>Di bagian bawah formulir modal, temukan kolom <strong>🔒 Katrol / Penyesuaian Nilai Akhir (Rahasia)</strong>.</li>
                          <li>Masukkan jumlah poin tambahan yang ingin Anda berikan (contoh: isi <code>5</code> untuk mendongkrak nilai akhir sebesar 5 poin).</li>
                          <li>Klik <strong>Simpan</strong>.</li>
                        </ol>
                      </div>
                      <div>
                        <h5 style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>👁️ Visibilitas Nilai:</h5>
                        <ul style={{ fontSize: "0.8rem", color: "var(--text-secondary)", paddingLeft: "16px", lineHeight: "1.5", margin: 0 }}>
                          <li><strong>Di Halaman Guru:</strong> Guru akan melihat Nilai Akhir yang sudah bertambah disertai dengan tanda gembok hijau kecil <strong>`🔒 +5`</strong> sebagai pengingat.</li>
                          <li><strong>Di Portal Siswa:</strong> Siswa hanya melihat Nilai Akhir yang sudah terdongkrak bulat tanpa tahu adanya nilai tambahan rahasia tersebut.</li>
                        </ul>
                      </div>
                    </div>

                    <div style={{ padding: "16px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-muted)" }}>Contoh Simulasi Nilai Katrol:</span>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "6px", fontSize: "0.8rem" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: "700" }}>Rudi Hermawan</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Nilai Aktual: 71.00 (Belum Tuntas)</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            <span>Katrol</span>
                            <strong style={{ color: "#34d399" }}>🔒 +4</strong>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                            <span style={{ fontWeight: "800", color: "var(--success)", fontSize: "1rem" }}>75.00</span>
                            <span style={{ fontSize: "0.65rem", backgroundColor: "rgba(16,185,129,0.15)", color: "#34d399", padding: "1px 4px", borderRadius: "3px" }}>LULUS</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", backgroundColor: "var(--bg-secondary)" }}>
              <button onClick={() => setPanduanModalOpen(false)} className="btn btn-primary" style={{ padding: "8px 20px", fontSize: "0.85rem" }}>
                Mengerti & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gabung Aspek ke Kelompok */}
      {mergeModalOpen && (() => {
        const selectedCols = kelas.kolomNilai.filter(c => selectedForGroup.has(c.id));
        const totalBobot = selectedCols.reduce((sum, c) => sum + (Number(c.bobot) || 0), 0);
        return (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" }}>
            <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "500px", display: "flex", flexDirection: "column", gap: "16px", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "800", margin: 0 }}>🔗 Gabung Aspek ke Kelompok</h3>
                <button onClick={() => setMergeModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "var(--text-muted)", lineHeight: 1 }}>×</button>
              </div>

              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", backgroundColor: "rgba(59,130,246,0.06)", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(59,130,246,0.15)" }}>
                <strong>💡 Cara Kerja:</strong> Aspek-aspek yang dipilih akan menjadi sub-aspek dalam kelompok baru. Semua data nilai siswa yang sudah ada <strong>tetap terjaga</strong> — tidak ada data yang hilang.
              </div>

              {/* Daftar aspek yang akan digabung */}
              <div>
                <p style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Aspek yang akan digabung:</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {selectedCols.map(c => {
                    const bobotNorm = totalBobot > 0 ? Math.round((c.bobot / totalBobot) * 10000) / 100 : 0;
                    return (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", fontSize: "0.83rem" }}>
                        <span style={{ fontWeight: "600" }}>{c.nama}</span>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>bobot asli: {c.bobot}%</span>
                          <span style={{ color: "var(--primary)", fontWeight: "700", fontSize: "0.75rem" }}>→ {bobotNorm}% dalam grup</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: "8px", padding: "6px 10px", backgroundColor: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Bobot kelompok di nilai akhir:</span>
                  <strong style={{ color: totalBobot === 100 ? "var(--success)" : "var(--text-primary)" }}>{totalBobot}%</strong>
                </div>
              </div>

              {/* Input nama kelompok */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: "700" }}>Nama Kelompok Baru</label>
                <input
                  id="merge-group-name-input"
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Pengetahuan, Keterampilan, ..."
                  value={mergeGroupName}
                  onChange={(e) => setMergeGroupName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && mergeGroupName.trim()) handleMergeToGroup(); }}
                  style={{ padding: "8px 12px", fontSize: "0.9rem" }}
                  autoFocus
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                <button onClick={() => setMergeModalOpen(false)} className="btn btn-secondary" disabled={isMerging}>Batal</button>
                <button
                  onClick={handleMergeToGroup}
                  className="btn btn-primary"
                  disabled={isMerging || !mergeGroupName.trim()}
                  style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: "120px", justifyContent: "center" }}
                >
                  {isMerging ? (
                    <>
                      <span style={{ display: "inline-block", width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      Menggabung...
                    </>
                  ) : (
                    <>🔗 Konfirmasi & Gabung</>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== MODAL: Atur Aspek & Bobot ===== */}
      {kolomModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }}>
          <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "850px", height: "80vh", maxHeight: "750px", minHeight: "min(550px, 90vh)", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-color)", padding: "24px 24px 16px 24px" }}>
              <div>
                <h3 style={{ fontSize: "1.4rem", fontWeight: "800", margin: 0 }}>⚖️ Atur Aspek & Bobot Nilai</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>Kelola aspek penilaian, bobot, dan sub-aspek.</p>
              </div>
              <button onClick={handleCloseKolomModal} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1, padding: "4px" }}>✕</button>
            </div>

            <div className="aspect-modal-container">
              {/* --- PANEL KIRI: DAFTAR ASPEK --- */}
              <div className="aspect-sidebar-panel">
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase" }}>Daftar Aspek ({kelas.kolomNilai.length + newAspects.filter(a => a.nama.trim() !== "").length})</span>
                  <input
                    type="checkbox"
                    title="Pilih semua aspek mandiri"
                    style={{ accentColor: "var(--primary)", width: "14px", height: "14px", cursor: "pointer" }}
                    checked={kelas.kolomNilai.filter(c => !c.isGroup).length > 0 && kelas.kolomNilai.filter(c => !c.isGroup).every(c => selectedForGroup.has(c.id))}
                    onChange={(e) => {
                      const eligibleIds = kelas.kolomNilai.filter(c => !c.isGroup).map(c => c.id);
                      if (e.target.checked) {
                        setSelectedForGroup(new Set(eligibleIds));
                      } else {
                        setSelectedForGroup(new Set());
                      }
                    }}
                  />
                </div>
                
                <div className="aspect-sidebar-list">
                  {/* Existing Aspects */}
                  {kelas.kolomNilai.map((col) => {
                    const isActive = col.id === activeAspectId;
                    return (
                      <div
                        key={col.id}
                        className={`aspect-item-card ${isActive ? "active" : ""}`}
                        onClick={() => setActiveAspectId(col.id)}
                      >
                        <div className="aspect-item-card-header">
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                            {!col.isGroup && (
                              <input
                                type="checkbox"
                                checked={selectedForGroup.has(col.id)}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const next = new Set(selectedForGroup);
                                  if (e.target.checked) next.add(col.id);
                                  else next.delete(col.id);
                                  setSelectedForGroup(next);
                                }}
                                style={{ accentColor: "var(--primary)", width: "14px", height: "14px", cursor: "pointer", flexShrink: 0 }}
                                title="Pilih untuk digabung ke kelompok"
                              />
                            )}
                            <span className="aspect-item-card-title">{col.nama || <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>(Tanpa Nama)</span>}</span>
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteKolom(col.id, col.nama);
                            }}
                            style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "0.85rem", padding: "2px" }}
                            title="Hapus aspek"
                          >
                            🗑️
                          </button>
                        </div>
                        
                        <div className="aspect-item-card-meta">
                          <span className="badge badge-primary" style={{ fontSize: "0.6rem", padding: "1px 6px" }}>
                            {col.bobot || 0}%
                          </span>
                          {col.isGroup ? (
                            <span className="badge badge-warning" style={{ fontSize: "0.6rem", padding: "1px 6px" }}>
                              Kelompok ({col.subKolom?.length || 0})
                            </span>
                          ) : (
                            <span className="badge badge-success" style={{ fontSize: "0.6rem", padding: "1px 6px", backgroundColor: "rgba(16,185,129,0.04)" }}>
                              Tunggal
                            </span>
                          )}
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginLeft: "auto" }}>
                            {kelas.skemaPenilaian?.hiddenAspek?.includes(col.id) ? "🔒" : "👁️"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* New Aspects */}
                  {newAspects.map((aspect) => {
                    const isActive = aspect.id === activeAspectId;
                    return (
                      <div
                        key={aspect.id}
                        className={`aspect-item-card ${isActive ? "active" : ""}`}
                        style={{ borderStyle: "dashed", borderColor: isActive ? "var(--primary)" : "var(--success)" }}
                        onClick={() => setActiveAspectId(aspect.id)}
                      >
                        <div className="aspect-item-card-header">
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                            <span className="badge badge-success" style={{ fontSize: "0.6rem", padding: "1px 4px", flexShrink: 0 }}>BARU</span>
                            <span className="aspect-item-card-title">{aspect.nama || <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>+ Aspek Baru</span>}</span>
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveNewAspect(aspect.id);
                            }}
                            style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "0.85rem", padding: "2px" }}
                            title="Hapus aspek baru"
                          >
                            ✖
                          </button>
                        </div>
                        
                        <div className="aspect-item-card-meta">
                          <span className="badge badge-primary" style={{ fontSize: "0.6rem", padding: "1px 6px" }}>
                            {aspect.bobot || 0}%
                          </span>
                          {aspect.isGroup ? (
                            <span className="badge badge-warning" style={{ fontSize: "0.6rem", padding: "1px 6px" }}>
                              Kelompok ({aspect.subKolom?.length || 0})
                            </span>
                          ) : (
                            <span className="badge badge-success" style={{ fontSize: "0.6rem", padding: "1px 6px", backgroundColor: "rgba(16,185,129,0.04)" }}>
                              Tunggal
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Button Add New Aspect */}
                  <button
                    onClick={handleAddBlankAspect}
                    className="btn btn-secondary"
                    style={{ borderStyle: "dashed", borderColor: "var(--primary)", color: "var(--primary)", padding: "10px", fontSize: "0.82rem", fontWeight: "700", width: "100%", marginTop: "10px" }}
                  >
                    ➕ Tambah Aspek Baru
                  </button>
                </div>

                {/* Merge Toolbar — muncul jika 2+ aspek mandiri dipilih */}
                {selectedForGroup.size >= 2 && (
                  <div className="animate-fade-in" style={{ padding: "12px", backgroundColor: "rgba(59,130,246,0.08)", borderTop: "1px solid rgba(59,130,246,0.2)", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: "700", color: "var(--primary)" }}>🔲 {selectedForGroup.size} Terpilih</span>
                      <button onClick={() => setSelectedForGroup(new Set())} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline" }}>Batal</button>
                    </div>
                    <button
                      onClick={() => { setMergeGroupName(""); setMergeModalOpen(true); }}
                      className="btn btn-primary"
                      style={{ padding: "6px 10px", fontSize: "0.75rem", fontWeight: "700", width: "100%" }}
                    >
                      🔗 Gabung ke Kelompok
                    </button>
                  </div>
                )}
              </div>

              {/* --- PANEL KANAN: CONFIG DETAIL --- */}
              <div className="aspect-content-panel">
                {(() => {
                  const activeAspect = kelas.kolomNilai.find(c => c.id === activeAspectId) || newAspects.find(a => a.id === activeAspectId);
                  
                  if (!activeAspect) {
                    return (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center", flex: 1, color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>
                        <span style={{ fontSize: "3rem", marginBottom: "16px" }}>⚖️</span>
                        <h4 style={{ fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>Belum Ada Aspek Terpilih</h4>
                        <p style={{ fontSize: "0.82rem", maxWidth: "300px" }}>Pilih salah satu aspek penilaian di sebelah kiri untuk dikonfigurasi, atau buat aspek baru.</p>
                      </div>
                    );
                  }

                  const isNew = newAspects.some(a => a.id === activeAspectId);

                  return (
                    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      {/* Name & Weight Row */}
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Nama Aspek Penilaian</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Contoh: UTS, UAS, Tugas, Praktikum..."
                            value={activeAspect.nama}
                            onChange={(e) => {
                              if (isNew) handleNewAspectChange(activeAspect.id, 'nama', e.target.value);
                              else handleColumnNameChange(activeAspect.id, e.target.value);
                            }}
                            style={{ padding: "10px 14px" }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Bobot Nilai (%)</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="form-input"
                            placeholder="%"
                            value={activeAspect.bobot}
                            onChange={(e) => {
                              if (e.target.value === "" || /^\d*$/.test(e.target.value)) {
                                if (isNew) handleNewAspectChange(activeAspect.id, 'bobot', e.target.value);
                                else handleBobotChange(activeAspect.id, e.target.value);
                              }
                            }}
                            style={{ padding: "10px 14px", textAlign: "center" }}
                          />
                        </div>
                      </div>

                      {/* Visibility & DB Info Row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: "700" }}>Visibilitas Nilai</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            {isNew ? "Aspek baru akan otomatis ditampilkan setelah disimpan." : "Tentukan apakah siswa dapat melihat nilai aspek ini di portal mereka."}
                          </span>
                        </div>
                        {isNew ? (
                          <span className="badge badge-success" style={{ fontSize: "0.7rem", backgroundColor: "rgba(16,185,129,0.08)" }}>Otomatis Tampil</span>
                        ) : (
                          <button
                            onClick={() => toggleAspectVisibility(activeAspect.id)}
                            className="btn btn-secondary"
                            style={{
                              padding: "6px 12px",
                              fontSize: "0.78rem",
                              fontWeight: "700",
                              borderColor: kelas.skemaPenilaian?.hiddenAspek?.includes(activeAspect.id) ? "var(--danger)" : "var(--success)",
                              color: kelas.skemaPenilaian?.hiddenAspek?.includes(activeAspect.id) ? "var(--danger)" : "var(--success)",
                              backgroundColor: kelas.skemaPenilaian?.hiddenAspek?.includes(activeAspect.id) ? "rgba(239, 68, 68, 0.05)" : "rgba(16, 185, 129, 0.05)"
                            }}
                          >
                            {kelas.skemaPenilaian?.hiddenAspek?.includes(activeAspect.id) ? "🔒 Tersembunyi (Siswa)" : "👁️ Tampil (Siswa)"}
                          </button>
                        )}
                      </div>

                      {/* Tipe Aspek Selector (Single vs Group) */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <label className="form-label">Tipe Struktur Aspek</label>
                        <div className="selection-card-grid">
                          {/* Option 1: Single */}
                          <div
                            className={`selection-card ${!activeAspect.isGroup ? "active" : ""}`}
                            onClick={() => {
                              if (activeAspect.isGroup) {
                                if (isNew) {
                                  handleNewAspectChange(activeAspect.id, 'isGroup', false);
                                } else {
                                  handleToggleGroupType(activeAspect, false);
                                }
                              }
                            }}
                          >
                            <span className="selection-card-icon">🎯</span>
                            <div className="selection-card-content">
                              <span className="selection-card-title">Aspek Tunggal</span>
                              <span className="selection-card-desc">Satu nilai tunggal di spreadsheet. Bagus untuk: UTS, UAS, Keaktifan.</span>
                            </div>
                          </div>

                          {/* Option 2: Group */}
                          <div
                            className={`selection-card ${activeAspect.isGroup ? "active" : ""}`}
                            onClick={() => {
                              if (!activeAspect.isGroup) {
                                if (isNew) {
                                  handleNewAspectChange(activeAspect.id, 'isGroup', true);
                                } else {
                                  handleToggleGroupType(activeAspect, true);
                                }
                              }
                            }}
                          >
                            <span className="selection-card-icon">📂</span>
                            <div className="selection-card-content">
                              <span className="selection-card-title">Kelompok Nilai (Grup)</span>
                              <span className="selection-card-desc">Wadah untuk beberapa sub-aspek. Bagus untuk: Kumpulan Tugas Harian, KD 1 - KD 4.</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Group Calculation & Sub-Aspects (Only if Group) */}
                      {activeAspect.isGroup && (
                        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                          {/* Calculation Method Selection */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <label className="form-label">Metode Perhitungan Sub-Aspek</label>
                            <div className="selection-card-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "8px" }}>
                              <div
                                className={`selection-card ${activeAspect.hitungMetode !== "persentase" ? "active" : ""}`}
                                onClick={() => {
                                  if (isNew) {
                                    handleNewAspectChange(activeAspect.id, 'hitungMetode', 'rata-rata');
                                  } else {
                                    const newCols = kelas.kolomNilai.map(c => c.id === activeAspect.id ? { ...c, hitungMetode: 'rata-rata' } : c);
                                    setKelas({ ...kelas, kolomNilai: newCols });
                                  }
                                }}
                                style={{ padding: "12px", gap: "10px" }}
                              >
                                <span className="selection-card-icon" style={{ fontSize: "1.4rem" }}>🧮</span>
                                <div className="selection-card-content">
                                  <span className="selection-card-title" style={{ fontSize: "0.88rem" }}>Rata-rata Otomatis</span>
                                  <span className="selection-card-desc" style={{ fontSize: "0.72rem" }}>Nilai grup = rata-rata dari sub-aspek yang terisi.</span>
                                </div>
                              </div>

                              <div
                                className={`selection-card ${activeAspect.hitungMetode === "persentase" ? "active" : ""}`}
                                onClick={() => {
                                  if (isNew) {
                                    handleNewAspectChange(activeAspect.id, 'hitungMetode', 'persentase');
                                  } else {
                                    const newCols = kelas.kolomNilai.map(c => c.id === activeAspect.id ? { ...c, hitungMetode: 'persentase' } : c);
                                    setKelas({ ...kelas, kolomNilai: newCols });
                                  }
                                }}
                                style={{ padding: "12px", gap: "10px" }}
                              >
                                <span className="selection-card-icon" style={{ fontSize: "1.4rem" }}>⚖️</span>
                                <div className="selection-card-content">
                                  <span className="selection-card-title" style={{ fontSize: "0.88rem" }}>Bobot Kustom (%)</span>
                                  <span className="selection-card-desc" style={{ fontSize: "0.72rem" }}>Setiap sub-aspek memiliki porsi bobot berbeda (harus 100%).</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Sub-Aspects List Manager */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <label className="form-label" style={{ margin: 0 }}>Daftar Sub-Aspek Penilaian</label>
                              {activeAspect.hitungMetode === "persentase" && (
                                <span
                                  className="badge"
                                  style={{
                                    fontSize: "0.7rem",
                                    fontWeight: "700",
                                    backgroundColor: (activeAspect.subKolom || []).reduce((sum, s) => sum + (Number(s.bobot) || 0), 0) === 100 ? "var(--success-glow)" : "var(--warning-glow)",
                                    color: (activeAspect.subKolom || []).reduce((sum, s) => sum + (Number(s.bobot) || 0), 0) === 100 ? "var(--success)" : "var(--warning)",
                                    border: (activeAspect.subKolom || []).reduce((sum, s) => sum + (Number(s.bobot) || 0), 0) === 100 ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(245,158,11,0.2)"
                                  }}
                                >
                                  Total Bobot: {(activeAspect.subKolom || []).reduce((sum, s) => sum + (Number(s.bobot) || 0), 0)}% {(activeAspect.subKolom || []).reduce((sum, s) => sum + (Number(s.bobot) || 0), 0) === 100 ? "✓ Pas" : "⚠️ Harus 100%"}
                                </span>
                              )}
                            </div>

                            <div className="sub-aspect-list">
                              {(activeAspect.subKolom || []).map((sub, sIdx) => (
                                <div key={sub.id} className="sub-aspect-row">
                                  <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Contoh: Tugas 1, Kuis 1, KD 3.1..."
                                    value={sub.nama}
                                    onChange={(e) => {
                                      if (isNew) {
                                        const newSub = activeAspect.subKolom.map(s => s.id === sub.id ? { ...s, nama: e.target.value } : s);
                                        handleNewAspectChange(activeAspect.id, 'subKolom', newSub);
                                      } else {
                                        const newCols = kelas.kolomNilai.map(c => c.id === activeAspect.id ? { ...c, subKolom: c.subKolom.map(s => s.id === sub.id ? { ...s, nama: e.target.value } : s) } : c);
                                        setKelas({ ...kelas, kolomNilai: newCols });
                                      }
                                    }}
                                    style={{ padding: "6px 12px", fontSize: "0.85rem", flex: 1 }}
                                  />

                                  {activeAspect.hitungMetode === "persentase" && (
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      className="form-input"
                                      placeholder="%"
                                      value={sub.bobot !== null && sub.bobot !== undefined ? sub.bobot : ""}
                                      onChange={(e) => {
                                        if (e.target.value === "" || /^\d*$/.test(e.target.value)) {
                                          const val = e.target.value === "" ? null : Number(e.target.value);
                                          if (isNew) {
                                            const newSub = activeAspect.subKolom.map(s => s.id === sub.id ? { ...s, bobot: val } : s);
                                            handleNewAspectChange(activeAspect.id, 'subKolom', newSub);
                                          } else {
                                            const newCols = kelas.kolomNilai.map(c => c.id === activeAspect.id ? { ...c, subKolom: c.subKolom.map(s => s.id === sub.id ? { ...s, bobot: val } : s) } : c);
                                            setKelas({ ...kelas, kolomNilai: newCols });
                                          }
                                        }
                                      }}
                                      style={{ padding: "6px 8px", fontSize: "0.85rem", width: "55px", textAlign: "center" }}
                                    />
                                  )}

                                  <button
                                    onClick={() => {
                                      if (isNew) {
                                        const newSub = activeAspect.subKolom.filter(s => s.id !== sub.id);
                                        handleNewAspectChange(activeAspect.id, 'subKolom', newSub);
                                      } else {
                                        const hasData = kelas.siswa.some(s => s.nilai[sub.id] !== undefined && s.nilai[sub.id] !== null && s.nilai[sub.id] !== "");
                                        if (hasData) {
                                          if (!confirm(`⚠️ PERINGATAN!\nSub-aspek "${sub.nama}" sudah memiliki data nilai siswa yang terisi!\n\nJika dihapus, nilai siswa di sub-aspek ini akan terhapus secara permanen saat Anda menekan Simpan.\n\nApakah Anda benar-benar yakin ingin menghapusnya?`)) {
                                            return;
                                          }
                                        } else {
                                          if (!confirm(`Hapus sub-aspek ${sub.nama}?`)) return;
                                        }
                                        const newCols = kelas.kolomNilai.map(c => c.id === activeAspect.id ? { ...c, subKolom: c.subKolom.filter(s => s.id !== sub.id) } : c);
                                        setKelas({ ...kelas, kolomNilai: newCols });
                                      }
                                    }}
                                    style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "1rem", padding: "4px" }}
                                    title="Hapus sub-aspek"
                                  >
                                    ✖
                                  </button>
                                </div>
                              ))}
                            </div>

                            <button
                              onClick={() => {
                                const newSubObj = { id: `sub-new-${Date.now()}-${Math.random()}`, nama: "", bobot: "" };
                                if (isNew) {
                                  const newSub = [...(activeAspect.subKolom || []), newSubObj];
                                  handleNewAspectChange(activeAspect.id, 'subKolom', newSub);
                                } else {
                                  const newCols = kelas.kolomNilai.map(c => c.id === activeAspect.id ? { ...c, subKolom: [...(c.subKolom || []), newSubObj] } : c);
                                  setKelas({ ...kelas, kolomNilai: newCols });
                                }
                              }}
                              className="btn btn-secondary"
                              style={{ fontSize: "0.78rem", padding: "6px 12px", color: "var(--primary)", width: "max-content", marginTop: "8px" }}
                            >
                              ➕ Tambah Sub-Aspek
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)", flexWrap: "wrap", gap: "12px", borderBottomLeftRadius: "var(--radius-md)", borderBottomRightRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.88rem", fontWeight: "700", color: totalBobot === 100 ? "var(--success)" : "var(--warning)" }}>
                  Total Bobot: {totalBobot}%
                </span>
                <span className={`badge ${totalBobot === 100 ? "badge-success" : "badge-warning"}`} style={{ fontSize: "0.62rem" }}>
                  {totalBobot === 100 ? "✓ Lengkap" : "Harus 100%"}
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={handleCloseKolomModal} className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "0.82rem" }} disabled={isSavingBobot}>
                  Batal & Tutup
                </button>
                <button onClick={handleOpenDuplicate} className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "0.82rem" }} title="Salin Aspek & Bobot dari Kelas Lain" disabled={isSavingBobot}>
                  📋 Salin dari Kelas Lain
                </button>
                <button
                  onClick={saveAllBobot}
                  className="btn btn-primary"
                  style={{ padding: "8px 20px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "7px", minWidth: "110px", justifyContent: "center" }}
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
        </div>
      )}

      {/* ===== MODAL KONFIRMASI PERUBAHAN BELUM DISIMPAN ===== */}
      {showUnsavedConfirm && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "420px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "var(--shadow-lg), 0 0 30px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "2rem" }}>⚠️</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800", color: "var(--text-primary)" }}>Perubahan Belum Disimpan</h4>
                <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Anda telah membuat perubahan pada konfigurasi aspek nilai.</span>
              </div>
            </div>
            
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Apakah Anda ingin menyimpan perubahan tersebut sebelum menutup pengaturan aspek?
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
              <button
                onClick={() => {
                  setShowUnsavedConfirm(false);
                  saveAllBobot();
                }}
                className="btn btn-primary"
                style={{ width: "100%", padding: "10px", fontSize: "0.85rem", fontWeight: "700" }}
              >
                💾 Ya, Simpan Perubahan
              </button>
              <button
                onClick={forceCloseKolomModal}
                className="btn btn-danger"
                style={{ width: "100%", padding: "10px", fontSize: "0.85rem", fontWeight: "700", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.2)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--danger)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)"; e.currentTarget.style.color = "var(--danger)"; }}
              >
                🗑️ Buang Perubahan
              </button>
              <button
                onClick={() => setShowUnsavedConfirm(false)}
                className="btn btn-secondary"
                style={{ width: "100%", padding: "10px", fontSize: "0.85rem" }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ===== MODAL: Atur Status Nilai & KKM ===== */}
      {rangeModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }}>
          <div className="glass-card animate-fade-in modal-content-scroll" style={{ width: "100%", maxWidth: "500px", maxHeight: "90vh", display: "flex", flexDirection: "column", padding: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-color)", padding: "24px 24px 16px 24px" }}>
              <div>
                <h3 style={{ fontSize: "1.4rem", fontWeight: "800", margin: 0 }}>📊 Atur Status Nilai & KKM</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>Atur ambang batas tiap predikat dan nilai kelulusan.</p>
              </div>
              <button onClick={() => { setRangeModalOpen(false); setFabOpen(false); }} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1, padding: "4px" }}>✕</button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
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
          </div>
        </div>
      )}

      {/* ===== MODAL: Atur Nilai Katrol (Rahasia) ===== */}
      {katrolModalOpen && katrolSiswa && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }}>
          <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "420px", display: "flex", flexDirection: "column", padding: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-color)", padding: "20px 24px" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800", margin: 0 }}>🔒 Katrol / Penyesuaian Nilai</h3>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>Set nilai tambahan khusus secara rahasia.</p>
              </div>
              <button onClick={() => { setKatrolModalOpen(false); setKatrolSiswa(null); }} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer", lineHeight: 1, padding: "4px" }}>✕</button>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", backgroundColor: "var(--bg-secondary)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "700" }}>{katrolSiswa.nama}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>NISN: {katrolSiswa.nisn}</span>
                <div style={{ borderTop: "1px solid var(--border-color)", marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                  <span>Nilai Aktual (Murni):</span>
                  <strong>{((katrolSiswa.finalScore || 0) - (Number(katrolSiswa.nilai?._katrol) || 0)).toFixed(2)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginTop: "4px" }}>
                  <span>Nilai Akhir Saat Ini:</span>
                  <strong style={{ color: "var(--primary)" }}>{katrolSiswa.finalScore?.toFixed(2) ?? "0.00"}</strong>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                  🔒 Tambahan Poin Katrol (Rahasia)
                </label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Contoh: 5 (menambah 5 poin)"
                  value={katrolValue}
                  onChange={(e) => setKatrolValue(e.target.value)}
                  style={{ padding: "8px 12px", fontSize: "0.9rem" }}
                  autoFocus
                />
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                  *Nilai katrol ditambahkan langsung ke Nilai Akhir siswa, bersifat tersembunyi bagi siswa di portal pencarian.
                </span>
              </div>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: "12px", marginTop: "4px" }}>
                <button 
                  onClick={() => { setKatrolModalOpen(false); setKatrolSiswa(null); }} 
                  className="btn btn-secondary" 
                  style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                  disabled={isSavingKatrol}
                >
                  Batal
                </button>
                <button 
                  onClick={async () => {
                    setIsSavingKatrol(true);
                    try {
                      const _katrol = katrolValue !== "" && katrolValue !== null && katrolValue !== undefined ? Number(katrolValue) : null;
                      const response = await fetch(`/api/kelas/${classId}/siswa/${katrolSiswa.nisn}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                          nilai: { _katrol }
                        }),
                      });
                      
                      if (!response.ok) {
                        const data = await response.json();
                        throw new Error(data.error || "Gagal menyimpan nilai katrol");
                      }
                      
                      setKatrolModalOpen(false);
                      setKatrolSiswa(null);
                      fetchClassDetail();
                    } catch (err) {
                      alert(err.message || "Gagal menyimpan.");
                    } finally {
                      setIsSavingKatrol(false);
                    }
                  }} 
                  className="btn btn-primary" 
                  style={{ padding: "6px 16px", fontSize: "0.82rem", minWidth: "90px", display: "flex", justifyContent: "center" }}
                  disabled={isSavingKatrol}
                >
                  {isSavingKatrol ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </>
  );
}
