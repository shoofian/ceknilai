"use client";

import { useState, useEffect, use, useMemo, Fragment, useRef } from "react";
import { createPortal } from "react-dom";
import Modal from '@/components/Modal';
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import RaporIntegrationModal from "@/components/RaporIntegrationModal";
import RemedialModal from "@/components/RemedialModal";
import RemedialReportModal from "@/components/RemedialReportModal";
import AdvancedToolsModal from "@/components/AdvancedToolsModal";
import dynamic from "next/dynamic";

import { ASPEK_PRESETS } from '@/lib/presets';

const QrScannerModal = dynamic(() => import("@/components/QrScannerModal"), { ssr: false });
const QrCardGeneratorModal = dynamic(() => import("@/components/QrCardGeneratorModal"), { ssr: false });


export default function DetailKelas({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const classId = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const quickAttendanceTriggered = useRef(false);

  const [loading, setLoading] = useState(true);
  const [kelas, setKelas] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const studentsWithoutBirthDate = useMemo(() => {
    if (!kelas || !kelas.siswa) return [];
    return kelas.siswa.filter(s => {
      const dob = s.tanggalLahir ? s.tanggalLahir.toString().trim() : "";
      return !dob || dob === "-" || dob === "1900-01-01";
    });
  }, [kelas]);
  
  // State Onboarding
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  
  // State Print Preview
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const iframeRef = useRef(null);
  const lastClickRef = useRef({});
  
  // States untuk Siswa
  const [siswaModalOpen, setSiswaModalOpen] = useState(false);
  const [selectedNisns, setSelectedNisns] = useState([]);
  const [isEditingSiswa, setIsEditingSiswa] = useState(false);
  const [oldNisn, setOldNisn] = useState("");
  const [nisn, setNisn] = useState("");
  const [namaSiswa, setNamaSiswa] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [targetClassId, setTargetClassId] = useState("");
  const [nilaiKatrol, setNilaiKatrol] = useState("");
  const [siswaError, setSiswaError] = useState("");

  // States & Handlers untuk Remedial, Pengayaan & Bonus
  const [remedialModalOpen, setRemedialModalOpen] = useState(false);
  const [selectedRemedialKolom, setSelectedRemedialKolom] = useState(null);
  const [remedialReportOpen, setRemedialReportOpen] = useState(false);
  const [remedialReportConfig, setRemedialReportConfig] = useState({});
  const [advancedToolsModalOpen, setAdvancedToolsModalOpen] = useState(false);

  const handleSaveRemedial = async (updatedSiswaList, newSkemaConfig) => {
    try {
      const updatedSkema = {
        ...(kelas.skemaPenilaian || {}),
        ...newSkemaConfig
      };

      setKelas((prev) => ({
        ...prev,
        siswa: updatedSiswaList,
        skemaPenilaian: updatedSkema
      }));

      setRemedialModalOpen(false);

      await fetch(`/api/kelas/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skemaPenilaian: updatedSkema })
      });

      await Promise.all(
        updatedSiswaList.map((s) =>
          fetch(`/api/kelas/${classId}/siswa/${s.nisn}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nilai: s.nilai })
          })
        )
      );
    } catch (err) {
      console.error("Gagal menyimpan data remedial:", err);
    }
  };

  const handleOpenRemedialReport = (kolom, config) => {
    setRemedialReportConfig(config);
    setRemedialReportOpen(true);
  };

  // States untuk Kolom Nilai
  const [presetSelectionModalOpen, setPresetSelectionModalOpen] = useState(false);
  const [kolomModalOpen, setKolomModalOpen] = useState(false);

  const handleOpenKolomModal = () => {
    if (!kelas?.kolomNilai || kelas.kolomNilai.length === 0) {
      setPresetSelectionModalOpen(true);
    } else {
      setKolomModalOpen(true);
    }
  };
  const [fabOpen, setFabOpen] = useState(false);
  const [newAspects, setNewAspects] = useState([{ id: Date.now(), nama: "", bobot: "", isGroup: false, subKolom: [] }]);
  const [kolomError, setKolomError] = useState("");
  const [activeAspectId, setActiveAspectId] = useState(null);
  const [initialHiddenAspek, setInitialHiddenAspek] = useState([]);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: "Batal",
    isDanger: false,
    isAlert: false,
    onConfirm: null
  });

  const triggerConfirm = (message, onConfirm, options = {}) => {
    setConfirmConfig({
      isOpen: true,
      title: options.title || "Konfirmasi",
      message: message,
      confirmText: options.confirmText || "OK",
      cancelText: options.cancelText || "Batal",
      isDanger: !!options.isDanger,
      isAlert: false,
      onConfirm: () => {
        onConfirm();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const triggerAlert = (message, onConfirm = null, options = {}) => {
    setConfirmConfig({
      isOpen: true,
      title: options.title || "Informasi",
      message: message,
      confirmText: options.confirmText || "Tutup",
      cancelText: "",
      isDanger: !!options.isDanger,
      isAlert: true,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };
  
  // Status penyimpanan otomatis tabel nilai
  const [saveStatus, setSaveStatus] = useState({}); // { [nisn-colId]: 'idle' | 'saving' | 'saved' }


  // States untuk Status Nilai
  const [rangeModalOpen, setRangeModalOpen] = useState(false);
  const [gradeA, setGradeA] = useState(85);
  const [gradeB, setGradeB] = useState(75);
  const [gradeC, setGradeC] = useState(65);
  const [gradeD, setGradeD] = useState(50);
  const [kkm, setKkm] = useState("");
  // Label status untuk setiap rentang
  const [statusA, setStatusA] = useState('A');
  const [statusB, setStatusB] = useState('B');
  const [statusC, setStatusC] = useState('C');
  const [statusD, setStatusD] = useState('D');


  // States untuk Impor CSV
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewList, setPreviewList] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importWarnings, setImportWarnings] = useState([]);
  const [rombelSelectModalOpen, setRombelSelectModalOpen] = useState(false);
  const [tempParsedSiswa, setTempParsedSiswa] = useState([]);
  const [availableRombels, setAvailableRombels] = useState([]);
  const [selectedRombelFilter, setSelectedRombelFilter] = useState("");

  // State loading saat simpan komponen & bobot
  const [isSavingBobot, setIsSavingBobot] = useState(false);

  // States untuk Presensi
  const [presensiModalOpen, setPresensiModalOpen] = useState(false);
  const [isSavingPresensi, setIsSavingPresensi] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCardModalOpen, setQrCardModalOpen] = useState(false);
  const [unlockedPertemuanIds, setUnlockedPertemuanIds] = useState([]);
  const togglePertemuanLock = (pertemuanId) => {
    setUnlockedPertemuanIds(prev => 
      prev.includes(pertemuanId) 
        ? prev.filter(id => id !== pertemuanId) 
        : [...prev, pertemuanId]
    );
  };
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
  const [defaultBulkStatus, setDefaultBulkStatus] = useState(""); // empty/blank by default

  const [panduanModalOpen, setPanduanModalOpen] = useState(false);
  const [panduanActiveTab, setPanduanActiveTab] = useState("komponen"); // komponen, kkm, siswa, ekspor, erapor, katrol
  const [switcherOpen, setSwitcherOpen] = useState(false);


  // States untuk Hub Modal Operasi Data
  const [kelolaSiswaModalOpen, setKelolaSiswaModalOpen] = useState(false);
  const [kelolaSiswaTab, setKelolaSiswaTab] = useState('tambah'); // 'tambah' | 'impor' | 'sync'
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isSyncingBankData, setIsSyncingBankData] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncPreviewData, setSyncPreviewData] = useState(null);
  const [cetakEksporModalOpen, setCetakEksporModalOpen] = useState(false);
  const [cetakEksporTab, setCetakEksporTab] = useState('laporan'); // 'laporan' | 'kartu' | 'erapor' | 'excel'

  const [panelKontrolExpanded, setPanelKontrolExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth < 768) return false; // Selalu paksa tertutup di mobile (< 768px)
      const saved = sessionStorage.getItem("panelKontrolExpanded");
      if (saved !== null) return saved === "true";
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setPanelKontrolExpanded(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("panelKontrolExpanded", String(panelKontrolExpanded));
    }
  }, [panelKontrolExpanded]);





  // State untuk profile guru
  const [guruProfile, setGuruProfile] = useState(null);
  const isLocked = !!(guruProfile && guruProfile.is_locked);

  // State & handler untuk deteksi mobile screen
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const formatNameForMobile = (name, isExpanded) => {
    if (!name) return "";
    if (isExpanded) return name;
    if (!isMobile) return name;

    const originalName = name.trim();
    const words = originalName.split(/\s+/);

    if (words.length > 2 && /^muhammad\b/i.test(originalName)) {
      const word1 = "M.";
      const word2 = words[1];
      const word3 = words[2];
      const remainingInitials = words.slice(3).map(w => w ? w[0].toUpperCase() + "." : "").filter(Boolean).join(" ");
      return `${word1} ${word2} ${word3}${remainingInitials ? " " + remainingInitials : ""}`;
    }

    let displayName = originalName;
    if (/^muhammad\b/i.test(displayName)) {
      displayName = displayName.replace(/^muhammad\b/i, 'M.');
    }

    const currentWords = displayName.split(/\s+/);
    if (currentWords.length <= 2) return displayName;

    const firstTwo = currentWords.slice(0, 2).join(" ");
    const remainingInitials = currentWords.slice(2).map(w => w ? w[0].toUpperCase() + "." : "").filter(Boolean).join(" ");
    return `${firstTwo} ${remainingInitials}`;
  };

  // States untuk Bagikan Overview
  const [isGeneratingOverview, setIsGeneratingOverview] = useState(false);
  const [generatedOverviewImage, setGeneratedOverviewImage] = useState(null);

  // States untuk Catatan Siswa
  const [openCatatan, setOpenCatatan] = useState({}); // { [nisn]: boolean }
  const [catatanSiswaTerpilih, setCatatanSiswaTerpilih] = useState(null); // Siswa yang sedang diedit catatannya di modal
  const [isNamaColumnExpanded, setIsNamaColumnExpanded] = useState(false);
  const [catatanDraft, setCatatanDraft] = useState({}); // { [nisn]: string }
  const [savingCatatan, setSavingCatatan] = useState({}); // { [nisn]: boolean }
  const [temporaryScores, setTemporaryScores] = useState({}); // For real-time updates while typing

  // States untuk Fitur Duplikasi Aspek
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [fetchingClasses, setFetchingClasses] = useState(false);
  const [initialKolomNilai, setInitialKolomNilai] = useState([]);
  const [deletedKolomIds, setDeletedKolomIds] = useState([]);

  // States untuk Fitur Terapkan Komponen ke Kelas Lain
  const [applyToOtherModalOpen, setApplyToOtherModalOpen] = useState(false);
  const [applySelectedClassIds, setApplySelectedClassIds] = useState([]);
  const [applySearchQuery, setApplySearchQuery] = useState("");
  const [isApplyingToOther, setIsApplyingToOther] = useState(false);

  // States untuk Katrol Nilai Baru
  const [katrolModalOpen, setKatrolModalOpen] = useState(false);
  const [katrolSiswa, setKatrolSiswa] = useState(null);
  const [katrolValue, setKatrolValue] = useState("");
  const [isSavingKatrol, setIsSavingKatrol] = useState(false);
  const [katrolMultiSiswa, setKatrolMultiSiswa] = useState([]); // NISN siswa tambahan yang dipilih
  const [katrolShowMulti, setKatrolShowMulti] = useState(false); // toggle tampilkan pilihan multi-siswa

  // States untuk Alat Lanjutan & Normalisasi Nilai
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [normModalOpen, setNormModalOpen] = useState(false);
  const [normMethod, setNormMethod] = useState("linear"); // "linear" | "minmax" | "scalemax"
  const [normLinearPoin, setNormLinearPoin] = useState(5);
  const [normMinTarget, setNormMinTarget] = useState(60);
  const [normMaxTarget, setNormMaxTarget] = useState(100);
  const [normMaxOnlyTarget, setNormMaxOnlyTarget] = useState(100);
  const [isSavingNorm, setIsSavingNorm] = useState(false);

  useEffect(() => {
    if (normModalOpen && kelas) {
      const currentMaxCap = Number(kelas.skemaPenilaian?.maxCap) || 100;
      setNormMaxTarget(currentMaxCap);
      setNormMaxOnlyTarget(currentMaxCap);
    }
  }, [normModalOpen, kelas]);

  // State untuk Navigasi Panel Mobile di Modal Atur Komponen
  const [mobileActiveView, setMobileActiveView] = useState("list"); // "list" atau "detail"

  useEffect(() => {
    if (kolomModalOpen && kelas) {
      setInitialKolomNilai(JSON.parse(JSON.stringify(kelas.kolomNilai)));
      setInitialHiddenAspek(JSON.parse(JSON.stringify(kelas.skemaPenilaian?.hiddenAspek || [])));
      setDeletedKolomIds([]);
      setMobileActiveView("list"); // Reset ke daftar komponen di mobile
      if (kelas.kolomNilai && kelas.kolomNilai.length > 0) {
        setActiveAspectId(kelas.kolomNilai[0].id);
        setNewAspects([]);
      } else {
        const newId = `new-aspect-${Date.now()}`;
        setNewAspects([{ id: newId, nama: "", bobot: "", isGroup: false, subKolom: [] }]);
        setActiveAspectId(newId);
        setMobileActiveView("detail"); // Tampilkan form jika belum ada komponen sama sekali
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

  // States untuk Cetak KHS / Rapor Bayangan PDF
  const [selectedPrintStudent, setSelectedPrintStudent] = useState(null);

  const handlePrintStudentKHS = (student) => {
    setSelectedPrintStudent(student);
    
    setTimeout(() => {
      // 1. Tambahkan style element untuk set size: A4 portrait
      const printStyle = document.createElement("style");
      printStyle.id = "dynamic-print-portrait-style";
      printStyle.innerHTML = "@media print { @page { size: A4 portrait !important; margin: 15mm 15mm 15mm 15mm !important; } }";
      document.head.appendChild(printStyle);

      // 2. Tambahkan class print-portrait-mode pada body
      document.body.classList.add("print-portrait-mode");

      // 3. Panggil print dialog
      window.print();

      // 4. Bersihkan setelah dialog print ditutup
      setTimeout(() => {
        document.body.classList.remove("print-portrait-mode");
        const styleEl = document.getElementById("dynamic-print-portrait-style");
        if (styleEl) styleEl.remove();
      }, 500);
    }, 150);
  };

  // State untuk Integrasi E-Rapor
  const [raporModalOpen, setRaporModalOpen] = useState(false);

  // States untuk Gabung Komponen ke Kelompok
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
      alert("Pilih minimal 2 komponen untuk digabung!");
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
  const [viewMode, setViewMode] = useState('tabs');
  const [activeTab, setActiveTab] = useState('nilai'); // Default harus match dengan default viewMode agar tidak blank

  // Load activeTab and viewMode from sessionStorage/localStorage on mount
  useEffect(() => {
    const loadSettings = () => {
      if (typeof window !== "undefined" && classId) {
        const savedTab = sessionStorage.getItem(`activeTab_${classId}`);
        const savedViewMode = localStorage.getItem('ceknilai_view_mode') || 'tabs';
        
        setViewMode(savedViewMode);
        
        if (savedViewMode === 'tabs') {
          if (!savedTab || savedTab === 'dashboard') {
            setActiveTab('nilai');
          } else {
            setActiveTab(savedTab);
          }
        } else if (savedViewMode === 'dashboard') {
          if (!savedTab) {
            setActiveTab('dashboard');
          } else {
            setActiveTab(savedTab);
          }
        }
      }
    };

    loadSettings();
    window.addEventListener('ceknilai_view_mode_changed', loadSettings);
    
    return () => {
      window.removeEventListener('ceknilai_view_mode_changed', loadSettings);
    };
  }, [classId]);

  // Persist activeTab on refresh
  useEffect(() => {
    if (typeof window !== "undefined" && activeTab && classId) {
      sessionStorage.setItem(`activeTab_${classId}`, activeTab);
    }
  }, [activeTab, classId]);



  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('ceknilai_view_mode', mode);
    if (mode === 'dashboard') {
      setActiveTab('dashboard');
    } else {
      if (activeTab === 'dashboard') setActiveTab('nilai');
    }
  };

  const [showKehadiran, setShowKehadiran] = useState(false);
  const [laporanTheme, setLaporanTheme] = useState("dark");
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);

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
      let totalPoinBonus = 0;
      if (kelas.skemaPenilaian?.enableBonusStars) {
        Object.keys(student.nilai || {}).forEach(k => {
          if (k.endsWith("_bonus")) totalPoinBonus += (Number(student.nilai[k]?.poin) || 0);
        });
      }
      const maxCap = Number(kelas.skemaPenilaian?.maxCap) || 100;
      const rawFinalScore = totalNilaiTerisi + (Number(student.nilai?._katrol) || 0) + totalPoinBonus;
      const finalScore = Math.min(maxCap, rawFinalScore);

      return {
        ...student,
        finalScore: finalScore,
        isSelesai: jumlahAspekTerisi === kelas.kolomNilai.length,
        jumlahAspekTerisi
      };
    });

    // Always use a stable sort with secondary tie-breaker (nama / nisn)
    const key = sortConfig.key || 'nama';
    const dir = sortConfig.direction === 'desc' ? -1 : 1;

    mapped.sort((a, b) => {
      let cmp = 0;
      if (key === 'nama') {
        const nameA = a.nama || "";
        const nameB = b.nama || "";
        cmp = nameA.localeCompare(nameB, 'id', { numeric: true, sensitivity: 'base' });
      } else if (key === 'nisn') {
        const nisnA = a.nisn || "";
        const nisnB = b.nisn || "";
        cmp = nisnA.localeCompare(nisnB, 'id', { numeric: true });
      } else if (key === 'finalScore') {
        const scoreA = Number(a.finalScore) || 0;
        const scoreB = Number(b.finalScore) || 0;
        cmp = scoreA - scoreB;
      } else {
        let valA = a[key];
        let valB = b[key];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) cmp = -1;
        else if (valA > valB) cmp = 1;
      }

      if (cmp !== 0) return cmp * dir;

      // Secondary tie-breaker: Always fall back to alphabetical name (A-Z) so student order is 100% stable
      const fallbackNameA = a.nama || "";
      const fallbackNameB = b.nama || "";
      const nameCmp = fallbackNameA.localeCompare(fallbackNameB, 'id', { numeric: true, sensitivity: 'base' });
      if (nameCmp !== 0) return nameCmp;

      // Tertiary tie-breaker: nisn
      return (a.nisn || "").localeCompare(b.nisn || "");
    });

    return mapped;
  }, [kelas?.siswa, kelas?.kolomNilai, temporaryScores, sortConfig]);

  // === COMPUTED ANALYTICS & RANKING ===
  const analyticsData = useMemo(() => {
    if (!kelas || !kelas.siswa || kelas.siswa.length === 0 || kelas.kolomNilai.length === 0) return null;

    const skema = kelas.skemaPenilaian || { A: 85, B: 75, C: 65, D: 50, kkm: "" };
    const kkmVal = (skema.kkm !== undefined && skema.kkm !== null && skema.kkm !== "") ? Number(skema.kkm) : null;

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
      
      let attSummary = { H: 0, I: 0, S: 0, A: 0, D: 0 };
      pertemuanList.forEach(p => {
        const val = student.nilai[`_presensi_${p.id}`];
        if (val && attSummary[val] !== undefined) {
          attSummary[val]++;
        }
      });

      if (presensiConfig.digunakan && presensiConfig.bobot > 0 && pertemuanList.length > 0) {
        let attCount = attSummary.H + attSummary.S + attSummary.I + attSummary.A + attSummary.D;
        let attTotal = (attSummary.H * 100) + (attSummary.S * 50) + (attSummary.I * 50) + (attSummary.A * 0) + (attSummary.D * 100);
        
        // Poin kehadiran rata-rata (hanya dihitung berdasarkan jumlah pertemuan yg sudah diisi)
        const attAvg = attCount > 0 ? (attTotal / attCount) : 0;
        total += attAvg * (presensiConfig.bobot / 100);
        
        // Jika ada pertemuan, anggap "complete" jika setidaknya semua nilai akademik terisi
        // (atau bisa juga mewajibkan semua presensi terisi, tapi ini lebih fleksibel)
      }
      
      // Tambahkan Nilai Katrol & Bonus jika ada
      let totalPoinBonus = 0;
      if (skema.enableBonusStars) {
        Object.keys(student.nilai || {}).forEach(k => {
          if (k.endsWith("_bonus")) totalPoinBonus += (Number(student.nilai[k]?.poin) || 0);
        });
      }
      total += (Number(student.nilai?._katrol) || 0) + totalPoinBonus;
      
      const maxCap = Number(skema.maxCap) || 100;
      total = Math.min(maxCap, total);

      let predikat = "-";
      if (complete) {
        if (total >= skema.A) predikat = skema.statusA || "A";
        else if (total >= skema.B) predikat = skema.statusB || "B";
        else if (total >= skema.C) predikat = skema.statusC || "C";
        else predikat = skema.statusD || "D";
      }

      return { ...student, finalScore: parseFloat(total.toFixed(2)), complete, predikat, lulus: complete && (kkmVal !== null ? total >= kkmVal : false), attSummary };
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
          // Untuk kolom grup: periksa tiap sub-komponen secara individual
          col.subKolom.forEach(sub => {
            const sc = s.nilai[sub.id];
            const isSFilled = sc !== undefined && sc !== null && sc !== "";
            const aspekLabel = `${col.nama} › ${sub.nama}`;
            if (!isSFilled) {
              issues.push({ komponen: aspekLabel, status: "Kosong (Belum Mengerjakan)" });
            } else if (kkmVal !== null && Number(sc) < kkmVal) {
              issues.push({ komponen: aspekLabel, status: "Di bawah KKM" });
            }
          });
        } else {
          const { score, isFilled } = getColScore(s, col, null);
          if (!isFilled) {
            issues.push({ komponen: col.nama, status: "Kosong (Belum Mengerjakan)" });
          } else if (kkmVal !== null && Number(score) < kkmVal) {
            issues.push({ komponen: col.nama, status: "Di bawah KKM" });
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
      return { totalH: 0, totalI: 0, totalS: 0, totalA: 0, totalD: 0, avgAttendance: 0, totalPertemuan: 0 };
    }

    const pertemuanList = kelas.skemaPenilaian?.pertemuan || [];
    const totalP = pertemuanList.length;
    let totalH = 0, totalI = 0, totalS = 0, totalA = 0, totalD = 0;
    
    kelas.siswa.forEach(siswa => {
      pertemuanList.forEach(p => {
        const status = siswa.nilai[`_presensi_${p.id}`];
        if (status === 'H') totalH++;
        else if (status === 'I') totalI++;
        else if (status === 'S') totalS++;
        else if (status === 'A') totalA++;
        else if (status === 'D') totalD++;
      });
    });

    const totalPossible = kelas.siswa.length * totalP;
    const avgAttendance = totalPossible > 0 ? Math.round(((totalH + totalD) / totalPossible) * 100) : 0;

    return { totalH, totalI, totalS, totalA, totalD, avgAttendance, totalPertemuan: totalP };
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
  const toggleNamaExpand = () => {
    setIsNamaColumnExpanded(prev => !prev);
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
        // Tutup modal catatan setelah berhasil menyimpan
        setCatatanSiswaTerpilih(null);
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
          data.siswa = data.siswa.map(s => ({ ...s, nilai: s.nilai || {} }));
          data.siswa.sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
        }
        setKelas(data);
// Initialize grade range states from class skemaPenilaian or defaults
        if (data.skemaPenilaian) {
          setGradeA(data.skemaPenilaian.A ?? 85);
          setGradeB(data.skemaPenilaian.B ?? 75);
          setGradeC(data.skemaPenilaian.C ?? 65);
          setGradeD(data.skemaPenilaian.D ?? 50);
          setKkm(data.skemaPenilaian.kkm ?? "");
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

    // Fetch classes for transfer dropdown
    fetch("/api/kelas")
      .then(res => res.json())
      .then(data => {
        setAvailableClasses(data.filter(c => c.id !== classId));
      })
      .catch(err => console.error("Gagal memuat daftar kelas:", err));
  }, [classId]);

  // Efek untuk memunculkan onboarding modal
  useEffect(() => {
    if (kelas && !kelas.archived && Array.isArray(kelas.siswa) && kelas.siswa.length === 0 && Array.isArray(kelas.kolomNilai) && kelas.kolomNilai.length === 0) {
      const seen = sessionStorage.getItem(`onboarding_seen_${classId}`);
      if (!seen) {
        setOnboardingModalOpen(true);
        sessionStorage.setItem(`onboarding_seen_${classId}`, 'true');
      }
    }
  }, [kelas, classId]);

  useEffect(() => {
    if (kelas && searchParams && searchParams.get('action') === 'quick-attendance' && !quickAttendanceTriggered.current) {
      quickAttendanceTriggered.current = true;
      setActiveTab('presensi');
      handleOpenAddPertemuan();
      
      // Bersihkan url query param agar tidak looping
      const cleanUrl = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: cleanUrl, url: cleanUrl }, '', cleanUrl);
    }
  }, [kelas, searchParams]);

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
    setPertemuanNama(`Pert. ${(kelas.skemaPenilaian?.pertemuan?.length || 0) + 1}`);
    setPertemuanTanggal(new Date().toISOString().split('T')[0]);
    setPertemuanMateri("");
    setPertemuanKegiatan("");
    setDefaultBulkStatus(""); // default to empty/blank
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
    } else {
      // Add new
      const newPertemuanId = Date.now().toString();
      const newPertemuan = { 
        id: newPertemuanId, 
        nama: pertemuanNama.trim(), 
        tanggal: pertemuanTanggal,
        materi: pertemuanMateri.trim(),
        kegiatan: pertemuanKegiatan.trim()
      };
      updatedPertemuan = [...(kelas.skemaPenilaian?.pertemuan || []), newPertemuan];

      const updatedSkema = { ...kelas.skemaPenilaian, pertemuan: updatedPertemuan };
      const defaultStatus = defaultBulkStatus === "" ? null : defaultBulkStatus;

      // Update state locally immediately
      const updatedSiswa = kelas.siswa.map(s => ({
        ...s,
        nilai: {
          ...s.nilai,
          [`_presensi_${newPertemuanId}`]: defaultStatus
        }
      }));

      try {
        // Save to backend: class update + parallel student updates if defaultStatus is not null
        const classPromise = fetch(`/api/kelas/${kelas.id}`, { 
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ skemaPenilaian: updatedSkema }) 
        });

        const studentPromises = [];
        if (defaultStatus !== null && kelas.siswa && kelas.siswa.length > 0) {
          studentPromises.push(
            ...kelas.siswa.map(s => 
              fetch(`/api/kelas/${classId}/siswa/${s.nisn}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  nilai: {
                    [`_presensi_${newPertemuanId}`]: defaultStatus
                  }
                })
              })
            )
          );
        }

        const responses = await Promise.all([classPromise, ...studentPromises]);
        const classRes = responses[0];
        
        if (classRes.ok) {
          setKelas({ ...kelas, siswa: updatedSiswa, skemaPenilaian: updatedSkema });
          // Otomatis buka kunci pertemuan baru agar guru bisa langsung mengisi
          setUnlockedPertemuanIds(prev => [...prev, newPertemuanId]);
          setPertemuanModalOpen(false);
        } else {
          alert("Gagal menambahkan pertemuan.");
        }
      } catch (e) {
        console.error("Error adding pertemuan", e);
        alert("Terjadi kesalahan.");
      } finally {
        setIsSavingPertemuan(false);
      }
    }
  };

  const handleSyncBankData = async () => {
    if (isSyncingBankData || isLocked) return;
    setIsSyncingBankData(true);
    try {
      const response = await fetch("/api/kelas/sync-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kelasId: classId, action: 'preview' })
      });
      const data = await response.json();
      if (response.ok) {
        if (data.preview) {
          setSyncPreviewData(data);
          setShowSyncModal(true);
        } else {
          alert(data.message || "Tidak ada perubahan yang perlu disinkronkan.");
        }
      } else {
        alert(data.error || "Gagal memuat pratinjau sinkronisasi.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan koneksi saat mencoba pratinjau sinkronisasi.");
    } finally {
      setIsSyncingBankData(false);
    }
  };

  const handleCommitSyncBankData = async () => {
    if (isSyncingBankData || isLocked || !syncPreviewData) return;
    setIsSyncingBankData(true);
    try {
      const response = await fetch("/api/kelas/sync-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          kelasId: classId, 
          action: 'commit', 
          previewData: syncPreviewData 
        })
      });
      const data = await response.json();
      if (response.ok) {
        alert("Sinkronisasi Bank Data berhasil dilakukan!");
        setShowSyncModal(false);
        setSyncPreviewData(null);
        setKelolaSiswaModalOpen(false);
        fetchKelasDetail();
      } else {
        alert(data.error || "Gagal menyimpan hasil sinkronisasi.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan koneksi saat menyimpan sinkronisasi.");
    } finally {
      setIsSyncingBankData(false);
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

  const handleQrMarkPresence = async (studentNisn, pertemuanId, status) => {
    if (!kelas || !kelas.siswa) return;

    // 1. Update state secara lokal langsung agar responsif
    const updatedSiswa = kelas.siswa.map(s => {
      if (s.nisn === studentNisn) {
        return {
          ...s,
          nilai: {
            ...s.nilai,
            [`_presensi_${pertemuanId}`]: status
          }
        };
      }
      return s;
    });
    
    setKelas({ ...kelas, siswa: updatedSiswa });

    // 2. Simpan ke backend
    await handleSaveScore(studentNisn, `_presensi_${pertemuanId}`, status);
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
    setTargetClassId("");
    setSiswaError("");
    setSiswaModalOpen(true);

    // Fetch classes for transfer dropdown
    fetch("/api/kelas")
      .then(res => res.json())
      .then(data => {
        setAvailableClasses(data.filter(c => c.id !== classId));
      })
      .catch(err => console.error("Gagal memuat daftar kelas:", err));
  };

  const handleSiswaSubmit = async (e) => {
    e.preventDefault();
    if (!nisn.trim() || !namaSiswa.trim()) {
      setSiswaError("NISN dan Nama Siswa harus diisi.");
      return;
    }
    
    try {
      const response = await fetch(`/api/kelas/${classId}/siswa${isEditingSiswa ? `/${oldNisn}` : ""}`, {
        method: isEditingSiswa ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nisn: nisn.trim(),
          nama: namaSiswa.trim(),
          tanggalLahir: tanggalLahir || null,
          ...(isEditingSiswa && targetClassId ? { kelasIdBaru: targetClassId } : {})
        }),
      });

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
    triggerConfirm(
      `Apakah Anda yakin ingin menghapus siswa "${studentName}" (NISN: ${studentNisn}) dari kelas ini? Semua nilainya akan terhapus secara permanen.`,
      async () => {
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
      },
      {
        title: "🗑️ Hapus Siswa",
        confirmText: "Ya, Hapus",
        isDanger: true
      }
    );
  };
  const handleSelectStudent = (studentNisn) => {
    setSelectedNisns((prev) =>
      prev.includes(studentNisn)
        ? prev.filter((id) => id !== studentNisn)
        : [...prev, studentNisn]
    );
  };

  const handleSelectAllStudents = () => {
    if (!kelas || !kelas.siswa) return;
    if (selectedNisns.length === kelas.siswa.length) {
      setSelectedNisns([]);
    } else {
      setSelectedNisns(kelas.siswa.map((s) => s.nisn));
    }
  };

  const handleBulkDeleteStudents = () => {
    if (selectedNisns.length === 0) return;
    
    triggerConfirm(
      `⚠️ PERINGATAN MASAL!\nApakah Anda yakin ingin menghapus ${selectedNisns.length} siswa secara sekaligus?\nTindakan ini bersifat PERMANEN dan akan menghapus semua data siswa beserta nilai mereka di kelas ini!`,
      async () => {
        try {
          const deletePromises = selectedNisns.map((studentNisn) =>
            fetch(`/api/kelas/${classId}/siswa/${studentNisn}`, {
              method: "DELETE",
            })
          );
          
          await Promise.all(deletePromises);
          
          setSelectedNisns([]);
          fetchClassDetail();
          triggerConfirm(`Berhasil menghapus ${deletePromises.length} siswa secara sekaligus.`, null, { title: "Sukses", confirmText: "OK", cancelText: "" });
        } catch (err) {
          console.error("Bulk delete failed", err);
          alert("Gagal melakukan hapus massal.");
        }
      },
      { title: "⚠️ Hapus Massal Siswa", confirmText: "Hapus Sekaligus", cancelText: "Batal", isDanger: true }
    );
  };

  const handleBulkTransferStudents = (targetClassId) => {
    if (selectedNisns.length === 0 || !targetClassId) return;
    const targetClass = availableClasses.find(c => c.id === targetClassId);
    if (!targetClass) return;

    triggerConfirm(
      `Apakah Anda yakin ingin memindahkan ${selectedNisns.length} siswa terpilih ke kelas "${targetClass.nama}"?`,
      async () => {
        try {
          let successCount = 0;
          let failCount = 0;
          let errorMessage = "";

          const transferPromises = selectedNisns.map(async (studentNisn) => {
            const res = await fetch(`/api/kelas/${classId}/siswa/${studentNisn}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                kelasIdBaru: targetClassId
              })
            });
            if (res.ok) {
              successCount++;
            } else {
              failCount++;
              const errData = await res.json();
              errorMessage = errData.error || errorMessage;
            }
          });

          await Promise.all(transferPromises);

          setSelectedNisns([]);
          fetchClassDetail();

          if (failCount === 0) {
            triggerConfirm(`Berhasil memindahkan ${successCount} siswa ke kelas "${targetClass.nama}".`, null, { title: "Sukses", confirmText: "OK", cancelText: "" });
          } else {
            triggerConfirm(`Selesai memproses pemindahan. Berhasil: ${successCount}, Gagal: ${failCount}.${errorMessage ? `\n\nCatatan Error: ${errorMessage}` : ""}`, null, { title: "Hasil Pemindahan", confirmText: "OK", cancelText: "" });
          }
        } catch (err) {
          console.error("Bulk transfer failed", err);
          alert("Gagal melakukan pemindahan massal.");
        }
      },
      { title: "🔄 Pindahkan Siswa Massal", confirmText: "Pindahkan", cancelText: "Batal" }
    );
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

  const handleMoveKolom = async (index, direction) => {
    if (!kelas || !kelas.kolomNilai) return;
    const newKolom = [...kelas.kolomNilai];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newKolom.length) return;
    
    // Swap target and index items
    const temp = newKolom[index];
    newKolom[index] = newKolom[targetIndex];
    newKolom[targetIndex] = temp;
    
    // Update local state immediately
    setKelas({ ...kelas, kolomNilai: newKolom });
    
    // Save new order to database (async)
    try {
      await fetch(`/api/kelas/${kelas.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kolomNilai: newKolom })
      });
    } catch (e) {
      console.error("Gagal menukar posisi aspek", e);
    }
  };

  const handleMoveNewAspect = (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newAspects.length) return;
    
    const newAspectsCopy = [...newAspects];
    const temp = newAspectsCopy[index];
    newAspectsCopy[index] = newAspectsCopy[targetIndex];
    newAspectsCopy[targetIndex] = temp;
    
    setNewAspects(newAspectsCopy);
  };

  const handleAddBlankAspect = () => {
    const newId = `new-aspect-${Date.now()}`;
    const newAspect = { id: newId, nama: "", bobot: "", isGroup: false, subKolom: [] };
    setNewAspects(prev => [...prev, newAspect]);
    setActiveAspectId(newId);
  };

  const handleToggleGroupType = (col, nextIsGroup) => {
    // Jika centang dihilangkan dan ada sub-komponen di dalamnya
    if (!nextIsGroup && col.subKolom && col.subKolom.length > 0) {
      triggerConfirm(
        `Apakah Anda yakin ingin membongkar kelompok "${col.nama}"?\n\n${col.subKolom.length} sub-komponen di dalamnya akan otomatis dinaikkan menjadi komponen mandiri tingkat teratas agar nilai siswa tidak hilang.`,
        () => {
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
              id: sub.id, // Pertahankan ID sub-komponen asli agar nilainya langsung terpeta otomatis
              nama: `${col.nama} - ${sub.nama || "sub-komponen"}`,
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

          alert(`💡 Berhasil membongkar kelompok!\nsub-komponen berikut kini menjadi komponen mandiri:\n` + promotedCols.map(p => `- ${p.nama} (${p.bobot}%)`).join("\n"));
        },
        {
          title: "Bongkar Kelompok",
          confirmText: "Ya, Bongkar",
          isDanger: true
        }
      );
      return;
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
    triggerConfirm(
      `Apakah Anda yakin ingin menyalin komponen dari kelas "${sourceClass.nama}"?\n\nKomponen nilai baru yang belum ada di kelas ini akan ditambahkan ke daftar komponen aktif Anda.`,
      () => {
        const existingNames = new Set(
          kelas.kolomNilai.map(col => col.nama.trim().toLowerCase())
        );
        const skippedNames = [];
        const aspectsToAdd = [];

        sourceClass.kolomNilai.forEach(col => {
          const trimmedName = col.nama.trim();
          if (existingNames.has(trimmedName.toLowerCase())) {
            skippedNames.push(trimmedName);
          } else {
            const newColId = 'col-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
            aspectsToAdd.push({
              ...col,
              id: newColId,
              subKolom: col.subKolom ? col.subKolom.map(sub => ({
                ...sub,
                id: `${newColId}-sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
              })) : []
            });
          }
        });

        if (aspectsToAdd.length > 0) {
          const updatedCols = [...kelas.kolomNilai, ...aspectsToAdd];
          
          // Urutkan komponen berdasarkan urutan di kelas asal agar susunannya sama
          const sourceOrderMap = new Map();
          sourceClass.kolomNilai.forEach((col, idx) => {
            sourceOrderMap.set(col.nama.trim().toLowerCase(), idx);
          });
          
          updatedCols.sort((a, b) => {
            const aName = a.nama.trim().toLowerCase();
            const bName = b.nama.trim().toLowerCase();
            const aIdx = sourceOrderMap.has(aName) ? sourceOrderMap.get(aName) : 999999;
            const bIdx = sourceOrderMap.has(bName) ? sourceOrderMap.get(bName) : 999999;
            return aIdx - bIdx;
          });

          setKelas({ ...kelas, kolomNilai: updatedCols });
          setNewAspects([]); // Bersihkan newAspects jika ada komponen yang disalin
          setActiveAspectId(aspectsToAdd[0].id); // Pilih komponen pertama yang baru disalin
        }

        setDuplicateModalOpen(false);

        if (skippedNames.length > 0) {
          // Tampilkan informasi komponen yang tidak disalin menggunakan modal kustom
          setTimeout(() => {
            triggerAlert(
              `Beberapa komponen berikut tidak disalin karena sudah ada komponen dengan nama yang sama di kelas ini (nilai & konfigurasi komponen yang sudah ada tetap dipertahankan):\n\n- ${skippedNames.join("\n- ")}`,
              null,
              { title: "📋 INFORMASI PENYALINAN" }
            );
          }, 300); // Jeda singkat setelah modal duplikat ditutup
        }
      },
      {
        title: "📋 SALIN ASPEK DARI KELAS LAIN",
        confirmText: "Ya, Salin",
        cancelText: "Batal"
      }
    );
  };

  const handleOpenApplyToOther = async () => {
    setFetchingClasses(true);
    setApplySelectedClassIds([]);
    setApplySearchQuery("");
    setApplyToOtherModalOpen(true);
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

  const handleApplyToOtherClasses = async () => {
    if (applySelectedClassIds.length === 0) {
      alert("Silakan pilih minimal 1 kelas tujuan.");
      return;
    }

    if (!kelas?.kolomNilai || kelas.kolomNilai.length === 0) {
      alert("Kelas ini belum memiliki komponen nilai untuk diterapkan ke kelas lain.");
      return;
    }

    const selectedTargetClasses = availableClasses.filter(c => applySelectedClassIds.includes(c.id));
    const targetNames = selectedTargetClasses.map(c => c.nama).join(", ");

    triggerConfirm(
      `Apakah Anda yakin ingin menerapkan komponen & bobot dari kelas "${kelas.nama}" ke ${applySelectedClassIds.length} kelas berikut?\n\n- ${targetNames}\n\n*Komponen baru yang belum ada di kelas tujuan akan ditambahkan. Komponen yang sudah ada dengan nama yang sama tetap dipertahankan.`,
      async () => {
        setIsApplyingToOther(true);
        let successCount = 0;
        let failCount = 0;

        try {
          // Komponen yang akan diterapkan berasal dari kelas.kolomNilai aktif saat ini
          const currentAspects = kelas.kolomNilai;

          for (const targetClass of selectedTargetClasses) {
            try {
              // Ambil data detail kelas target terbaru
              const resTarget = await fetch(`/api/kelas/${targetClass.id}`);
              if (!resTarget.ok) throw new Error("Gagal mengambil data kelas target");
              const fullTargetClass = await resTarget.json();

              const existingNames = new Set(
                (fullTargetClass.kolomNilai || []).map(col => col.nama.trim().toLowerCase())
              );

              const aspectsToAdd = [];
              currentAspects.forEach(col => {
                const trimmedName = col.nama.trim();
                if (!existingNames.has(trimmedName.toLowerCase())) {
                  const newColId = 'col-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
                  aspectsToAdd.push({
                    ...col,
                    id: newColId,
                    bobot: Number(col.bobot) || 0,
                    subKolom: col.subKolom ? col.subKolom.map((sub, i) => ({
                      ...sub,
                      id: `${newColId}-sub-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
                      bobot: sub.bobot !== undefined && sub.bobot !== null ? Number(sub.bobot) : null
                    })) : []
                  });
                }
              });

              const updatedKolomNilai = [...(fullTargetClass.kolomNilai || []), ...aspectsToAdd];
              
              // Kirim update ke API kelas target
              const resPatch = await fetch(`/api/kelas/${targetClass.id}/kolom`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  kolomNilai: updatedKolomNilai,
                  skemaPenilaian: {
                    ...(fullTargetClass.skemaPenilaian || {}),
                    ...(kelas.skemaPenilaian ? { kkm: kelas.skemaPenilaian.kkm, gradeRanges: kelas.skemaPenilaian.gradeRanges } : {})
                  }
                }),
              });

              if (resPatch.ok) {
                successCount++;
              } else {
                failCount++;
              }
            } catch (errTarget) {
              console.error(`Error applying to class ${targetClass.nama}:`, errTarget);
              failCount++;
            }
          }

          setApplyToOtherModalOpen(false);
          setApplySelectedClassIds([]);

          setTimeout(() => {
            triggerAlert(
              `Berhasil menerapkan komponen & bobot penilaian ke ${successCount} kelas!${failCount > 0 ? ` (${failCount} kelas gagal)` : ''}`,
              null,
              { title: "🚀 TERAPKAN ASPEK SELESAI" }
            );
          }, 300);

        } catch (err) {
          console.error("Apply to other classes error:", err);
          alert("Terjadi kesalahan saat menerapkan komponen ke kelas lain.");
        } finally {
          setIsApplyingToOther(false);
        }
      },
      {
        title: "📤 TERAPKAN ASPEK KE KELAS LAIN",
        confirmText: "Ya, Terapkan",
        cancelText: "Batal"
      }
    );
  };

  const handleDeleteKolom = (colId, colName) => {
    const hasData = kelas.siswa.some(s => s.nilai && s.nilai[colId] !== undefined && s.nilai[colId] !== null && s.nilai[colId] !== "");
    
    const executeDelete = () => {
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

    if (hasData) {
      triggerConfirm(
        `Komponen "${colName}" sudah memiliki data nilai siswa!\n\nJika dihapus, nilai siswa di komponen ini akan dihapus secara permanen saat Anda menekan Simpan.\n\nApakah Anda yakin ingin menghapus secara visual dari daftar?`,
        executeDelete,
        {
          title: "⚠️ PERINGATAN!",
          confirmText: "Ya, Hapus",
          isDanger: true
        }
      );
    } else {
      triggerConfirm(
        `Apakah Anda yakin ingin menghapus komponen "${colName}"?`,
        executeDelete,
        {
          title: "Hapus Aspek",
          confirmText: "Ya, Hapus",
          isDanger: true
        }
      );
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
    // Validasi bobot kelompok sub-komponen kustom
    for (const col of kelas.kolomNilai) {
      if (col.isGroup && col.hitungMetode === "persentase") {
        const sum = (col.subKolom || []).reduce((s, sub) => s + (Number(sub.bobot) || 0), 0);
        if (sum !== 100) {
          alert(`⚠️ Gagal menyimpan: Komponen kelompok "${col.nama}" menggunakan Bobot Kustom, tetapi total bobot sub-komponennya saat ini adalah ${sum}% (harus pas 100%).`);
          return;
        }
        // Pastikan tidak ada nama sub-komponen yang kosong
        if ((col.subKolom || []).some(sub => sub.nama.trim() === "")) {
          alert(`⚠️ Gagal menyimpan: Terdapat nama sub-komponen yang kosong pada kelompok "${col.nama}".`);
          return;
        }
      }
    }

    const validNewAspects = newAspects.filter(a => a.nama.trim() !== "");
    for (const aspect of validNewAspects) {
      if (aspect.isGroup && aspect.hitungMetode === "persentase") {
        const sum = (aspect.subKolom || []).reduce((s, sub) => s + (Number(sub.bobot) || 0), 0);
        if (sum !== 100) {
          alert(`⚠️ Gagal menyimpan: Komponen kelompok baru "${aspect.nama}" menggunakan Bobot Kustom, tetapi total bobot sub-komponennya saat ini adalah ${sum}% (harus pas 100%).`);
          return;
        }
        if ((aspect.subKolom || []).some(sub => sub.nama.trim() === "")) {
          alert(`⚠️ Gagal menyimpan: Terdapat nama sub-komponen yang kosong pada kelompok baru "${aspect.nama}".`);
          return;
        }
      }
    }

    if (totalBobot > 100) {
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
        const hasData = kelas.siswa.some(s => s.nilai && s.nilai[colId] !== undefined && s.nilai[colId] !== null && s.nilai[colId] !== "");
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
          const hasData = kelas.siswa.some(s => s.nilai && s.nilai[col.id] !== undefined && s.nilai[col.id] !== null && s.nilai[col.id] !== "");
          if (hasData) {
            changedToGroup.push(col.nama);
          }
        }
        // 2. Group -> Single
        if (initial.isGroup && !col.isGroup) {
          const subIds = (initial.subKolom || []).map(s => s.id);
          const hasData = kelas.siswa.some(s => s.nilai && subIds.some(sid => s.nilai[sid] !== undefined && s.nilai[sid] !== null && s.nilai[sid] !== ""));
          if (hasData) {
            changedToSingle.push(col.nama);
          }
        }
        // 3. Deleted Sub-columns inside group
        if (initial.isGroup && col.isGroup) {
          for (const initialSub of (initial.subKolom || [])) {
            const stillExists = (col.subKolom || []).some(s => s.id === initialSub.id);
            if (!stillExists) {
              const hasData = kelas.siswa.some(s => s.nilai && s.nilai[initialSub.id] !== undefined && s.nilai[initialSub.id] !== null && s.nilai[initialSub.id] !== "");
              if (hasData) {
                deletedSubAspects.push(`sub-komponen "${initialSub.nama}" di kelompok "${col.nama}"`);
              }
            }
          }
        }
      }
    }

    if (changedToGroup.length > 0 || changedToSingle.length > 0 || deletedSubAspects.length > 0 || deletedColumnsWithValues.length > 0) {
      let warningMessage = "⚠️ PERINGATAN KESELAMATAN DATA NILAI!\n\n" +
        "Sistem mendeteksi adanya perubahan struktur komponen yang berpotensi menghilangkan nilai siswa yang sudah diisi:\n\n";

      if (deletedColumnsWithValues.length > 0) {
        warningMessage += `• Komponen berikut telah dihapus secara permanen: \n  - ${deletedColumnsWithValues.join("\n  - ")}\n` +
          "  (Seluruh nilai siswa di komponen ini akan dihapus secara permanen!)\n\n";
      }

      if (changedToGroup.length > 0) {
        warningMessage += `• Komponen tunggal berikut diubah menjadi kelompok: ${changedToGroup.join(", ")}\n` +
          "  (Nilai mandiri saat ini tidak akan terbaca karena nilai harus diisi ulang pada sub-komponen yang baru)\n\n";
      }

      if (changedToSingle.length > 0) {
        warningMessage += `• Komponen kelompok berikut diubah menjadi tunggal: ${changedToSingle.join(", ")}\n` +
          "  (Seluruh sub-komponen beserta nilainya di dalamnya akan dihapus secara permanen!)\n\n";
      }

      if (deletedSubAspects.length > 0) {
        warningMessage += `• sub-komponen berikut telah dihapus: \n  - ${deletedSubAspects.join("\n  - ")}\n` +
          "  (Seluruh nilai siswa di sub-komponen tersebut akan dihapus secara permanen!)\n\n";
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
          throw new Error(deleteData.error || `Gagal menghapus komponen ${colId}`);
        }
      }

      // Buat aspek-aspek baru terlebih dahulu
      const validNewAspects = newAspects.filter(a => a.nama.trim() !== "");
      let updatedKolomNilai = [...kelas.kolomNilai]; // Salin state lama
      let updatedTpConfig = { ...(kelas.skemaPenilaian?.tpConfig || {}) };

      for (const aspect of validNewAspects) {
        const res = await fetch(`/api/kelas/${classId}/kolom`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nama: aspect.nama.trim(), bobot: Number(aspect.bobot) || 0, isGroup: aspect.isGroup, hitungMetode: aspect.hitungMetode || 'rata-rata', subKolom: aspect.subKolom }),
        });
        if (!res.ok) {
           const data = await res.json();
           throw new Error(data.error || "Gagal membuat komponen baru");
        }
        const data = await res.json();
        const permanentId = data.kolom.id;
        updatedKolomNilai.push(data.kolom); // Masukkan komponen yang baru dibuat ke daftar sinkronisasi
        if (aspect.tp) {
          updatedTpConfig[permanentId] = aspect.tp;
        }
      }

      // Perbarui seluruh konfigurasi secara massal — konversi bobot ke Number sebelum dikirim
      const kolomToSave = updatedKolomNilai.map(col => ({ ...col, bobot: Number(col.bobot) || 0 }));
      // Validasi urutan KKM sebelum menyimpan
      if (gradeA < gradeB || gradeB < gradeC || gradeC < gradeD) {
        alert('Gagal menyimpan: Pastikan urutan nilai KKM adalah A ≥ B ≥ C ≥ D.');
        return;
      }

      const response = await fetch(`/api/kelas/${classId}/kolom`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          kolomNilai: kolomToSave,
          skemaPenilaian: {
            ...(kelas.skemaPenilaian || {}),
            A: gradeA,
            B: gradeB,
            C: gradeC,
            D: gradeD,
            kkm: kkm,
            statusA: statusA.trim() || 'A',
            statusB: statusB.trim() || 'B',
            statusC: statusC.trim() || 'C',
            statusD: statusD.trim() || 'D',
            tpConfig: updatedTpConfig
          }
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
        setKelas(prevKelas => {
          if (!prevKelas) return prevKelas;
          const updatedSiswa = prevKelas.siswa.map(s => {
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
          return { ...prevKelas, siswa: updatedSiswa };
        });

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

  // === 1-CLICK QUICK STAR ⭐ FOR ACTIVE STUDENTS (1 STAR = +1 POINT) ===
  const [starToast, setStarToast] = useState(null);

  const getStudentTotalStars = (student) => {
    if (!student || !student.nilai) return 0;
    let totalPoinBonus = 0;
    Object.keys(student.nilai).forEach((k) => {
      if (k.endsWith("_bonus")) {
        totalPoinBonus += Number(student.nilai[k]?.poin) || 0;
      }
    });
    return Math.max(0, Math.floor(totalPoinBonus)); // 1 Star = 1 Point
  };

  const handleToggleEnableBonusStars = async () => {
    const currentSkema = kelas.skemaPenilaian || {};
    const newStatus = !currentSkema.enableBonusStars;
    const updatedSkema = {
      ...currentSkema,
      enableBonusStars: newStatus
    };

    setKelas((prev) => ({
      ...prev,
      skemaPenilaian: updatedSkema
    }));

    try {
      await fetch(`/api/kelas/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skemaPenilaian: updatedSkema })
      });
    } catch (e) {
      console.error("Gagal memperbarui status fitur bonus:", e);
    }
  };

  const handleQuickAddStar = async (student) => {
    if (!kelas || !kelas.kolomNilai || kelas.kolomNilai.length === 0) return;
    const targetCol = kelas.kolomNilai[0];
    const keyBonus = `${targetCol.id}_bonus`;

    const currentBonusObj = student.nilai?.[keyBonus] || {};
    const currentPoin = Number(currentBonusObj.poin) || 0;
    const newPoin = currentPoin + 1; // +1 Point per star

    const updatedNilai = {
      ...(student.nilai || {}),
      [keyBonus]: {
        poin: newPoin,
        catatan: "Apresiasi Bonus Keaktifan Kelas ⭐",
        tanggal: new Date().toISOString().split("T")[0]
      }
    };

    setKelas((prev) => ({
      ...prev,
      siswa: prev.siswa.map((s) => (s.nisn === student.nisn ? { ...s, nilai: updatedNilai } : s))
    }));

    const newStarCount = newPoin;
    const shortName = (student.nama || "Siswa").split(" ")[0];
    setStarToast(`⭐ +1 Bonus (+1 Poin) untuk ${shortName}! (Total: ${newStarCount} ⭐)`);
    setTimeout(() => setStarToast(null), 2500);

    try {
      await fetch(`/api/kelas/${classId}/siswa/${student.nisn}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nilai: updatedNilai })
      });
    } catch (e) {
      console.error("Gagal simpan bonus:", e);
    }
  };

  const handleQuickRemoveStar = async (student) => {
    if (!kelas || !kelas.kolomNilai || kelas.kolomNilai.length === 0) return;
    const targetCol = kelas.kolomNilai[0];
    const keyBonus = `${targetCol.id}_bonus`;

    const currentBonusObj = student.nilai?.[keyBonus] || {};
    const currentPoin = Number(currentBonusObj.poin) || 0;
    if (currentPoin <= 0) return;

    const newPoin = Math.max(0, currentPoin - 1); // -1 Point per star

    const updatedNilai = {
      ...(student.nilai || {}),
      [keyBonus]: {
        poin: newPoin,
        catatan: "Penyesuaian Bonus Keaktifan Kelas ⭐",
        tanggal: new Date().toISOString().split("T")[0]
      }
    };

    setKelas((prev) => ({
      ...prev,
      siswa: prev.siswa.map((s) => (s.nisn === student.nisn ? { ...s, nilai: updatedNilai } : s))
    }));

    const newStarCount = newPoin;
    const shortName = (student.nama || "Siswa").split(" ")[0];
    setStarToast(`⭐ Bonus ${shortName} diperbarui (Total: ${newStarCount} ⭐)`);
    setTimeout(() => setStarToast(null), 2500);

    try {
      await fetch(`/api/kelas/${classId}/siswa/${student.nisn}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nilai: updatedNilai })
      });
    } catch (e) {
      console.error("Gagal simpan bonus:", e);
    }
  };

  // === SMART CLIPBOARD PASTE (FROM EXCEL / GOOGLE SHEETS) ===
  const handleGradePaste = (e, startStudentNisn, colId) => {
    const pastedText = e.clipboardData ? e.clipboardData.getData("text/plain") : "";
    if (!pastedText) return;

    const lines = pastedText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l !== "");

    if (lines.length <= 1) {
      // Biarkan paste 1 nilai biasa berjalan secara bawaan
      return;
    }

    // Jika paste berisi banyak baris dari Excel/Sheets
    e.preventDefault();

    const startRowIdx = sortedStudents.findIndex(s => s.nisn === startStudentNisn);
    if (startRowIdx === -1) return;

    let updatedCount = 0;
    const newTemp = {};

    lines.forEach((lineVal, offset) => {
      const targetStudent = sortedStudents[startRowIdx + offset];
      if (targetStudent) {
        // Konversi koma desimal Indonesia menjadi titik (misal: 85,5 -> 85.5)
        const normalizedValStr = lineVal.replace(/,/g, ".");
        const numVal = Number(normalizedValStr);

        if (!isNaN(numVal) && normalizedValStr !== "") {
          const scoreClamped = Math.min(100, Math.max(0, numVal));
          const valStr = scoreClamped.toString();
          const cellKey = `${targetStudent.nisn}-${colId}`;

          newTemp[cellKey] = valStr;
          handleGradeBlur(targetStudent.nisn, colId, valStr);
          updatedCount++;
        }
      }
    });

    setTemporaryScores(prev => ({ ...prev, ...newTemp }));
    triggerAlert(`📋 Berhasil menempelkan (${updatedCount} nilai) dari Excel secara otomatis!`, null, { title: "Salin-Tempel Excel Cepat" });
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
        const nisnIdx = headers.findIndex(h => {
          const l = h.toLowerCase().trim();
          return l === "nisn" || l === "no induk siswa nasional" || l === "nomor induk siswa nasional";
        });
        const namaIdx = headers.findIndex(h => {
          const l = h.toLowerCase().trim();
          return l === "nama" || l === "nama siswa" || l === "nama lengkap" || l === "nama peserta didik";
        });
        const tglIdx = headers.findIndex(h => {
          const l = h.toLowerCase().trim();
          return l.includes("tanggal lahir") || l.includes("tgl lahir");
        });
        
        if (namaIdx === -1) {
          alert("Format berkas Excel tidak valid! Harus mempunyai kolom header: Nama");
          return;
        }

        // Coba cari kolom Rombel/Rombongan Belajar/Kelas di sheet
        const rombelIdx = headers.findIndex(h => {
          const l = h.toLowerCase();
          return l === "rombel" || l === "rombongan belajar" || l === "kelas" || l.includes("rombel") || l.includes("rombongan belajar") || l.includes("kelas");
        });
        
        // === Helper: normalize all known Dapodik/Excel date formats to YYYY-MM-DD ===
        const BULAN_ID_CLIENT = {
          januari: "01", februari: "02", maret: "03", april: "04",
          mei: "05", juni: "06", juli: "07", agustus: "08",
          september: "09", oktober: "10", november: "11", desember: "12",
        };

        const normalizeTanggal = (raw) => {
          if (!raw && raw !== 0) return "";
          const s = String(raw).trim();
          if (!s || s === "-") return "";

          // Already YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

          // DD/MM/YYYY or DD-MM-YYYY
          const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,"0")}-${dmy[1].padStart(2,"0")}`;

          // YYYY/MM/DD
          const ymd = s.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/);
          if (ymd) return `${ymd[1]}-${ymd[2].padStart(2,"0")}-${ymd[3].padStart(2,"0")}`;

          // Excel serial number (pure integer, e.g. 40200)
          if (/^\d+$/.test(s)) {
            const serial = parseInt(s, 10);
            if (serial > 1 && serial < 80000) {
              const epoch = new Date(Date.UTC(1899, 11, 30));
              const d = new Date(epoch.getTime() + serial * 86400000);
              if (!isNaN(d.getTime())) {
                return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
              }
            }
          }

          // Indonesian long format: "15 Januari 2009"
          const idLong = s.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
          if (idLong) {
            const m = BULAN_ID_CLIENT[idLong[2].toLowerCase()];
            if (m) return `${idLong[3]}-${m}-${idLong[1].padStart(2,"0")}`;
          }

          // Fallback
          const parsed = new Date(s);
          if (!isNaN(parsed.getTime())) {
            return `${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,"0")}-${String(parsed.getDate()).padStart(2,"0")}`;
          }

          return s; // return as-is, server will re-attempt parsing
        };

        const parsedSiswa = [];
        const warnings = [];
        
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i];
          if (!cols || cols.length === 0) continue;

          // Check if row is entirely empty cells
          const isRowEmpty = cols.every(cell => String(cell).trim() === "");
          if (isRowEmpty) continue;
          
          const nisnVal = nisnIdx !== -1 && cols[nisnIdx] !== undefined ? String(cols[nisnIdx]).replace(/[,.\s]/g, "").trim() : "";
          const namaVal = namaIdx !== -1 && cols[namaIdx] !== undefined ? String(cols[namaIdx]).trim() : "";
          const tglRaw = tglIdx !== -1 && cols[tglIdx] !== undefined ? cols[tglIdx] : "";
          const tglVal = normalizeTanggal(tglRaw);
          const rombelVal = rombelIdx !== -1 && cols[rombelIdx] !== undefined ? String(cols[rombelIdx]).trim() : "";

          let finalNisn = nisnVal;
          if (!finalNisn) {
            finalNisn = `TMP${Math.floor(Date.now() / 1000).toString(36).toUpperCase()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}${i}`;
          }

          // Pengecekan data tidak lengkap
          const missingFields = [];
          if (!namaVal) missingFields.push("Nama");

          if (missingFields.length > 0) {
            const identifier = namaVal || nisnVal || `Baris ${i + 1}`;
            const rombelDesc = rombelVal ? `Rombel: ${rombelVal}` : `Kelas saat ini: ${kelas?.nama || 'tidak diketahui'}`;
            warnings.push(`Siswa "${identifier}" (${rombelDesc}) (Baris ${i + 1}) dilewati karena data tidak lengkap: ${missingFields.join(", ")} tidak ditemukan.`);
            continue;
          }
          
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
            nisn: finalNisn,
            nama: namaVal,
            tanggalLahir: tglVal,
            rombel: rombelVal,
            nilai: nilaiObj
          });
        }
        
        if (parsedSiswa.length === 0) {
          let errorMsg = "Tidak ada data siswa yang valid untuk diimpor.";
          if (warnings.length > 0) {
            errorMsg += " Semua baris dilewati karena data tidak lengkap.";
          }
          alert(errorMsg);
          setImportWarnings(warnings);
          return;
        }
        
        // Cek Rombel
        const uniqueRombels = [...new Set(parsedSiswa.map(s => s.rombel).filter(r => r))];
        if (uniqueRombels.length > 1) {
          setAvailableRombels(uniqueRombels);
          setTempParsedSiswa(parsedSiswa);
          setSelectedRombelFilter(uniqueRombels.includes(kelas.rombelNama) ? kelas.rombelNama : uniqueRombels[0]);
          setImportWarnings(warnings);
          setRombelSelectModalOpen(true);
        } else {
          setImportWarnings(warnings);
          setPreviewList(parsedSiswa);
          setPreviewModalOpen(true);
        }
        
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
        let msg = data.message || "Impor data berhasil!";
        if (data.skipped && data.skipped.length > 0) {
          msg += "\n\nCatatan (Beberapa siswa dilewati):\n" + data.skipped.map(s => `- ${s.name}: ${s.reason}`).join("\n");
        }
        triggerAlert(msg, () => {
          setPreviewModalOpen(false);
          fetchClassDetail();
        }, { title: data.skipped && data.skipped.length > 0 ? "Impor Berhasil dengan Catatan" : "Impor Berhasil" });
      } else {
        triggerAlert(data.error || "Gagal mengimpor data.", null, { title: "Impor Gagal", isDanger: true });
      }
    } catch (err) {
      console.error(err);
      triggerAlert("Terjadi kesalahan koneksi server saat mengimpor.", null, { title: "Galat Koneksi", isDanger: true });
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "8px", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "500" }}>
          <Link href="/guru/kelas">📚 Daftar Kelas</Link>
          <span>/</span>
          <span style={{ color: "var(--text-primary)" }}>{kelas.nama}</span>
        </div>
      </div>

      {/* Warning Banner for Archived Class */}
      {kelas.archived && (
        <div style={{
          padding: "16px 20px",
          borderRadius: "var(--radius-sm)",
          backgroundColor: "rgba(100, 116, 139, 0.1)",
          border: "1px solid var(--border-color)",
          color: "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "0.9rem",
          fontWeight: "600",
          boxShadow: "var(--shadow-sm)"
        }} className="animate-fade-in">
          <span style={{ fontSize: "1.4rem" }}>📁</span>
          <div>
            <strong>Kelas ini telah diarsipkan.</strong> Anda hanya dapat melihat data kelas dan tidak dapat melakukan pengeditan atau perubahan nilai.
          </div>
        </div>
      )}

      {/* Warning Banner for Missing Birth Dates */}
      {studentsWithoutBirthDate.length > 0 && (
        <div style={{
          padding: "16px 20px",
          borderRadius: "var(--radius-sm)",
          backgroundColor: "var(--warning-glow)",
          border: "1px solid rgba(245, 158, 11, 0.25)",
          color: "var(--text-primary)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "0.9rem",
          fontWeight: "500",
          boxShadow: "var(--shadow-sm)"
        }} className="animate-fade-in">
          <span style={{ fontSize: "1.4rem" }}>⚠️</span>
          <div>
            <strong>Lengkapi Tanggal Lahir Siswa!</strong> Terdapat <strong>{studentsWithoutBirthDate.length} siswa</strong> di kelas ini yang belum memiliki tanggal lahir yang valid. Silakan lengkapi agar siswa dapat melakukan <strong>cek nilai mandiri</strong> menggunakan NISN dan tanggal lahir mereka.
          </div>
        </div>
      )}

      {/* Main Header Card */}
      <div className="glass-card mobile-compact" style={{ position: "relative", zIndex: 50, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px", borderLeft: "5px solid var(--primary)" }}>
        <div style={{ flex: "1 1 min-content" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", lineHeight: "1.2", position: "relative" }}>
            <div className="class-switcher-dropdown" style={{ position: "relative" }}>
              <span 
                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", margin: "-4px -8px", borderRadius: "var(--radius-sm)", transition: "background 0.2s" }}
                onClick={() => setSwitcherOpen(!switcherOpen)}
                onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"}
                onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                title="Pindah Kelas Lain"
              >
                {kelas.nama} <span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>▼</span>
              </span>
              
              {switcherOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: "8px",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-lg)",
                  zIndex: 100,
                  width: "max-content",
                  minWidth: "220px",
                  maxHeight: "50vh",
                  overflowY: "auto"
                }}>
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-color)", fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    🚀 Pindah Kelas
                  </div>
                  {availableClasses.length > 0 ? availableClasses.map(c => (
                    <div 
                      key={c.id}
                      onClick={() => window.location.href = `/guru/kelas/${c.id}`}
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--border-color)",
                        transition: "background 0.2s",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px"
                      }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <div style={{ fontWeight: "800", fontSize: "0.95rem", color: "var(--text-primary)" }}>{c.nama}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "500" }}>{c.mataPelajaran}</div>
                    </div>
                  )) : (
                    <div style={{ padding: "16px", fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center" }}>Tidak ada kelas lain</div>
                  )}
                </div>
              )}
            </div>
            
            {/* Click away listener overlay */}
            {switcherOpen && (
              <div 
                style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                onClick={() => setSwitcherOpen(false)}
              />
            )}
            
            <div style={{ position: "relative", marginLeft: "4px" }}>
              <button 
                onClick={() => setShareDropdownOpen(!shareDropdownOpen)}
                style={{ padding: "6px 10px", backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s", color: "var(--text-primary)" }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"}
                onMouseOut={e => e.currentTarget.style.backgroundColor = "var(--bg-tertiary)"}
                title="Bagikan Kelas ke Siswa"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              
              {shareDropdownOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: "8px",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-lg)",
                  zIndex: 100,
                  width: "max-content",
                  minWidth: "200px",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden"
                }}>
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-color)", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Kode: <span style={{ fontFamily: "monospace", color: "var(--primary)" }}>{kelas.id}</span>
                  </div>
                  <div 
                    onClick={() => {
                      navigator.clipboard.writeText(kelas.id);
                      alert("Kode Kelas disalin!");
                      setShareDropdownOpen(false);
                    }}
                    style={{ padding: "12px 16px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border-color)" }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    📋 Salin Kode Kelas
                  </div>
                  <div 
                    onClick={() => {
                      const shareLink = `${window.location.origin}/?kelas=${kelas.id}`;
                      navigator.clipboard.writeText(shareLink);
                      alert("Tautan Kelas disalin!");
                      setShareDropdownOpen(false);
                    }}
                    style={{ padding: "12px 16px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    🔗 Salin Tautan (Link)
                  </div>
                </div>
              )}
            </div>

            {shareDropdownOpen && (
              <div 
                style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                onClick={() => setShareDropdownOpen(false)}
              />
            )}

          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px", flexWrap: "wrap" }}>
            <p style={{ color: "var(--text-secondary)", margin: 0, fontWeight: "500", fontSize: "0.85rem" }}>
              {kelas.mataPelajaran} &bull; {kelas.tahunAjaran} ({kelas.semester || "Ganjil"})
            </p>
          </div>
        </div>

        {/* Weights overview */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", flex: "0 0 auto" }}>
          <div className="mobile-compact-stats" style={{ textAlign: "right", backgroundColor: "var(--bg-tertiary)", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
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

      {/* Alert Komponen Nilai Belum Diatur */}
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
                Komponen Nilai Belum Dikonfigurasi
              </h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                Kelas ini belum memiliki komponen atau kolom nilai (seperti UTS, UAS, Tugas) sehingga penilaian belum dapat diisi.
              </p>
            </div>
          </div>
          
          <div style={{ height: "1px", backgroundColor: "rgba(245, 158, 11, 0.15)", margin: "4px 0" }}></div>
          
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>
              💡 <strong>Langkah cepat:</strong> Klik tombol "Mulai Atur Komponen Sekarang" di sebelah kanan untuk menambahkan aspek/kolom baru.
            </span>
            <button
              onClick={() => {

                handleOpenKolomModal();
                const configCard = document.getElementById("konfigurasi-kelas");
                if (configCard) {
                  configCard.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="btn"
              disabled={isLocked}
              style={{
                padding: "8px 18px",
                fontSize: "0.85rem",
                backgroundColor: "var(--warning)",
                color: "#ffffff",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontWeight: "700",
                cursor: isLocked ? "not-allowed" : "pointer",
                opacity: isLocked ? 0.6 : 1,
                boxShadow: isLocked ? "none" : "0 4px 10px rgba(245, 158, 11, 0.2)"
              }}
            >
              ⚙️ Mulai Atur Komponen Sekarang
            </button>
          </div>
        </div>
      )}


      {/* Tab Navigation - Single Line Grid (No Scroll) */}
      {viewMode === 'tabs' ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "4px",
          backgroundColor: "var(--bg-secondary)",
          padding: "4px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-color)",
          width: "100%"
        }}>
          {[{ id: "nilai", label: "📊 Nilai" }, { id: "presensi", label: "📅 Presensi" }, { id: "analitik", label: "📈 Analitik" }, { id: "tindak-lanjut", label: "📢 Lanjutan" }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="btn"
              style={{
                padding: "8px",
                fontSize: "0.8rem",
                fontWeight: "700",
                borderRadius: "var(--radius-sm)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                backgroundColor: activeTab === tab.id ? "var(--primary)" : "transparent",
                color: activeTab === tab.id ? "#ffffff" : "var(--text-secondary)",
                boxShadow: activeTab === tab.id ? "0 2px 8px rgba(59,130,246,0.35)" : "none",
                whiteSpace: "nowrap",
                justifyContent: "center",
                display: "flex",
                alignItems: "center"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* Back Button for Dashboard Mode */}
      {viewMode === 'dashboard' && activeTab !== 'dashboard' && (
        <div style={{ display: "flex", marginBottom: "8px" }}>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="btn"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)", fontWeight: "600", borderRadius: "var(--radius-md)" }}
          >
            ← Kembali ke Menu Kelas
          </button>
        </div>
      )}

      {/* Dashboard Cards Content */}
      {activeTab === 'dashboard' && viewMode === 'dashboard' && (
        <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px", marginTop: "12px" }}>
          {[
            { id: "nilai", icon: "📊", title: "Manajemen Nilai", desc: "Kelola kolom, aspek penilaian, dan daftar nilai siswa." },
            { id: "presensi", icon: "📅", title: "Presensi Siswa", desc: "Isi dan pantau kehadiran siswa untuk mapel Anda." },
            { id: "analitik", icon: "📈", title: "Analitik Kelas", desc: "Lihat statistik, peringkat, dan tren nilai." },
            { id: "tindak-lanjut", label: "📢 Lanjutan", icon: "📢", title: "Tindak Lanjut & e-Rapor", desc: "Kirim rapor mini, kelola e-Rapor, dan rekap aksi." }
          ].map(menu => (
            <div 
              key={menu.id}
              onClick={() => setActiveTab(menu.id)}
              className="glass-card"
              style={{ padding: "24px", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "16px", border: "1px solid var(--border-color)" }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{ fontSize: "2.5rem", backgroundColor: "var(--bg-secondary)", width: "64px", height: "64px", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {menu.icon}
              </div>
              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: "1.05rem", fontWeight: "800", color: "var(--text-primary)", lineHeight: "1.2" }}>{menu.title}</h4>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.4" }}>{menu.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============= ANALITIK & PERINGKAT TAB ============= */}
      {activeTab === "analitik" && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {!analyticsData ? (
            <div className="glass-card" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              Tambah siswa dan komponen nilai terlebih dahulu untuk melihat analitik dan peringkat.
            </div>
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
                    {analyticsData.aspectAvg.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Belum ada komponen nilai.</p>}
                  </div>
                </div>
              </div>

              {/* ============= PERINGKAT SISWA TABLE ============= */}
              <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "20px 24px 16px 24px" }}>
                  <h4 style={{ fontSize: "1.25rem", fontWeight: "800" }}>🏆 Peringkat Siswa</h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                    Urutan berdasarkan nilai akhir tertinggi. Hanya siswa dengan semua komponen terisi yang diperingkatkan.
                  </p>
                </div>
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

              {/* Theme Toggle Selector */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginRight: "8px", backgroundColor: "var(--bg-tertiary)", padding: "4px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                {['light', 'dark'].map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setLaporanTheme(theme)}
                    className="btn"
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      borderRadius: "4px",
                      border: "none",
                      cursor: "pointer",
                      backgroundColor: laporanTheme === theme ? (theme === 'dark' ? 'var(--bg-primary)' : '#ffffff') : 'transparent',
                      color: laporanTheme === theme ? 'var(--text-primary)' : 'var(--text-secondary)',
                      boxShadow: laporanTheme === theme ? 'var(--shadow-sm)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                  </button>
                ))}
              </div>

              <button onClick={() => {
                const text = `*Laporan Kendala Akademik (Otomatis)*\nMata Pelajaran: ${kelas.mataPelajaran}\nKelas: ${kelas.nama}\nGuru Pengampu: ${guruProfile?.nama || "-"}\nKKM: ${analyticsData?.kkmVal}\n\n` + 
                (analyticsData?.problematicStudents.length === 0 ? "Semua siswa telah tuntas dan melampaui KKM. 🎉" : 
                analyticsData?.problematicStudents.map((s, idx) => `*${idx + 1}. ${s.nama}*\n_Status Nilai Akhir: ${totalBobot !== 100 ? `Belum Lengkap (Bobot < 100%) ⚠️` : (s.finalScore >= analyticsData?.kkmVal ? `Sudah Tuntas KKM ✅` : `Belum Tuntas ❌`)}_` +
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
                
                const canvas = await html2canvas(element, { scale: 2, backgroundColor: laporanTheme === "dark" ? "#0f172a" : "#ffffff" });
                
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
          {(() => {
            const isDark = laporanTheme === "dark";
            const colors = {
              bg: isDark ? "#0f172a" : "#ffffff",
              textPrimary: isDark ? "#f8fafc" : "#0f172a",
              textSecondary: isDark ? "#94a3b8" : "#475569",
              textMuted: isDark ? "#64748b" : "#64748b",
              headerTitle: isDark ? "#38bdf8" : "#0284c7",
              subTitleGuru: isDark ? "#cbd5e1" : "#1e293b",
              borderDash: isDark ? "rgba(255,255,255,0.2)" : "rgba(15,23,42,0.15)",
              cardBg: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
              cardBorder: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.06)",
              tuntasBg: isDark ? "rgba(16, 185, 129, 0.03)" : "rgba(16, 185, 129, 0.04)",
              tuntasBorder: isDark ? "rgba(52, 211, 153, 0.15)" : "rgba(16, 185, 129, 0.2)",
              tuntasHeaderBg: isDark ? "rgba(16, 185, 129, 0.08)" : "rgba(16, 185, 129, 0.1)",
              tuntasText: isDark ? "#34d399" : "#059669",
              belumTuntasBg: isDark ? "rgba(239, 68, 68, 0.03)" : "rgba(239, 68, 68, 0.04)",
              belumTuntasBorder: isDark ? "rgba(248, 113, 113, 0.15)" : "rgba(239, 68, 68, 0.2)",
              belumTuntasHeaderBg: isDark ? "rgba(239, 68, 68, 0.08)" : "rgba(239, 68, 68, 0.1)",
              belumTuntasText: isDark ? "#fca5a5" : "#dc2626",
              listBorder: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)",
              attBg: isDark ? "rgba(0,0,0,0.25)" : "rgba(15,23,42,0.04)",
              attText: isDark ? "#94a3b8" : "#475569",
              kosongBg: isDark ? "rgba(251,191,36,0.08)" : "rgba(245,158,11,0.08)",
              kosongBorder: isDark ? "#fbbf24" : "#d97706",
              kosongText: isDark ? "#fcd34d" : "#b45309",
              kurangBg: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)",
              kurangBorder: isDark ? "#ef4444" : "#dc2626",
              kurangText: isDark ? "#fca5a5" : "#b91c1c",
            };
            
            return (
              <div id="laporan-wali-kelas-export" style={{ backgroundColor: colors.bg, padding: "24px", borderRadius: "var(--radius-md)", color: colors.textPrimary, width: "100%", maxWidth: "800px", margin: "0 auto", border: isDark ? "none" : "1px solid var(--border-color)", boxShadow: isDark ? "none" : "var(--shadow-md)" }}>
                <div style={{ textAlign: "center", marginBottom: "24px", borderBottom: `1px dashed ${colors.borderDash}`, paddingBottom: "16px" }}>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "800", margin: "0 0 8px 0", color: colors.headerTitle }}>Laporan Kendala Akademik</h2>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: colors.textSecondary, marginBottom: "6px" }}>{kelas.mataPelajaran} • Kelas {kelas.nama}</p>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: colors.textMuted }}>Guru Pengampu: <strong style={{ color: colors.subTitleGuru }}>{guruProfile?.nama || "-"}</strong> • KKM: <strong style={{ color: colors.subTitleGuru }}>{analyticsData?.kkmVal}</strong></p>
                </div>

                {analyticsData?.problematicStudents.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <span style={{ fontSize: "3rem" }}>🎉</span>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginTop: "16px", color: "#10b981" }}>Luar Biasa! Semua Siswa Tuntas</h3>
                    <p style={{ color: colors.textSecondary, fontSize: "0.9rem", marginTop: "8px" }}>Tidak ada siswa dengan nilai kosong atau di bawah KKM.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {analyticsData?.problematicStudents.map((s, i) => (
                      <div key={s.nisn} style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}`, padding: "16px", borderRadius: "8px", borderLeft: "4px solid #ef4444" }}>
                        <h4 style={{ fontSize: "1.1rem", fontWeight: "800", margin: "0 0 12px 0", color: colors.textPrimary }}>{i + 1}. {s.nama}</h4>
                        
                        {/* Status & Detail Kendala Box */}
                        <div style={{
                          backgroundColor: totalBobot !== 100 ? "rgba(245, 158, 11, 0.03)" : (s.finalScore >= analyticsData?.kkmVal ? colors.tuntasBg : colors.belumTuntasBg),
                          border: `1px solid ${totalBobot !== 100 ? "rgba(245, 158, 11, 0.15)" : (s.finalScore >= analyticsData?.kkmVal ? colors.tuntasBorder : colors.belumTuntasBorder)}`,
                          borderRadius: "8px",
                          overflow: "hidden"
                        }}>
                          {/* Final Score Status Header */}
                          <div style={{ 
                            display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", fontSize: "0.85rem", fontWeight: "600",
                            backgroundColor: totalBobot !== 100 ? "rgba(245, 158, 11, 0.08)" : (s.finalScore >= analyticsData?.kkmVal ? colors.tuntasHeaderBg : colors.belumTuntasHeaderBg),
                            color: totalBobot !== 100 ? (isDark ? "#fcd34d" : "#b45309") : (s.finalScore >= analyticsData?.kkmVal ? colors.tuntasText : colors.belumTuntasText),
                            borderBottom: `1px solid ${totalBobot !== 100 ? "rgba(245, 158, 11, 0.15)" : (s.finalScore >= analyticsData?.kkmVal ? colors.tuntasBorder : colors.belumTuntasBorder)}`
                          }}>
                            <span>{totalBobot !== 100 ? "⚠️" : (s.finalScore >= analyticsData?.kkmVal ? "✅" : "⚠️")}</span>
                            <span>Status Nilai Akhir: {totalBobot !== 100 ? "Belum Lengkap (Bobot Komponen Belum 100%)" : (s.finalScore >= analyticsData?.kkmVal ? "Aman (Tuntas KKM)" : "Kurang (Belum Tuntas)")}</span>
                          </div>

                          {/* Rincian Kendala Komponen (Nested inside status box) */}
                          <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div style={{ fontSize: "0.75rem", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>↳</span> Rincian Detail Kendala Komponen:
                            </div>
                            
                            <div style={{ paddingLeft: "12px", borderLeft: `2px solid ${colors.listBorder}`, display: "flex", flexDirection: "column", gap: "6px" }}>
                              {showKehadiran && (
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem", backgroundColor: colors.attBg, padding: "7px 12px", borderRadius: "4px", borderLeft: "3px solid #475569" }}>
                                  <span style={{ color: colors.attText, fontWeight: "600" }}>📋 Kehadiran</span>
                                  <span style={{ fontWeight: "700", fontSize: "0.75rem", color: colors.attText }}>
                                    H: {s.attSummary.H} | I: {s.attSummary.I} | S: {s.attSummary.S} | <span style={{ color: s.attSummary.A > 0 ? (isDark ? "#fca5a5" : "#dc2626") : "inherit" }}>A: {s.attSummary.A}</span>
                                  </span>
                                </div>
                              )}
                              {s.issues.map((issue, idx) => {
                                const isKosong = issue.status.includes("Kosong");
                                return (
                                  <div key={idx} style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    fontSize: "0.82rem", padding: "7px 12px", borderRadius: "4px",
                                    backgroundColor: isKosong ? colors.kosongBg : colors.kurangBg,
                                    borderLeft: `3px solid ${isKosong ? colors.kosongBorder : colors.kurangBorder}`
                                  }}>
                                    <span style={{ color: colors.textPrimary, fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                                      <span style={{ color: isKosong ? colors.kosongBorder : colors.kurangBorder }}>•</span> {issue.aspek}
                                    </span>
                                    <span style={{ 
                                      fontWeight: "700", fontSize: "0.75rem",
                                      color: isKosong ? colors.kosongText : colors.kurangText
                                    }}>
                                      {issue.status}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: `1px dashed ${colors.borderDash}`, textAlign: "center", fontSize: "0.75rem", color: colors.textMuted }}>
                  <p style={{ margin: "0 0 8px 0", color: colors.textSecondary, fontSize: "0.85rem" }}>Siswa dapat mengecek detail nilai masing-masing secara privat melalui: <strong style={{ color: colors.headerTitle }}>ceknilaimu.vercel.app</strong></p>
                  Dihasilkan otomatis oleh CekNilai App • {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ============= PRESENSI TAB ============= */}
      {activeTab === "presensi" && (
        <div className="glass-card animate-fade-in" style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h4 style={{ fontSize: "1.25rem", fontWeight: "800" }}>📅 Tabel Presensi (Kehadiran)</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                Kelola kehadiran siswa. Klik pada sel untuk mengubah status: <strong style={{color:"var(--success)"}}>H</strong> (Hadir), <strong style={{color:"var(--warning)"}}>I</strong> (Izin), <strong style={{color:"#3b82f6"}} >S</strong> (Sakit), <strong style={{color:"#8b5cf6"}}>D</strong> (Dispensasi), <strong style={{color:"var(--danger)"}}>A</strong> (Alpha).
              </p>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "4px",
              width: "100%",
              marginTop: "4px"
            }}>
              <button onClick={() => {
                setPresensiConfigTemp(kelas.skemaPenilaian?.presensi || { digunakan: false, bobot: 0 });
                setPresensiModalOpen(true);
              }} className="btn btn-outline" style={{ fontSize: "0.74rem", padding: "6px 2px", borderRadius: "6px", whiteSpace: "nowrap", justifyContent: "center", fontWeight: "700" }}>
                ⚙️ Atur
              </button>
              <button 
                onClick={() => {
                  if (!kelas.skemaPenilaian?.pertemuan || kelas.skemaPenilaian.pertemuan.length === 0) {
                    alert("Belum ada pertemuan. Silakan buat pertemuan terlebih dahulu dengan tombol 'Tambah Pertemuan' sebelum menggunakan pemindai QR.");
                    return;
                  }
                  setQrModalOpen(true);
                }} 
                className="btn" 
                style={{ 
                  fontSize: "0.74rem", 
                  padding: "6px 2px",
                  backgroundColor: "rgba(59, 130, 246, 0.08)",
                  color: "#3b82f6",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s"
                }}
              >
                📷 Scan
              </button>
              <button 
                onClick={handleOpenAddPertemuan} 
                className="btn btn-primary" 
                style={{ 
                  fontSize: "0.74rem", 
                  padding: "6px 2px", 
                  fontWeight: "700",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  whiteSpace: "nowrap"
                }}
              >
                ➕ Tambah
              </button>
            </div>
          </div>

          {/* Panel Presensi Massal Cepat removed from page, integrated directly inside pertemuan modals */}



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
                      <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginLeft: "4px", fontWeight: "600" }}>Alpha</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "1.05rem", fontWeight: "800", color: "#8b5cf6" }}>{presensiStats.totalD}</span>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginLeft: "4px", fontWeight: "600" }}>Dispensasi</span>
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
                              <span style={{ fontWeight: "700", color: "var(--text-primary)" }}>Materi: </span>
                              <span style={{ color: "var(--text-primary)" }}>{p.materi}</span>
                            </div>
                          ) : (
                            <div style={{ fontStyle: "italic", color: "var(--text-muted)" }}>Materi belum diisi</div>
                          )}
                          {currentKegiatan ? (
                            <div>
                              <span style={{ fontWeight: "700", color: "var(--text-secondary)" }}>Kegiatan: </span>
                              <span style={{ color: "var(--text-secondary)" }}>{currentKegiatan}</span>
                            </div>
                          ) : (
                            <div style={{ fontStyle: "italic", color: "var(--text-muted)" }}>Kegiatan belum diisi</div>
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
                  <th className="mobile-hide" style={{ width: "50px", minWidth: "50px", textAlign: "center", backgroundColor: "var(--bg-tertiary)", position: "sticky", left: 0, zIndex: 22 }}>
                    <input
                      type="checkbox"
                      checked={kelas.siswa.length > 0 && selectedNisns.length === kelas.siswa.length}
                      onChange={handleSelectAllStudents}
                      style={{ cursor: "pointer", width: "16px", height: "16px" }}
                    />
                  </th>
                  <th className="mobile-hide" style={{ width: "40px", minWidth: "40px", textAlign: "center", backgroundColor: "var(--bg-tertiary)", position: "sticky", left: "50px", zIndex: 22 }}>
                    No
                  </th>
                  <th className="sticky-nama" style={{ position: "sticky", left: "90px", zIndex: 22, backgroundColor: "var(--bg-tertiary)", boxShadow: "2px 0 5px rgba(0,0,0,0.05)" }}>Nama Siswa</th>
                  {([...(kelas.skemaPenilaian?.pertemuan || [])].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))).map((p, idx) => (
                    <th key={p.id} style={{ minWidth: "90px", textAlign: "center", backgroundColor: "var(--bg-tertiary)", position: "relative" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)" }} title={p.nama}>
                          {p.nama.replace(/Pertemuan/i, "Pert.")}
                        </span>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600" }}>{p.tanggal}</div>
                        <button 
                          onClick={() => togglePertemuanLock(p.id)} 
                          style={{
                            background: unlockedPertemuanIds.includes(p.id) ? "rgba(239, 68, 68, 0.2)" : "rgba(30, 41, 59, 0.8)",
                            border: unlockedPertemuanIds.includes(p.id) ? "1px solid #ef4444" : "1px solid var(--border-color)",
                            borderRadius: "4px",
                            padding: "2px 6px",
                            color: unlockedPertemuanIds.includes(p.id) ? "#ef4444" : "var(--text-muted)",
                            cursor: "pointer",
                            fontSize: "0.68rem",
                            lineHeight: 1,
                            marginTop: "4px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            transition: "all 0.2s"
                          }}
                          title={unlockedPertemuanIds.includes(p.id) ? "Klik untuk mengunci kolom ini" : "Klik untuk membuka kunci kolom ini"}
                        >
                          {unlockedPertemuanIds.includes(p.id) ? "🔓 Buka" : "🔒 Kunci"}
                        </button>
                      </div>
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
                          {p.materi}
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
                          {p.kegiatan || p.keterangan}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "8px" }}>
                        <button onClick={() => handleOpenEditPertemuan(p)} style={{ background: "rgba(59, 130, 246, 0.1)", borderRadius: "4px", padding: "2px 6px", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: "0.7rem", fontWeight: "bold" }}>Ubah</button>
                        <button onClick={() => {
                          triggerConfirm(
                            `Apakah Anda yakin ingin menghapus "${p.nama}"? Seluruh data kehadiran untuk pertemuan ini akan ikut terhapus secara permanen.`,
                            async () => {
                              const updatedSkema = { ...kelas.skemaPenilaian, pertemuan: kelas.skemaPenilaian.pertemuan.filter(pt => pt.id !== p.id) };
                              setKelas({ ...kelas, skemaPenilaian: updatedSkema });
                              try {
                                 await fetch(`/api/kelas/${kelas.id}`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ skemaPenilaian: updatedSkema }) });
                              } catch(e) {}
                            },
                            {
                              title: "Hapus Pertemuan",
                              confirmText: "Ya, Hapus",
                              isDanger: true
                            }
                          );
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
                      <th style={{ minWidth: "60px", textAlign: "center", backgroundColor: "var(--bg-tertiary)", color: "#8b5cf6" }}>D</th>
                      <th style={{ minWidth: "90px", textAlign: "center", backgroundColor: "var(--bg-secondary)", color: "var(--primary)", fontWeight: "800" }}>% Hadir</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {kelas.siswa.length === 0 ? (
                  <tr>
                    <td colSpan={kelas.skemaPenilaian?.pertemuan?.length > 0 ? (kelas.skemaPenilaian.pertemuan.length + 9) : 4} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                      Belum ada siswa di kelas ini.
                    </td>
                  </tr>
                ) : kelas.siswa.map((siswa, sIdx) => (
                  <tr key={siswa.nisn} style={{ backgroundColor: sIdx % 2 === 0 ? "var(--bg-secondary)" : "var(--bg-primary)" }}>
                    <td className="mobile-hide" style={{ width: "50px", minWidth: "50px", textAlign: "center", position: "sticky", left: 0, zIndex: 12, backgroundColor: sIdx % 2 === 0 ? "var(--bg-secondary)" : "var(--bg-primary)" }}>
                      <input
                        type="checkbox"
                        checked={selectedNisns.includes(siswa.nisn)}
                        onChange={() => handleSelectStudent(siswa.nisn)}
                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                      />
                    </td>
                    <td className="mobile-hide" style={{ width: "40px", minWidth: "40px", textAlign: "center", color: "var(--text-secondary)", fontWeight: "bold", position: "sticky", left: "50px", zIndex: 12, backgroundColor: sIdx % 2 === 0 ? "var(--bg-secondary)" : "var(--bg-primary)" }}>
                      {sIdx + 1}
                    </td>
                    <td 
                      className={`sticky-nama ${isNamaColumnExpanded ? 'expanded-active' : ''}`}
                      onClick={toggleNamaExpand}
                      title="Klik untuk melihat nama lengkap"
                      style={{ position: "sticky", left: "90px", zIndex: 12, fontWeight: "600", backgroundColor: sIdx % 2 === 0 ? "var(--bg-secondary)" : "var(--bg-primary)", cursor: "pointer", boxShadow: "2px 0 5px rgba(0,0,0,0.05)" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", overflow: "hidden" }}>
                        <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", width: "100%", display: "block" }}>{formatNameForMobile(siswa.nama, isNamaColumnExpanded)}</span>
                      </div>
                    </td>
                    {([...(kelas.skemaPenilaian?.pertemuan || [])].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))).map(p => {
                      const val = siswa.nilai[`_presensi_${p.id}`] || "";
                      const isUnlocked = unlockedPertemuanIds.includes(p.id);
                      return (
                        <td key={p.id} style={{ textAlign: "center", padding: "6px" }}>
                          <button 
                            onClick={() => {
                              if (!isUnlocked) {
                                const cellKey = `${siswa.nisn}-${p.id}`;
                                const now = Date.now();
                                const lastClick = lastClickRef.current[cellKey] || 0;
                                lastClickRef.current[cellKey] = now;
                                if (now - lastClick < 500) {
                                  triggerAlert("Kolom presensi ini masih terkunci. Silakan klik tombol gembok (🔓 Buka) di bagian atas atau bawah kolom terlebih dahulu untuk dapat mengubah data presensi.", null, { title: "🔒 Kolom Terkunci" });
                                }
                                return;
                              }
                              const nextVal = val === "" ? "H" : val === "H" ? "I" : val === "I" ? "S" : val === "S" ? "A" : val === "A" ? "D" : "";
                              const newSiswa = [...kelas.siswa];
                              newSiswa[sIdx].nilai[`_presensi_${p.id}`] = nextVal;
                              setKelas({ ...kelas, siswa: newSiswa });
                              
                              // Trigger auto save reusing handleSaveScore logic
                              handleSaveScore(siswa.nisn, `_presensi_${p.id}`, nextVal);
                            }}
                            title={!isUnlocked ? "Kolom terkunci. Klik ikon gembok di atas/bawah kolom untuk mengedit." : "Klik untuk mengubah status kehadiran (H -> I -> S -> A -> D -> kosong)"}
                            style={{
                              width: "42px", 
                              height: "42px", 
                              borderRadius: "10px", 
                              fontWeight: "800", 
                              cursor: !isUnlocked ? "not-allowed" : "pointer", 
                              fontSize: val === "" ? "1.1rem" : "1.05rem",
                              backgroundColor: val === 'H' ? "#10b981" : val === 'I' ? "#f59e0b" : val === 'S' ? "#3b82f6" : val === 'A' ? "#ef4444" : val === 'D' ? "#8b5cf6" : (isUnlocked ? "rgba(59, 130, 246, 0.08)" : "var(--bg-tertiary)"),
                              color: val !== "" ? "#ffffff" : (isUnlocked ? "var(--primary)" : "var(--text-muted)"),
                              border: val !== "" ? "none" : (isUnlocked ? "1.5px dashed var(--primary)" : "1px dashed var(--border-color)"),
                              boxShadow: val !== "" ? "0 2px 6px rgba(0,0,0,0.18)" : "none",
                              transition: "all 0.2s ease",
                              opacity: !isUnlocked && val === "" ? 0.4 : 1
                            }}>
                            {val || (isUnlocked ? "+" : "-")}
                          </button>
                        </td>
                      )
                    })}
                    {(!kelas.skemaPenilaian?.pertemuan || kelas.skemaPenilaian.pertemuan.length === 0) && (
                      <td></td>
                    )}
                    {kelas.skemaPenilaian?.pertemuan?.length > 0 && (() => {
                      let countH = 0, countI = 0, countS = 0, countA = 0, countD = 0;
                      (kelas.skemaPenilaian?.pertemuan || []).forEach(p => {
                        const status = siswa.nilai[`_presensi_${p.id}`];
                        if (status === 'H') countH++;
                        else if (status === 'I') countI++;
                        else if (status === 'S') countS++;
                        else if (status === 'A') countA++;
                        else if (status === 'D') countD++;
                      });
                      const totalP = kelas.skemaPenilaian.pertemuan.length;
                      const persentase = totalP > 0 ? Math.round(((countH + countD) / totalP) * 100) : 0;
                      return (
                        <>
                          <td style={{ textAlign: "center", fontWeight: "700", color: "var(--success)", backgroundColor: "rgba(16, 185, 129, 0.02)" }}>{countH}</td>
                          <td style={{ textAlign: "center", fontWeight: "700", color: "var(--warning)", backgroundColor: "rgba(245, 158, 11, 0.02)" }}>{countI}</td>
                          <td style={{ textAlign: "center", fontWeight: "700", color: "#3b82f6", backgroundColor: "rgba(59, 130, 246, 0.02)" }}>{countS}</td>
                          <td style={{ textAlign: "center", fontWeight: "700", color: "var(--danger)", backgroundColor: "rgba(239, 68, 68, 0.02)" }}>{countA}</td>
                          <td style={{ textAlign: "center", fontWeight: "700", color: "#8b5cf6", backgroundColor: "rgba(139, 92, 246, 0.02)" }}>{countD}</td>
                          <td style={{ textAlign: "center", fontWeight: "800", color: "var(--primary)", backgroundColor: "rgba(59, 130, 246, 0.05)", fontSize: "1rem" }}>
                            {persentase}%
                          </td>
                        </>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: "var(--bg-tertiary)", borderTop: "2px solid var(--border-color)" }}>
                  <td colSpan={3} style={{ textAlign: "right", fontWeight: "700", padding: "10px 16px", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                    Status Kunci:
                  </td>
                  {(kelas.skemaPenilaian?.pertemuan || []).map(p => (
                    <td key={p.id} style={{ textAlign: "center", padding: "8px" }}>
                      <button 
                        onClick={() => togglePertemuanLock(p.id)} 
                        style={{
                          background: unlockedPertemuanIds.includes(p.id) ? "rgba(239, 68, 68, 0.2)" : "rgba(30, 41, 59, 0.8)",
                          border: unlockedPertemuanIds.includes(p.id) ? "1px solid #ef4444" : "1px solid var(--border-color)",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          color: unlockedPertemuanIds.includes(p.id) ? "#ef4444" : "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: "0.68rem",
                          fontWeight: "bold",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          transition: "all 0.2s",
                          marginLeft: "auto",
                          marginRight: "auto"
                        }}
                        title={unlockedPertemuanIds.includes(p.id) ? "Klik untuk mengunci kolom ini" : "Klik untuk membuka kunci kolom ini"}
                      >
                        {unlockedPertemuanIds.includes(p.id) ? "🔓" : "🔒"}
                      </button>
                    </td>
                  ))}
                  {kelas.skemaPenilaian?.pertemuan?.length > 0 && (
                    <td colSpan={6}></td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", padding: "0 24px", marginTop: "10px" }}>
            <div style={{ display: "flex", gap: "20px", fontSize: "0.85rem", color: "var(--text-secondary)", flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}><div style={{ width: "16px", height: "16px", borderRadius: "4px", backgroundColor: "var(--success)" }}></div> Hadir (100)</span>
              <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}><div style={{ width: "16px", height: "16px", borderRadius: "4px", backgroundColor: "#3b82f6" }}></div> Sakit (50)</span>
              <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}><div style={{ width: "16px", height: "16px", borderRadius: "4px", backgroundColor: "var(--warning)" }}></div> Izin (50)</span>
              <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}><div style={{ width: "16px", height: "16px", borderRadius: "4px", backgroundColor: "var(--danger)" }}></div> Alpha (0)</span>
              <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}><div style={{ width: "16px", height: "16px", borderRadius: "4px", backgroundColor: "#8b5cf6" }}></div> Dispensasi (100)</span>
            </div>
          </div>
        </div>
      )}

      {/* ============= NILAI TAB (existing gradebook) ============= */}
      {activeTab !== "nilai" ? null : (
      <>
      {/* Table: Main Spreadsheet Gradebook */}
      <div className="glass-card" style={{ padding: "20px 0", overflow: "hidden" }}>
        
        <div style={{ padding: "0 24px 16px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <h4 style={{ fontSize: "1.25rem", fontWeight: "800", margin: 0 }}>📊 Buku Nilai Kelas</h4>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", color: "var(--success)", fontWeight: "600", backgroundColor: "rgba(16, 185, 129, 0.1)", padding: "2px 8px", borderRadius: "12px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--success)" }}></span>
                Tersimpan otomatis
              </div>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
              Ketik nilai pada tabel. Terkunci otomatis saat kursor berpindah.
            </p>
          </div>
          
          {/* Action Toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "nowrap", overflowX: "auto", paddingBottom: "4px" }}>
            <button 
              onClick={() => { setKelolaSiswaTab('tambah'); setKelolaSiswaModalOpen(true); }}
              className={(!kelas?.siswa || kelas.siswa.length === 0) ? "btn btn-primary" : "btn btn-outline"} 
              style={{ width: "auto", padding: "6px 12px", fontSize: "0.8rem", fontWeight: "700", borderRadius: "6px", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap", boxShadow: (!kelas?.siswa || kelas.siswa.length === 0) ? "0 0 0 4px rgba(59,130,246,0.2)" : "none", animation: (!kelas?.siswa || kelas.siswa.length === 0) ? "pulse-soft 2s infinite" : "none" }}
            >
              + Data Siswa
            </button>
            <button 
              onClick={() => { handleOpenKolomModal(); }} 
              className={(!kelas?.kolomNilai || kelas.kolomNilai.length === 0) ? "btn btn-primary" : "btn btn-outline"} 
              style={{ width: "auto", padding: "6px 12px", fontSize: "0.8rem", fontWeight: "700", borderRadius: "6px", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap", opacity: isLocked ? 0.6 : 1, cursor: isLocked ? "not-allowed" : "pointer", boxShadow: (!kelas?.kolomNilai || kelas.kolomNilai.length === 0) && !isLocked ? "0 0 0 4px rgba(59,130,246,0.2)" : "none", animation: (!kelas?.kolomNilai || kelas.kolomNilai.length === 0) && !isLocked ? "pulse-soft 2s infinite" : "none" }}
              disabled={isLocked}
            >
              + Komponen Nilai
            </button>
            <button 
              onClick={() => { setCetakEksporTab('laporan'); setCetakEksporModalOpen(true); }}
              className="btn btn-secondary" 
              style={{ width: "auto", padding: "6px 10px", fontSize: "0.8rem", fontWeight: "700", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap", flexShrink: 0 }}
              title="Cetak & Ekspor"
            >
              🖨️
            </button>
            
            <div style={{ position: "relative" }}>
              <button 
                onClick={() => setSettingsDropdownOpen(!settingsDropdownOpen)}
                className="btn btn-secondary"
                style={{ width: "auto", padding: "6px 8px", fontSize: "0.9rem", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}
                title="Lainnya"
              >
                ⋮
              </button>
              
              {settingsDropdownOpen && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "8px",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-lg)",
                  zIndex: 100,
                  width: "max-content",
                  minWidth: "220px",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden"
                }}>
                  <div 
                    onClick={() => { setSettingsDropdownOpen(false); setPanduanActiveTab("komponen"); setPanduanModalOpen(true); }}
                    style={{ padding: "12px 16px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    📖 Panduan Penggunaan
                  </div>
                  <div 
                    onClick={() => { setSettingsDropdownOpen(false); setAdvancedToolsModalOpen(true); }}
                    style={{ padding: "12px 16px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "10px", color: "var(--text-primary)" }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    🧪 Fitur Lanjutan (Eksperimental)
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {settingsDropdownOpen && (
            <div 
              style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
              onClick={() => setSettingsDropdownOpen(false)}
            />
          )}
        </div>

        {(kelas.siswa.length > 0 || kelas.kolomNilai.length > 0) ? (
          <div className="table-container" style={{ margin: 0, borderRadius: 0, borderRight: "none", borderLeft: "none", maxHeight: "70vh", overflowY: "auto", overflowX: "auto" }}>
            {(() => {
              const hasGroups = kelas.kolomNilai.some(col => col.isGroup && col.subKolom?.length > 0);
              return (
                <table className="premium-table" style={{ width: "100%", minWidth: "800px" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 20 }}>
                    <tr>
                      <th className="mobile-hide" rowSpan={hasGroups ? 2 : 1} style={{ width: "50px", minWidth: "50px", textAlign: "center", position: "sticky", top: 0, backgroundColor: "var(--bg-tertiary)", zIndex: 23 }}>
                        <input
                          type="checkbox"
                          checked={kelas.siswa.length > 0 && selectedNisns.length === kelas.siswa.length}
                          onChange={handleSelectAllStudents}
                          style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        />
                      </th>
                      <th className="mobile-hide" rowSpan={hasGroups ? 2 : 1} style={{ width: "40px", minWidth: "40px", textAlign: "center", position: "sticky", top: 0, backgroundColor: "var(--bg-tertiary)", zIndex: 21 }}>
                        No
                      </th>
                      <th className="mobile-hide" rowSpan={hasGroups ? 2 : 1} style={{ width: "140px", minWidth: "140px", cursor: "pointer", userSelect: "none", position: "sticky", top: 0, backgroundColor: "var(--bg-tertiary)", zIndex: 21 }} onClick={() => handleSort('nisn')}>
                        NISN {sortConfig.key === 'nisn' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                      </th>
                      <th className="sticky-nama" rowSpan={hasGroups ? 2 : 1} style={{ position: "sticky", left: 0, top: 0, zIndex: 22, backgroundColor: "var(--bg-tertiary)", boxShadow: "4px 0 8px rgba(0,0,0,0.05)", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort('nama')}>
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

                      {/* Optional Dedicated Column for Star Bonus */}
                      {kelas.skemaPenilaian?.enableBonusStars && (
                        <th rowSpan={hasGroups ? 2 : 1} style={{ textAlign: "center", width: "95px", minWidth: "95px", backgroundColor: "var(--bg-tertiary)", position: "sticky", top: 0, zIndex: 21 }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontWeight: "700", color: "#d97706" }}>⭐ Bonus</span>
                          </div>
                        </th>
                      )}

                      <th rowSpan={hasGroups ? 2 : 1} style={{ textAlign: "center", width: "140px", backgroundColor: "var(--bg-tertiary)", cursor: "pointer", userSelect: "none", position: "sticky", top: 0, zIndex: 21 }} onClick={() => handleSort('finalScore')}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
                          <span>N. AKHIR {sortConfig.key === 'finalScore' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
                          <button 
                            onClick={handleTogglePublish}
                            disabled={kelas.archived || isLocked}
                            className={`btn ${kelas.isNilaiAkhirGenerated ? "btn-secondary" : "btn-primary"}`}
                            style={{ 
                              padding: "4px 8px", 
                              fontSize: "0.65rem",
                              borderColor: kelas.isNilaiAkhirGenerated ? "var(--border-color)" : "transparent",
                              color: kelas.isNilaiAkhirGenerated ? "var(--text-primary)" : "#fff",
                              width: "100%",
                              whiteSpace: "nowrap",
                              opacity: (kelas.archived || isLocked) ? 0.5 : 1,
                              cursor: (kelas.archived || isLocked) ? "not-allowed" : "pointer"
                            }}
                          >
                            {kelas.isNilaiAkhirGenerated ? "🔒 Batalkan" : "🚀 Tampilkan"}
                          </button>
                        </div>
                      </th>
                      <th rowSpan={hasGroups ? 2 : 1} style={{ textAlign: "center", width: "180px", minWidth: "180px", position: "sticky", top: 0, backgroundColor: "var(--bg-tertiary)", zIndex: 21 }}>Aksi</th>
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
                    sortedStudents.map((student, idx) => {
                      
                      // Nilai akhir sudah dihitung di useMemo
                      const finalScore = student.finalScore;
                      const isSelesai = student.isSelesai;
                      const jumlahAspekTerisi = student.jumlahAspekTerisi;

                  return (
                    <Fragment key={student.nisn}>
                      <tr style={{ backgroundColor: idx % 2 === 0 ? "var(--bg-secondary)" : "var(--bg-primary)" }}>
                        <td className="mobile-hide" style={{ width: "50px", minWidth: "50px", textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={selectedNisns.includes(student.nisn)}
                            onChange={() => handleSelectStudent(student.nisn)}
                            style={{ cursor: "pointer", width: "16px", height: "16px" }}
                          />
                        </td>
                        <td className="mobile-hide" style={{ width: "40px", minWidth: "40px", textAlign: "center", color: "var(--text-secondary)", fontWeight: "bold" }}>
                          {idx + 1}
                        </td>
                        <td className="mobile-hide" style={{ width: "140px", minWidth: "140px", fontFamily: "monospace", fontSize: "0.85rem", fontWeight: "600" }}>
                          {student.nisn}
                        </td>
                        <td 
                          className={`sticky-nama ${isNamaColumnExpanded ? 'expanded-active' : ''}`}
                          onClick={toggleNamaExpand}
                          title="Klik untuk melihat nama lengkap"
                          style={{ fontWeight: "600", position: "sticky", left: 0, zIndex: 5, backgroundColor: idx % 2 === 0 ? "var(--bg-secondary)" : "var(--bg-primary)", boxShadow: "4px 0 8px rgba(0,0,0,0.05)", cursor: "pointer" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", overflow: "hidden" }}>
                            <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", width: "100%", display: "block" }}>{formatNameForMobile(student.nama, isNamaColumnExpanded)}</span>
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
                                    onPaste={(e) => handleGradePaste(e, student.nisn, sub.id)}
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
                                    disabled={kelas.archived || isLocked}
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
                                      transition: "all 0.15s ease",
                                      cursor: (kelas.archived || isLocked) ? "not-allowed" : "text"
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

                        {/* Optional Dedicated Cell for Star Bonus (Bonus Keaktifan) */}
                        {kelas.skemaPenilaian?.enableBonusStars && (
                          <td style={{ textAlign: "center", backgroundColor: "rgba(245, 158, 11, 0.03)", padding: "6px 8px" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "2px", justifyContent: "center" }}>
                              {getStudentTotalStars(student) > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickRemoveStar(student);
                                  }}
                                  style={{
                                    background: "rgba(239, 68, 68, 0.12)",
                                    border: "1px solid rgba(239, 68, 68, 0.4)",
                                    borderRadius: "6px",
                                    padding: "1px 5px",
                                    cursor: "pointer",
                                    fontSize: "0.75rem",
                                    fontWeight: "800",
                                    color: "#dc2626",
                                    lineHeight: "1"
                                  }}
                                  title="Kurangi 1 Bonus (-1 ⭐)"
                                >
                                  -
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAddStar(student);
                                }}
                                style={{
                                  background: "rgba(245, 158, 11, 0.15)",
                                  border: "1px solid rgba(245, 158, 11, 0.4)",
                                  borderRadius: "6px",
                                  padding: "2px 8px",
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                  fontWeight: "700",
                                  color: "#d97706",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px"
                                }}
                                title="Tambah 1 Bonus (+1 ⭐ = +1 Poin)"
                              >
                                ⭐ {getStudentTotalStars(student) > 0 ? getStudentTotalStars(student) : "+"}
                              </button>
                            </div>
                          </td>
                        )}

                        {/* Weighted Final Score */}
                        <td 
                          onClick={() => {
                            if (kelas.isNilaiAkhirGenerated && !kelas.archived && !isLocked) {
                              setKatrolSiswa(student);
                              setKatrolValue(student.nilai?._katrol !== undefined && student.nilai?._katrol !== null ? student.nilai._katrol.toString() : "");
                              setKatrolMultiSiswa([]);
                              setKatrolShowMulti(false);
                              setKatrolModalOpen(true);
                            }
                          }}
                          style={{ 
                            textAlign: "center", 
                            fontWeight: "800", 
                            color: kelas.isNilaiAkhirGenerated ? "var(--primary)" : "var(--text-muted)", 
                            backgroundColor: "rgba(59,130,246,0.02)", 
                            padding: "10px 12px",
                            cursor: (kelas.isNilaiAkhirGenerated && !kelas.archived && !isLocked) ? "pointer" : "default",
                            position: "relative"
                          }}
                          title={(kelas.isNilaiAkhirGenerated && !kelas.archived && !isLocked) ? "Klik untuk penyesuaian nilai akhir (Katrol Rahasia)" : ""}
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
                            <button 
                              onClick={() => handlePrintStudentKHS(student)} 
                              className="btn btn-secondary" 
                              style={{ padding: "6px 8px", fontSize: "0.75rem" }} 
                              title="Cetak KHS / Rapor Bayangan PDF"
                            >
                              🖨️
                            </button>
                            <button 
                              onClick={() => handleOpenEditSiswa(student)} 
                              className="btn btn-secondary" 
                              style={{ padding: "6px 8px", fontSize: "0.75rem", opacity: (kelas.archived || isLocked) ? 0.5 : 1, cursor: (kelas.archived || isLocked) ? "not-allowed" : "pointer" }} 
                              title={(kelas.archived || isLocked) ? "Tidak dapat mengedit" : "Edit Profil Siswa"}
                              disabled={kelas.archived || isLocked}
                            >
                              <div style={{ display: "flex", alignItems: "center" }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </div>
                            </button>
                            <button
                              onClick={() => {
                                setCatatanSiswaTerpilih(student);
                                setCatatanDraft(prev => ({
                                  ...prev,
                                  [student.nisn]: student.catatan || ""
                                }));
                              }}
                              className="btn btn-secondary"
                              style={{ 
                                padding: "6px 8px", 
                                fontSize: "0.75rem",
                                background: student.catatan ? "rgba(245, 158, 11, 0.12)" : "var(--bg-secondary)",
                                borderColor: student.catatan ? "rgba(245, 158, 11, 0.4)" : "var(--border-color)",
                                color: student.catatan ? "var(--warning)" : "var(--text-secondary)",
                                position: "relative"
                              }}
                              title={student.catatan ? "Lihat/Edit Catatan Guru (Ada Catatan)" : "Tambah Catatan Guru"}
                            >
                              ✏️
                              {student.catatan && (
                                <span style={{ position: "absolute", top: "-3px", right: "-3px", width: "7px", height: "7px", backgroundColor: "var(--warning)", borderRadius: "50%", border: "1px solid var(--bg-secondary)" }}></span>
                              )}
                            </button>
                            <button 
                              onClick={() => handleDeleteSiswa(student.nisn, student.nama)} 
                              className="btn btn-secondary" 
                              style={{ padding: "6px 8px", fontSize: "0.75rem", color: "var(--danger)", opacity: (kelas.archived || isLocked) ? 0.5 : 1, cursor: (kelas.archived || isLocked) ? "not-allowed" : "pointer" }} 
                              title={(kelas.archived || isLocked) ? "Tidak dapat menghapus" : "Hapus Siswa"}
                              disabled={kelas.archived || isLocked}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>

                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7 + kelas.kolomNilai.reduce((sum, col) => sum + (col.isGroup && col.subKolom?.length > 0 ? col.subKolom.length : 1), 0)} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontStyle: "italic" }}>
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
        Belum ada siswa dan komponen nilai di kelas ini. Silakan atur komponen nilai atau tambah siswa terlebih dahulu.
      </div>
    )}
      {/* Advanced Tools & Settings Modal */}
      <AdvancedToolsModal
        isOpen={advancedToolsModalOpen}
        onClose={() => setAdvancedToolsModalOpen(false)}
        kelas={kelas}
        isLocked={isLocked}
        onOpenNormModal={() => setNormModalOpen(true)}
        onOpenRemedialModal={(col) => {
          setSelectedRemedialKolom(col);
          setRemedialModalOpen(true);
        }}
        onToggleBonusStars={handleToggleEnableBonusStars}
        onUpdateSkema={(newSkema) => {
          const updatedSkema = {
            ...(kelas.skemaPenilaian || {}),
            ...newSkema
          };
          setKelas(prev => ({ ...prev, skemaPenilaian: updatedSkema }));
          fetch(`/api/kelas/${classId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ skemaPenilaian: updatedSkema })
          });
        }}
      />

      </div>



      </>
      )}
      </div>

      {/* Bulk Action Bar */}
      {mounted && selectedNisns.length > 0 && typeof document !== "undefined" && createPortal(
        <div
          className="no-print animate-fade-in"
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "20px",
            padding: "12px 24px",
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 0 40px rgba(59, 130, 246, 0.3)",
            zIndex: 9999,
            color: "#fff",
            width: "calc(100% - 32px)",
            maxWidth: "680px",
          }}
        >
          <span style={{ fontSize: "0.95rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
            📋 {selectedNisns.length} Siswa Terpilih
          </span>
          
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <select
              style={{
                backgroundColor: "rgba(30, 41, 59, 0.9)",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "0.85rem",
                cursor: isLocked ? "not-allowed" : "pointer",
                outline: "none",
                maxWidth: "200px"
              }}
              disabled={isLocked}
              defaultValue=""
              onChange={(e) => {
                const targetId = e.target.value;
                if (targetId) {
                  handleBulkTransferStudents(targetId);
                  e.target.value = "";
                }
              }}
            >
              <option value="" disabled>🔄 Pindahkan ke kelas...</option>
              {availableClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama} ({c.mataPelajaran})
                </option>
              ))}
            </select>

            <button
              onClick={handleBulkDeleteStudents}
              disabled={isLocked}
              className="btn btn-primary"
              style={{
                backgroundColor: "var(--danger)",
                borderColor: "transparent",
                color: "#fff",
                padding: "8px 16px",
                fontSize: "0.85rem",
                fontWeight: "700",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: isLocked ? "not-allowed" : "pointer",
              }}
            >
              🗑️ Hapus Massal
            </button>
            <button
              onClick={() => setSelectedNisns([])}
              className="btn btn-secondary"
              style={{
                padding: "8px 16px",
                fontSize: "0.85rem",
                fontWeight: "600",
                borderRadius: "8px",
                color: "#ccc",
                borderColor: "rgba(255, 255, 255, 0.2)",
                backgroundColor: "transparent",
              }}
            >
              Batal
            </button>
          </div>
        </div>,
        document.body
      )}

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
                       <div style={{ flex: 1, fontSize: "1.1rem", fontWeight: "700", color: "#e2e8f0" }}>Lulus (≥ {kelas?.skemaPenilaian?.kkm !== undefined && kelas?.skemaPenilaian?.kkm !== null && kelas?.skemaPenilaian?.kkm !== "" ? kelas.skemaPenilaian.kkm : "Belum Diatur ⚠️"})</div>
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
           
           {/* Radar Chart: Rata-rata per Komponen */}
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
                             <div style={{ fontSize: "2.5rem", fontWeight: "900", lineHeight: 1, color: (kelas?.skemaPenilaian?.kkm !== undefined && kelas?.skemaPenilaian?.kkm !== null && kelas?.skemaPenilaian?.kkm !== "" && aspect.avg >= kelas.skemaPenilaian.kkm) ? "#10b981" : "#f43f5e" }}>
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

              {isEditingSiswa && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Pindahkan ke Kelas Lain (Opsional)</label>
                  <select
                    className="form-input"
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
                  >
                    <option value="">-- Tetap di kelas saat ini --</option>
                    {availableClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama} - {c.mataPelajaran} ({c.tahunAjaran})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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




      {/* MODAL: ROMBEL SELECTION */}
      {rombelSelectModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "480px", display: "flex", flexDirection: "column", gap: "16px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <span style={{ fontSize: "1.5rem" }}>👥</span>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--primary)", margin: 0 }}>Pilih Rombongan Belajar</h3>
            </div>
            
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              File Excel/Dapodik yang Anda unggah mengandung data siswa dari <strong>beberapa kelas sekaligus</strong> ({availableRombels.length} rombel terdeteksi).
              <br/><br/>
              Anda saat ini sedang mengimpor ke kelas <strong style={{ color: "var(--text-primary)" }}>{kelas.nama}</strong>. Silakan pilih satu rombel yang datanya ingin diekstrak:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)" }}>Pilih Rombel / Kelas:</label>
              <select 
                value={selectedRombelFilter}
                onChange={(e) => setSelectedRombelFilter(e.target.value)}
                className="form-input"
                style={{ fontSize: "0.9rem", padding: "10px" }}
              >
                {availableRombels.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
              <button 
                onClick={() => setRombelSelectModalOpen(false)} 
                className="btn btn-secondary"
                style={{ padding: "8px 16px", fontSize: "0.85rem" }}
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  const filtered = tempParsedSiswa.filter(s => s.rombel === selectedRombelFilter);
                  setPreviewList(filtered);
                  setRombelSelectModalOpen(false);
                  setPreviewModalOpen(true);
                }} 
                className="btn btn-primary"
                style={{ padding: "8px 24px", fontSize: "0.85rem", fontWeight: "700" }}
              >
                Lanjutkan Ekstrak &rarr;
              </button>
            </div>
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

            {importWarnings.length > 0 && (
              <div style={{
                maxHeight: "130px",
                overflowY: "auto",
                backgroundColor: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                fontSize: "0.8rem",
                color: "var(--text-primary)",
                display: "flex",
                flexDirection: "column",
                gap: "6px"
              }}>
                <strong style={{ color: "var(--warning)" }}>⚠️ Pemberitahuan: {importWarnings.length} siswa tidak berhasil ditambahkan karena data tidak lengkap:</strong>
                <ul style={{ paddingLeft: "16px", margin: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                  {importWarnings.map((warn, idx) => (
                    <li key={idx}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}

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
                  {importing ? (
                    <>
                      <span className="btn-spinner" />
                      Mengimpor...
                    </>
                  ) : (
                    "✅ Konfirmasi Impor"
                  )}
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

        .sticky-nama {
          position: sticky !important;
          left: 0 !important;
          max-width: 150px !important;
          min-width: 150px !important;
          width: 150px !important;
          font-size: 0.88rem !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          box-shadow: 4px 0 8px rgba(0,0,0,0.08) !important;
          z-index: 10 !important;
          transition: all 0.2s ease;
          border-right: 2px solid var(--border-color) !important;
          padding-right: 16px !important;
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
        
        .sticky-nama.expanded-active span {
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }

        th.sticky-nama {
          background-color: var(--bg-tertiary) !important;
          z-index: 30 !important;
        }

        @media (max-width: 768px) {
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
          .mobile-hide {
            display: none !important;
          }
          
          .sticky-nama {
            max-width: 80px !important;
            min-width: 80px !important;
            width: 80px !important;
            left: 0 !important; /* Force to left edge */
            font-size: 0.7rem !important;
            padding: 8px 6px !important;
          }
          
          .sticky-nama.expanded-active {
            max-width: 140px !important;
            min-width: 140px !important;
            width: 140px !important;
          }
          .presensi-stats-grid {
            grid-template-columns: repeat(2, 1fr);
            padding: 0 16px;
            gap: 8px;
          }
          .presensi-accum-card {
            grid-column: span 2;
          }
          .presensi-stats-card {
            padding: 10px 12px;
            gap: 8px;
          }
          .presensi-stats-card > div:first-child {
            font-size: 1.4rem !important;
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

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Pilih kelas sumber untuk menyalin konfigurasi komponen dan bobotnya. Tindakan ini akan <b style={{color: "var(--danger)"}}>meniban dan menghapus</b> komponen yang ada di tabel saat ini.</p>

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

      {/* Apply to Other Classes Modal */}
      {applyToOtherModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050, padding: "16px" }}>
          <div className="glass-card" style={{ width: "100%", maxWidth: "520px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px", maxHeight: "90vh", overflow: "hidden", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  📤 Terapkan ke Kelas Lain
                </h3>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "4px", margin: 0 }}>
                  Salin & terapkan konfigurasi komponen dan bobot dari kelas ini ke beberapa kelas sekaligus.
                </p>
              </div>
              <button 
                onClick={() => setApplyToOtherModalOpen(false)} 
                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}
                disabled={isApplyingToOther}
              >
                ✕
              </button>
            </div>

            {/* Info Sumber */}
            <div style={{ backgroundColor: "var(--bg-tertiary)", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Kelas Asal</span>
                <h4 style={{ fontSize: "0.95rem", fontWeight: "800", margin: "2px 0 0 0", color: "var(--primary)" }}>{kelas?.nama}</h4>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "var(--text-primary)" }}>{kelas?.kolomNilai?.length || 0} Komponen Nilai</span>
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "block" }}>Total Bobot: {totalBobot}%</span>
              </div>
            </div>

            {/* Search & Toggle All */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="🔍 Cari nama kelas..." 
                  value={applySearchQuery} 
                  onChange={(e) => setApplySearchQuery(e.target.value)}
                  style={{ flex: 1, padding: "6px 12px", fontSize: "0.82rem" }}
                />
                {!fetchingClasses && availableClasses.length > 0 && (
                  <button
                    onClick={() => {
                      const filtered = availableClasses.filter(c => c.nama.toLowerCase().includes(applySearchQuery.toLowerCase()) || (c.mataPelajaran || "").toLowerCase().includes(applySearchQuery.toLowerCase()));
                      const filteredIds = filtered.map(c => c.id);
                      const allSelected = filteredIds.every(id => applySelectedClassIds.includes(id));
                      if (allSelected) {
                        setApplySelectedClassIds(applySelectedClassIds.filter(id => !filteredIds.includes(id)));
                      } else {
                        setApplySelectedClassIds(Array.from(new Set([...applySelectedClassIds, ...filteredIds])));
                      }
                    }}
                    style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.78rem", fontWeight: "700", cursor: "pointer", padding: "4px 8px", whiteSpace: "nowrap" }}
                  >
                    {availableClasses
                      .filter(c => c.nama.toLowerCase().includes(applySearchQuery.toLowerCase()) || (c.mataPelajaran || "").toLowerCase().includes(applySearchQuery.toLowerCase()))
                      .every(c => applySelectedClassIds.includes(c.id)) ? "Batal Semua" : "Pilih Semua"}
                  </button>
                )}
              </div>

              {/* Class List Multi-select */}
              <div style={{ maxHeight: "240px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", padding: "8px" }}>
                {fetchingClasses ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
                    <span className="spinner" style={{ width: "24px", height: "24px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
                  </div>
                ) : availableClasses.length === 0 ? (
                  <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", padding: "20px", margin: 0 }}>Belum ada kelas lain yang tersedia.</p>
                ) : (
                  availableClasses
                    .filter(c => c.nama.toLowerCase().includes(applySearchQuery.toLowerCase()) || (c.mataPelajaran || "").toLowerCase().includes(applySearchQuery.toLowerCase()))
                    .map(c => {
                      const isChecked = applySelectedClassIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "8px 12px",
                            borderRadius: "var(--radius-sm)",
                            cursor: "pointer",
                            border: `1px solid ${isChecked ? "var(--primary)" : "var(--border-color)"}`,
                            backgroundColor: isChecked ? "rgba(59,130,246,0.08)" : "var(--bg-secondary)",
                            transition: "all 0.15s ease"
                          }}
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setApplySelectedClassIds(applySelectedClassIds.filter(id => id !== c.id));
                              } else {
                                setApplySelectedClassIds([...applySelectedClassIds, c.id]);
                              }
                            }}
                            style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--primary)" }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <h4 style={{ fontSize: "0.88rem", fontWeight: "700", margin: 0 }}>{c.nama}</h4>
                              <span className="badge" style={{ fontSize: "0.68rem", backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                                {c.siswa?.length || 0} Siswa
                              </span>
                            </div>
                            <p style={{ fontSize: "0.73rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                              {c.mataPelajaran || "Umum"} &bull; {c.kolomNilai?.length || 0} Komponen Saat Ini
                            </p>
                          </div>
                        </label>
                      );
                    })
                )}
              </div>
            </div>

            {/* Note & Footer Buttons */}
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic", lineHeight: 1.4 }}>
              *Komponen baru akan ditambahkan tanpa menghapus komponen yang sudah ada di kelas tujuan.
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "14px", marginTop: "4px" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: "700", color: applySelectedClassIds.length > 0 ? "var(--primary)" : "var(--text-muted)" }}>
                {applySelectedClassIds.length > 0 ? `+${applySelectedClassIds.length} Kelas Dipilih` : "Belum ada kelas dipilih"}
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  onClick={() => setApplyToOtherModalOpen(false)} 
                  className="btn btn-secondary" 
                  style={{ padding: "8px 14px", fontSize: "0.82rem" }}
                  disabled={isApplyingToOther}
                >
                  Batal
                </button>
                <button
                  onClick={handleApplyToOtherClasses}
                  className="btn btn-primary"
                  style={{ padding: "8px 16px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}
                  disabled={applySelectedClassIds.length === 0 || isApplyingToOther}
                >
                  {isApplyingToOther ? (
                    <>
                      <span className="btn-spinner" />
                      Menerapkan...
                    </>
                  ) : (
                    <>🚀 Terapkan ke {applySelectedClassIds.length} Kelas</>
                  )}
                </button>
              </div>
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
                  <h4 style={{ fontSize: "1.05rem", fontWeight: "700", marginBottom: "4px", color: "var(--text-primary)" }}>Atur Komponen Nilai</h4>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                    Scroll ke bagian bawah dan klik <strong>"⚙️ Atur Komponen & Bobot Nilai"</strong>. Tentukan kolom penilaian (misal: UTS, UAS, Tugas) beserta persentase bobotnya hingga total 100%.
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
                    Setelah komponen dan siswa siap, Anda bisa langsung mengetikkan nilai di tabel buku nilai. Semua perubahan akan tersimpan secara otomatis.
                  </p>
                </div>
              </div>

            </div>

            {/* Action */}
            <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
              <button 
                onClick={() => setOnboardingModalOpen(false)}
                className="btn btn-secondary" 
                style={{ flex: 1, padding: "14px", fontSize: "0.9rem", borderRadius: "var(--radius-md)", justifyContent: "center" }}
              >
                Nanti Saja
              </button>
              <button 
                onClick={() => {
                  setOnboardingModalOpen(false);
                  handleOpenKolomModal();
                  const configCard = document.getElementById("konfigurasi-kelas");
                  if (configCard) {
                    configCard.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="btn btn-primary" 
                style={{ flex: 2, padding: "14px", fontSize: "1rem", borderRadius: "var(--radius-md)", justifyContent: "center", boxShadow: "0 4px 15px var(--primary-glow)" }}
              >
                Mulai Atur Komponen 🚀
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
                  <label htmlFor="gunakanPresensi" style={{ fontWeight: "700", fontSize: "1rem", cursor: "pointer", color: "var(--text-primary)" }}>Gunakan Presensi sebagai Komponen Nilai Akhir</label>
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
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Saran: Jika bobot presensi 10%, pastikan sisa 90% dibagi ke komponen akademik lainnya agar total pas 100%.</span>
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
                {isSavingPresensi ? (
                  <>
                    <span className="btn-spinner" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Pengaturan"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tambah/Edit Pertemuan Modal */}
      {pertemuanModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px", backdropFilter: "blur(6px)" }}>
          <div className="glass-card" style={{ width: "100%", maxWidth: "500px", padding: "28px", display: "flex", flexDirection: "column", gap: "20px", border: "1px solid rgba(255, 255, 255, 0.08)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "14px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
                {isEditingPertemuan ? "✏️ Edit Pertemuan" : "📅 Tambah Pertemuan Baru"}
              </h3>
              <button onClick={() => setPertemuanModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "var(--text-muted)", transition: "color 0.2s" }} onMouseEnter={(e) => e.target.style.color = "var(--text-primary)"} onMouseLeave={(e) => e.target.style.color = "var(--text-muted)"}>✕</button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-secondary)" }}>Nama Pertemuan</label>
                  <input
                    type="text"
                    value={pertemuanNama}
                    onChange={(e) => setPertemuanNama(e.target.value)}
                    className="input-field"
                    placeholder="Contoh: Pertemuan 1"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      fontSize: "0.9rem",
                      outline: "none"
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-secondary)" }}>Tanggal Pertemuan</label>
                  <input
                    type="date"
                    value={pertemuanTanggal}
                    onChange={(e) => setPertemuanTanggal(e.target.value)}
                    className="input-field"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      fontSize: "0.9rem",
                      outline: "none"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-secondary)" }}>Materi Pembelajaran <span style={{ fontWeight: "500", color: "var(--text-muted)" }}>(Opsional)</span></label>
                <input
                  type="text"
                  value={pertemuanMateri}
                  onChange={(e) => setPertemuanMateri(e.target.value)}
                  className="input-field"
                  placeholder="Contoh: Pendahuluan Algoritma"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    outline: "none"
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-secondary)" }}>Kegiatan Pembelajaran <span style={{ fontWeight: "500", color: "var(--text-muted)" }}>(Opsional)</span></label>
                <textarea
                  value={pertemuanKegiatan}
                  onChange={(e) => setPertemuanKegiatan(e.target.value)}
                  className="input-field"
                  placeholder="Contoh: Diskusi kelompok dan latihan coding dasar..."
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    outline: "none",
                    resize: "vertical"
                  }}
                />
              </div>

              {isEditingPertemuan ? (
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "14px", marginTop: "4px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-secondary)" }}>⚡ Presensi Massal Cepat (Bulk)</label>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>Ubah status kehadiran seluruh siswa di pertemuan ini secara serentak.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "6px", marginTop: "4px" }}>
                    {[
                      { val: 'H', label: 'Hadir', bg: 'var(--success)', color: '#ffffff', border: 'var(--success)' },
                      { val: 'I', label: 'Izin', bg: 'var(--warning)', color: '#ffffff', border: 'var(--warning)' },
                      { val: 'S', label: 'Sakit', bg: 'var(--primary)', color: '#ffffff', border: 'var(--primary)' },
                      { val: 'D', label: 'Dispensasi', bg: '#8b5cf6', color: '#ffffff', border: '#8b5cf6' },
                      { val: 'A', label: 'Alpha', bg: 'var(--danger)', color: '#ffffff', border: 'var(--danger)' },
                      { val: '', label: 'Kosong', bg: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: 'var(--border-color)' }
                    ].map(item => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => {
                          triggerConfirm(
                            `Apakah Anda yakin ingin mengubah status kehadiran SEMUA siswa di "${pertemuanNama}" menjadi "${item.label}"?`,
                            () => {
                              handleBulkPresensi(selectedPertemuanId, item.val);
                            },
                            {
                              title: "Presensi Massal",
                              confirmText: "Ya, Ubah",
                              isDanger: false
                            }
                          );
                        }}
                        className="btn"
                        style={{
                          padding: "8px 4px",
                          fontSize: "0.75rem",
                          fontWeight: "800",
                          backgroundColor: item.bg,
                          border: `1px solid ${item.border}`,
                          color: item.color,
                          cursor: "pointer",
                          borderRadius: "var(--radius-sm)",
                          textAlign: "center",
                          transition: "filter 0.2s"
                        }}
                        onMouseEnter={(e) => e.target.style.filter = "brightness(1.15)"}
                        onMouseLeave={(e) => e.target.style.filter = "none"}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "14px", marginTop: "4px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-secondary)" }}>⚡ Set Kehadiran Awal Siswa (Bulk)</label>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>Pilih status kehadiran default untuk seluruh siswa saat pertemuan ini pertama kali dibuat.</p>
                  <select
                    value={defaultBulkStatus}
                    onChange={(e) => setDefaultBulkStatus(e.target.value)}
                    className="input-field"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      fontSize: "0.9rem",
                      appearance: "auto",
                      outline: "none",
                      cursor: "pointer"
                    }}
                  >
                    <option value="">∅ Kosongkan (Default / Isi Manual)</option>
                    <option value="H">🟢 Hadir (Semua)</option>
                    <option value="I">🟡 Izin (Semua)</option>
                    <option value="S">🔵 Sakit (Semua)</option>
                    <option value="D">🟣 Dispensasi (Semua)</option>
                    <option value="A">🔴 Alpha (Semua)</option>
                  </select>
                </div>
              )}
            </div>
            
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: "14px", marginTop: "4px" }}>
              <button type="button" onClick={() => setPertemuanModalOpen(false)} className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>Batal</button>
              <button 
                type="button"
                onClick={handleSavePertemuan} 
                className="btn btn-primary"
                disabled={isSavingPertemuan || !pertemuanNama.trim() || !pertemuanTanggal}
                style={{ padding: "8px 20px", fontSize: "0.85rem" }}
              >
                {isSavingPertemuan ? (
                  <>
                    <span className="btn-spinner" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan"
                )}
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

      <QrScannerModal
        isOpen={qrModalOpen}
        onClose={() => {
          setQrModalOpen(false);
          fetchClassDetail();
        }}
        kelas={kelas}
        onMarkPresence={handleQrMarkPresence}
      />

      <QrCardGeneratorModal
        isOpen={qrCardModalOpen}
        onClose={() => setQrCardModalOpen(false)}
        kelas={kelas}
      />

      {/* ============= MODAL HUB: KELOLA DATA SISWA ============= */}
      {kelolaSiswaModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "16px" }}>
          <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "520px", display: "flex", flexDirection: "column", padding: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.3rem" }}>📊</span>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "800", color: "var(--primary)", margin: 0 }}>Kelola Data Siswa</h3>
              </div>
              <button onClick={() => setKelolaSiswaModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-secondary)", padding: "4px", margin: "16px 24px 0 24px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <button
                onClick={() => setKelolaSiswaTab('tambah')}
                style={{
                  flex: 1, padding: "8px", fontSize: "0.8rem", fontWeight: "700", borderRadius: "6px", border: "none", cursor: "pointer", transition: "all 0.15s",
                  backgroundColor: kelolaSiswaTab === 'tambah' ? "var(--primary)" : "transparent",
                  color: kelolaSiswaTab === 'tambah' ? "#fff" : "var(--text-secondary)"
                }}
              >
                👤 Tambah
              </button>
              <button
                onClick={() => setKelolaSiswaTab('impor')}
                style={{
                  flex: 1, padding: "8px", fontSize: "0.8rem", fontWeight: "700", borderRadius: "6px", border: "none", cursor: "pointer", transition: "all 0.15s",
                  backgroundColor: kelolaSiswaTab === 'impor' ? "var(--primary)" : "transparent",
                  color: kelolaSiswaTab === 'impor' ? "#fff" : "var(--text-secondary)"
                }}
              >
                📤 Impor
              </button>
              <button
                onClick={() => setKelolaSiswaTab('sync')}
                style={{
                  flex: 1, padding: "8px", fontSize: "0.8rem", fontWeight: "700", borderRadius: "6px", border: "none", cursor: "pointer", transition: "all 0.15s",
                  backgroundColor: kelolaSiswaTab === 'sync' ? "var(--primary)" : "transparent",
                  color: kelolaSiswaTab === 'sync' ? "#fff" : "var(--text-secondary)"
                }}
              >
                🔄 Sinkronisasi
              </button>
            </div>

            {/* Tab Content */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px", minHeight: "180px", justifyContent: "space-between" }}>
              {kelolaSiswaTab === 'tambah' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: "600", lineHeight: "1.5" }}>
                    Input Manual (Satu per Satu)
                  </p>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                    Cocok jika Anda hanya ingin menambahkan 1 atau 2 siswa susulan. Jika Anda ingin memasukkan 1 kelas penuh (misal 30+ siswa), sangat disarankan beralih ke tab <strong>Impor</strong>.
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                    <button
                      onClick={() => {
                        setKelolaSiswaModalOpen(false);
                        handleOpenAddSiswa();
                      }}
                      className="btn btn-primary"
                      style={{ padding: "10px 24px", fontSize: "0.85rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}
                      disabled={isLocked}
                    >
                      👤 Tambah Siswa Baru
                    </button>
                  </div>
                </div>
              )}


              {kelolaSiswaTab === 'impor' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                    Unggah daftar nama siswa secara massal. Anda bisa langsung mengunggah file <strong>Dapodik</strong> yang Anda miliki, atau format <strong>Excel / CSV</strong> buatan sendiri dengan minimal kolom berikut:
                  </p>
                  <div style={{ backgroundColor: "var(--bg-tertiary)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "0.8rem", color: "var(--text-primary)" }}>
                    <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <li><strong>Nama</strong> (Nama Lengkap Siswa) - <em>Wajib</em></li>
                      <li><strong>NISN</strong> (Nomor Induk Siswa Nasional) - <em style={{color: "var(--primary)"}}>Opsional (Jika kosong, dibuat otomatis)</em></li>
                      <li><strong>Tanggal Lahir</strong> (Format Bebas) - <em>Opsional</em></li>
                    </ul>
                    <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "1.2rem" }}>💡</span>
                      <span style={{ color: "var(--text-secondary)" }}>Bingung dengan formatnya? <button onClick={downloadExcelTemplate} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: "700", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Unduh Template Kosong</button></span>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                    <label
                      className={`btn btn-primary ${isLocked ? "disabled" : ""}`}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "8px",
                        fontSize: "0.85rem", padding: "10px 24px", borderRadius: "8px",
                        cursor: isLocked ? "not-allowed" : "pointer",
                        opacity: isLocked ? 0.5 : 1,
                        margin: 0, fontWeight: "700"
                      }}
                    >
                      <span>📤</span> Unggah Berkas Dapodik / Excel
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          setKelolaSiswaModalOpen(false);
                          handleExcelUpload(e);
                        }}
                        disabled={isLocked}
                      />
                    </label>
                  </div>
                </div>
              )}

              {kelolaSiswaTab === 'sync' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: "600", lineHeight: "1.5" }}>
                    Tarik Data Otomatis
                  </p>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                    Ambil daftar siswa terbaru dari Bank Data Siswa yang dikelola oleh sekolah. Siswa baru yang belum ada di kelas Anda (berdasarkan {kelas?.tingkatan} {kelas?.rombel_nama}) akan langsung dimasukkan tanpa menghapus nilai siswa yang sudah ada.
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                    <button
                      onClick={handleSyncBankData}
                      className={`btn btn-primary ${isSyncingBankData || isLocked ? "disabled" : ""}`}
                      style={{ padding: "10px 24px", fontSize: "0.85rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", cursor: isSyncingBankData || isLocked ? "not-allowed" : "pointer", opacity: isSyncingBankData || isLocked ? 0.5 : 1 }}
                      disabled={isSyncingBankData || isLocked}
                    >
                      {isSyncingBankData ? "⏳ Mensinkronkan..." : "🔄 Tarik dari Bank Data"}
                    </button>
                  </div>
                </div>
              )}


              <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: "14px", marginTop: "12px" }}>
                <button onClick={() => setKelolaSiswaModalOpen(false)} className="btn btn-secondary" style={{ padding: "6px 16px", fontSize: "0.82rem" }}>Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============= MODAL HUB: CETAK & EKSPOR ============= */}
      {cetakEksporModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "16px" }}>
          <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "520px", display: "flex", flexDirection: "column", padding: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.3rem" }}>🖨️</span>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "800", color: "var(--primary)", margin: 0 }}>Cetak & Ekspor</h3>
              </div>
              <button onClick={() => setCetakEksporModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-secondary)", padding: "4px", margin: "16px 24px 0 24px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <button
                onClick={() => setCetakEksporTab('laporan')}
                style={{
                  flex: 1, padding: "8px", fontSize: "0.8rem", fontWeight: "700", borderRadius: "6px", border: "none", cursor: "pointer", transition: "all 0.15s",
                  backgroundColor: cetakEksporTab === 'laporan' ? "var(--primary)" : "transparent",
                  color: cetakEksporTab === 'laporan' ? "#fff" : "var(--text-secondary)"
                }}
              >
                🖨️ Laporan
              </button>
              <button
                onClick={() => setCetakEksporTab('kartu')}
                style={{
                  flex: 1, padding: "8px", fontSize: "0.8rem", fontWeight: "700", borderRadius: "6px", border: "none", cursor: "pointer", transition: "all 0.15s",
                  backgroundColor: cetakEksporTab === 'kartu' ? "var(--primary)" : "transparent",
                  color: cetakEksporTab === 'kartu' ? "#fff" : "var(--text-secondary)"
                }}
              >
                📇 Kartu QR
              </button>
              <button
                onClick={() => setCetakEksporTab('erapor')}
                style={{
                  flex: 1, padding: "8px", fontSize: "0.8rem", fontWeight: "700", borderRadius: "6px", border: "none", cursor: "pointer", transition: "all 0.15s",
                  backgroundColor: cetakEksporTab === 'erapor' ? "var(--primary)" : "transparent",
                  color: cetakEksporTab === 'erapor' ? "#fff" : "var(--text-secondary)"
                }}
              >
                📋 E-Rapor
              </button>
              <button
                onClick={() => setCetakEksporTab('excel')}
                style={{
                  flex: 1, padding: "8px", fontSize: "0.8rem", fontWeight: "700", borderRadius: "6px", border: "none", cursor: "pointer", transition: "all 0.15s",
                  backgroundColor: cetakEksporTab === 'excel' ? "var(--primary)" : "transparent",
                  color: cetakEksporTab === 'excel' ? "#fff" : "var(--text-secondary)"
                }}
              >
                📥 Excel
              </button>
            </div>

            {/* Tab Content */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px", minHeight: "180px", justifyContent: "space-between" }}>
              {cetakEksporTab === 'laporan' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                    Cetak lembar nilai siswa secara fisik atau simpan sebagai dokumen PDF dengan layout rapi dan profesional.
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                    <button
                      onClick={() => {
                        setCetakEksporModalOpen(false);
                        setIsPreviewOpen(true);
                      }}
                      className="btn btn-primary"
                      style={{ padding: "10px 24px", fontSize: "0.85rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}
                    >
                      🖨️ Cetak Lembar Laporan
                    </button>
                  </div>
                </div>
              )}

              {cetakEksporTab === 'kartu' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                    Buat dan cetak kartu presensi siswa yang berisi nama, NISN, dan QR Code unik untuk sistem pemindaian.
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                    <button
                      onClick={() => {
                        setCetakEksporModalOpen(false);
                        setQrCardModalOpen(true);
                      }}
                      className="btn btn-primary"
                      style={{ padding: "10px 24px", fontSize: "0.85rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}
                    >
                      📇 Cetak Kartu Presensi & QR
                    </button>
                  </div>
                </div>
              )}

              {cetakEksporTab === 'erapor' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                    Format dan ekspor nilai kelas langsung ke format data e-Rapor resmi (Kemendikbud).
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                    <button
                      onClick={() => {
                        setCetakEksporModalOpen(false);
                        setRaporModalOpen(true);
                      }}
                      className="btn btn-primary"
                      style={{ padding: "10px 24px", fontSize: "0.85rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}
                      disabled={kelas.kolomNilai.length === 0 || kelas.siswa.length === 0}
                    >
                      📋 Integrasi ke E-Rapor
                    </button>
                  </div>
                </div>
              )}

              {cetakEksporTab === 'excel' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                    Unduh seluruh data siswa beserta nilainya ke dalam format spreadsheet Excel (.xlsx).
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                    <button
                      onClick={() => {
                        setCetakEksporModalOpen(false);
                        downloadExcelTemplate();
                      }}
                      className="btn btn-primary"
                      style={{ padding: "10px 24px", fontSize: "0.85rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}
                    >
                      📥 Ekspor Data ke Excel
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: "14px", marginTop: "12px" }}>
                <button onClick={() => setCetakEksporModalOpen(false)} className="btn btn-secondary" style={{ padding: "6px 16px", fontSize: "0.82rem" }}>Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============= MODAL CATATAN GURU ============= */}
      {catatanSiswaTerpilih && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: "16px" }}>
          <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "550px", display: "flex", flexDirection: "column", gap: "16px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.3rem" }}>📝</span>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "800", color: "var(--primary)", margin: 0 }}>Catatan Perkembangan Siswa</h3>
              </div>
              <button onClick={() => setCatatanSiswaTerpilih(null)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            <div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "12px", lineHeight: "1.4" }}>
                Tulis bimbingan akademik, keterangan ketidakhadiran, atau catatan perkembangan lainnya untuk siswa bernama <strong>{catatanSiswaTerpilih.nama}</strong> (NISN: {catatanSiswaTerpilih.nisn}).
              </p>

              <textarea
                className="form-input"
                placeholder={kelas.archived ? "Kelas diarsipkan, catatan tidak dapat diubah" : "Tulis catatan perkembangan siswa di sini..."}
                value={catatanDraft[catatanSiswaTerpilih.nisn] !== undefined ? catatanDraft[catatanSiswaTerpilih.nisn] : (catatanSiswaTerpilih.catatan || "")}
                onChange={(e) => setCatatanDraft({ ...catatanDraft, [catatanSiswaTerpilih.nisn]: e.target.value })}
                rows={4}
                disabled={kelas.archived}
                style={{ 
                  padding: "12px", 
                  fontSize: "0.9rem", 
                  width: "100%", 
                  borderRadius: "var(--radius-sm)",
                  borderColor: "var(--border-color)",
                  outline: "none",
                  resize: "vertical", 
                  minHeight: "100px", 
                  cursor: kelas.archived ? "not-allowed" : "text" 
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
              <button 
                type="button" 
                onClick={() => setCatatanSiswaTerpilih(null)} 
                className="btn btn-secondary" 
                style={{ padding: "8px 16px", fontSize: "0.85rem" }}
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={() => saveCatatan(catatanSiswaTerpilih.nisn)} 
                className="btn btn-primary"
                disabled={savingCatatan[catatanSiswaTerpilih.nisn] || kelas.archived}
                style={{ padding: "8px 20px", fontSize: "0.85rem" }}
              >
                {savingCatatan[catatanSiswaTerpilih.nisn] ? (
                  <>
                    <span className="btn-spinner" />
                    Menyimpan...
                  </>
                ) : (
                  "💾 Simpan Catatan"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  { id: "komponen", label: "⚖️ Komponen & Bobot" },
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
                {panduanActiveTab === "komponen" && (
                  <>
                    <div>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: "800", marginBottom: "8px", color: "#60a5fa" }}>⚖️ Fitur: Atur Komponen & Bobot Nilai</h4>
                      <p style={{ fontSize: "0.85rem", lineHeight: "1.5", color: "var(--text-secondary)" }}>
                        Fitur ini digunakan untuk mengonfigurasi komponen penilaian mata pelajaran Anda (seperti Tugas, UTS, UAS, atau Kehadiran) lengkap dengan porsi bobot masing-masing komponen. Total keseluruhan bobot wajib berjumlah <strong>100%</strong> agar penilaian dapat dikalkulasi secara valid.
                      </p>
                    </div>
 
                    <div className="panduan-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <h5 style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>📋 Tahapan Penggunaan:</h5>
                        <ol style={{ fontSize: "0.8rem", color: "var(--text-secondary)", paddingLeft: "16px", lineHeight: "1.6", margin: 0 }}>
                          <li>Klik tombol <strong>⚖️ Atur Komponen & Bobot</strong> pada Panel Kontrol.</li>
                          <li>Tentukan nama komponen (misal: "Tugas Mandiri") dan isi bobotnya (misal: "20").</li>
                          <li>Jika komponen tersebut merupakan kelompok/grup (misal: grup "Tugas" yang memiliki sub-komponen "Tugas 1, Tugas 2"), nyalakan opsi <strong>Grup Aspek</strong> lalu tambahkan sub-komponen di bawahnya.</li>
                          <li>Tentukan metode perhitungan grup komponen: <strong>Rata-rata Otomatis</strong> (mengkalkulasi rata-rata sub-komponen) atau <strong>Persentase</strong> (setiap sub-komponen memiliki bobot tersendiri dalam grup tersebut).</li>
                          <li>Pastikan total bobot dari seluruh komponen utama bernilai 100%, lalu klik <strong>Simpan Perubahan</strong>.</li>
                        </ol>
                      </div>
                      <div>
                        <h5 style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>💡 Contoh Penggunaan:</h5>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                          Mata pelajaran Informatika diatur memiliki 3 komponen utama:<br />
                          1. <strong>Tugas (Grup - Rata-rata)</strong>: Bobot 30% (sub-komponen: Tugas 1, Tugas 2).<br />
                          2. <strong>UTS (Tunggal)</strong>: Bobot 30%.<br />
                          3. <strong>UAS (Tunggal)</strong>: Bobot 40%.<br />
                          Total bobot komponen utama: 30% + 30% + 40% = 100%.
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
                          <li>Sistem otomatis mendownload file spreadsheet yang memuat NISN, Nama, dan kolom komponen nilai yang telah Anda buat sebelumnya.</li>
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
                          <li>Petakan setiap kolom TP di e-Rapor dengan kolom komponen di CekNilai (misal: TP 1 diambil dari komponen UTS, TP 2 diambil dari Tugas).</li>
                          <li>Klik <strong>Isi & Unduh Rapor Excel</strong>. Nilai dan capaian kompetensi terisi otomatis di file e-Rapor Anda.</li>
                        </ol>
                      </div>
                      <div>
                        <h5 style={{ fontSize: "0.85rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>💡 Keunggulan Integrasi:</h5>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                          Sistem mendeteksi secara otomatis NISN siswa dan memetakan nilai rapor dengan aman. Jika ada nilai rapor siswa di bawah 100 namun semua komponen KKM tercapai, sistem secara cerdas akan memberikan status ketercapaian optimal secara otomatis agar template valid diunggah kembali ke sistem sekolah.
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

      {/* Modal Gabung Komponen ke Kelompok */}
      {mergeModalOpen && (() => {
        const selectedCols = kelas.kolomNilai.filter(c => selectedForGroup.has(c.id));
        const totalBobot = selectedCols.reduce((sum, c) => sum + (Number(c.bobot) || 0), 0);
        return (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px" }}>
            <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "500px", display: "flex", flexDirection: "column", gap: "16px", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "800", margin: 0 }}>🔗 Gabung Komponen ke Kelompok</h3>
                <button onClick={() => setMergeModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "var(--text-muted)", lineHeight: 1 }}>×</button>
              </div>

              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", backgroundColor: "rgba(59,130,246,0.06)", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(59,130,246,0.15)" }}>
                <strong>💡 Cara Kerja:</strong> Aspek-aspek yang dipilih akan menjadi sub-komponen dalam kelompok baru. Semua data nilai siswa yang sudah ada <strong>tetap terjaga</strong> — tidak ada data yang hilang.
              </div>

              {/* Daftar komponen yang akan digabung */}
              <div>
                <p style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Komponen yang akan digabung:</p>
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

      {/* ===== MODAL: Pemilihan Preset ===== */}
      {presetSelectionModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "800px", padding: "32px", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div>
                <h3 style={{ fontSize: "1.4rem", fontWeight: "800" }}>Pilih Struktur Komponen Nilai</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>Pilih preset yang sesuai dengan kurikulum Anda, atau mulai dari nol secara manual.</p>
              </div>
              <button onClick={() => setPresetSelectionModalOpen(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
              {/* Option Kustom */}
              <div 
                onClick={() => {
                  setPresetSelectionModalOpen(false);
                  setKolomModalOpen(true);
                }}
                style={{ border: "2px dashed var(--border-color)", padding: "20px", borderRadius: "var(--radius-md)", cursor: "pointer", display: "flex", flexDirection: "column", gap: "8px", transition: "all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--primary)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-color)"}
              >
                <div style={{ fontSize: "2rem" }}>📝</div>
                <h4 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Mulai Kosong (Kustom)</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Buat komponen, kategori, dan bobot nilai secara manual dari awal tanpa template.</p>
              </div>

              {/* Options Presets */}
              {ASPEK_PRESETS.map(preset => (
                <div 
                  key={preset.id}
                  onClick={() => {
                    setKelas(prev => ({
                      ...prev,
                      kolomNilai: JSON.parse(JSON.stringify(preset.kolomNilai))
                    }));
                    setNewAspects([]);
                    if (preset.kolomNilai.length > 0) {
                      setActiveAspectId(preset.kolomNilai[0].id);
                    }
                    setPresetSelectionModalOpen(false);
                    setKolomModalOpen(true);
                  }}
                  style={{ border: "1px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)", padding: "20px", borderRadius: "var(--radius-md)", cursor: "pointer", display: "flex", flexDirection: "column", gap: "8px", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 4px 12px var(--primary-glow)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <h4 style={{ fontSize: "1.05rem", fontWeight: "700", color: "var(--text-primary)" }}>{preset.nama}</h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", minHeight: "36px" }}>{preset.deskripsi}</p>
                  
                  <div style={{ marginTop: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Preview Kolom:</span>
                    <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {preset.kolomNilai.slice(0, 3).map((col, idx) => (
                        <li key={idx}><strong>{col.nama}</strong> ({col.bobot}%) {col.isGroup && col.subKolom?.length > 0 && <span style={{opacity:0.7}}>• {col.subKolom.length} sub-kolom</span>}</li>
                      ))}
                      {preset.kolomNilai.length > 3 && <li><em>+ {preset.kolomNilai.length - 3} lainnya</em></li>}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: Atur Komponen, Bobot & KKM ===== */}
      {kolomModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }}>
          <div className="glass-card aspect-modal-card animate-fade-in">
            <div className="aspect-modal-header">
              <div style={{ flex: 1 }}>
                <h3>⚙️ Pengaturan Komponen & KKM</h3>
              </div>
              <button onClick={handleCloseKolomModal} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1, padding: "4px" }}>✕</button>
            </div>

            <div className="aspect-modal-container">
              {/* --- PANEL KIRI: DAFTAR ASPEK --- */}
              <div className={`aspect-sidebar-panel ${mobileActiveView === "list" ? "show-mobile" : "hide-mobile"}`}>
                <div className="aspect-sidebar-header">
                  <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase" }}>Daftar Komponen ({kelas.kolomNilai.length + newAspects.filter(a => a.nama.trim() !== "").length})</span>
                  <input
                    type="checkbox"
                    title="Pilih semua komponen mandiri"
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
                  {kelas.kolomNilai.map((col, idx) => {
                    const isActive = col.id === activeAspectId;
                    return (
                      <div
                        key={col.id}
                        className={`aspect-item-card ${isActive ? "active" : ""}`}
                        onClick={() => {
                          setActiveAspectId(col.id);
                          setMobileActiveView("detail");
                        }}
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
                          
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "auto", flexShrink: 0 }}>
                            {idx > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveKolom(idx, 'up');
                                }}
                                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.85rem", padding: "2px" }}
                                title="Pindahkan Ke Atas"
                              >
                                ▲
                              </button>
                            )}
                            {idx < kelas.kolomNilai.length - 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveKolom(idx, 'down');
                                }}
                                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.85rem", padding: "2px" }}
                                title="Pindahkan Ke Bawah"
                              >
                                ▼
                              </button>
                            )}
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
                        </div>
                        
                        <div className="aspect-item-card-meta">
                          <span className="badge badge-primary" style={{ fontSize: "0.6rem", padding: "1px 6px" }}>
                            {col.bobot || 0}%
                          </span>
                          {col.isGroup ? (
                            <span className="badge badge-warning" style={{ fontSize: "0.6rem", padding: "1px 6px" }}>
                              Kelompok ({col.subKomom?.length || col.subKolom?.length || 0})
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
                  {newAspects.map((aspect, idx) => {
                    const isActive = aspect.id === activeAspectId;
                    return (
                      <div
                        key={aspect.id}
                        className={`aspect-item-card ${isActive ? "active" : ""}`}
                        style={{ borderStyle: "dashed", borderColor: isActive ? "var(--primary)" : "var(--success)" }}
                        onClick={() => {
                          setActiveAspectId(aspect.id);
                          setMobileActiveView("detail");
                        }}
                      >
                        <div className="aspect-item-card-header">
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                            <span className="badge badge-success" style={{ fontSize: "0.6rem", padding: "1px 4px", flexShrink: 0 }}>BARU</span>
                            <span className="aspect-item-card-title">{aspect.nama || <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>+ Komponen Baru</span>}</span>
                          </div>
                          
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "auto", flexShrink: 0 }}>
                            {idx > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveNewAspect(idx, 'up');
                                }}
                                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.85rem", padding: "2px" }}
                                title="Pindahkan Ke Atas"
                              >
                                ▲
                              </button>
                            )}
                            {idx < newAspects.length - 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveNewAspect(idx, 'down');
                                }}
                                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.85rem", padding: "2px" }}
                                title="Pindahkan Ke Bawah"
                              >
                                ▼
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveNewAspect(aspect.id);
                              }}
                              style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "0.85rem", padding: "2px" }}
                              title="Hapus komponen baru"
                            >
                              ✖
                            </button>
                          </div>
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
                  
                  {/* --- KKM Menu Item (Inline Form) --- */}
                  <div
                    className="aspect-item-card"
                    style={{ border: "1px dashed var(--primary)", backgroundColor: "rgba(59,130,246,0.05)", marginTop: "12px", marginBottom: "8px", cursor: "default" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", width: "100%", padding: "4px" }}>
                      <span className="aspect-item-card-title" style={{ fontWeight: "700" }}>🎯 KKM (Lulus ≥)</span>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={kkm} 
                        min={0} 
                        max={100} 
                        onChange={e => {
                          const kkmValue = e.target.value === "" ? "" : Number(e.target.value);
                          setKkm(kkmValue);
                          if (typeof kkmValue === "number" && kkmValue > 0) {
                            const interval = Math.round((100 - kkmValue) / 3);
                            setGradeC(kkmValue);
                            setGradeB(kkmValue + interval);
                            setGradeA(kkmValue + (interval * 2));
                            setGradeD(0);
                          }
                        }} 
                        style={{ padding: "4px 8px", fontSize: "0.85rem", maxWidth: "70px", textAlign: "center" }} 
                      />
                    </div>
                  </div>
                  
                  {/* Button Add New Aspect */}
                  <button
                    onClick={() => {
                      handleAddBlankAspect();
                      setMobileActiveView("detail");
                    }}
                    className="btn btn-secondary"
                    style={{ borderStyle: "dashed", borderColor: "var(--primary)", color: "var(--primary)", padding: "10px", fontSize: "0.82rem", fontWeight: "700", width: "100%", marginTop: "10px" }}
                  >
                    ➕ Tambah Komponen Baru
                  </button>
                </div>

                {/* Merge Toolbar — muncul jika 2+ komponen mandiri dipilih */}
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
              <div className={`aspect-content-panel ${mobileActiveView === "detail" ? "show-mobile" : "hide-mobile"}`}>
                <button 
                  onClick={() => setMobileActiveView("list")}
                  className="mobile-back-btn"
                  style={{
                    display: "none",
                    alignItems: "center",
                    gap: "6px",
                    background: "none",
                    border: "none",
                    color: "var(--primary)",
                    fontWeight: "700",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    padding: "8px 0",
                    textAlign: "left",
                    marginBottom: "12px",
                    width: "fit-content"
                  }}
                >
                  ← Kembali ke Daftar Komponen
                </button>
                {(() => {
                  const activeAspect = kelas.kolomNilai.find(c => c.id === activeAspectId) || newAspects.find(a => a.id === activeAspectId);
                  
                  if (!activeAspect) {
                    return (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center", flex: 1, color: "var(--text-muted)", padding: "40px", textAlign: "center" }}>
                        <span style={{ fontSize: "3rem", marginBottom: "16px" }}>⚖️</span>
                        <h4 style={{ fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>Belum Ada Komponen Terpilih</h4>
                        <p style={{ fontSize: "0.82rem", maxWidth: "300px" }}>Pilih salah satu komponen nilai di sebelah kiri untuk dikonfigurasi, atau buat komponen baru.</p>
                      </div>
                    );
                  }

                  const isNew = newAspects.some(a => a.id === activeAspectId);

                  return (
                    <div className="animate-fade-in aspect-content-detail">
                      {/* Name & Weight Row */}
                      <div className="aspect-form-row" style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "12px" }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Nama Komponen Nilai</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Contoh: UTS, UAS, Tugas, Praktikum..."
                            value={activeAspect.nama}
                            onChange={(e) => {
                              if (isNew) handleNewAspectChange(activeAspect.id, 'nama', e.target.value);
                              else handleColumnNameChange(activeAspect.id, e.target.value);
                            }}
                            style={{ padding: "10px 14px", width: "100%" }}
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
                            style={{ padding: "10px 14px", textAlign: "center", width: "100%" }}
                          />
                        </div>
                      </div>

                      {/* TP/KD Description Field */}
                      <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "12px" }}>
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          📖 Deskripsi TP / KD / Indikator Penilaian <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "normal" }}>(Opsional)</span>
                        </label>
                        <textarea
                          className="form-input"
                          placeholder="Contoh: TP 1: Memahami konsep algoritma pemrograman dasar, tipe data, dan instruksi kondisional..."
                          value={isNew ? (activeAspect.tp || "") : (kelas.skemaPenilaian?.tpConfig?.[activeAspect.id] || "")}
                          onChange={(e) => {
                            if (isNew) {
                              handleNewAspectChange(activeAspect.id, 'tp', e.target.value);
                            } else {
                              const currentTp = kelas.skemaPenilaian?.tpConfig || {};
                              setKelas({
                                ...kelas,
                                skemaPenilaian: {
                                  ...(kelas.skemaPenilaian || {}),
                                  tpConfig: {
                                    ...currentTp,
                                    [activeAspect.id]: e.target.value
                                  }
                                }
                              });
                            }
                          }}
                          rows={2}
                          style={{ padding: "10px 14px", fontSize: "0.85rem", resize: "vertical" }}
                        />
                      </div>

                      {/* Tipe Komponen Selector (Single vs Group) */}
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
                              <span className="selection-card-title">Komponen Tunggal</span>
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
                              <span className="selection-card-desc">Wadah untuk beberapa sub-komponen. Bagus untuk: Kumpulan Tugas Harian, KD 1 - KD 4.</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Visibility & DB Info Row */}
                      <div className="aspect-visibility-row" style={{ marginTop: "12px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: "700" }}>Visibilitas Nilai</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            {isNew ? "Komponen baru akan otomatis ditampilkan setelah disimpan." : "Tentukan apakah siswa dapat melihat nilai komponen ini di portal mereka."}
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

                      {/* Group Calculation & Sub-Aspects (Only if Group) */}
                      {activeAspect.isGroup && (
                        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                          {/* Calculation Method Selection */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <label className="form-label">Metode Perhitungan sub-komponen</label>
                            <div className="selection-card-grid sub-method-grid">
                              <div
                                className={`selection-card sub-method-card ${activeAspect.hitungMetode !== "persentase" ? "active" : ""}`}
                                onClick={() => {
                                  if (isNew) {
                                    handleNewAspectChange(activeAspect.id, 'hitungMetode', 'rata-rata');
                                  } else {
                                    const newCols = kelas.kolomNilai.map(c => c.id === activeAspect.id ? { ...c, hitungMetode: 'rata-rata' } : c);
                                    setKelas({ ...kelas, kolomNilai: newCols });
                                  }
                                }}
                              >
                                <span className="selection-card-icon">🧮</span>
                                <div className="selection-card-content">
                                  <span className="selection-card-title">Rata-rata Otomatis</span>
                                  <span className="selection-card-desc">Nilai grup = rata-rata dari sub-komponen yang terisi.</span>
                                </div>
                              </div>

                              <div
                                className={`selection-card sub-method-card ${activeAspect.hitungMetode === "persentase" ? "active" : ""}`}
                                onClick={() => {
                                  if (isNew) {
                                    handleNewAspectChange(activeAspect.id, 'hitungMetode', 'persentase');
                                  } else {
                                    const newCols = kelas.kolomNilai.map(c => c.id === activeAspect.id ? { ...c, hitungMetode: 'persentase' } : c);
                                    setKelas({ ...kelas, kolomNilai: newCols });
                                  }
                                }}
                              >
                                <span className="selection-card-icon">⚖️</span>
                                <div className="selection-card-content">
                                  <span className="selection-card-title">Bobot Kustom (%)</span>
                                  <span className="selection-card-desc">Setiap sub-komponen memiliki porsi bobot berbeda (harus 100%).</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Sub-Aspects List Manager */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                              <label className="form-label" style={{ margin: 0 }}>Daftar Sub-Komponen Nilai</label>
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
                                        const hasData = kelas.siswa.some(s => s.nilai && s.nilai[sub.id] !== undefined && s.nilai[sub.id] !== null && s.nilai[sub.id] !== "");
                                        if (hasData) {
                                          if (!confirm(`⚠️ PERINGATAN!\nsub-komponen "${sub.nama}" sudah memiliki data nilai siswa yang terisi!\n\nJika dihapus, nilai siswa di sub-komponen ini akan terhapus secara permanen saat Anda menekan Simpan.\n\nApakah Anda benar-benar yakin ingin menghapusnya?`)) {
                                            return;
                                          }
                                        } else {
                                          if (!confirm(`Hapus sub-komponen ${sub.nama}?`)) return;
                                        }
                                        const newCols = kelas.kolomNilai.map(c => c.id === activeAspect.id ? { ...c, subKolom: c.subKolom.filter(s => s.id !== sub.id) } : c);
                                        setKelas({ ...kelas, kolomNilai: newCols });
                                      }
                                    }}
                                    style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "1rem", padding: "4px" }}
                                    title="Hapus sub-komponen"
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
                              ➕ Tambah sub-komponen
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer Modal Actions */}
            <div className="aspect-modal-footer">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.88rem", fontWeight: "700", color: totalBobot === 100 ? "var(--success)" : "var(--warning)" }}>
                  Total Bobot: {totalBobot}%
                </span>
                <span className={`badge ${totalBobot === 100 ? "badge-success" : "badge-warning"}`} style={{ fontSize: "0.62rem" }}>
                  {totalBobot === 100 ? "✓ Lengkap" : "Harus 100%"}
                </span>
              </div>
              <div className="aspect-modal-footer-buttons">
                <button onClick={handleCloseKolomModal} className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "0.82rem" }} disabled={isSavingBobot}>
                  Batal & Tutup
                </button>
                <button onClick={handleOpenDuplicate} className="btn btn-secondary btn-salin-kelas" style={{ padding: "8px 16px", fontSize: "0.82rem" }} title="Salin Komponen & Bobot dari Kelas Lain" disabled={isSavingBobot || isApplyingToOther}>
                  📋 Salin dari Kelas Lain
                </button>
                <button onClick={handleOpenApplyToOther} className="btn btn-secondary btn-terapkan-kelas" style={{ padding: "8px 16px", fontSize: "0.82rem" }} title="Terapkan Komponen & Bobot ke Kelas Lain" disabled={isSavingBobot || isApplyingToOther}>
                  📤 Terapkan ke Kelas Lain
                </button>
                <button
                  onClick={saveAllBobot}
                  className="btn btn-primary btn-simpan-aspek"
                  style={{ padding: "8px 20px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "7px", minWidth: "110px", justifyContent: "center" }}
                  disabled={isSavingBobot}
                >
                  {isSavingBobot ? (
                    <>
                      <span className="btn-spinner" />
                      Menyimpan...
                    </>
                  ) : (
                    <>💾 Simpan Semua Pengaturan</>
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
                <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Anda telah membuat perubahan pada konfigurasi komponen nilai.</span>
              </div>
            </div>
            
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Apakah Anda ingin menyimpan perubahan tersebut sebelum menutup pengaturan komponen?
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




      {/* ===== MODAL: Atur Nilai Katrol (Rahasia) ===== */}
      {katrolModalOpen && katrolSiswa && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }}>
          <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "480px", display: "flex", flexDirection: "column", padding: 0, maxHeight: "90vh", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-color)", padding: "20px 24px" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800", margin: 0 }}>🔒 Katrol / Penyesuaian Nilai</h3>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>Set nilai tambahan khusus secara rahasia.</p>
              </div>
              <button onClick={() => { setKatrolModalOpen(false); setKatrolSiswa(null); setKatrolMultiSiswa([]); setKatrolShowMulti(false); }} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer", lineHeight: 1, padding: "4px" }}>✕</button>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>
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
                  🔒 Tambahan Poin Katrol (Rahasia) <span style={{ fontWeight: "500", color: "var(--text-muted)", fontSize: "0.75rem" }}>(opsional)</span>
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

              {/* === Multi-siswa section === */}
              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                <button
                  onClick={() => setKatrolShowMulti(!katrolShowMulti)}
                  style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.82rem", fontWeight: "700", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {katrolShowMulti ? "▾" : "▸"} Terapkan ke siswa lain juga
                  {katrolMultiSiswa.length > 0 && (
                    <span style={{ fontSize: "0.7rem", backgroundColor: "var(--primary)", color: "#fff", borderRadius: "10px", padding: "2px 8px", fontWeight: "700" }}>
                      +{katrolMultiSiswa.length}
                    </span>
                  )}
                </button>

                {katrolShowMulti && kelas?.siswa && (
                  <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Pilih siswa yang juga akan menerima nilai katrol yang sama:</span>
                      <button 
                        onClick={() => {
                          const otherNisns = kelas.siswa.filter(s => s.nisn !== katrolSiswa.nisn).map(s => s.nisn);
                          setKatrolMultiSiswa(katrolMultiSiswa.length === otherNisns.length ? [] : otherNisns);
                        }} 
                        style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.72rem", fontWeight: "700", cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}
                      >
                        {katrolMultiSiswa.length === kelas.siswa.filter(s => s.nisn !== katrolSiswa.nisn).length ? "Batal Semua" : "Pilih Semua"}
                      </button>
                    </div>
                    <div style={{ maxHeight: "180px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "6px" }}>
                      {kelas.siswa
                        .filter(s => s.nisn !== katrolSiswa.nisn)
                        .sort((a, b) => (a.nama || "").localeCompare(b.nama || ""))
                        .map(s => (
                          <label 
                            key={s.nisn} 
                            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", backgroundColor: katrolMultiSiswa.includes(s.nisn) ? "rgba(59,130,246,0.08)" : "transparent", transition: "background 0.15s" }}
                          >
                            <input 
                              type="checkbox" 
                              checked={katrolMultiSiswa.includes(s.nisn)}
                              onChange={() => {
                                setKatrolMultiSiswa(prev => 
                                  prev.includes(s.nisn) 
                                    ? prev.filter(n => n !== s.nisn) 
                                    : [...prev, s.nisn]
                                );
                              }}
                              style={{ accentColor: "var(--primary)", width: "16px", height: "16px" }}
                            />
                            <span style={{ fontWeight: katrolMultiSiswa.includes(s.nisn) ? "700" : "500" }}>{s.nama}</span>
                          </label>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: "12px", marginTop: "4px" }}>
                <button 
                  onClick={() => { setKatrolModalOpen(false); setKatrolSiswa(null); setKatrolMultiSiswa([]); setKatrolShowMulti(false); }} 
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
                      
                      // Kumpulkan semua NISN target (siswa utama + siswa tambahan yang dipilih)
                      const allTargetNisns = [katrolSiswa.nisn, ...katrolMultiSiswa];
                      
                      const promises = allTargetNisns.map(nisn => 
                        fetch(`/api/kelas/${classId}/siswa/${nisn}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ nilai: { _katrol } }),
                        })
                      );
                      
                      const responses = await Promise.all(promises);
                      const failedCount = responses.filter(r => !r.ok).length;
                      
                      if (failedCount > 0) {
                        alert(`${failedCount} dari ${allTargetNisns.length} siswa gagal disimpan.`);
                      }
                      
                      setKatrolModalOpen(false);
                      setKatrolSiswa(null);
                      setKatrolMultiSiswa([]);
                      setKatrolShowMulti(false);
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
                  {isSavingKatrol ? (
                    <>
                      <span className="btn-spinner" />
                      Menyimpan...
                    </>
                  ) : (
                    katrolMultiSiswa.length > 0 
                      ? `Simpan (${1 + katrolMultiSiswa.length} siswa)` 
                      : "Simpan"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: Normalisasi Nilai ===== */}
      {normModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }}>
          <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "620px", display: "flex", flexDirection: "column", padding: 0, maxHeight: "90vh", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-color)", padding: "20px 24px" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>📐 Normalisasi Nilai Akhir</span>
                </h3>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Sesuaikan rentang dan distribusi nilai siswa tanpa mengubah nilai komponen fisik.
                </p>
              </div>
              <button onClick={() => setNormModalOpen(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer", lineHeight: 1, padding: "4px" }}>✕</button>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>
              {/* Method Selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: "700" }}>Pilih Metode Normalisasi:</label>
                <select
                  className="form-input"
                  value={normMethod}
                  onChange={(e) => setNormMethod(e.target.value)}
                  style={{ padding: "8px 12px", fontSize: "0.85rem" }}
                >
                  <option value="linear">➕ Geser Linear (Tambah/Kurang Poin Tetap ke Semua Siswa)</option>
                  <option value="minmax">📊 Skala Min-Max (Seragamkan ke Rentang Target, misal 60–100)</option>
                  <option value="scalemax">🎯 Skala ke Max (Siswa Tertinggi Menjadi Target, misal 100)</option>
                </select>
              </div>

              {/* Method Parameters */}
              <div style={{ backgroundColor: "var(--bg-secondary)", padding: "14px 16px", borderRadius: "8px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "10px" }}>
                {normMethod === "linear" && (
                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                      Poin Tambahan (Bisa positif/negatif):
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={normLinearPoin}
                      onChange={(e) => setNormLinearPoin(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Contoh: 5"
                      style={{ padding: "6px 12px", fontSize: "0.85rem", width: "100%", maxWidth: "160px" }}
                    />
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                      Setiap siswa akan mendapat tambahan {normLinearPoin >= 0 ? `+${normLinearPoin}` : normLinearPoin} poin pada nilai akhirnya.
                    </span>
                  </div>
                )}

                {normMethod === "minmax" && (
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: "130px" }}>
                      <label style={{ fontSize: "0.8rem", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                        Target Nilai Terendah (Min):
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={normMinTarget}
                        onChange={(e) => setNormMinTarget(e.target.value === '' ? '' : Number(e.target.value))}
                        style={{ padding: "6px 12px", fontSize: "0.85rem", width: "100%" }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: "130px" }}>
                      <label style={{ fontSize: "0.8rem", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                        Target Nilai Tertinggi (Max):
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={normMaxTarget}
                        onChange={(e) => setNormMaxTarget(e.target.value === '' ? '' : Number(e.target.value))}
                        style={{ padding: "6px 12px", fontSize: "0.85rem", width: "100%" }}
                      />
                    </div>
                  </div>
                )}

                {normMethod === "scalemax" && (
                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                      Target Nilai Tertinggi (Max):
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={normMaxOnlyTarget}
                      onChange={(e) => setNormMaxOnlyTarget(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Contoh: 100"
                      style={{ padding: "6px 12px", fontSize: "0.85rem", width: "100%", maxWidth: "160px" }}
                    />
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                      Siswa dengan nilai murni tertinggi akan diset menjadi {normMaxOnlyTarget}, dan siswa lainnya disesuaikan secara proporsional.
                    </span>
                  </div>
                )}
              </div>

              {/* Calculation & Live Preview Table */}
              {(() => {
                if (!kelas?.siswa || kelas.siswa.length === 0) return null;

                // Hitung nilai murni (tanpa katrol) dan nilai normalisasi baru
                const previewList = kelas.siswa.map(student => {
                  let totalMurni = 0;
                  let filledCount = 0;
                  kelas.kolomNilai.forEach(col => {
                    const { score, isFilled, isAllFilled } = getColScore(student, col, null);
                    if (isFilled) {
                      totalMurni += score * (col.bobot / 100);
                      if (isAllFilled) filledCount++;
                    }
                  });

                  // Presensi jika ada
                  const skema = kelas.skemaPenilaian || {};
                  const presensiConfig = skema.presensi || { digunakan: false, bobot: 0 };
                  const pertemuanList = skema.pertemuan || [];
                  if (presensiConfig.digunakan && presensiConfig.bobot > 0 && pertemuanList.length > 0) {
                    let attSummary = { H: 0, I: 0, S: 0, A: 0, D: 0 };
                    pertemuanList.forEach(p => {
                      const val = student.nilai[`_presensi_${p.id}`];
                      if (val && attSummary[val] !== undefined) attSummary[val]++;
                    });
                    let attCount = attSummary.H + attSummary.S + attSummary.I + attSummary.A + attSummary.D;
                    let attTotal = (attSummary.H * 100) + (attSummary.S * 50) + (attSummary.I * 50) + (attSummary.A * 0) + (attSummary.D * 100);
                    const attAvg = attCount > 0 ? (attTotal / attCount) : 0;
                    totalMurni += attAvg * (presensiConfig.bobot / 100);
                  }

                  let totalPoinBonus = 0;
                  if (skema.enableBonusStars) {
                    Object.keys(student.nilai || {}).forEach(k => {
                      if (k.endsWith("_bonus")) totalPoinBonus += (Number(student.nilai[k]?.poin) || 0);
                    });
                  }

                  totalMurni = parseFloat(totalMurni.toFixed(2));
                  const katrolLama = Number(student.nilai?._katrol) || 0;
                  const maxCap = Number(skema.maxCap) || 100;
                  const finalCurrent = parseFloat(Math.min(maxCap, totalMurni + katrolLama + totalPoinBonus).toFixed(2));

                  return {
                    nisn: student.nisn,
                    nama: student.nama,
                    totalMurni,
                    katrolLama,
                    finalCurrent
                  };
                });

                const allMurni = previewList.map(s => s.totalMurni);
                const minMurni = Math.min(...allMurni);
                const maxMurni = Math.max(...allMurni);

                const computedPreview = previewList.map(s => {
                  let rawNormalized = s.totalMurni;
                  if (normMethod === "linear") {
                    rawNormalized = s.totalMurni + (Number(normLinearPoin) || 0);
                  } else if (normMethod === "minmax") {
                    if (maxMurni === minMurni) {
                      rawNormalized = normMinTarget;
                    } else {
                      rawNormalized = normMinTarget + ((s.totalMurni - minMurni) / (maxMurni - minMurni)) * (normMaxTarget - normMinTarget);
                    }
                  } else if (normMethod === "scalemax") {
                    if (maxMurni === 0) {
                      rawNormalized = 0;
                    } else {
                      rawNormalized = (s.totalMurni / maxMurni) * normMaxOnlyTarget;
                    }
                  }
                  
                  const maxCap = Number(kelas.skemaPenilaian?.maxCap) || 100;
                  const clampedNormalized = parseFloat(Math.min(maxCap, Math.max(0, rawNormalized)).toFixed(2));
                  const newDelta = parseFloat((clampedNormalized - s.totalMurni).toFixed(2));

                  return {
                    ...s,
                    normalizedScore: clampedNormalized,
                    newDelta
                  };
                });

                const avgCurrent = (computedPreview.reduce((sum, s) => sum + s.finalCurrent, 0) / computedPreview.length).toFixed(2);
                const avgNormalized = (computedPreview.reduce((sum, s) => sum + s.normalizedScore, 0) / computedPreview.length).toFixed(2);

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", backgroundColor: "var(--bg-tertiary)", padding: "8px 12px", borderRadius: "6px" }}>
                      <span>Rata-rata Kelas: <strong>{avgCurrent}</strong> ➔ <strong style={{ color: "var(--primary)" }}>{avgNormalized}</strong></span>
                      <span>Rentang Murni: <strong>{minMurni} – {maxMurni}</strong></span>
                    </div>

                    <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
                      <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ backgroundColor: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                            <th style={{ padding: "8px 12px" }}>Siswa</th>
                            <th style={{ padding: "8px 12px", textAlign: "center" }}>Murni</th>
                            <th style={{ padding: "8px 12px", textAlign: "center" }}>Saat Ini</th>
                            <th style={{ padding: "8px 12px", textAlign: "center" }}>Hasil Normalisasi</th>
                            <th style={{ padding: "8px 12px", textAlign: "center" }}>Katrol Baru</th>
                          </tr>
                        </thead>
                        <tbody>
                          {computedPreview
                            .sort((a, b) => (a.nama || "").localeCompare(b.nama || ""))
                            .map(s => (
                              <tr key={s.nisn} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                <td style={{ padding: "6px 12px", fontWeight: "600" }}>{s.nama}</td>
                                <td style={{ padding: "6px 12px", textAlign: "center", color: "var(--text-muted)" }}>{s.totalMurni}</td>
                                <td style={{ padding: "6px 12px", textAlign: "center" }}>{s.finalCurrent}</td>
                                <td style={{ padding: "6px 12px", textAlign: "center", fontWeight: "800", color: "var(--primary)" }}>{s.normalizedScore}</td>
                                <td style={{ padding: "6px 12px", textAlign: "center", fontWeight: "700", color: s.newDelta >= 0 ? "#10b981" : "#ef4444" }}>
                                  {s.newDelta >= 0 ? `+${s.newDelta}` : s.newDelta}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: "8px", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "12px", marginTop: "6px" }}>
                      <button
                        onClick={async () => {
                          if (confirm("⚠️ Apakah Anda yakin ingin MENGHAPUS / MERESET semua nilai katrol & normalisasi seluruh siswa di kelas ini?")) {
                            setIsSavingNorm(true);
                            try {
                              const promises = kelas.siswa.map(s =>
                                fetch(`/api/kelas/${classId}/siswa/${s.nisn}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ nilai: { _katrol: null } }),
                                })
                              );
                              await Promise.all(promises);
                              setNormModalOpen(false);
                              fetchClassDetail();
                            } catch (err) {
                              alert("Gagal mereset normalisasi.");
                            } finally {
                              setIsSavingNorm(false);
                            }
                          }
                        }}
                        className="btn btn-secondary"
                        style={{ padding: "6px 12px", fontSize: "0.78rem", color: "var(--danger)", borderColor: "rgba(239, 68, 68, 0.2)" }}
                        disabled={isSavingNorm}
                      >
                        🗑️ Reset Semua Katrol
                      </button>

                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => setNormModalOpen(false)}
                          className="btn btn-secondary"
                          style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                          disabled={isSavingNorm}
                        >
                          Batal
                        </button>
                        <button
                          onClick={async () => {
                            setIsSavingNorm(true);
                            try {
                              const promises = computedPreview.map(s =>
                                fetch(`/api/kelas/${classId}/siswa/${s.nisn}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ nilai: { _katrol: s.newDelta === 0 ? null : s.newDelta } }),
                                })
                              );
                              const responses = await Promise.all(promises);
                              const failedCount = responses.filter(r => !r.ok).length;
                              if (failedCount > 0) {
                                alert(`${failedCount} dari ${computedPreview.length} siswa gagal di-update.`);
                              }
                              setNormModalOpen(false);
                              fetchClassDetail();
                            } catch (err) {
                              alert("Gagal menerapkan normalisasi.");
                            } finally {
                              setIsSavingNorm(false);
                            }
                          }}
                          className="btn btn-primary"
                          style={{ padding: "6px 16px", fontSize: "0.82rem", fontWeight: "700" }}
                          disabled={isSavingNorm}
                        >
                          {isSavingNorm ? "Terapkan..." : `Terapkan Normalisasi (${computedPreview.length} Siswa)`}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}


      {/* ===== GLOBAL CUSTOM CONFIRMATION MODAL ===== */}
      {confirmConfig.isOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "420px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px", border: confirmConfig.isDanger ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid var(--border-focus)", boxShadow: "var(--shadow-lg), 0 0 30px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <span style={{ fontSize: "2rem", lineHeight: "1" }}>
                {(() => {
                  const titleLower = (confirmConfig.title || "").toLowerCase();
                  if (confirmConfig.isDanger || titleLower.includes("⚠️") || titleLower.includes("hapus") || titleLower.includes("delete")) return "⚠️";
                  if (titleLower.includes("berhasil") || titleLower.includes("sukses") || titleLower.includes("success")) return "✅";
                  if (titleLower.includes("galat") || titleLower.includes("gagal") || titleLower.includes("error")) return "❌";
                  if (titleLower.includes("salin") || titleLower.includes("copy") || titleLower.includes("papan klip")) return "📋";
                  return "❓";
                })()}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800", color: confirmConfig.isDanger ? "var(--danger)" : "var(--text-primary)" }}>
                  {confirmConfig.title.replace("⚠️", "").trim() || "Konfirmasi"}
                </h4>
              </div>
            </div>
            
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", whiteSpace: "pre-line", maxHeight: "250px", overflowY: "auto" }}>
              {confirmConfig.message}
            </p>
            
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "12px" }}>
              {!confirmConfig.isAlert && (
                <button
                  type="button"
                  onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                  className="btn btn-secondary"
                  style={{ padding: "8px 16px", fontSize: "0.82rem" }}
                >
                  {confirmConfig.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={confirmConfig.onConfirm}
                className={confirmConfig.isDanger ? "btn btn-danger" : "btn btn-primary"}
                style={{
                  padding: "8px 20px",
                  fontSize: "0.82rem",
                  fontWeight: "700",
                  backgroundColor: confirmConfig.isDanger ? "var(--danger)" : "var(--primary)",
                  color: "#fff",
                  border: confirmConfig.isDanger ? "1px solid var(--danger)" : "1px solid var(--primary)"
                }}
              >
                {confirmConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PORTRAIT KHS / RAPOR BAYANGAN PRINT-ONLY VIEW */}
      {selectedPrintStudent && (() => {
        const student = selectedPrintStudent;
        const finalScore = student.finalScore || 0;
        
        const skema = kelas.skemaPenilaian || { A: 85, B: 75, C: 65, D: 50, kkm: 75 };
        let predikat = "E";
        if (finalScore >= skema.A) predikat = skema.statusA || "A";
        else if (finalScore >= skema.B) predikat = skema.statusB || "B";
        else if (finalScore >= skema.C) predikat = skema.statusC || "C";
        else if (finalScore >= skema.D) predikat = skema.statusD || "D";

        const statusKelulusan = finalScore >= (skema.kkm || 75) ? "LULUS" : "TIDAK LULUS";

        const config = {
          namaSekolah: skema.laporanConfig?.namaSekolah || (typeof window !== "undefined" ? localStorage.getItem("rep_namaSekolah") : "") || "",
          alamatSekolah: skema.laporanConfig?.alamatSekolah || (typeof window !== "undefined" ? localStorage.getItem("rep_alamatSekolah") : "") || "",
          telpSekolah: skema.laporanConfig?.telpSekolah || (typeof window !== "undefined" ? localStorage.getItem("rep_telpSekolah") : "") || "",
          namaKepsek: skema.laporanConfig?.namaKepsek || (typeof window !== "undefined" ? localStorage.getItem("rep_namaKepsek") : "") || "",
          nipKepsek: skema.laporanConfig?.nipKepsek || (typeof window !== "undefined" ? localStorage.getItem("rep_nipKepsek") : "") || "",
          kotaCetak: skema.laporanConfig?.kotaCetak || (typeof window !== "undefined" ? localStorage.getItem("rep_kotaCetak") : "") || "",
          nipGuru: skema.laporanConfig?.nipGuru || (typeof window !== "undefined" ? localStorage.getItem("rep_nipGuru") : "") || ""
        };

        // Hitung rekap presensi
        let totalH = 0, totalS = 0, totalI = 0, totalA = 0;
        (skema.pertemuan || []).forEach(p => {
          const val = student.nilai?.[`_presensi_${p.id}`];
          if (val === 'H') totalH++;
          else if (val === 'S') totalS++;
          else if (val === 'I') totalI++;
          else if (val === 'A') totalA++;
        });
        const hasPresensi = (skema.pertemuan || []).length > 0;

        // Hitung nilai komponen detail
        const detailNilai = (kelas.kolomNilai || []).map(col => {
          const groupConfig = skema.kolomAspekGroup?.[col.id];
          const isGroup = groupConfig ? !!groupConfig.isGroup : false;
          const hitungMetode = groupConfig ? (groupConfig.hitungMetode || "rata-rata") : "rata-rata";
          const subKolom = groupConfig ? (groupConfig.subKolom || []) : [];

          let scoreVal = null;
          let isFilled = false;
          const subDetail = [];

          if (isGroup && subKolom.length > 0) {
            let subTotal = 0;
            let subFilledWeight = 0;
            let subFilledCount = 0;

            subKolom.forEach(sub => {
              const sc = student.nilai?.[sub.id];
              if (sc !== undefined && sc !== null && sc !== "") {
                const scNum = Number(sc);
                if (hitungMetode === "persentase") {
                  const subBobot = sub.bobot !== undefined && sub.bobot !== null ? Number(sub.bobot) : 0;
                  subTotal += scNum * subBobot;
                  subFilledWeight += subBobot;
                } else {
                  subTotal += scNum;
                }
                subFilledCount++;
                subDetail.push({
                  subId: sub.id,
                  nama: sub.nama,
                  bobot: sub.bobot,
                  nilaiAsli: scNum
                });
              } else {
                subDetail.push({
                  subId: sub.id,
                  nama: sub.nama,
                  bobot: sub.bobot,
                  nilaiAsli: null
                });
              }
            });

            if (subFilledCount > 0) {
              isFilled = true;
              if (hitungMetode === "persentase") {
                scoreVal = subFilledWeight > 0 ? Number((subTotal / subFilledWeight).toFixed(2)) : 0;
              } else {
                scoreVal = Number((subTotal / subFilledCount).toFixed(2));
              }
            }
          } else {
            const rawVal = student.nilai?.[col.id];
            isFilled = rawVal !== undefined && rawVal !== null && rawVal !== "";
            scoreVal = isFilled ? Number(rawVal) : null;
          }

          return {
            kolomId: col.id,
            namaKolom: col.nama,
            bobot: col.bobot,
            nilaiAsli: scoreVal,
            isGroup,
            subDetail
          };
        });

        return (
          <div id="printable-khs-area">
            {/* KOP SEKOLAH */}
            <div className="khs-kop">
              <h2>LAPORAN HASIL BELAJAR SISWA</h2>
              <h3>{config.namaSekolah}</h3>
              <p>Alamat: {config.alamatSekolah} &bull; Telp: {config.telpSekolah}</p>
            </div>

            <div className="khs-title">KARTU HASIL STUDI (RAPOR BAYANGAN)</div>

            {/* BIODATA SISWA */}
            <table className="khs-identity-table">
              <tbody>
                <tr>
                  <td style={{ width: "15%", fontWeight: "bold" }}>Nama Siswa</td>
                  <td style={{ width: "2%" }}>:</td>
                  <td style={{ width: "33%" }}><strong>{student.nama}</strong></td>
                  <td style={{ width: "15%", fontWeight: "bold" }}>Mata Pelajaran</td>
                  <td style={{ width: "2%" }}>:</td>
                  <td style={{ width: "33%" }}>{kelas.mataPelajaran || "Informatika"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: "bold" }}>NISN</td>
                  <td>:</td>
                  <td>{student.nisn}</td>
                  <td style={{ fontWeight: "bold" }}>Kelas</td>
                  <td>:</td>
                  <td>{kelas.nama}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: "bold" }}>Tahun Ajaran</td>
                  <td>:</td>
                  <td>{kelas.tahunAjaran}</td>
                  <td style={{ fontWeight: "bold" }}>Semester</td>
                  <td>:</td>
                  <td>{kelas.semester || "Ganjil"}</td>
                </tr>
              </tbody>
            </table>

            {/* TABEL NILAI */}
            <table className="khs-grades-table">
              <thead>
                <tr>
                  <th style={{ width: "5%", textAlign: "center" }}>No</th>
                  <th style={{ width: "50%", textAlign: "left" }}>Komponen Penilaian</th>
                  <th style={{ width: "15%", textAlign: "center" }}>KKM</th>
                  <th style={{ width: "15%", textAlign: "center" }}>Nilai Angka</th>
                  <th style={{ width: "15%", textAlign: "center" }}>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {detailNilai.map((col, idx) => {
                  const isTuntas = col.nilaiAsli === "Tuntas" || (typeof col.nilaiAsli === 'number' && col.nilaiAsli >= skema.kkm);
                  const ketText = col.nilaiAsli === null || col.nilaiAsli === "" || col.nilaiAsli === "-" 
                    ? "Belum Diisi" 
                    : isTuntas ? "Tuntas" : "Belum Tuntas";
                    
                  return (
                    <Fragment key={col.kolomId}>
                      {/* Baris Komponen Utama */}
                      <tr style={col.isGroup ? { fontWeight: "bold" } : {}}>
                        <td style={{ textAlign: "center" }}>{idx + 1}</td>
                        <td style={{ textAlign: "left" }}>
                          {col.isGroup && <span style={{ fontSize: "0.7rem", border: "1.5px solid #000", padding: "1px 4px", marginRight: "6px", fontWeight: "bold" }}>GRUP</span>}
                          {col.namaKolom}
                          {skema.tpConfig?.[col.kolomId] && (
                            <div style={{ fontSize: "0.75rem", fontStyle: "italic", fontWeight: "normal", color: "#4b5563", marginTop: "2px" }}>
                              {skema.tpConfig[col.kolomId]}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>{skema.kkm}</td>
                        <td style={{ textAlign: "center", fontWeight: "bold" }}>
                          {col.nilaiAsli === null || col.nilaiAsli === "" || col.nilaiAsli === "-" ? "—" : col.nilaiAsli}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: "bold", color: isTuntas ? "#15803d" : "#b91c1c" }}>
                          {ketText}
                        </td>
                      </tr>

                      {/* Baris sub-komponen jika merupakan Grup */}
                      {col.isGroup && col.subDetail?.map((sub) => {
                        const subTuntas = sub.nilaiAsli !== null && sub.nilaiAsli >= skema.kkm;
                        const subKet = sub.nilaiAsli === null ? "Belum Diisi" : subTuntas ? "Tuntas" : "Belum Tuntas";
                        return (
                          <tr key={sub.subId} className="khs-sub-row">
                            <td></td>
                            <td style={{ fontStyle: "italic" }}>
                              ↳ {sub.nama}
                            </td>
                            <td style={{ textAlign: "center" }}>{skema.kkm}</td>
                            <td style={{ textAlign: "center" }}>
                              {sub.nilaiAsli === null ? "—" : sub.nilaiAsli}
                            </td>
                            <td style={{ textAlign: "center", fontSize: "0.85em", color: subTuntas ? "#15803d" : "#b91c1c" }}>
                              {subKet}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* RINGKASAN HASIL AKHIR */}
            <div className="khs-summary-box">
              <div className="khs-summary-column">
                <div className="khs-summary-item">
                  <span>KKM Kelulusan</span>
                  <strong>{skema.kkm}</strong>
                </div>
                <div className="khs-summary-item">
                  <span>Nilai Akhir Rapor</span>
                  <strong>{kelas.isNilaiAkhirGenerated ? finalScore.toFixed(2) : "🔒 Sedang Diproses"}</strong>
                </div>
              </div>
              <div className="khs-summary-column">
                <div className="khs-summary-item">
                  <span>Predikat Capaian</span>
                  <strong>{kelas.isNilaiAkhirGenerated ? predikat : "🔒"}</strong>
                </div>
                <div className="khs-summary-item">
                  <span>Status Kelulusan</span>
                  <strong style={{ color: finalScore >= skema.kkm ? "#15803d" : "#b91c1c" }}>
                    {kelas.isNilaiAkhirGenerated ? statusKelulusan : "🔒 Menunggu"}
                  </strong>
                </div>
              </div>
            </div>

            {/* PRESENSI KEHADIRAN (Hanya jika diaktifkan) */}
            {hasPresensi && (
              <div style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                <h4 style={{ margin: "10pt 0 4pt 0", fontSize: "10pt", fontWeight: "bold" }}>Rekapitulasi Kehadiran</h4>
                <table className="khs-presensi-table">
                  <thead>
                    <tr>
                      <th style={{ width: "70%" }}>Keadaan Kehadiran</th>
                      <th style={{ width: "30%", textAlign: "center" }}>Jumlah Hari</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1. Sakit (S)</td>
                      <td>{totalS} hari</td>
                    </tr>
                    <tr>
                      <td>2. Izin (I)</td>
                      <td>{totalI} hari</td>
                    </tr>
                    <tr>
                      <td>3. Tanpa Keterangan (A)</td>
                      <td>{totalA} hari</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* CATATAN GURU */}
            {student.catatan && (
              <div style={{ marginTop: "10pt", pageBreakInside: "avoid", breakInside: "avoid" }}>
                <h4 style={{ margin: "0 0 4pt 0", fontSize: "10pt", fontWeight: "bold" }}>Catatan Perkembangan dari Guru</h4>
                <div className="khs-catatan-box">
                  "{student.catatan}"
                </div>
              </div>
            )}

            {/* TANDA TANGAN (SIGNATURES) */}
            <div className="khs-signature-section">
              <div className="khs-signature-col" style={{ width: "30%" }}>
                <span>Orang Tua / Wali Siswa,</span>
                <span style={{ borderBottom: "1px solid #000000", width: "120px", margin: "40px auto 0 auto" }}></span>
              </div>
              
              <div className="khs-signature-col" style={{ width: "40%" }}>
                <span>Mengetahui,</span>
                <span>Kepala Sekolah,</span>
                <span style={{ fontWeight: "bold", borderBottom: "1px solid #000000", width: "160px", margin: "30px auto 0 auto" }}>
                  {config.namaKepsek}
                </span>
                <span style={{ fontSize: "0.8em" }}>NIP. {config.nipKepsek}</span>
              </div>

              <div className="khs-signature-col" style={{ width: "30%" }}>
                <span>{config.kotaCetak || "Jakarta"}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                <span>Guru Pengampu,</span>
                <span style={{ fontWeight: "bold", borderBottom: "1px solid #000000", width: "120px", margin: "30px auto 0 auto" }}>
                  {guruProfile?.nama || "Nama Guru"}
                </span>
                <span style={{ fontSize: "0.8em" }}>{config.nipGuru && config.nipGuru !== "-" ? `NIP. ${config.nipGuru}` : "NIP. —"}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============= MODAL PRATINJAU CETAK LAPORAN ============= */}
      {isPreviewOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1300, padding: "16px" }} className="animate-fade-in">
          <div className="glass-card" style={{ width: "95%", maxWidth: "1050px", height: "90vh", display: "flex", flexDirection: "column", gap: "16px", padding: "24px", backgroundColor: "var(--bg-primary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.4rem" }}>🖨️</span>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "800", color: "var(--primary)", margin: 0 }}>Pratinjau Cetak Laporan - {kelas.nama}</h3>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  onClick={() => {
                    if (iframeRef.current) {
                      iframeRef.current.contentWindow.print();
                    }
                  }} 
                  className="btn btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", padding: "6px 16px" }}
                >
                  🖨️ Cetak PDF
                </button>
                <button 
                  onClick={() => setIsPreviewOpen(false)} 
                  className="btn btn-secondary"
                  style={{ fontSize: "0.85rem", padding: "6px 16px" }}
                >
                  Tutup
                </button>
              </div>
            </div>
            
            <div style={{ flex: 1, position: "relative", width: "100%", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--border-color)", backgroundColor: "#ffffff" }}>
              <iframe
                ref={iframeRef}
                src={`/guru/laporan?kelasId=${kelas.id}&popup=true`}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Pratinjau Cetak"
              />
            </div>
          </div>
        </div>
      )}

      {/* ============= MODAL REMEDIAL, PENGAYAAN & BONUS ============= */}
      <RemedialModal
        isOpen={remedialModalOpen}
        onClose={() => setRemedialModalOpen(false)}
        kolom={selectedRemedialKolom}
        siswaList={kelas?.siswa || []}
        skemaPenilaian={kelas?.skemaPenilaian || {}}
        onSave={handleSaveRemedial}
        onOpenReport={handleOpenRemedialReport}
      />

      <RemedialReportModal
        isOpen={remedialReportOpen}
        onClose={() => setRemedialReportOpen(false)}
        kelas={kelas || {}}
        kolom={selectedRemedialKolom}
        siswaList={kelas?.siswa || []}
        config={remedialReportConfig}
      />

      {/* Floating 1-Click Star Notification Toast */}
      {starToast && (
        <div style={{
          position: "fixed",
          bottom: "28px",
          right: "28px",
          backgroundColor: "#0f172a",
          color: "#f59e0b",
          padding: "12px 20px",
          borderRadius: "12px",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.3)",
          border: "1px solid #f59e0b",
          fontWeight: "700",
          fontSize: "0.9rem",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          ✨ {starToast}
        </div>
      )}

      {showSyncModal && syncPreviewData && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1000,
          display: "flex", justifyContent: "center", alignItems: "center"
        }}>
          <div style={{
            background: "var(--bg-primary)", padding: "24px",
            borderRadius: "16px", maxWidth: "600px", width: "95%",
            maxHeight: "90vh", overflowY: "auto"
          }}>
            <h3 style={{ marginTop: 0, color: "var(--primary)" }}>Pratinjau Sinkronisasi Bank Data</h3>
            
            {syncPreviewData.removed && syncPreviewData.removed.length > 0 && (
              <div style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                borderLeft: "4px solid var(--danger)",
                padding: "12px",
                marginBottom: "16px",
                borderRadius: "4px"
              }}>
                <h4 style={{ margin: "0 0 8px 0", color: "var(--danger)" }}>⚠️ Peringatan Penghapusan Siswa</h4>
                <p style={{ margin: 0, fontSize: "0.85rem" }}>
                  Jika Anda melanjutkan, <strong>{syncPreviewData.removed.length} siswa</strong> yang tidak lagi ada di Bank Data akan dihapus dari kelas ini beserta <strong>seluruh data nilainya</strong> secara permanen.
                </p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {syncPreviewData.added && syncPreviewData.added.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 8px 0", color: "#10b981" }}>Menambahkan ({syncPreviewData.added.length}):</h4>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.85rem", maxHeight: "150px", overflowY: "auto" }}>
                    {syncPreviewData.added.map(s => <li key={s.nisn}>{s.nama} ({s.nisn})</li>)}
                  </ul>
                </div>
              )}

              {syncPreviewData.updated && syncPreviewData.updated.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 8px 0", color: "#f59e0b" }}>Pembaruan Nama ({syncPreviewData.updated.length}):</h4>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.85rem", maxHeight: "150px", overflowY: "auto" }}>
                    {syncPreviewData.updated.map(s => <li key={s.nisn}>{s.namaLama} ➔ {s.namaBaru}</li>)}
                  </ul>
                </div>
              )}

              {syncPreviewData.removed && syncPreviewData.removed.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 8px 0", color: "var(--danger)" }}>Menghapus ({syncPreviewData.removed.length}):</h4>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.85rem", maxHeight: "150px", overflowY: "auto" }}>
                    {syncPreviewData.removed.map(s => <li key={s.nisn}>{s.nama} ({s.nisn})</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowSyncModal(false);
                  setSyncPreviewData(null);
                }}
              >
                Batal
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleCommitSyncBankData}
                disabled={isSyncingBankData}
              >
                {isSyncingBankData ? "Menyimpan..." : "Lanjutkan Sinkronisasi"}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
