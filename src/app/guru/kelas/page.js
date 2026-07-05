"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";

export default function KelolaKelas() {
  const [loading, setLoading] = useState(true);
  const [kelas, setKelas] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState("");
  const [nama, setNama] = useState("");
  const [mataPelajaran, setMataPelajaran] = useState("Informatika");
  const [tahunAjaran, setTahunAjaran] = useState("2025/2026");
  const [semester, setSemester] = useState("Ganjil");
  const [error, setError] = useState("");

  // Bulk Import States
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [parsedClasses, setParsedClasses] = useState([]);
  const [parsedStudents, setParsedStudents] = useState([]);
  const [bulkForms, setBulkForms] = useState([{ id: Date.now(), nama: "", mataPelajaran: "Informatika", tahunAjaran: "2025/2026", semester: "Ganjil", sourceRombel: "" }]);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkError, setBulkError] = useState("");

  // Dapodik Upload Modal States
  const [dapodikUploadModalOpen, setDapodikUploadModalOpen] = useState(false);
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
  const [dupMataPelajaran, setDupMataPelajaran] = useState("");
  const [dupTahunAjaran, setDupTahunAjaran] = useState("");
  const [dupSemester, setDupSemester] = useState("Ganjil");
  const [copyStudents, setCopyStudents] = useState(true);
  const [copyGrades, setCopyGrades] = useState(false);
  const [dupError, setDupError] = useState("");
  const [isDuplicating, setIsDuplicating] = useState(false);

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

  useEffect(() => {
    fetchKelas();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setNama("");
    setMataPelajaran("Informatika");
    setTahunAjaran("2025/2026");
    setSemester("Ganjil");
    setError("");
    setModalOpen(true);
  };

  const handleOpenEdit = (k) => {
    setIsEditing(true);
    setCurrentId(k.id);
    setNama(k.nama);
    setMataPelajaran(k.mataPelajaran || "Informatika");
    setTahunAjaran(k.tahunAjaran);
    setSemester(k.semester || "Ganjil");
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nama.trim()) {
      setError("Nama kelas harus diisi.");
      return;
    }
    if (!mataPelajaran.trim()) {
      setError("Mata pelajaran harus diisi.");
      return;
    }

    try {
      let response;
      if (isEditing) {
        response = await fetch(`/api/kelas/${currentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nama: nama.trim(), mataPelajaran: mataPelajaran.trim(), tahunAjaran: tahunAjaran.trim(), semester: semester.trim() }),
        });
      } else {
        response = await fetch("/api/kelas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nama: nama.trim(), mataPelajaran: mataPelajaran.trim(), tahunAjaran: tahunAjaran.trim(), semester: semester.trim() }),
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal memproses data");
      }

      setModalOpen(false);
      fetchKelas();
    } catch (err) {
      setError(err.message || "Terjadi kesalahan.");
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
    setDupMataPelajaran(k.mataPelajaran || "Informatika");
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
    if (!dupMataPelajaran.trim()) {
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
          mataPelajaran: dupMataPelajaran.trim(),
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
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

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
            tglIdx = tempHeaders.findIndex((h) => h.includes("tanggal lahir") || h.includes("lahir"));
            break;
          }
        }

        if (headerRowIndex === -1) {
          setDapodikUploadError("Gagal menemukan baris header dengan kolom NISN, Nama, atau Rombel di dalam berkas. Pastikan file Dapodik sudah benar.");
          return;
        }

        if (tglIdx === -1) {
          setDapodikUploadError("Kolom 'Tanggal Lahir' tidak ditemukan di dalam berkas. Siswa tidak berhasil ditambahkan.");
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

          const nisnVal = cols[nisnIdx] ? String(cols[nisnIdx]).trim() : "";
          const namaVal = cols[namaIdx] ? String(cols[namaIdx]).trim() : "";
          const rombelVal = cols[rombelIdx] ? String(cols[rombelIdx]).trim() : "";
          // Use raw value (may be number for Excel serial) then normalize
          const tglRaw = tglIdx !== -1 && (cols[tglIdx] !== undefined && cols[tglIdx] !== null) ? cols[tglIdx] : "";
          const tglVal = normalizeTanggal(tglRaw);

          // Pengecekan data tidak lengkap
          const missingFields = [];
          if (!nisnVal) missingFields.push("NISN");
          if (!namaVal) missingFields.push("Nama");
          if (!rombelVal) missingFields.push("Rombel");
          if (!tglVal) missingFields.push("Tanggal Lahir");

          if (missingFields.length > 0) {
            // Catat baris bermasalah jika ada setidaknya salah satu data terisi (bukan baris kosong)
            if (nisnVal || namaVal || rombelVal || tglVal) {
              const identifier = namaVal || nisnVal || `Baris ${i + 1}`;
              warnings.push(`Siswa "${identifier}" (Baris ${i + 1}) dilewati karena data tidak lengkap: ${missingFields.join(", ")} tidak ditemukan.`);
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
          nama: "",
          mataPelajaran: "Informatika",
          tahunAjaran: "2025/2026",
          semester: "Ganjil",
          sourceRombel: ""
        }];

        setBulkForms(initialForms);
        setDapodikUploadModalOpen(false); // Close the upload/instruction modal
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
          return { ...form, [field]: value };
        }
        return form;
      });

      const isLastFilled = updated[updated.length - 1].nama.trim() !== "" || updated[updated.length - 1].sourceRombel !== "";
      if (isLastFilled) {
        updated.push({ id: Date.now(), nama: "", mataPelajaran: "Informatika", tahunAjaran: "2025/2026", semester: "Ganjil", sourceRombel: "" });
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

    const validForms = bulkForms.filter((f) => f.nama.trim() !== "" && f.sourceRombel !== "");
    if (validForms.length === 0) {
      setBulkError("Anda harus mengisi setidaknya satu kelas untuk diimpor.");
      return;
    }

    setIsBulkImporting(true);

    try {
      let successCount = 0;
      for (const form of validForms) {
        // 1. Create Class
        const resKelas = await fetch("/api/kelas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nama: form.nama.trim(), mataPelajaran: form.mataPelajaran.trim(), tahunAjaran: form.tahunAjaran.trim(), semester: form.semester.trim() }),
        });

        if (!resKelas.ok) {
          const errData = await resKelas.json();
          throw new Error(`Gagal membuat kelas ${form.nama}: ${errData.error}`);
        }

        const dataKelas = await resKelas.json();
        const newClassId = dataKelas.kelas.id;

        // 2. Import Students
        const studentsForThisClass = parsedStudents.filter((s) => s.rombel === form.sourceRombel);
        if (studentsForThisClass.length > 0) {
          const resStudents = await fetch(`/api/kelas/${newClassId}/import`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ siswaList: studentsForThisClass }),
          });

          if (!resStudents.ok) {
            console.error(`Gagal mengimpor siswa untuk kelas ${form.nama}`);
          }
        }
        successCount++;
      }

      triggerConfirm(`${successCount} Kelas beserta siswanya berhasil diimpor!`, null, { title: "Impor Berhasil", confirmText: "Selesai", cancelText: "" });
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
      <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Header section with add button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div className="page-title-section" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Manajemen Kelas</h1>
          <p className="page-subtitle">Buat dan kelola kelas aktif untuk tahun ajaran berjalan.</p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button onClick={() => { setDapodikUploadModalOpen(true); setDapodikUploadError(""); }} className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            📥 Impor Kelas Dapodik
          </button>
          <button onClick={handleOpenAdd} className="btn btn-primary">
            ➕ Tambah Kelas Baru
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <span className="spinner" style={{ width: "30px", height: "30px", border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}></span>
        </div>
      ) : kelas.length > 0 ? (
        <div className="grid-cols-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {kelas.map((k) => (
            <div key={k.id} className="glass-card animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px", borderBottom: "4px solid var(--primary)" }}>
              <div>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "12px" }}>
                  <span className="badge" style={{ fontSize: "0.7rem", backgroundColor: "var(--success)", color: "#fff", fontWeight: "800", padding: "4px 8px", boxShadow: "0 2px 10px var(--success-glow)" }}>
                    🟢 AKTIF
                  </span>
                  <span className="badge badge-primary" style={{ fontSize: "0.7rem", padding: "4px 8px" }}>
                    📚 {k.tahunAjaran}
                  </span>
                  <span className="badge" style={{ fontSize: "0.7rem", padding: "4px 8px", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.15)" }}>
                    ⏱️ Semester {k.semester || "Ganjil"}
                  </span>
                  <span className="badge" style={{ fontSize: "0.7rem", padding: "4px 8px", backgroundColor: "var(--primary-glow)", color: "var(--primary)", border: "1px solid rgba(59,130,246,0.15)" }}>
                    💻 {k.mataPelajaran}
                  </span>
                </div>
                
                <h3 style={{ fontSize: "1.25rem", fontWeight: "800", lineHeight: "1.3" }}>{k.nama}</h3>
                
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "600" }}>Kode Kelas:</span>
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
                
                <div style={{ display: "flex", gap: "16px", marginTop: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "1.1rem" }}>👨‍🎓</span>
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: "700" }}>{k.siswa.length}</div>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Siswa</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "1.1rem" }}>🏷️</span>
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: "700" }}>{k.kolomNilai.length}</div>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Aspek</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "auto" }}>
                <Link href={`/guru/kelas/${k.id}`} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: "0.9rem" }}>
                  ⚙️ Kelola Nilai & Siswa
                </Link>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "8px" }}>
                  <button onClick={() => handleOpenEdit(k)} className="btn btn-secondary" style={{ padding: "8px", fontSize: "0.85rem", width: "100%", justifyContent: "center" }} title="Edit Kelas">
                    ✏️ Edit
                  </button>
                  <button onClick={() => handleOpenDuplicate(k)} className="btn btn-secondary" style={{ padding: "8px", fontSize: "0.85rem", width: "100%", justifyContent: "center" }} title="Duplikat Kelas">
                    📋 Duplikat
                  </button>
                  <button onClick={() => handleArchive(k.id, k.nama)} className="btn btn-secondary" style={{ padding: "8px", fontSize: "0.85rem", color: "var(--warning)", borderColor: "rgba(245, 158, 11, 0.15)", width: "100%", justifyContent: "center" }} title="Arsipkan Kelas">
                    📁 Arsipkan
                  </button>
                  <button onClick={() => handleDelete(k.id, k.nama)} className="btn btn-secondary" style={{ padding: "8px 10px", fontSize: "0.85rem", color: "var(--danger)", borderColor: "rgba(239, 68, 68, 0.15)", justifyContent: "center" }} title="Hapus Kelas">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: "60px 20px", textAlign: "center", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-color)" }}>
          <h3 style={{ fontSize: "1.25rem", color: "var(--text-secondary)", marginBottom: "8px" }}>Belum Ada Kelas Aktif</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "20px" }}>Silakan klik tombol di atas untuk membuat kelas baru.</p>
          <button onClick={handleOpenAdd} className="btn btn-primary" style={{ display: "inline-flex" }}>
            ➕ Tambah Kelas Pertama
          </button>
        </div>
      )}

      </div>

      {/* Glassmorphism Modal for Add/Edit Class */}
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
          <div className="glass-card animate-fade-in modal-content-scroll" style={{ width: "100%", maxWidth: "450px", border: "1px solid var(--border-focus)", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "20px" }}>
              {isEditing ? "✏️ Edit Kelas" : "➕ Tambah Kelas Baru"}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Kelas</label>
                <input
                  type="text"
                  placeholder="Contoh: Kelas XI-IPA 2"
                  className="form-input"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Mata Pelajaran</label>
                <input
                  type="text"
                  placeholder="Contoh: Informatika"
                  className="form-input"
                  value={mataPelajaran}
                  onChange={(e) => setMataPelajaran(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tahun Ajaran</label>
                <input
                  type="text"
                  placeholder="Contoh: 2025/2026"
                  className="form-input"
                  value={tahunAjaran}
                  onChange={(e) => setTahunAjaran(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Semester</label>
                <select
                  className="form-input"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  required
                  style={{ 
                    appearance: "auto", 
                    backgroundColor: "rgba(30, 41, 59, 0.7)", 
                    color: "var(--text-primary)", 
                    border: "1px solid var(--border-color)" 
                  }}
                >
                  <option value="Ganjil" style={{ backgroundColor: "var(--bg-secondary)" }}>Semester Ganjil</option>
                  <option value="Genap" style={{ backgroundColor: "var(--bg-secondary)" }}>Semester Genap</option>
                </select>
              </div>

              {error && (
                <div style={{ padding: "10px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--danger-glow)", color: "var(--danger)", fontSize: "0.85rem" }}>
                  ❌ {error}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
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
                  📦 Impor Kelas Massal (Dapodik)
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
                <table className="premium-table" style={{ minWidth: "700px", margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: "25%" }}>Nama Kelas Target</th>
                      <th style={{ width: "20%" }}>Mata Pelajaran</th>
                      <th style={{ width: "15%" }}>T.A.</th>
                      <th style={{ width: "15%" }}>Semester</th>
                      <th style={{ width: "20%" }}>Sumber Dapodik</th>
                      <th style={{ width: "5%" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkForms.map((form, index) => (
                      <tr key={form.id}>
                        <td style={{ padding: "8px" }}>
                          <input type="text" className="form-input" placeholder="Nama kelas..." value={form.nama} onChange={(e) => handleBulkFormChange(form.id, "nama", e.target.value)} style={{ padding: "8px", fontSize: "0.85rem" }} />
                        </td>
                        <td style={{ padding: "8px" }}>
                          <input type="text" className="form-input" placeholder="Mapel..." value={form.mataPelajaran} onChange={(e) => handleBulkFormChange(form.id, "mataPelajaran", e.target.value)} style={{ padding: "8px", fontSize: "0.85rem" }} />
                        </td>
                        <td style={{ padding: "8px" }}>
                          <input type="text" className="form-input" placeholder="T.A." value={form.tahunAjaran} onChange={(e) => handleBulkFormChange(form.id, "tahunAjaran", e.target.value)} style={{ padding: "8px", fontSize: "0.85rem" }} />
                        </td>
                        <td style={{ padding: "8px" }}>
                          <select className="form-input" value={form.semester} onChange={(e) => handleBulkFormChange(form.id, "semester", e.target.value)} style={{ padding: "8px", fontSize: "0.85rem", appearance: "auto" }}>
                            <option value="Ganjil">Ganjil</option>
                            <option value="Genap">Genap</option>
                          </select>
                        </td>
                        <td style={{ padding: "8px" }}>
                          <select className="form-input" value={form.sourceRombel} onChange={(e) => handleBulkFormChange(form.id, "sourceRombel", e.target.value)} style={{ padding: "8px", fontSize: "0.85rem", appearance: "auto" }}>
                            <option value="">-- Abaikan --</option>
                            {parsedClasses.map((cls) => (
                              <option key={cls} value={cls}>{cls}</option>
                            ))}
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
                  {isBulkImporting ? "Mengimpor..." : "🚀 Simpan & Impor Kelas"}
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
                <label className="form-label">Nama Kelas Baru</label>
                <input
                  type="text"
                  placeholder="Contoh: Kelas XI-IPA 2 (Salinan)"
                  className="form-input"
                  value={dupNama}
                  onChange={(e) => setDupNama(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Mata Pelajaran</label>
                <input
                  type="text"
                  placeholder="Contoh: Informatika"
                  className="form-input"
                  value={dupMataPelajaran}
                  onChange={(e) => setDupMataPelajaran(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tahun Ajaran</label>
                <input
                  type="text"
                  placeholder="Contoh: 2025/2026"
                  className="form-input"
                  value={dupTahunAjaran}
                  onChange={(e) => setDupTahunAjaran(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Semester</label>
                <select
                  className="form-input"
                  value={dupSemester}
                  onChange={(e) => setDupSemester(e.target.value)}
                  required
                  style={{ 
                    appearance: "auto", 
                    backgroundColor: "rgba(30, 41, 59, 0.7)", 
                    color: "var(--text-primary)", 
                    border: "1px solid var(--border-color)" 
                  }}
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
                  {isDuplicating ? "Menduplikasi..." : "🚀 Simpan & Duplikat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Dapodik Import Guide & Upload */}
      {dapodikUploadModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 300,
            backdropFilter: "blur(6px)"
          }}
          className="animate-fade-in"
        >
          <div className="glass-card modal-content-scroll" style={{ width: "90%", maxWidth: "600px", padding: "26px", display: "flex", flexDirection: "column", gap: "18px", position: "relative", backgroundColor: "var(--bg-primary)", maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--primary)", boxShadow: "0 20px 40px rgba(59,130,246,0.2)" }}>
            
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.4rem" }}>📥</span>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--primary)", margin: 0 }}>Impor Kelas Dapodik</h3>
              </div>
              <button onClick={() => { setDapodikUploadModalOpen(false); setDapodikUploadError(""); }} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}>✕</button>
            </div>

            {/* Petunjuk Penggunaan */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <h4 style={{ fontSize: "1.02rem", fontWeight: "800", color: "var(--text-primary)" }}>📋 Petunjuk Penggunaan:</h4>
              <ol style={{ fontSize: "0.82rem", color: "var(--text-secondary)", paddingLeft: "18px", lineHeight: "1.6", display: "flex", flexDirection: "column", gap: "6px" }}>
                <li>Unduh data peserta didik dari <strong>aplikasi Dapodik</strong> sekolah Anda (format berkas yang didukung: <code>.xlsx</code>, <code>.xls</code>, atau <code>.csv</code>). Berkas data ini bisa Anda dapatkan dengan meminta bantuan <strong>operator atau admin sekolah</strong> Anda.</li>
                <li>Unggah berkas tersebut pada area unggahan di bawah ini.</li>
                <li>Sistem akan mendeteksi daftar rombel secara otomatis, lalu Anda dapat mengatur penamaan kelas target sebelum disimpan ke CekNilai.</li>
              </ol>
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
                backgroundColor: dragActive ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.02)",
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
                Klik atau seret berkas Dapodik ke sini
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                Mendukung format .xlsx, .xls, atau .csv
              </span>
            </div>

            {/* Footer / Action buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
              <button type="button" onClick={() => { setDapodikUploadModalOpen(false); setDapodikUploadError(""); }} className="btn btn-secondary" style={{ fontSize: "0.85rem" }}>
                Batal
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ===== GLOBAL CUSTOM CONFIRMATION MODAL ===== */}
      {confirmConfig.isOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }} className="animate-fade-in">
          <div className="glass-card animate-fade-in" style={{ width: "100%", maxWidth: "420px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px", border: confirmConfig.isDanger ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid var(--border-focus)", boxShadow: "var(--shadow-lg), 0 0 30px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <span style={{ fontSize: "2rem", lineHeight: "1" }}>{confirmConfig.title.includes("⚠️") || confirmConfig.isDanger ? "⚠️" : "❓"}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800", color: confirmConfig.isDanger ? "var(--danger)" : "var(--text-primary)" }}>
                  {confirmConfig.title.replace("⚠️", "").trim() || "Konfirmasi"}
                </h4>
              </div>
            </div>
            
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", whiteSpace: "pre-line" }}>
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

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
