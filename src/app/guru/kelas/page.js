"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import { ASPEK_PRESETS } from "@/lib/presets";
import SyncPreviewUI from "@/components/SyncPreviewUI";

export default function KelolaKelas() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [kelas, setKelas] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState("");
  const [nama, setNama] = useState("");
  const [rombelNama, setRombelNama] = useState("");
  const [namaKustom, setNamaKustom] = useState("");
  const [tingkatan, setTingkatan] = useState("");
  const [mataPelajaran, setMataPelajaran] = useState("");
  const [mataPelajaranCustom, setMataPelajaranCustom] = useState("");
  const [tahunAjaran, setTahunAjaran] = useState(`${new Date().getFullYear()}/${new Date().getFullYear() + 1}`);
  const [semester, setSemester] = useState("");
  const [presetAspek, setPresetAspek] = useState("kurikulum-merdeka-standar");
  const [syncBankData, setSyncBankData] = useState(true);
  const [error, setError] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Bank Data States
  const [bankRombels, setBankRombels] = useState([]);
  const [loadingBankRombels, setLoadingBankRombels] = useState(false);
  const [selectedBankRombels, setSelectedBankRombels] = useState({});
  const [bankSiswaLoading, setBankSiswaLoading] = useState(false);
  const [useBankData, setUseBankData] = useState(true);

  // Filter States
  const [filterTingkatan, setFilterTingkatan] = useState("Semua");
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  // Dropdown Constants
  const TINGKATAN_OPTIONS = [...Array.from({ length: 12 }, (_, i) => i + 1), "Ekskul"];
  const MATA_PELAJARAN_OPTIONS = [
    "Informatika", "Koding & AI", "Matematika", "Matematika Tingkat Lanjut",
    "Bahasa Indonesia", "Bahasa Indonesia Tingkat Lanjut", "Bahasa Inggris", "Bahasa Inggris Tingkat Lanjut",
    "Bahasa Jerman", "Bahasa Jepang", "Bahasa Arab", "Bahasa Mandarin", "Bahasa Prancis", "Bahasa Korea",
    "IPA", "Fisika", "Kimia", "Biologi",
    "IPS", "Ekonomi", "Geografi", "Sosiologi", "Sejarah", "Antropologi",
    "PKN", "Pendidikan Agama Islam", "Pendidikan Agama Kristen", "Pendidikan Agama Katolik",
    "Pendidikan Agama Hindu", "Pendidikan Agama Buddha", "Pendidikan Agama Konghucu",
    "Seni Budaya", "Seni Musik", "Seni Rupa", "Seni Tari", "Seni Teater",
    "PJOK", "Prakarya", "Prakarya dan Kewirausahaan",
    "Teknologi Informasi dan Komunikasi", "Bimbingan Konseling", "Ekstrakurikuler",
    "Muatan Lokal", "Lainnya"
  ];
  const currentYear = new Date().getFullYear();
  const TAHUN_AJARAN_OPTIONS = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - 1 + i;
    return `${y}/${y + 1}`;
  });

  const getEffectiveMataPelajaran = () => {
    if (mataPelajaran === "Lainnya") return mataPelajaranCustom.trim();
    return mataPelajaran;
  };

  // Bulk Import States
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [parsedClasses, setParsedClasses] = useState([]);
  const [parsedStudents, setParsedStudents] = useState([]);
  const [bulkForms, setBulkForms] = useState([{ id: Date.now(), tingkatan: "", rombelNama: "", namaKustom: "", mataPelajaran: "", mataPelajaranCustom: "", tahunAjaran: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`, semester: "Ganjil", sourceRombel: "" }]);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkError, setBulkError] = useState("");

  const detectLevelInRombel = (tingkatan, rombel) => {
    if (!rombel) return false;
    const r = rombel.toUpperCase().trim();
    return /^(10|11|12|X|XI|XII)\b/i.test(r) || r.startsWith("KELAS");
  };

  const stripLevelFromRombel = (rombel) => {
    if (!rombel) return "";
    return rombel.replace(/^(?:KELAS\s+)?(10|11|12|X{1,3}I{0,3})\b\s*[-_]?\s*/i, "").trim();
  };

  // Excel/Dapodik Upload Modal States
  const [creationMethod, setCreationMethod] = useState(null); // 'manual', 'excel', or null
  const [hoverMethod, setHoverMethod] = useState(null); // 'manual', 'excel', or null
  const [dapodikUploadError, setDapodikUploadError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [importWarnings, setImportWarnings] = useState([]);

  // Custom Confirm/Alert Dialog Modal States
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: "Batal",
    isDanger: false,
    onConfirm: null
  });

  const triggerConfirm = (message, onConfirm, options = {}) => {
    setConfirmConfig({
      isOpen: true,
      title: options.title || "Konfirmasi",
      message: message,
      confirmText: options.confirmText || "OK",
      cancelText: options.cancelText === undefined ? "Batal" : options.cancelText,
      isDanger: !!options.isDanger,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Duplicate Class States
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [sourceClass, setSourceClass] = useState(null);
  const [dupNama, setDupNama] = useState("");
  const [dupTingkatan, setDupTingkatan] = useState("");
  const [dupMataPelajaran, setDupMataPelajaran] = useState("");
  const [dupMataPelajaranCustom, setDupMataPelajaranCustom] = useState("");
  const [dupTahunAjaran, setDupTahunAjaran] = useState("");
  const [dupSemester, setDupSemester] = useState("Ganjil");
  const [copyStudents, setCopyStudents] = useState(true);
  const [copyGrades, setCopyGrades] = useState(false);
  const [dupError, setDupError] = useState("");
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Bulk Sync Wizard States
  const [bulkSyncSelectionOpen, setBulkSyncSelectionOpen] = useState(false);
  const [selectedClassesForSync, setSelectedClassesForSync] = useState(new Set()); // set of kelas IDs
  const [wizardQueue, setWizardQueue] = useState([]);
  const [currentWizardIndex, setCurrentWizardIndex] = useState(-1);
  const [syncPreviewData, setSyncPreviewData] = useState(null);
  const [syncSelectedAdded, setSyncSelectedAdded] = useState(new Set());
  const [syncSelectedUpdated, setSyncSelectedUpdated] = useState(new Set());
  const [syncSelectedRemoved, setSyncSelectedRemoved] = useState(new Set());
  const [wizardStep, setWizardStep] = useState("select_rombel");
  const [bankAvailableRombels, setBankAvailableRombels] = useState([]);
  const [selectedBankRombel, setSelectedBankRombel] = useState("");
  const [isSyncingBankData, setIsSyncingBankData] = useState(false);

  const fetchKelas = async () => {
    try {
      const response = await fetch("/api/kelas?archived=false");
      if (response.ok) {
        const data = await response.json();
        setKelas(data);
      }
    } catch (err) {
      console.error("Gagal mengambil data kelas", err);
    } finally {
      setLoading(false);
    }
  };

  const startBulkSync = () => {
    const selectedClasses = kelas.filter(k => selectedClassesForSync.has(k.id));
    if (selectedClasses.length === 0) return;
    
    setWizardQueue(selectedClasses);
    setCurrentWizardIndex(0);
    setBulkSyncSelectionOpen(false);
    fetchRombelsForWizardIndex(0, selectedClasses);
  };

  const fetchRombelsForWizardIndex = async (index, queue) => {
    if (index >= queue.length) {
      alert("Sinkronisasi massal selesai!");
      setWizardQueue([]);
      setCurrentWizardIndex(-1);
      setSelectedClassesForSync(new Set());
      return;
    }
    
    const k = queue[index];
    setSyncPreviewData(null);
    setWizardStep("select_rombel");
    setIsSyncingBankData(true);
    
    try {
      const response = await fetch("/api/kelas/sync-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kelasId: k.id, action: 'get-rombels' })
      });
      const data = await response.json();
      if (response.ok && data.rombels) {
        setBankAvailableRombels(data.rombels);
        const currentMatch = data.rombels.find(r => 
          String(r.tahun) === String(k.tahunAjaran) &&
          String(r.tingkatan) === String(k.tingkatan) && 
          String(r.rombel).toLowerCase() === String(k.rombel_nama).toLowerCase()
        );
        if (currentMatch) {
          setSelectedBankRombel(`${currentMatch.tahun}|${currentMatch.tingkatan}|${currentMatch.rombel}`);
        } else if (data.rombels.length > 0) {
          setSelectedBankRombel(`${data.rombels[0].tahun}|${data.rombels[0].tingkatan}|${data.rombels[0].rombel}`);
        } else {
          setSelectedBankRombel("");
        }
      } else {
        alert(data.error || "Gagal memuat daftar rombel bank data.");
        setWizardQueue([]);
        setCurrentWizardIndex(-1);
      }
    } catch (err) {
      console.error(err);
      alert("Kesalahan koneksi saat mengambil rombel bank data.");
      setWizardQueue([]);
      setCurrentWizardIndex(-1);
    } finally {
      setIsSyncingBankData(false);
    }
  };

  const handleProceedToPreview = async () => {
    if (!selectedBankRombel) {
      alert("Silakan pilih rombel tujuan dari Bank Data.");
      return;
    }
    const k = wizardQueue[currentWizardIndex];
    const [targetTahun, targetTingkatan, targetRombel] = selectedBankRombel.split("|");
    setIsSyncingBankData(true);
    
    try {
      const res = await fetch(`/api/kelas/sync-bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kelasId: k.id, action: "preview", targetTingkatan, targetRombel, targetTahun })
      });
      
      const data = await res.json();
      if (res.ok && data.preview) {
        setSyncPreviewData(data);
        setSyncSelectedAdded(new Set((data.added || []).map(s => s.nisn)));
        setSyncSelectedUpdated(new Set((data.updated || []).map(s => s.nisnLama)));
        setSyncSelectedRemoved(new Set((data.removed || []).map(s => s.nisn))); 
        setWizardStep("preview");
      } else {
        alert(data.error || data.message || "Gagal pratinjau sinkronisasi.");
      }
    } catch (err) {
      console.error(err);
      alert("Kesalahan koneksi.");
    } finally {
      setIsSyncingBankData(false);
    }
  };

  const handleCommitWizardIndex = async () => {
    if (currentWizardIndex < 0 || currentWizardIndex >= wizardQueue.length) return;
    
    setIsSyncingBankData(true);
    const k = wizardQueue[currentWizardIndex];
    
    try {
      const payload = {
        kelasId: k.id,
        action: "commit",
        previewData: {
          added: syncPreviewData.added.filter(s => syncSelectedAdded.has(s.nisn)),
          updated: syncPreviewData.updated.filter(s => syncSelectedUpdated.has(s.nisnLama)),
          removed: syncPreviewData.removed.filter(s => syncSelectedRemoved.has(s.nisn))
        },
        targetTingkatan: k.tingkatan,
        targetRombel: k.rombel_nama,
        targetTahun: k.tahunAjaran
      };
      
      const res = await fetch("/api/kelas/sync-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        fetchKelas();
        setCurrentWizardIndex(currentWizardIndex + 1);
        fetchRombelsForWizardIndex(currentWizardIndex + 1, wizardQueue);
      } else {
        const data = await res.json();
        alert(data.error || "Gagal menyimpan hasil sinkronisasi.");
      }
    } catch (err) {
      console.error(err);
      alert("Kesalahan koneksi saat menyimpan.");
    } finally {
      setIsSyncingBankData(false);
    }
  };
  
  const handleSeparateStudentWizard = (s) => {
    setSyncPreviewData(prev => {
      const newUpdated = prev.updated.filter(u => u.nisnLama !== s.nisnLama);
      const newRemoved = [...prev.removed, { nisn: s.nisnLama, nama: s.namaLama }];
      const newAdded = [...prev.added, { nisn: s.nisnBaru, nama: s.namaBaru, tanggalLahir: s.tanggalLahirBaru }];
      
      const nextSelectedUpdated = new Set(syncSelectedUpdated);
      nextSelectedUpdated.delete(s.nisnLama);
      setSyncSelectedUpdated(nextSelectedUpdated);
      
      const nextSelectedRemoved = new Set(syncSelectedRemoved);
      nextSelectedRemoved.add(s.nisnLama);
      setSyncSelectedRemoved(nextSelectedRemoved);
      
      const nextSelectedAdded = new Set(syncSelectedAdded);
      nextSelectedAdded.add(s.nisnBaru);
      setSyncSelectedAdded(nextSelectedAdded);
      
      return { ...prev, updated: newUpdated, removed: newRemoved, added: newAdded };
    });
  };

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.loggedIn && data.user) {
            setIsLocked(!!data.user.is_locked);
          }
        }
      } catch (err) {
        console.error("Gagal mengambil session", err);
      }
    };
    fetchSession();
    fetchKelas();
  }, []);

  useEffect(() => {
    const handleCloseDropdowns = () => setActiveDropdownId(null);
    window.addEventListener("click", handleCloseDropdowns);
    return () => window.removeEventListener("click", handleCloseDropdowns);
  }, []);

  useEffect(() => {
    if (creationMethod === "bank" && !isEditing) {
      const fetchBankRombels = async () => {
        setLoadingBankRombels(true);
        try {
          const res = await fetch(`/api/kelas/bank-rombel?tahun_pelajaran=${encodeURIComponent(tahunAjaran)}`);
          if (res.ok) {
            const data = await res.json();
            setBankRombels(data);
          } else {
            setBankRombels([]);
          }
        } catch (err) {
          console.error(err);
          setBankRombels([]);
        } finally {
          setLoadingBankRombels(false);
        }
      };
      fetchBankRombels();
    }
  }, [tahunAjaran, creationMethod, isEditing]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setNama("");
    setRombelNama("");
    setNamaKustom("");
    setTingkatan("");
    setMataPelajaran("");
    setMataPelajaranCustom("");
    setTahunAjaran("");
    setSemester("");
    setError("");
    setIsSaving(false);
    setCreationMethod(null);
    setHoverMethod(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (k) => {
    setIsEditing(true);
    setCurrentId(k.id);
    setNama(k.nama);
    setRombelNama(k.rombelNama || "");
    setNamaKustom(k.namaKustom || "");
    setTingkatan(k.tingkatan ? String(k.tingkatan) : "");
    const mapelVal = k.mataPelajaran || "";
    if (MATA_PELAJARAN_OPTIONS.includes(mapelVal)) {
      setMataPelajaran(mapelVal);
      setMataPelajaranCustom("");
    } else {
      setMataPelajaran("Lainnya");
      setMataPelajaranCustom(mapelVal);
    }
    const taVal = k.tahunAjaran || "";
    setTahunAjaran(TAHUN_AJARAN_OPTIONS.includes(taVal) ? taVal : taVal);
    setSemester(k.semester || "Ganjil");
    setError("");
    setIsSaving(false);
    setCreationMethod("manual");
    setHoverMethod("manual");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rombelNama.trim()) {
      setError("Nomor/Nama Rombel harus diisi.");
      return;
    }
    if (detectLevelInRombel(tingkatan, rombelNama)) {
      setError("Nama Rombel tidak boleh diawali dengan tingkatan (angka/romawi). Cukup tulis nama rombel saja, contoh: 'MIPA 1'.");
      return;
    }
    if (!tingkatan) {
      setError("Tingkatan kelas harus dipilih.");
      return;
    }
    const effectiveMapel = getEffectiveMataPelajaran();
    if (!effectiveMapel) {
      setError("Mata pelajaran harus diisi.");
      return;
    }
    if (!tahunAjaran) {
      setError("Tahun ajaran harus dipilih.");
      return;
    }
    if (!semester) {
      setError("Semester harus dipilih.");
      return;
    }

    // Auto-Trimming and construction
    const getRoman = (num) => {
      const roman = { 10: "X", 11: "XI", 12: "XII" };
      return roman[num] || num;
    };
    const romanTingkatan = getRoman(Number(tingkatan));
    const cleanRombel = rombelNama.trim().toUpperCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").replace(/\b0+(\d+)\b/g, "$1");
    const combinedNama = namaKustom.trim() 
      ? `${romanTingkatan} ${cleanRombel} - ${namaKustom.trim()}`
      : `${romanTingkatan} ${cleanRombel}`;

    setIsSaving(true);
    try {
      let response;
      const selectedPresetObj = ASPEK_PRESETS.find(p => p.id === presetAspek);
      const initialKolomNilai = selectedPresetObj ? JSON.parse(JSON.stringify(selectedPresetObj.kolomNilai)) : [];

      const payload = {
        nama: combinedNama,
        tingkatan: Number(tingkatan),
        rombelNama: cleanRombel,
        namaKustom: namaKustom.trim() || null,
        mataPelajaran: effectiveMapel,
        tahunAjaran: tahunAjaran.trim(),
        semester: semester.trim(),
        kolomNilai: isEditing ? undefined : initialKolomNilai,
        syncBankData: false
      };
      if (isEditing) {
        response = await fetch(`/api/kelas/${currentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch("/api/kelas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal memproses data");
      }

      setModalOpen(false);
      fetchKelas();

      if (!isEditing && data.kelas && data.kelas.id) {
        triggerConfirm(
          `Kelas "${payload.nama}" berhasil dibuat!\n\nLangkah selanjutnya yang sangat disarankan:\n1. Atur Komponen Nilai\n2. Tambah/Impor Siswa\n\nApakah Anda ingin langsung mengelola kelas ini sekarang?`,
          () => {
            router.push(`/guru/kelas/${data.kelas.id}?onboarding=true`);
          },
          { title: "🎉 Kelas Berhasil Dibuat!", confirmText: "🚀 Ya, Kelola Kelas", cancelText: "Nanti Saja" }
        );
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async (id, name) => {
    triggerConfirm(
      `Apakah Anda yakin ingin mengarsipkan kelas "${name}"?\nKelas ini tidak akan muncul di daftar aktif.`,
      async () => {
        try {
          const response = await fetch(`/api/kelas/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ archived: true }),
          });
          
          if (response.ok) {
            fetchKelas();
          } else {
            const data = await response.json();
            triggerConfirm(data.error || "Gagal mengarsipkan kelas.", null, { title: "Galat", confirmText: "OK", cancelText: "" });
          }
        } catch (err) {
          console.error("Archive failed", err);
        }
      },
      { title: "Arsipkan Kelas", confirmText: "Arsipkan", cancelText: "Batal" }
    );
  };

  const handleDelete = async (id, name) => {
    triggerConfirm(
      `⚠️ PERINGATAN KERAS!\nApakah Anda yakin ingin menghapus kelas "${name}"?\nTindakan ini bersifat PERMANEN dan akan menghapus semua data siswa serta nilai di dalamnya!`,
      async () => {
        try {
          const response = await fetch(`/api/kelas/${id}`, {
            method: "DELETE",
          });
          
          if (response.ok) {
            fetchKelas();
          } else {
            const data = await response.json();
            triggerConfirm(data.error || "Gagal menghapus kelas.", null, { title: "Galat", confirmText: "OK", cancelText: "" });
          }
        } catch (err) {
          console.error("Delete failed", err);
        }
      },
      { title: "⚠️ Hapus Kelas", confirmText: "Hapus Permanen", cancelText: "Batal", isDanger: true }
    );
  };

  const handleDuplicateOpen = (k) => {
    setSourceClass(k);
    setDupNama(`${k.nama} (Salinan)`);
    setDupTingkatan(k.tingkatan ? String(k.tingkatan) : "");
    const mapelVal = k.mataPelajaran || "";
    if (MATA_PELAJARAN_OPTIONS.includes(mapelVal)) {
      setDupMataPelajaran(mapelVal);
      setDupMataPelajaranCustom("");
    } else {
      setDupMataPelajaran("Lainnya");
      setDupMataPelajaranCustom(mapelVal);
    }
    setDupTahunAjaran(k.tahunAjaran);
    setDupSemester(k.semester || "Ganjil");
    setCopyStudents(true);
    setCopyGrades(false);
    setDupError("");
    setDuplicateModalOpen(true);
  };

  const handleDuplicateSubmit = async (e) => {
    e.preventDefault();
    if (!dupNama.trim()) {
      setDupError("Nama kelas baru harus diisi.");
      return;
    }
    if (!dupTingkatan) {
      setDupError("Tingkatan kelas harus dipilih.");
      return;
    }
    const effectiveDupMapel = dupMataPelajaran === "Lainnya" ? dupMataPelajaranCustom.trim() : dupMataPelajaran;
    if (!effectiveDupMapel) {
      setDupError("Mata pelajaran harus diisi.");
      return;
    }

    setIsDuplicating(true);
    setDupError("");

    try {
      let studentsPayload = [];
      if (copyStudents && sourceClass.siswa && sourceClass.siswa.length > 0) {
        studentsPayload = sourceClass.siswa.map((s) => {
          let nilaiPayload = {};
          if (copyGrades && s.nilai) {
            nilaiPayload = s.nilai;
          }
          return {
            nisn: s.nisn,
            nama: s.nama,
            tanggalLahir: s.tanggalLahir || "-",
            nilai: nilaiPayload,
            catatan: s.catatan || ""
          };
        });
      }

      const response = await fetch("/api/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: dupNama.trim(),
          tingkatan: Number(dupTingkatan),
          mataPelajaran: effectiveDupMapel,
          tahunAjaran: dupTahunAjaran.trim(),
          semester: dupSemester.trim(),
          kolomNilai: sourceClass.kolomNilai || [],
          siswa: studentsPayload,
          skemaPenilaian: sourceClass.skemaPenilaian || null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal menduplikasi kelas");
      }

      setDuplicateModalOpen(false);
      fetchKelas();
    } catch (err) {
      setDupError(err.message || "Terjadi kesalahan saat menduplikasi kelas.");
    } finally {
      setIsDuplicating(false);
    }
  };

  const processDapodikFile = async (file) => {
    if (!file) return;
    setDapodikUploadError("");
    setImportWarnings([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        // cellDates:false ensures dates come as serial numbers, then raw:false
        // converts all cells to their formatted display string — so dates come
        // back as "2008-09-03" instead of serial 39689, avoiding type guessing.
        const wb = XLSX.read(bstr, { type: "binary", cellDates: false });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });

        if (rows.length < 2) {
          setDapodikUploadError("Berkas Excel/CSV kosong atau format tidak sesuai.");
          return;
        }

        let headerRowIndex = -1;
        let nisnIdx = -1, namaIdx = -1, rombelIdx = -1, tglIdx = -1;
        let headers = [];

        // Scan the first 20 rows to find the actual header row
        for (let r = 0; r < Math.min(rows.length, 20); r++) {
          if (!rows[r] || !Array.isArray(rows[r])) continue;
          
          // Use Array.from to safely handle sparse arrays (non-adjacent columns)
          const tempHeaders = Array.from({ length: rows[r].length }, (_, i) => String(rows[r][i] || "").trim().toLowerCase());
          
          const nIdx = tempHeaders.findIndex((h) => h === "nisn" || h.includes("nisn"));
          const namIdx = tempHeaders.findIndex((h) => h === "nama" || h === "nama siswa" || h.includes("nama") || h.includes("peserta didik"));
          const romIdx = tempHeaders.findIndex((h) => h === "rombel" || h === "kelas" || h.includes("rombel") || h.includes("rombongan belajar") || h.includes("kelas saat ini"));
          
          if (nIdx !== -1 && namIdx !== -1 && romIdx !== -1) {
            headerRowIndex = r;
            headers = tempHeaders;
            nisnIdx = nIdx;
            namaIdx = namIdx;
            rombelIdx = romIdx;
            tglIdx = tempHeaders.findIndex((h) => h.includes("tanggal lahir") || (h.includes("lahir") && !h.includes("tempat")));
            break;
          }
        }

        if (headerRowIndex === -1) {
          setDapodikUploadError("Gagal menemukan baris header dengan kolom NISN, Nama, atau Rombel di dalam berkas. Pastikan file Dapodik sudah benar.");
          return;
        }

        const extractedStudents = [];
        const uniqueClasses = new Set();
        const warnings = [];

        // === Helper: normalize all known Dapodik date formats to YYYY-MM-DD ===
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
        // === End helper ===

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const cols = rows[i];
          if (!cols || !Array.isArray(cols) || cols.length === 0) continue;

          // NISN: remove thousands-separators that Excel formatting may add (e.g. "3,099,240,538")
          const nisnVal = cols[nisnIdx] ? String(cols[nisnIdx]).replace(/[,.\s]/g, "").trim() : "";
          const namaVal = cols[namaIdx] ? String(cols[namaIdx]).trim() : "";
          const rombelVal = cols[rombelIdx] ? String(cols[rombelIdx]).trim() : "";
          // With raw:false, date cells already come as formatted strings (e.g. "2008-09-03")
          // normalizeTanggal handles any remaining format variants as fallback
          const tglRaw = tglIdx !== -1 ? cols[tglIdx] : "";
          const tglVal = normalizeTanggal(tglRaw);


          // Pengecekan data tidak lengkap
          const missingFields = [];
          if (!nisnVal) missingFields.push("NISN");
          if (!namaVal) missingFields.push("Nama");
          if (!rombelVal) missingFields.push("Rombel");

          if (missingFields.length > 0) {
            // Catat baris bermasalah jika ada setidaknya salah satu data terisi (bukan baris kosong)
            if (nisnVal || namaVal || rombelVal) {
              const identifier = namaVal || nisnVal || `Baris ${i + 1}`;
              const rombelDesc = rombelVal ? `Rombel: ${rombelVal}` : "Rombel tidak terdefinisi";
              warnings.push(`Siswa "${identifier}" (${rombelDesc}) (Baris ${i + 1}) dilewati karena data tidak lengkap: ${missingFields.join(", ")} tidak ditemukan.`);
            }
            continue;
          }

          extractedStudents.push({ nisn: nisnVal, nama: namaVal, rombel: rombelVal, tanggalLahir: tglVal, nilai: {}, catatan: "" });
          uniqueClasses.add(rombelVal);
        }

        if (extractedStudents.length === 0) {
          let errorMsg = "Tidak ada data siswa yang valid untuk diimpor.";
          if (warnings.length > 0) {
            errorMsg += " Semua baris dilewati karena data tidak lengkap.";
          }
          setDapodikUploadError(errorMsg);
          setImportWarnings(warnings);
          return;
        }

        setImportWarnings(warnings);
        setParsedStudents(extractedStudents);
        const classArray = Array.from(uniqueClasses).sort();
        setParsedClasses(classArray);

        const initialForms = [{
          id: Date.now(),
          tingkatan: "",
          rombelNama: "",
          namaKustom: "",
          mataPelajaran: "",
          mataPelajaranCustom: "",
          tahunAjaran: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
          semester: "Ganjil",
          sourceRombel: ""
        }];

        setBulkForms(initialForms);
        setModalOpen(false); // Close the main Add Class modal
        setBulkModalOpen(true); // Open the configuration modal
        setBulkError("");
      } catch (err) {
        console.error(err);
        setDapodikUploadError("Terjadi kesalahan saat memproses berkas.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processDapodikFile(e.dataTransfer.files[0]);
    }
  };

  const handleBulkFormChange = (id, field, value) => {
    setBulkForms((prev) => {
      const updated = prev.map((form) => {
        if (form.id === id) {
          const newForm = { ...form, [field]: value };
          // Auto-fill rombelNama and tingkatan if sourceRombel is selected
          if (field === "sourceRombel" && value) {
            if (!newForm.rombelNama) {
              newForm.rombelNama = stripLevelFromRombel(value);
            }
            if (!newForm.tingkatan) {
              const m = value.match(/^(?:KELAS\s+)?(10|11|12|X{1,3}I{0,3})\b/i);
              if (m) {
                const lvl = m[1].toUpperCase();
                if (lvl === "10" || lvl === "X") newForm.tingkatan = "10";
                else if (lvl === "11" || lvl === "XI") newForm.tingkatan = "11";
                else if (lvl === "12" || lvl === "XII") newForm.tingkatan = "12";
              }
            }
          }
          return newForm;
        }
        return form;
      });

      const isLastFilled = updated[updated.length - 1].rombelNama.trim() !== "" || updated[updated.length - 1].sourceRombel !== "";
      if (isLastFilled) {
        updated.push({ id: Date.now(), tingkatan: "", rombelNama: "", namaKustom: "", mataPelajaran: "", mataPelajaranCustom: "", tahunAjaran: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`, semester: "Ganjil", sourceRombel: "" });
      }

      return updated;
    });
  };

  const handleRemoveBulkForm = (id) => {
    setBulkForms((prev) => prev.filter((f) => f.id !== id));
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setBulkError("");

    const validForms = bulkForms.filter((f) => f.rombelNama.trim() !== "" && f.sourceRombel !== "");
    if (validForms.length === 0) {
      setBulkError("Anda harus mengisi setidaknya satu kelas untuk diimpor.");
      return;
    }

    for (const form of validForms) {
      if (!form.tingkatan) {
        setBulkError(`Tingkatan kelas harus diisi untuk rombel "${form.rombelNama}".`);
        return;
      }
      if (detectLevelInRombel(form.tingkatan, form.rombelNama)) {
        setBulkError(`Nama Rombel untuk "${form.rombelNama}" tidak boleh diawali dengan tingkatan (angka/romawi). Cukup tulis nama rombel saja.`);
        return;
      }
      const effectiveMapel = form.mataPelajaran === "Lainnya" ? (form.mataPelajaranCustom || "").trim() : form.mataPelajaran;
      if (!effectiveMapel) {
        setBulkError(`Mata pelajaran harus diisi untuk rombel "${form.rombelNama}".`);
        return;
      }
      if (!form.tahunAjaran) {
        setBulkError(`Tahun ajaran harus diisi untuk rombel "${form.rombelNama}".`);
        return;
      }
    }

    setIsBulkImporting(true);

    try {
      // 1. Client-side check for student matching (Removed to allow empty classes)

      // 2. Prepare bulk payload
      const payload = {
        classes: validForms.map((form) => {
          const effectiveMapel = form.mataPelajaran === "Lainnya" ? (form.mataPelajaranCustom || "").trim() : form.mataPelajaran;
          const getRoman = (num) => {
            const roman = { 10: "X", 11: "XI", 12: "XII" };
            return roman[num] || num;
          };
          const romanTingkatan = getRoman(Number(form.tingkatan));
          const cleanRombel = form.rombelNama.trim().toUpperCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").replace(/\b0+(\d+)\b/g, "$1");
          const combinedNama = form.namaKustom.trim() 
            ? `${romanTingkatan} ${cleanRombel} - ${form.namaKustom.trim()}`
            : `${romanTingkatan} ${cleanRombel}`;

          const studentsForThisClass = parsedStudents.filter((s) => s.rombel === form.sourceRombel);

          return {
            nama: combinedNama,
            tingkatan: Number(form.tingkatan),
            rombelNama: cleanRombel,
            namaKustom: form.namaKustom.trim() || null,
            mataPelajaran: effectiveMapel,
            tahunAjaran: form.tahunAjaran.trim(),
            semester: form.semester.trim(),
            siswaList: studentsForThisClass
          };
        })
      };

      // 3. Send single HTTP Request
      const res = await fetch("/api/kelas/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let errMsg = errData.error || `Gagal melakukan impor massal (HTTP ${res.status})`;
        if (errData.detail && Array.isArray(errData.detail) && errData.detail.length > 0) {
          errMsg += "\n\nDetail Kesalahan:\n" + errData.detail.map(d => `- ${d}`).join("\n");
        }
        throw new Error(errMsg);
      }

      const resData = await res.json();
      if (resData.errors && resData.errors.length > 0) {
        console.warn("Some classes failed during bulk import:", resData.errors);
        const detailMsg = "\n\nNamun, beberapa kelas/siswa mengalami masalah/dilewati:\n" + resData.errors.map(d => `- ${d}`).join("\n");
        triggerConfirm(
          `${resData.results?.length ?? 0} Kelas berhasil diimpor.${detailMsg}`,
          null,
          { title: "Impor Selesai dengan Catatan", confirmText: "Selesai", cancelText: "" }
        );
      } else {
        triggerConfirm(`${resData.results?.length ?? 0} Kelas beserta siswanya berhasil diimpor!`, null, { title: "Impor Berhasil", confirmText: "Selesai", cancelText: "" });
      }
      setBulkModalOpen(false);
      fetchKelas();
    } catch (err) {
      console.error(err);
      setBulkError(err.message || "Terjadi kesalahan saat memproses impor massal.");
    } finally {
      setIsBulkImporting(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .clickable-class-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          cursor: pointer;
        }
        .clickable-class-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);
          border-color: var(--primary) !important;
        }
        .clickable-class-card:hover .card-click-indicator {
          color: var(--primary) !important;
        }
        .btn-dots:hover {
          background-color: var(--bg-tertiary);
        }
      `}} />
      <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Header section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div className="page-title-section" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Manajemen Kelas</h1>
          <p className="page-subtitle">Buat dan kelola kelas aktif untuk tahun ajaran berjalan.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <span className="spinner" style={{ width: "30px", height: "30px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
        </div>
      ) : kelas.length > 0 ? (
        <>
          {/* Filter Bar & Actions */}
          <div className="glass-card" style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "nowrap", padding: "12px 16px", alignItems: "center", overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <label className="hide-on-mobile" style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)" }}>Tingkatan:</label>
              <select
                className="form-input"
                value={filterTingkatan}
                onChange={(e) => setFilterTingkatan(e.target.value)}
                style={{ padding: "4px 10px", fontSize: "0.82rem", borderRadius: "var(--radius-sm)", width: "max-content", minWidth: "120px", appearance: "auto", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
              >
                <option value="Semua" style={{ backgroundColor: "var(--bg-secondary)" }}>Semua Tingkatan</option>
                {TINGKATAN_OPTIONS.map(t => (
                  <option key={t} value={String(t)} style={{ backgroundColor: "var(--bg-secondary)" }}>{t}</option>
                ))}
              </select>
            </div>
            
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
              <Link 
                href="/guru/arsip" 
                className="btn btn-outline"
                style={{ padding: "6px 10px", fontSize: "0.8rem", color: "var(--text-secondary)", borderColor: "var(--border-color)", borderStyle: "dashed" }}
                title="Lihat Kelas yang Diarsipkan"
              >
                📁 <span className="hide-on-mobile">Arsip</span>
              </Link>
              <button 
                onClick={() => setBulkSyncSelectionOpen(true)}
                className="btn btn-secondary"
                style={{ opacity: isLocked ? 0.6 : 1, cursor: isLocked ? "not-allowed" : "pointer", padding: "6px 10px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
                disabled={isLocked || kelas.length === 0}
                title="Sinkronisasi Massal"
              >
                🔄 <span className="hide-on-mobile">Sinkronisasi Massal</span>
              </button>
              <button 
                onClick={handleOpenAdd} 
                className="btn btn-primary"
                style={{ opacity: isLocked ? 0.6 : 1, cursor: isLocked ? "not-allowed" : "pointer", padding: "6px 10px", fontSize: "0.85rem" }}
                disabled={isLocked}
                title="Tambah Kelas"
              >
                ➕ <span className="hide-on-mobile">Tambah Kelas</span>
              </button>
            </div>
          </div>

          <div className="grid-kelas">
          {kelas.filter(k => filterTingkatan === "Semua" || String(k.tingkatan) === filterTingkatan).map((k) => (
            <div 
              key={k.id} 
              className="glass-card animate-fade-in clickable-class-card school-card" 
              onClick={(e) => {
                if (e.target.closest('button') || e.target.closest('a') || e.target.closest('select') || e.target.closest('input')) {
                  return;
                }
                router.push(`/guru/kelas/${k.id}`);
              }}
              style={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: "20px", 
                borderBottom: "4px solid var(--primary)",
                position: "relative",
                overflow: "hidden",
                backgroundImage: "radial-gradient(var(--border-color) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
                backgroundPosition: "-10px -10px"
              }}
            >
              {/* School Watermark */}
              <div style={{ position: "absolute", bottom: "-10px", right: "10px", fontSize: "80px", opacity: 0.04, pointerEvents: "none", zIndex: 0 }}>
                🏫
              </div>
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "8px" }}>
                  <h3 style={{ fontSize: "clamp(1.1rem, 4vw, 1.4rem)", fontWeight: "900", lineHeight: "1.2", margin: 0, color: "var(--text-primary)", wordBreak: "break-word" }}>
                    {k.nama}
                  </h3>
                  
                  <div style={{ position: "relative", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => setActiveDropdownId(activeDropdownId === k.id ? null : k.id)} 
                      className="btn-dots"
                      style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "1.4rem", cursor: "pointer", padding: "0px 4px", borderRadius: "4px", display: "flex", alignItems: "center", transition: "background 0.2s" }}
                      title="Menu Kelas"
                    >
                      ⋮
                    </button>
                    {activeDropdownId === k.id && (
                      <div style={{ position: "absolute", right: 0, top: "100%", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-lg)", zIndex: 10, display: "flex", flexDirection: "column", minWidth: "120px", overflow: "hidden", marginTop: "4px" }}>
                        <button onClick={() => { handleOpenEdit(k); setActiveDropdownId(null); }} disabled={isLocked} style={{ padding: "8px 12px", background: "none", border: "none", color: "var(--text-primary)", textAlign: "left", fontSize: "0.85rem", cursor: isLocked ? "not-allowed" : "pointer", opacity: isLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>✏️ Edit</button>
                        <button onClick={() => { handleDuplicateOpen(k); setActiveDropdownId(null); }} disabled={isLocked} style={{ padding: "8px 12px", background: "none", border: "none", color: "var(--text-primary)", textAlign: "left", fontSize: "0.85rem", cursor: isLocked ? "not-allowed" : "pointer", opacity: isLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>📋 Duplikat</button>
                        <button onClick={() => { handleArchive(k.id, k.nama); setActiveDropdownId(null); }} disabled={isLocked} style={{ padding: "8px 12px", background: "none", border: "none", color: "var(--warning)", textAlign: "left", fontSize: "0.85rem", cursor: isLocked ? "not-allowed" : "pointer", opacity: isLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>📁 Arsip</button>
                        <button onClick={() => { handleDelete(k.id, k.nama); setActiveDropdownId(null); }} disabled={isLocked} style={{ padding: "8px 12px", background: "none", border: "none", color: "var(--danger)", textAlign: "left", fontSize: "0.85rem", cursor: isLocked ? "not-allowed" : "pointer", opacity: isLocked ? 0.5 : 1, display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>🗑️ Hapus</button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
                  {k.tingkatan && (
                    <span className="badge" style={{ fontSize: "0.7rem", padding: "4px 8px", backgroundColor: "var(--primary-glow)", color: "var(--primary)", border: "1px solid rgba(139, 92, 246, 0.15)", fontWeight: "700" }}>
                      🎓 KLS {k.tingkatan}
                    </span>
                  )}
                  <span className="badge badge-primary" style={{ fontSize: "0.7rem", padding: "4px 8px" }}>
                    📚 {k.tahunAjaran}
                  </span>
                  <span className="badge" style={{ fontSize: "0.7rem", padding: "4px 8px", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.15)" }}>
                    ⏱️ {k.semester || "Ganjil"}
                  </span>
                  <span className="badge" style={{ fontSize: "0.7rem", padding: "4px 8px", backgroundColor: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "4px", fontWeight: "700" }}>
                    💻 {k.mataPelajaran}
                  </span>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "600" }}>Kode:</span>
                  <code style={{ fontSize: "0.75rem", backgroundColor: "var(--bg-tertiary)", padding: "2px 6px", borderRadius: "4px", color: "var(--primary)", border: "1px solid var(--border-color)", fontWeight: "700" }}>{k.id}</code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(k.id);
                      triggerConfirm("Kode Kelas berhasil disalin ke papan klip!", null, { title: "Salin Kode", confirmText: "OK", cancelText: "" });
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", padding: "2px" }}
                    title="Salin Kode Kelas"
                  >
                    📋
                  </button>
                </div>
                
                {/* Compact Stats for Mobile & Desktop */}
                <div style={{ display: "flex", gap: "12px", marginTop: "12px", borderTop: "1px dashed var(--border-color)", paddingTop: "12px", color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: "600" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    👨‍🎓 {k.siswa.length} Siswa
                  </span>
                  <span style={{ color: "var(--border-color)" }}>|</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    🏷️ {k.kolomNilai.length} Komponen
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "auto", position: "relative", zIndex: 1 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <Link href={`/guru/kelas/${k.id}`} className="btn btn-primary" style={{ justifyContent: "center", padding: "8px", fontSize: "0.8rem", fontWeight: "700", display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }} title="Kelola Nilai">
                    <span>📊</span>
                    <span style={{ fontSize: "0.65rem" }}>Nilai</span>
                  </Link>
                  <Link href={`/guru/kelas/${k.id}?action=quick-attendance`} className="btn" style={{ justifyContent: "center", padding: "8px", fontSize: "0.8rem", backgroundColor: "#10b981", color: "#ffffff", border: "none", fontWeight: "700", display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }} title="Presensi">
                    <span>⚡</span>
                    <span style={{ fontSize: "0.65rem" }}>Presensi</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
          </div>
        </>

      ) : (
        <div style={{ padding: "60px 20px", textAlign: "center", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-color)" }}>
          <h3 style={{ fontSize: "1.25rem", color: "var(--text-secondary)", marginBottom: "8px" }}>Belum Ada Kelas Aktif</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "20px" }}>Silakan klik tombol di atas untuk membuat kelas baru.</p>
          <button 
            onClick={handleOpenAdd} 
            className="btn btn-primary" 
            style={{ display: "inline-flex", opacity: isLocked ? 0.6 : 1, cursor: isLocked ? "not-allowed" : "pointer", boxShadow: !isLocked ? "0 0 0 4px rgba(59,130,246,0.2)" : "none", animation: !isLocked ? "pulse-soft 2s infinite" : "none" }}
            disabled={isLocked}
          >
            ➕ Tambah Kelas Pertama
            {!isLocked && (
              <span className="badge badge-warning" style={{ fontSize: "0.6rem", padding: "2px 6px", marginLeft: "6px" }}>Mulai Disini</span>
            )}
          </button>
          
          <div style={{ marginTop: "24px" }}>
            <Link href="/guru/arsip" style={{ fontSize: "0.85rem", color: "var(--text-muted)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <span>📁</span> Buka Arsip Kelas
            </Link>
          </div>
        </div>
      )}
      </div>

      {modalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div 
            className="glass-card animate-fade-in modal-content-scroll" 
            style={{ 
              width: "100%", 
              maxWidth: isEditing || creationMethod === "manual" ? "450px" : (creationMethod === "excel" ? "600px" : "680px"), 
              border: "1px solid var(--border-focus)", 
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              maxHeight: "90vh",
              overflowY: "auto"
            }}
          >
            {creationMethod === null && !isEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "14px" }}>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: "800", margin: 0 }}>➕ Tambah Kelas Baru</h3>
                  <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}>✕</button>
                </div>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: 0 }}>Pilih metode pembuatan kelas yang paling sesuai dengan kebutuhan Anda:</p>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginTop: "8px" }}>
                  {/* Pilihan 1: Impor Excel */}
                  <div 
                    onClick={() => { setCreationMethod("excel"); setDapodikUploadError(""); }}
                    onMouseEnter={() => setHoverMethod("excel")}
                    onMouseLeave={() => setHoverMethod(null)}
                    style={{
                      border: hoverMethod === "excel" ? "1px solid var(--primary)" : "1px solid var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      padding: "20px",
                      cursor: "pointer",
                      backgroundColor: hoverMethod === "excel" ? "var(--primary-glow)" : "var(--bg-secondary)",
                      transition: "var(--transition)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px"
                    }}
                  >
                    <span style={{ fontSize: "2rem" }}>📥</span>
                    <strong style={{ fontSize: "1.05rem", color: "var(--primary)" }}>Impor dari Berkas Excel (atau Dapodik)</strong>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                      <strong>Direkomendasikan untuk banyak kelas.</strong> Cukup unggah berkas excel/csv data siswa, sistem akan otomatis membaca daftar rombel dan nama siswa tanpa perlu mengetik satu-per-satu.
                    </span>
                  </div>

                  {/* Pilihan 2: Buat Kelas Kosong (Manual) */}
                  <div 
                    onClick={() => { setCreationMethod("manual"); }}
                    onMouseEnter={() => setHoverMethod("manual")}
                    onMouseLeave={() => setHoverMethod(null)}
                    style={{
                      border: hoverMethod === "manual" ? "1px solid var(--primary)" : "1px solid var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      padding: "20px",
                      cursor: "pointer",
                      backgroundColor: hoverMethod === "manual" ? "var(--primary-glow)" : "var(--bg-secondary)",
                      transition: "var(--transition)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px"
                    }}
                  >
                    <span style={{ fontSize: "2rem" }}>📝</span>
                    <strong style={{ fontSize: "1.05rem", color: "var(--primary)" }}>Buat Kelas Kosong</strong>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                      <strong>Manual.</strong> Buat nama kelas terlebih dahulu. Siswa dapat ditambahkan satu per satu atau diimpor di menu Kelola Siswa.
                    </span>
                  </div>

                  {/* Pilihan 3: Ambil dari Bank Data */}
                  <div 
                    onClick={() => { setCreationMethod("bank"); setBankRombels([]); setSelectedBankRombels({}); }}
                    onMouseEnter={() => setHoverMethod("bank")}
                    onMouseLeave={() => setHoverMethod(null)}
                    style={{
                      border: hoverMethod === "bank" ? "1px solid var(--primary)" : "1px solid var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      padding: "20px",
                      cursor: "pointer",
                      backgroundColor: hoverMethod === "bank" ? "var(--primary-glow)" : "var(--bg-secondary)",
                      transition: "var(--transition)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px"
                    }}
                  >
                    <span style={{ fontSize: "2rem" }}>☁️</span>
                    <strong style={{ fontSize: "1.05rem", color: "var(--primary)" }}>Ambil dari Bank Data</strong>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                      <strong>Direkomendasikan.</strong> Tarik data otomatis dari pusat Bank Data sekolah Anda. Mirip dengan impor massal namun tanpa perlu file Excel.
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px", borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
                  <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary" style={{ fontSize: "0.85rem" }}>
                    Batal
                  </button>
                </div>
              </div>
            ) : creationMethod === "bank" && !isEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "1.4rem" }}>☁️</span>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--primary)", margin: 0 }}>Ambil dari Bank Data</h3>
                  </div>
                  <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}>✕</button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <label className="form-label" style={{ marginBottom: "0" }}>Tahun Pelajaran</label>
                  <select
                    className="form-input"
                    value={tahunAjaran}
                    onChange={(e) => {
                       setTahunAjaran(e.target.value);
                       setBankRombels([]);
                       setSelectedBankRombels({});
                    }}
                    style={{ padding: "8px", fontSize: "0.9rem", appearance: "auto" }}
                  >
                    <option value="" disabled>-- Pilih T.A. --</option>
                    {TAHUN_AJARAN_OPTIONS.map(ta => (
                      <option key={ta} value={ta}>{ta}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px", minHeight: "150px" }}>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: "700", margin: 0 }}>Pilih Rombel yang Tersedia:</h4>
                  {loadingBankRombels ? (
                    <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      Sedang memuat data dari Bank Data...
                    </div>
                  ) : bankRombels.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "30px", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-tertiary)" }}>
                      <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📭</div>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Tidak ada data rombel di Bank Data untuk Tahun Ajaran {tahunAjaran}</span>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", maxHeight: "250px", overflowY: "auto", padding: "4px" }} className="modal-content-scroll">
                      {bankRombels.map(br => {
                        const key = `${br.tingkatan}-${br.rombel}`;
                        return (
                          <label key={key} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", cursor: "pointer", backgroundColor: selectedBankRombels[key] ? "rgba(59,130,246,0.1)" : "var(--bg-secondary)", transition: "var(--transition)" }}>
                            <input 
                              type="checkbox" 
                              checked={!!selectedBankRombels[key]} 
                              onChange={(e) => {
                                setSelectedBankRombels(prev => ({ ...prev, [key]: e.target.checked }));
                              }}
                            />
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <strong style={{ fontSize: "0.9rem" }}>Tingkat {br.tingkatan} - {br.rombel}</strong>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{br.siswaCount || '?'} Siswa</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {dapodikUploadError && (
                  <div style={{ padding: "12px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--danger-glow)", color: "var(--danger)", fontSize: "0.82rem", border: "1px solid rgba(239, 68, 68, 0.15)" }}>
                    ❌ {dapodikUploadError}
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px", borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
                  <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary" style={{ fontSize: "0.85rem" }} disabled={bankSiswaLoading}>
                    Batal
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ fontSize: "0.85rem" }}
                    disabled={Object.values(selectedBankRombels).filter(Boolean).length === 0 || bankSiswaLoading}
                    onClick={async () => {
                      setBankSiswaLoading(true);
                      setDapodikUploadError("");
                      try {
                        const res = await fetch(`/api/kelas/bank-data?tahun_pelajaran=${encodeURIComponent(tahunAjaran)}`);
                        if (!res.ok) throw new Error("Gagal mengambil Bank Data Siswa");
                        const data = await res.json();
                        
                        const selectedKeys = Object.keys(selectedBankRombels).filter(k => selectedBankRombels[k]);
                        const targetRombels = new Set(selectedKeys.map(k => k.split('-')[1]));
                        
                        const filteredStudents = data.filter(s => targetRombels.has(s.rombel));
                        if (filteredStudents.length === 0) {
                          throw new Error("Tidak ada siswa ditemukan di Bank Data untuk rombel terpilih.");
                        }
                        
                        const extStudents = filteredStudents.map(s => ({
                          nisn: s.nisn,
                          nama: s.nama,
                          rombel: s.rombel,
                          tanggalLahir: s.tanggal_lahir || "",
                          nilai: {},
                          catatan: ""
                        }));
                        
                        const initialForms = [];
                        selectedKeys.forEach((key, idx) => {
                          const [t, r] = key.split('-');
                          initialForms.push({
                            id: Date.now() + idx,
                            tingkatan: t,
                            rombelNama: stripLevelFromRombel(r),
                            namaKustom: "",
                            mataPelajaran: "",
                            mataPelajaranCustom: "",
                            tahunAjaran: tahunAjaran,
                            semester: "Ganjil",
                            sourceRombel: r
                          });
                        });
                        
                        setParsedStudents(extStudents);
                        setParsedClasses(Array.from(targetRombels));
                        setBulkForms(initialForms);
                        setBulkModalOpen(true);
                        setModalOpen(false);
                      } catch (err) {
                        setDapodikUploadError(err.message);
                      } finally {
                        setBankSiswaLoading(false);
                      }
                    }}
                  >
                    {bankSiswaLoading ? "Menarik Data..." : "Lanjutkan ke Impor Massal ➔"}
                  </button>
                </div>
              </div>
            ) : creationMethod === "excel" && !isEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "1.4rem" }}>📥</span>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--primary)", margin: 0 }}>Impor Kelas dari Berkas Excel</h3>
                  </div>
                  <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}>✕</button>
                </div>

                {/* Petunjuk Penggunaan & Kolom Minimal */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <h4 style={{ fontSize: "1rem", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>📋 Petunjuk Berkas Excel:</h4>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: "1.5" }}>
                    Anda dapat menggunakan berkas ekspor <strong>Dapodik</strong> langsung dari operator sekolah, atau membuat berkas Excel sendiri (format <code>.xlsx</code>, <code>.xls</code>, atau <code>.csv</code>) yang memiliki kolom wajib berikut:
                  </p>
                  <ul style={{ fontSize: "0.82rem", color: "var(--text-secondary)", paddingLeft: "18px", lineHeight: "1.5", display: "flex", flexDirection: "column", gap: "4px", margin: 0 }}>
                    <li><strong>NISN</strong> (Nomor Induk Siswa Nasional)</li>
                    <li><strong>Nama</strong> (atau <em>Nama Siswa</em> / <em>Nama Peserta Didik</em>)</li>
                    <li><strong>Rombel</strong> (atau <em>Kelas</em> / <em>Rombongan Belajar</em>)</li>
                    <li><strong>Tanggal Lahir</strong> (opsional)</li>
                  </ul>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0, fontStyle: "italic" }}>
                    * Catatan: Jika berkas Excel memiliki kolom lain (seperti Jenis Kelamin, Alamat, dll.), Anda tidak perlu menghapusnya. Sistem otomatis mengabaikan kolom lainnya.
                  </p>
                </div>

                {/* Error Banner */}
                {dapodikUploadError && (
                  <div style={{ padding: "12px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--danger-glow)", color: "var(--danger)", fontSize: "0.82rem", border: "1px solid rgba(239, 68, 68, 0.15)" }}>
                    ❌ {dapodikUploadError}
                  </div>
                )}

                {/* Upload Area */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  style={{
                    position: "relative",
                    border: dragActive ? "2px dashed var(--primary)" : "2px dashed var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    padding: "40px 20px",
                    backgroundColor: dragActive ? "var(--primary-glow)" : "rgba(59,130,246,0.02)",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "var(--transition)"
                  }}
                >
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processDapodikFile(e.target.files[0]);
                      }
                    }}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
                  />
                  <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>📁</div>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600", display: "block" }}>
                    Klik atau seret berkas Excel ke sini
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                    Mendukung format .xlsx, .xls, atau .csv
                  </span>
                </div>

                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
                  <button type="button" onClick={() => setCreationMethod(null)} className="btn btn-secondary" style={{ fontSize: "0.85rem" }}>
                    ⬅️ Kembali
                  </button>
                  <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary" style={{ fontSize: "0.85rem" }}>
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "20px" }}>
                  {isEditing ? "✏️ Edit Kelas" : "➕ Tambah Kelas Baru Manual"}
                </h3>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* 1 & 2. Tingkatan & No./Nama Rombel */}
                  {!isEditing && bankRombels.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "-10px" }}>
                      <label style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "var(--primary)", fontWeight: "600" }}>
                        <input
                          type="checkbox"
                          checked={useBankData}
                          onChange={(e) => {
                            setUseBankData(e.target.checked);
                            if (e.target.checked) {
                              setTingkatan("");
                              setRombelNama("");
                            }
                          }}
                        />
                        Pilih dari Bank Data Sekolah
                      </label>
                    </div>
                  )}
                  
                  {useBankData && !isEditing && bankRombels.length > 0 ? (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Tingkatan & Rombel (dari Bank Data) <span style={{ color: "var(--danger)" }}>*</span></label>
                      <select
                        className="form-input"
                        value={`${tingkatan}-${rombelNama}`}
                        onChange={(e) => {
                          if (!e.target.value) {
                            setTingkatan("");
                            setRombelNama("");
                            return;
                          }
                          const [t, ...r] = e.target.value.split('-');
                          setTingkatan(t);
                          setRombelNama(r.join('-'));
                        }}
                        style={{ 
                          appearance: "auto", 
                          backgroundColor: "var(--bg-secondary)", 
                          color: "var(--text-primary)", 
                          border: "1px solid var(--border-color)" 
                        }}
                        required
                      >
                        <option value="-" disabled style={{ backgroundColor: "var(--bg-secondary)" }}>-- Pilih Rombel --</option>
                        {bankRombels.map(br => (
                          <option key={`${br.tingkatan}-${br.rombel}`} value={`${br.tingkatan}-${br.rombel}`} style={{ backgroundColor: "var(--bg-secondary)" }}>
                            Tingkat {br.tingkatan} - {br.rombel}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "12px" }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Tingkatan <span style={{ color: "var(--danger)" }}>*</span></label>
                        <select
                          className="form-input"
                          value={tingkatan}
                          onChange={(e) => setTingkatan(e.target.value)}
                          style={{ 
                            appearance: "auto", 
                            backgroundColor: "var(--bg-secondary)", 
                            color: "var(--text-primary)", 
                            border: "1px solid var(--border-color)" 
                          }}
                        >
                          <option value="" disabled style={{ backgroundColor: "var(--bg-secondary)" }}>-- Pilih --</option>
                          {TINGKATAN_OPTIONS.map(t => (
                            <option key={t} value={String(t)} style={{ backgroundColor: "var(--bg-secondary)" }}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">No./Nama Rombel <span style={{ color: "var(--danger)" }}>*</span></label>
                        <input
                          type="text"
                          placeholder="Contoh: MIPA 1 atau 1"
                          className="form-input"
                          value={rombelNama}
                          onChange={(e) => setRombelNama(e.target.value)}
                          required
                        />
                        {detectLevelInRombel(tingkatan, rombelNama) && (
                          <span style={{ color: "var(--warning)", fontSize: "0.75rem", marginTop: "4px", display: "block", lineHeight: "1.3" }}>
                            ⚠️ Cukup tulis nama rombel saja (contoh: "MIPA 1", bukan "XI MIPA 1" atau "{tingkatan} MIPA 1").
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. Pratinjau Nama Kelas */}
                  <div style={{ 
                    backgroundColor: "var(--bg-secondary)", 
                    border: "1px dashed var(--border-color)", 
                    borderRadius: "var(--radius-sm)", 
                    padding: "12px 16px",
                    fontSize: "0.85rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px"
                  }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>🏷️ Pratinjau Nama Kelas</span>
                    <strong style={{ fontSize: "1rem", color: "var(--primary)" }}>
                      {(() => {
                        const getRoman = (num) => {
                          const roman = { 10: "X", 11: "XI", 12: "XII" };
                          return roman[num] || num;
                        };
                        const romanTingkatan = tingkatan ? getRoman(Number(tingkatan)) : "[Tingkatan]";
                        const displayRombel = rombelNama.trim() 
                          ? rombelNama.trim().toUpperCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").replace(/\b0+(\d+)\b/g, "$1") 
                          : "[Rombel]";
                        return namaKustom.trim()
                          ? `${romanTingkatan} ${displayRombel} - ${namaKustom.trim()}`
                          : `${romanTingkatan} ${displayRombel}`;
                      })()}
                    </strong>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Mata Pelajaran <span style={{ color: "var(--danger)" }}>*</span></label>
                    <select
                      className="form-input"
                      value={mataPelajaran}
                      onChange={(e) => { setMataPelajaran(e.target.value); if (e.target.value !== "Lainnya") setMataPelajaranCustom(""); }}
                      style={{ 
                        appearance: "auto", 
                        backgroundColor: "var(--bg-secondary)", 
                        color: "var(--text-primary)", 
                        border: "1px solid var(--border-color)" 
                      }}
                    >
                      <option value="" disabled style={{ backgroundColor: "var(--bg-secondary)" }}>-- Pilih Mata Pelajaran --</option>
                      {MATA_PELAJARAN_OPTIONS.map(mp => (
                        <option key={mp} value={mp} style={{ backgroundColor: "var(--bg-secondary)" }}>{mp}</option>
                      ))}
                    </select>
                    {mataPelajaran === "Lainnya" && (
                      <input
                        type="text"
                        placeholder="Ketik nama mata pelajaran..."
                        className="form-input"
                        value={mataPelajaranCustom}
                        onChange={(e) => setMataPelajaranCustom(e.target.value)}
                        style={{ marginTop: "8px" }}
                      />
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Tahun Ajaran <span style={{ color: "var(--danger)" }}>*</span></label>
                    <select
                      className="form-input"
                      value={tahunAjaran}
                      onChange={(e) => setTahunAjaran(e.target.value)}
                      style={{ 
                        appearance: "auto", 
                        backgroundColor: "var(--bg-secondary)", 
                        color: "var(--text-primary)", 
                        border: "1px solid var(--border-color)" 
                      }}
                    >
                      <option value="" disabled style={{ backgroundColor: "var(--bg-secondary)" }}>-- Pilih Tahun Ajaran --</option>
                      {TAHUN_AJARAN_OPTIONS.map(ta => (
                        <option key={ta} value={ta} style={{ backgroundColor: "var(--bg-secondary)" }}>{ta}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Semester <span style={{ color: "var(--danger)" }}>*</span></label>
                    <select
                      className="form-input"
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      style={{ 
                        appearance: "auto", 
                        backgroundColor: "var(--bg-secondary)", 
                        color: "var(--text-primary)", 
                        border: "1px solid var(--border-color)" 
                      }}
                    >
                      <option value="" disabled style={{ backgroundColor: "var(--bg-secondary)" }}>-- Pilih Semester --</option>
                      <option value="Ganjil" style={{ backgroundColor: "var(--bg-secondary)" }}>Semester Ganjil</option>
                      <option value="Genap" style={{ backgroundColor: "var(--bg-secondary)" }}>Semester Genap</option>
                    </select>
                  </div>

                  {!isEditing && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>✨ Preset Komponen Nilai (Opsional)</span>
                      </label>
                      <select
                        className="form-input"
                        value={presetAspek}
                        onChange={(e) => setPresetAspek(e.target.value)}
                        style={{ 
                          appearance: "auto", 
                          backgroundColor: "var(--bg-secondary)", 
                          color: "var(--text-primary)", 
                          border: "1px solid var(--border-color)" 
                        }}
                      >
                        <option value="none">Tanpa Preset (Kosong / Atur Nanti)</option>
                        {ASPEK_PRESETS.map(p => (
                          <option key={p.id} value={p.id} style={{ backgroundColor: "var(--bg-secondary)" }}>
                            {p.nama}
                          </option>
                        ))}
                      </select>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                        Otomatis membuat struktur komponen &amp; bobot penilaian sesuai standar kurikulum.
                      </span>
                    </div>
                  )}

                  {/* Sinkronisasi dihapus karena sudah ada mode tersendiri */}

                  {error && (
                    <div style={{ padding: "10px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--danger-glow)", color: "var(--danger)", fontSize: "0.85rem" }}>
                      ❌ {error}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "10px", justifyContent: "space-between", marginTop: "10px" }}>
                    {!isEditing ? (
                      <button type="button" onClick={() => setCreationMethod(null)} className="btn btn-secondary" disabled={isSaving}>
                        ⬅️ Kembali
                      </button>
                    ) : (
                      <div />
                    )}
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary" disabled={isSaving}>
                        Batal
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? (
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
                </form>
              </>
            )}
          </div>
        </div>
      )}


      {/* Bulk Modal for Dapodik Import */}
      {bulkModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div className="glass-card animate-fade-in modal-content-scroll" style={{ width: "100%", maxWidth: "800px", border: "1px solid var(--primary)", boxShadow: "0 20px 40px rgba(59,130,246,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--primary)" }}>
                  📦 Pembuatan Kelas Massal
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Ditemukan <strong>{parsedStudents.length} siswa</strong> dari <strong>{parsedClasses.length} rombel/kelas</strong>. Silakan atur pembuatan kelas di bawah ini.
                </p>
              </div>
              <button onClick={() => setBulkModalOpen(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            {importWarnings.length > 0 && (
              <div style={{
                maxHeight: "130px",
                overflowY: "auto",
                backgroundColor: "var(--warning-glow)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                fontSize: "0.8rem",
                color: "var(--text-primary)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                marginBottom: "16px"
              }}>
                <strong style={{ color: "var(--warning)" }}>⚠️ Pemberitahuan: {importWarnings.length} siswa tidak berhasil ditambahkan karena data tidak lengkap:</strong>
                <ul style={{ paddingLeft: "16px", margin: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                  {importWarnings.map((warn, idx) => (
                    <li key={idx}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleBulkSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="premium-table" style={{ minWidth: "800px", margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: "12%" }}>Tingkatan</th>
                      <th style={{ width: "18%" }}>No./Nama Rombel</th>
                      <th style={{ width: "22%" }}>Mata Pelajaran</th>
                      <th style={{ width: "14%" }}>T.A.</th>
                      <th style={{ width: "12%" }}>Semester</th>
                      <th style={{ width: "18%" }}>Sumber Siswa</th>
                      <th style={{ width: "4%" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkForms.map((form, index) => (
                      <tr key={form.id}>
                        <td style={{ padding: "8px" }}>
                          <select className="form-input" value={form.tingkatan} onChange={(e) => handleBulkFormChange(form.id, "tingkatan", e.target.value)} style={{ padding: "8px", fontSize: "0.85rem", appearance: "auto" }}>
                            <option value="" disabled>-- Pilih --</option>
                            {TINGKATAN_OPTIONS.map(t => (
                              <option key={t} value={String(t)}>{t}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: "8px" }}>
                          <input type="text" className="form-input" placeholder="Contoh: MIPA 1 atau 1" value={form.rombelNama} onChange={(e) => handleBulkFormChange(form.id, "rombelNama", e.target.value)} style={{ padding: "8px", fontSize: "0.85rem" }} />
                          {detectLevelInRombel(form.tingkatan, form.rombelNama) && (
                            <span style={{ color: "var(--warning)", fontSize: "0.7rem", marginTop: "4px", display: "block", lineHeight: "1.2" }}>
                              ⚠️ Tanpa tingkatan
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "8px" }}>
                          <select
                            className="form-input"
                            value={form.mataPelajaran}
                            onChange={(e) => {
                              handleBulkFormChange(form.id, "mataPelajaran", e.target.value);
                              if (e.target.value !== "Lainnya") {
                                handleBulkFormChange(form.id, "mataPelajaranCustom", "");
                              }
                            }}
                            style={{ padding: "8px", fontSize: "0.85rem", appearance: "auto" }}
                          >
                            <option value="" disabled>-- Pilih Mapel --</option>
                            {MATA_PELAJARAN_OPTIONS.map(mp => (
                              <option key={mp} value={mp}>{mp}</option>
                            ))}
                          </select>
                          {form.mataPelajaran === "Lainnya" && (
                            <input
                              type="text"
                              placeholder="Mapel kustom..."
                              className="form-input"
                              value={form.mataPelajaranCustom || ""}
                              onChange={(e) => handleBulkFormChange(form.id, "mataPelajaranCustom", e.target.value)}
                              style={{ marginTop: "4px", padding: "6px 8px", fontSize: "0.8rem" }}
                            />
                          )}
                        </td>
                        <td style={{ padding: "8px" }}>
                          <select
                            className="form-input"
                            value={form.tahunAjaran}
                            onChange={(e) => handleBulkFormChange(form.id, "tahunAjaran", e.target.value)}
                            style={{ padding: "8px", fontSize: "0.85rem", appearance: "auto" }}
                          >
                            <option value="" disabled>-- Pilih T.A. --</option>
                            {TAHUN_AJARAN_OPTIONS.map(ta => (
                              <option key={ta} value={ta}>{ta}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: "8px" }}>
                          <select className="form-input" value={form.semester} onChange={(e) => handleBulkFormChange(form.id, "semester", e.target.value)} style={{ padding: "8px", fontSize: "0.85rem", appearance: "auto" }}>
                            <option value="" disabled>-- Semester --</option>
                            <option value="Ganjil">Ganjil</option>
                            <option value="Genap">Genap</option>
                          </select>
                        </td>
                        <td style={{ padding: "8px" }}>
                          <select className="form-input" value={form.sourceRombel} onChange={(e) => handleBulkFormChange(form.id, "sourceRombel", e.target.value)} style={{ padding: "8px", fontSize: "0.85rem", appearance: "auto" }}>
                            <option value="">-- Abaikan --</option>
                            {parsedClasses.map((cls) => {
                              const count = parsedStudents.filter(s => s.rombel === cls).length;
                              return (
                                <option key={cls} value={cls}>{cls} ({count} siswa)</option>
                              );
                            })}
                          </select>
                        </td>
                        <td style={{ padding: "8px", textAlign: "center" }}>
                          {index !== bulkForms.length - 1 ? (
                            <button type="button" onClick={() => handleRemoveBulkForm(form.id)} className="btn btn-secondary" style={{ color: "var(--danger)", padding: "4px 8px" }} title="Hapus Baris">✖</button>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>✧</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {bulkError && (
                <div style={{ padding: "10px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--danger-glow)", color: "var(--danger)", fontSize: "0.85rem" }}>
                  ❌ {bulkError}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" onClick={() => setBulkModalOpen(false)} className="btn btn-secondary" disabled={isBulkImporting}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={isBulkImporting}>
                  {isBulkImporting ? (
                    <>
                      <span className="btn-spinner" />
                      Mengimpor...
                    </>
                  ) : (
                    "🚀 Simpan & Impor Kelas"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Glassmorphism Modal for Duplicate Class */}
      {duplicateModalOpen && sourceClass && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div className="glass-card animate-fade-in modal-content-scroll" style={{ width: "100%", maxWidth: "450px", border: "1px solid var(--primary)", boxShadow: "0 20px 40px rgba(59,130,246,0.2)" }}>
            <h3 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "8px", color: "var(--primary)" }}>
              📋 Duplikat Kelas
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "20px" }}>
              Salin konfigurasi kelas <strong>{sourceClass.nama}</strong> ke kelas baru.
            </p>

            <form onSubmit={handleDuplicateSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Kelas Baru <span style={{ color: "var(--danger)" }}>*</span></label>
                <input
                  type="text"
                  placeholder="Contoh: Kelas XI-IPA 2 (Salinan)"
                  className="form-input"
                  value={dupNama}
                  onChange={(e) => setDupNama(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tingkatan <span style={{ color: "var(--danger)" }}>*</span></label>
                <select
                  className="form-input"
                  value={dupTingkatan}
                  onChange={(e) => setDupTingkatan(e.target.value)}
                  style={{ appearance: "auto", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                >
                  <option value="" disabled style={{ backgroundColor: "var(--bg-secondary)" }}>-- Pilih Tingkatan --</option>
                  {TINGKATAN_OPTIONS.map(t => (
                    <option key={t} value={String(t)} style={{ backgroundColor: "var(--bg-secondary)" }}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Mata Pelajaran <span style={{ color: "var(--danger)" }}>*</span></label>
                <select
                  className="form-input"
                  value={dupMataPelajaran}
                  onChange={(e) => { setDupMataPelajaran(e.target.value); if (e.target.value !== "Lainnya") setDupMataPelajaranCustom(""); }}
                  style={{ appearance: "auto", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                >
                  <option value="" disabled style={{ backgroundColor: "var(--bg-secondary)" }}>-- Pilih Mata Pelajaran --</option>
                  {MATA_PELAJARAN_OPTIONS.map(mp => (
                    <option key={mp} value={mp} style={{ backgroundColor: "var(--bg-secondary)" }}>{mp}</option>
                  ))}
                </select>
                {dupMataPelajaran === "Lainnya" && (
                  <input
                    type="text"
                    placeholder="Ketik nama mata pelajaran..."
                    className="form-input"
                    value={dupMataPelajaranCustom}
                    onChange={(e) => setDupMataPelajaranCustom(e.target.value)}
                    style={{ marginTop: "8px" }}
                  />
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tahun Ajaran <span style={{ color: "var(--danger)" }}>*</span></label>
                <select
                  className="form-input"
                  value={dupTahunAjaran}
                  onChange={(e) => setDupTahunAjaran(e.target.value)}
                  style={{ appearance: "auto", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                >
                  <option value="" disabled style={{ backgroundColor: "var(--bg-secondary)" }}>-- Pilih Tahun Ajaran --</option>
                  {TAHUN_AJARAN_OPTIONS.map(ta => (
                    <option key={ta} value={ta} style={{ backgroundColor: "var(--bg-secondary)" }}>{ta}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Semester <span style={{ color: "var(--danger)" }}>*</span></label>
                <select
                  className="form-input"
                  value={dupSemester}
                  onChange={(e) => setDupSemester(e.target.value)}
                  style={{ appearance: "auto", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                >
                  <option value="Ganjil" style={{ backgroundColor: "var(--bg-secondary)" }}>Semester Ganjil</option>
                  <option value="Genap" style={{ backgroundColor: "var(--bg-secondary)" }}>Semester Genap</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "14px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="checkbox"
                    id="copyStudents"
                    checked={copyStudents}
                    onChange={(e) => {
                      setCopyStudents(e.target.checked);
                      if (!e.target.checked) setCopyGrades(false);
                    }}
                    style={{
                      width: "16px",
                      height: "16px",
                      accentColor: "var(--primary)",
                      cursor: "pointer"
                    }}
                  />
                  <label htmlFor="copyStudents" style={{ fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", color: "var(--text-primary)" }}>
                    👥 Salin Daftar Siswa ({sourceClass?.siswa?.length || 0} Siswa)
                  </label>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0 0 0 26px" }}>
                  Menyalin daftar nama dan NISN siswa ke kelas baru.
                </p>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px", opacity: copyStudents ? 1 : 0.5 }}>
                  <input
                    type="checkbox"
                    id="copyGrades"
                    checked={copyGrades}
                    disabled={!copyStudents}
                    onChange={(e) => setCopyGrades(e.target.checked)}
                    style={{
                      width: "16px",
                      height: "16px",
                      accentColor: "var(--primary)",
                      cursor: copyStudents ? "pointer" : "not-allowed"
                    }}
                  />
                  <label htmlFor="copyGrades" style={{ fontSize: "0.85rem", fontWeight: "600", cursor: copyStudents ? "pointer" : "not-allowed", color: "var(--text-primary)" }}>
                    📊 Salin Nilai Siswa
                  </label>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0 0 0 26px" }}>
                  Menyalin semua entri nilai siswa yang sudah ada ke kelas baru.
                </p>
              </div>

              {dupError && (
                <div style={{ padding: "10px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--danger-glow)", color: "var(--danger)", fontSize: "0.85rem" }}>
                  ❌ {dupError}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" onClick={() => setDuplicateModalOpen(false)} className="btn btn-secondary" disabled={isDuplicating}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={isDuplicating}>
                  {isDuplicating ? (
                    <>
                      <span className="btn-spinner" />
                      Menduplikasi...
                    </>
                  ) : (
                    "🚀 Simpan & Duplikat"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ===== GLOBAL CUSTOM CONFIRMATION MODAL ===== */}
      {confirmConfig.isOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }} className="animate-fade-in">
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
                <h4 style={{ margin: "0", fontSize: "1.1rem", fontWeight: "800", color: confirmConfig.isDanger ? "var(--danger)" : "var(--text-primary)" }}>
                  {confirmConfig.title.replace("⚠️", "").trim() || "Konfirmasi"}
                </h4>
              </div>
            </div>
            
            <p style={{ margin: "0", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", whiteSpace: "pre-line", maxHeight: "250px", overflowY: "auto" }}>
              {confirmConfig.message}
            </p>
            
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "12px" }}>
              {confirmConfig.cancelText && (
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

      {/* Bulk Sync Selection Modal */}
      {bulkSyncSelectionOpen && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div className="modal-content" style={{ background: "var(--bg-primary)", padding: "24px", borderRadius: "16px", maxWidth: "500px", width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <h3 style={{ marginTop: 0 }}>Pilih Kelas untuk Sinkronisasi Massal</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "16px" }}>Pilih kelas-kelas yang ingin Anda sinkronkan dengan Bank Data. Anda akan memverifikasi perubahannya satu per satu.</p>
            
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", paddingRight: "4px", marginBottom: "16px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", cursor: "pointer", border: "1px solid var(--border-color)" }}>
                <input 
                  type="checkbox"
                  checked={selectedClassesForSync.size === kelas.length && kelas.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedClassesForSync(new Set(kelas.map(k => k.id)));
                    else setSelectedClassesForSync(new Set());
                  }}
                />
                <strong>Pilih Semua Kelas</strong>
              </label>
              <hr style={{ margin: "4px 0", borderColor: "var(--border-color)", opacity: 0.5 }} />
              {kelas.map(k => (
                <label key={k.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", backgroundColor: selectedClassesForSync.has(k.id) ? "rgba(59,130,246,0.1)" : "transparent", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
                  <input 
                    type="checkbox"
                    checked={selectedClassesForSync.has(k.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedClassesForSync);
                      if (e.target.checked) newSet.add(k.id);
                      else newSet.delete(k.id);
                      setSelectedClassesForSync(newSet);
                    }}
                  />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: "600" }}>{k.nama}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{k.mataPelajaran} • {k.tahunAjaran}</span>
                  </div>
                </label>
              ))}
            </div>
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
              <button className="btn btn-secondary" onClick={() => setBulkSyncSelectionOpen(false)}>Batal</button>
              <button 
                className="btn btn-primary" 
                disabled={selectedClassesForSync.size === 0}
                onClick={startBulkSync}
              >
                Mulai Sinkronisasi ({selectedClassesForSync.size})
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Bulk Sync Wizard Modal */}
      {currentWizardIndex >= 0 && currentWizardIndex < wizardQueue.length && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
          {wizardStep === "preview" && syncPreviewData ? (
            <SyncPreviewUI
              syncPreviewData={syncPreviewData}
              syncSelectedAdded={syncSelectedAdded}
              setSyncSelectedAdded={setSyncSelectedAdded}
              syncSelectedUpdated={syncSelectedUpdated}
              setSyncSelectedUpdated={setSyncSelectedUpdated}
              syncSelectedRemoved={syncSelectedRemoved}
              setSyncSelectedRemoved={setSyncSelectedRemoved}
              handleSeparateStudent={handleSeparateStudentWizard}
              onCommit={handleCommitWizardIndex}
              onCancel={() => setWizardStep("select_rombel")}
              isSyncingBankData={isSyncingBankData}
              title={`Sinkronisasi Kelas ${currentWizardIndex + 1} dari ${wizardQueue.length}: ${wizardQueue[currentWizardIndex].nama}`}
              commitText={currentWizardIndex + 1 < wizardQueue.length ? "Simpan & Lanjut ke Berikutnya" : "Simpan & Selesai"}
            />
          ) : wizardStep === "select_rombel" ? (
            <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <div className="modal-content" style={{ background: "var(--bg-primary)", padding: "24px", borderRadius: "16px", maxWidth: "450px", width: "95%", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "1.2rem" }}>Pilih Rombel ({currentWizardIndex + 1}/{wizardQueue.length})</h3>
                  <button onClick={() => { setWizardQueue([]); setCurrentWizardIndex(-1); }} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-secondary)" }}>×</button>
                </div>
                
                <div style={{ padding: "12px", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", marginBottom: "16px", border: "1px solid var(--border-color)" }}>
                  <p style={{ margin: "0 0 4px 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Kelas Saat Ini:</p>
                  <p style={{ margin: 0, fontWeight: "600", color: "var(--primary)" }}>{wizardQueue[currentWizardIndex].nama}</p>
                </div>

                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label className="form-label" style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Rombel di Bank Data <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  {isSyncingBankData && bankAvailableRombels.length === 0 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                      <span className="spinner" style={{ width: "16px", height: "16px", border: "2px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></span>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Memuat rombel...</span>
                    </div>
                  ) : bankAvailableRombels.length > 0 ? (
                    <select
                      className="form-input"
                      value={selectedBankRombel}
                      onChange={(e) => setSelectedBankRombel(e.target.value)}
                      style={{ appearance: "auto", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                    >
                      <option value="" disabled style={{ backgroundColor: "var(--bg-secondary)" }}>-- Pilih Rombel --</option>
                      {bankAvailableRombels.map(br => (
                        <option key={`${br.tahun}|${br.tingkatan}|${br.rombel}`} value={`${br.tahun}|${br.tingkatan}|${br.rombel}`} style={{ backgroundColor: "var(--bg-secondary)" }}>
                          Tingkat {br.tingkatan} - {br.rombel} ({br.siswaCount} Siswa)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ padding: "10px", backgroundColor: "var(--danger-glow)", color: "var(--danger)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", border: "1px solid rgba(239, 68, 68, 0.15)" }}>
                      Tidak ada rombel tersedia di Bank Data untuk tahun ajaran ini.
                    </div>
                  )}
                </div>
                
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
                  <button className="btn btn-secondary" onClick={() => { setWizardQueue([]); setCurrentWizardIndex(-1); }} disabled={isSyncingBankData}>Batal</button>
                  <button 
                    className="btn btn-primary" 
                    disabled={isSyncingBankData || !selectedBankRombel}
                    onClick={handleProceedToPreview}
                  >
                    {isSyncingBankData && bankAvailableRombels.length > 0 ? (
                      <><span className="btn-spinner" /> Memproses...</>
                    ) : "Lanjut ke Pratinjau ➔"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <div className="modal-content" style={{ background: "var(--bg-primary)", padding: "32px", borderRadius: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                <span className="spinner" style={{ width: "40px", height: "40px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></span>
                <p>Memproses...</p>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
