"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Printer, Search, Users, CheckCircle, AlertTriangle, ArrowLeft, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ERaporDashboard() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Auth and Role States
  const [authorized, setAuthorized] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [guru, setGuru] = useState(null);
  const [showBiodataModal, setShowBiodataModal] = useState(false);

  const filteredStudents = students.filter(s => 
    (s.nama && s.nama.toLowerCase().includes(search.toLowerCase())) || 
    (s.nisn && s.nisn.includes(search))
  );

  const missingStats = React.useMemo(() => {
    let stats = {
      nipd: 0, tempat_lahir: 0, tanggal_lahir: 0, jenis_kelamin: 0, 
      agama: 0, alamat_lengkap: 0, orang_tua: 0
    };
    students.forEach(s => {
      const b = s.biodata_detail || {};
      if (!b.nipd) stats.nipd++;
      if (!b.tempat_lahir) stats.tempat_lahir++;
      if (!b.tanggal_lahir) stats.tanggal_lahir++;
      if (!b.jenis_kelamin) stats.jenis_kelamin++;
      if (!b.agama) stats.agama++;
      if (!b.alamat_lengkap) stats.alamat_lengkap++;
      if (!b.nama_ayah && !b.nama_ibu && !b.nama_wali) stats.orang_tua++;
    });
    return stats;
  }, [students]);

  // Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ message: "", type: "" }); // type: 'success' | 'error' | 'info'

  // Mock data for preview (sementara sebelum tarik dari database)
  const mockStudents = [
    { id: '1', name: 'Ahmad Faisal', nisn: '0012345678', status: 'Selesai' },
    { id: '2', name: 'Budi Santoso', nisn: '0012345679', status: 'Selesai' },
    { id: '3', name: 'Citra Kirana', nisn: '0012345680', status: 'Belum Selesai' },
  ];

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.loggedIn && data.user) {
            setGuru(data.user);
            
            if (!data.user.walikelas_tingkatan || !data.user.walikelas_rombel_nama) {
              setErrorMsg("Akses Ditolak: Anda bukan Wali Kelas aktif. Hanya Wali Kelas yang dapat mengelola dan mencetak e-Rapor.");
            } else {
              setAuthorized(true);
              
              // Fetch from backend
              const resSiswa = await fetch("/api/erapor/siswa");
              if (resSiswa.ok) {
                const dataSiswa = await resSiswa.json();
                setStudents(dataSiswa.siswa || []);
              } else {
                setErrorMsg("Gagal memuat daftar siswa dari database.");
              }
            }
          } else {
            router.push("/login");
          }
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Gagal memeriksa sesi", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  // Fungsi Parser Excel Dapodik
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus({ message: "Membaca berkas Excel...", type: "info" });

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Baca sebagai JSON raw
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });

        if (rows.length < 2) {
          setUploadStatus({ message: "Berkas Excel kosong atau format tidak sesuai.", type: "error" });
          setIsUploading(false);
          return;
        }

        // Cari baris Header
        let headerRowIndex = -1;
        let headers = [];
        
        for (let r = 0; r < Math.min(rows.length, 20); r++) {
          if (!rows[r] || !Array.isArray(rows[r])) continue;
          const tempHeaders = Array.from({ length: rows[r].length }, (_, i) => String(rows[r][i] || "").trim().toLowerCase());
          
          if (tempHeaders.some(h => h.includes("nisn"))) {
            headerRowIndex = r;
            headers = tempHeaders;
            break;
          }
        }

        if (headerRowIndex === -1) {
          setUploadStatus({ message: "Gagal menemukan kolom NISN di dalam berkas Dapodik.", type: "error" });
          setIsUploading(false);
          return;
        }

        // Mapping index kolom
        const getIdx = (keywords) => headers.findIndex(h => keywords.some(k => h.includes(k)));
        
        const idxNISN = getIdx(["nisn"]);
        const idxNIPD = getIdx(["nipd", "no induk", "induk"]);
        const idxTmptLahir = getIdx(["tempat lahir"]);
        const idxTglLahir = getIdx(["tanggal lahir", "tgl lahir"]);
        const idxJK = getIdx(["jenis kelamin", "l/p"]);
        const idxAgama = getIdx(["agama"]);
        const idxAlamat = getIdx(["alamat", "jalan"]);
        const idxTelepon = getIdx(["telepon", "no hp", "hp"]);
        
        const idxAyah = getIdx(["nama ayah", "ayah"]);
        const idxKerjaAyah = getIdx(["pekerjaan ayah"]);
        const idxIbu = getIdx(["nama ibu", "ibu kandung"]);
        const idxKerjaIbu = getIdx(["pekerjaan ibu"]);
        const idxWali = getIdx(["nama wali"]);
        const idxKerjaWali = getIdx(["pekerjaan wali"]);

        const extractedData = [];

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const cols = rows[i];
          if (!cols || !cols[idxNISN]) continue;
          
          const nisnVal = String(cols[idxNISN]).replace(/[,.\s]/g, "").trim();
          if (!nisnVal) continue;

          extractedData.push({
            nisn: nisnVal,
            nipd: idxNIPD > -1 ? cols[idxNIPD] : null,
            tempat_lahir: idxTmptLahir > -1 ? cols[idxTmptLahir] : null,
            tanggal_lahir: idxTglLahir > -1 ? cols[idxTglLahir] : null,
            jenis_kelamin: idxJK > -1 ? cols[idxJK] : null,
            agama: idxAgama > -1 ? cols[idxAgama] : null,
            alamat_lengkap: idxAlamat > -1 ? cols[idxAlamat] : null,
            telepon: idxTelepon > -1 ? cols[idxTelepon] : null,
            nama_ayah: idxAyah > -1 ? cols[idxAyah] : null,
            pekerjaan_ayah: idxKerjaAyah > -1 ? cols[idxKerjaAyah] : null,
            nama_ibu: idxIbu > -1 ? cols[idxIbu] : null,
            pekerjaan_ibu: idxKerjaIbu > -1 ? cols[idxKerjaIbu] : null,
            nama_wali: idxWali > -1 ? cols[idxWali] : null,
            pekerjaan_wali: idxKerjaWali > -1 ? cols[idxKerjaWali] : null,
          });
        }

        if (extractedData.length === 0) {
          setUploadStatus({ message: "Tidak ada data siswa yang valid untuk diimpor.", type: "error" });
          setIsUploading(false);
          return;
        }

        setUploadStatus({ message: `Ditemukan ${extractedData.length} baris. Menyimpan ke database...`, type: "info" });

        // Kirim ke Backend API
        const res = await fetch("/api/erapor/biodata/bulk-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ biodataList: extractedData })
        });

        const dataRes = await res.json();
        
        if (res.ok) {
          setUploadStatus({ message: `Berhasil! ${dataRes.count || extractedData.length} Biodata berhasil diimpor.`, type: "success" });
        } else {
          setUploadStatus({ message: dataRes.error || "Gagal menyimpan biodata ke database.", type: "error" });
        }

      } catch (err) {
        console.error("Upload error", err);
        setUploadStatus({ message: "Terjadi kesalahan saat memproses berkas excel.", type: "error" });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    
    reader.readAsBinaryString(file);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "NISN", "NIPD", "Tempat Lahir", "Tanggal Lahir", "Jenis Kelamin", 
      "Agama", "Alamat Lengkap", "Telepon", "Nama Ayah", "Pekerjaan Ayah", 
      "Nama Ibu", "Pekerjaan Ibu", "Nama Wali", "Pekerjaan Wali"
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "FormatBiodata");
    XLSX.writeFile(wb, "Format_Biodata_Kosong.xlsx");
  };


  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 text-sm font-medium">Memverifikasi Akses...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-10 flex justify-center">
        <div className="bg-white/70 backdrop-blur-md max-w-lg w-full text-center border border-red-200/50 p-8 rounded-2xl shadow-lg">
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 p-4 rounded-full text-red-500">
              <AlertTriangle size={48} />
            </div>
          </div>
          <h3 className="text-xl font-bold mb-3 text-red-600">Akses Terbatas</h3>
          <p className="text-gray-600 mb-8 leading-relaxed">{errorMsg}</p>
          <Link href="/guru" className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl transition-colors">
            <ArrowLeft size={18} />
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      
      {/* Upload Notification Alert */}
      {uploadStatus.message && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          uploadStatus.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
          uploadStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
          'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <div className="flex items-center gap-3 font-medium">
            {uploadStatus.type === 'error' ? <AlertTriangle size={20} /> : 
             uploadStatus.type === 'success' ? <CheckCircle size={20} /> : 
             <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
            {uploadStatus.message}
          </div>
          <button onClick={() => setUploadStatus({message: "", type: ""})} className="opacity-70 hover:opacity-100 font-bold">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="glass-card" style={{ padding: "24px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ backgroundColor: "var(--primary-glow)", padding: "16px", borderRadius: "16px", color: "var(--primary)" }}>
          <FileText size={32} />
        </div>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: "800", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "8px" }}>
            e-Rapor Kurikulum Merdeka
          </h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Kelola dan cetak rapor peserta didik Kelas {guru?.walikelas_tingkatan} {guru?.walikelas_rombel_nama}
          </p>
        </div>
      </div>

      {/* Upload Notification */}
      {uploadStatus.show && (
        <div className={`glass-card`} style={{ 
          marginBottom: "24px", 
          padding: "16px",
          display: "flex", alignItems: "center", gap: "12px",
          borderLeft: `4px solid ${uploadStatus.isError ? "var(--danger)" : "var(--success)"}` 
        }}>
          {uploadStatus.isError ? <AlertTriangle style={{ color: "var(--danger)" }} /> : <Check style={{ color: "var(--success)" }} />}
          <span style={{ color: uploadStatus.isError ? "var(--danger)" : "var(--success)", fontWeight: "600" }}>
            {uploadStatus.message}
          </span>
        </div>
      )}

      {/* Dashboard Stats & Actions */}
      <div className="grid-cols-2" style={{ marginBottom: "24px" }}>
        <div className="stat-card">
          <div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase" }}>Total Siswa Perwalian</p>
            <h3 style={{ fontSize: "2rem", marginTop: "4px" }}>{students.length}</h3>
          </div>
          <div className="stat-icon" style={{ backgroundColor: "var(--primary-glow)", color: "var(--primary)" }}>
            👥
          </div>
        </div>

        <div className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600", marginBottom: "12px" }}>Integrasi Dapodik</p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              style={{ display: "none" }}
            />
            <button 
              onClick={() => fileInputRef.current.click()} 
              disabled={isUploading}
              className="btn btn-success"
              style={{ flex: 1 }}
            >
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {isUploading ? "Mengimpor..." : "Impor Biodata Excel"}
            </button>
            <button className="btn btn-secondary" onClick={handleDownloadTemplate}>
              <Download size={18} /> Format Kosong
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <h3 style={{ fontSize: "1.2rem", margin: 0 }}>Daftar Siswa & Status Rapor</h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setShowBiodataModal(true)} className="btn btn-secondary" style={{ padding: "6px 16px", fontSize: "0.85rem", gap: "6px" }}>
                <FileText size={16} /> Detail Kelengkapan
              </button>
              <Link href="/guru/erapor/cetak-semua" className="btn btn-primary" style={{ padding: "6px 16px", fontSize: "0.85rem", gap: "6px" }}>
                <Printer size={16} /> Cetak Semua Rapor
              </Link>
            </div>
          </div>
          
          <div style={{ position: "relative", width: "100%", maxWidth: "300px" }}>
            <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input 
              type="text" 
              placeholder="Cari nama atau NISN..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: "36px" }}
            />
          </div>
        </div>

        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th style={{ width: "50px" }}>No</th>
                <th>Nama Lengkap</th>
                <th>NISN</th>
                <th>Status Biodata</th>
                <th style={{ textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((siswa, idx) => (
                  <tr key={siswa.nisn || idx}>
                    <td>{idx + 1}</td>
                    <td style={{ fontWeight: "600" }}>{siswa.nama}</td>
                    <td style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>{siswa.nisn}</td>
                    <td>
                      <span className={`badge ${siswa.status_pengisian === "Selesai" ? "badge-success" : "badge-warning"}`}>
                        {siswa.status_pengisian}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link 
                        href={`/guru/erapor/${siswa.nisn}`}
                        className="btn btn-primary"
                        style={{ padding: "6px 16px", fontSize: "0.85rem", gap: "6px" }}
                      >
                        <Printer size={16} /> Pratinjau Rapor
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                    {search ? "Siswa tidak ditemukan." : "Belum ada data siswa di kelas ini. Hubungi Operator Sekolah."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Biodata */}
      {showBiodataModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "var(--bg-primary)", borderRadius: "16px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", width: "100%", maxWidth: "1152px", maxHeight: "90vh", display: "flex", flexDirection: "column", border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px", borderBottom: "1px solid var(--border-color)" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>Detail Kelengkapan Biodata</h2>
              <button 
                onClick={() => setShowBiodataModal(false)}
                style={{ padding: "8px", borderRadius: "12px", color: "var(--text-secondary)", background: "transparent", border: "none", cursor: "pointer", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto" style={{ flex: 1 }}>
              {/* Rekap Kelengkapan Data */}
              <div style={{ marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
                {missingStats.nipd > 0 && <span className="badge badge-warning">NIPD: {missingStats.nipd} Kosong</span>}
                {missingStats.tempat_lahir > 0 && <span className="badge badge-warning">Tempat Lahir: {missingStats.tempat_lahir} Kosong</span>}
                {missingStats.tanggal_lahir > 0 && <span className="badge badge-warning">Tanggal Lahir: {missingStats.tanggal_lahir} Kosong</span>}
                {missingStats.jenis_kelamin > 0 && <span className="badge badge-warning">Jenis Kelamin: {missingStats.jenis_kelamin} Kosong</span>}
                {missingStats.agama > 0 && <span className="badge badge-warning">Agama: {missingStats.agama} Kosong</span>}
                {missingStats.alamat_lengkap > 0 && <span className="badge badge-warning">Alamat: {missingStats.alamat_lengkap} Kosong</span>}
                {missingStats.orang_tua > 0 && <span className="badge badge-warning">Orang Tua/Wali: {missingStats.orang_tua} Kosong</span>}
                {Object.values(missingStats).every(v => v === 0) && students.length > 0 && (
                  <span className="badge badge-success">Semua Data Biodata Lengkap!</span>
                )}
              </div>

              <div className="table-container" style={{ overflowX: "auto", margin: 0 }}>
                <table className="premium-table crosshair-highlight" style={{ minWidth: "1200px" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "50px", position: "sticky", left: 0, zIndex: 10, backgroundColor: "var(--bg-secondary)" }}>No</th>
                      <th style={{ position: "sticky", left: "50px", zIndex: 10, backgroundColor: "var(--bg-secondary)", minWidth: "200px" }}>Nama Lengkap</th>
                      <th style={{ minWidth: "120px" }}>NISN / NIPD</th>
                      <th>Tempat/Tgl Lahir</th>
                      <th>L/P</th>
                      <th>Agama</th>
                      <th style={{ minWidth: "200px" }}>Alamat Lengkap</th>
                      <th>Ortu/Wali</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length > 0 ? (
                      students.map((siswa, idx) => (
                        <tr key={siswa.nisn || idx}>
                          <td style={{ position: "sticky", left: 0, backgroundColor: "inherit" }}>{idx + 1}</td>
                          <td style={{ fontWeight: "600", position: "sticky", left: "50px", backgroundColor: "inherit" }}>{siswa.nama}</td>
                          <td>
                            <div style={{ fontFamily: "monospace", color: "var(--text-secondary)" }}>{siswa.nisn}</div>
                            <div style={{ fontSize: "0.8rem", color: !siswa.biodata_detail?.nipd ? "var(--danger)" : "var(--text-muted)" }}>
                              {siswa.biodata_detail?.nipd || "NIPD Kosong"}
                            </div>
                          </td>
                          <td>
                            <div style={{ color: !siswa.biodata_detail?.tempat_lahir ? "var(--danger)" : "inherit" }}>
                              {siswa.biodata_detail?.tempat_lahir || "Tempat Kosong"}
                            </div>
                            <div style={{ fontSize: "0.8rem", color: !siswa.biodata_detail?.tanggal_lahir ? "var(--danger)" : "var(--text-muted)" }}>
                              {siswa.biodata_detail?.tanggal_lahir || "Tgl Kosong"}
                            </div>
                          </td>
                          <td style={{ color: !siswa.biodata_detail?.jenis_kelamin ? "var(--danger)" : "inherit", textAlign: "center" }}>
                            {siswa.biodata_detail?.jenis_kelamin || "-"}
                          </td>
                          <td style={{ color: !siswa.biodata_detail?.agama ? "var(--danger)" : "inherit" }}>
                            {siswa.biodata_detail?.agama || "Kosong"}
                          </td>
                          <td style={{ color: !siswa.biodata_detail?.alamat_lengkap ? "var(--danger)" : "inherit", fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "250px" }} title={siswa.biodata_detail?.alamat_lengkap}>
                            {siswa.biodata_detail?.alamat_lengkap || "Alamat Kosong"}
                          </td>
                          <td style={{ color: (!siswa.biodata_detail?.nama_ayah && !siswa.biodata_detail?.nama_ibu && !siswa.biodata_detail?.nama_wali) ? "var(--danger)" : "inherit" }}>
                            {siswa.biodata_detail?.nama_ayah || siswa.biodata_detail?.nama_ibu || siswa.biodata_detail?.nama_wali || "Kosong"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                          Belum ada data siswa di kelas ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div style={{ padding: "24px", borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", display: "flex", justifyContent: "flex-end", borderBottomLeftRadius: "16px", borderBottomRightRadius: "16px" }}>
              <button onClick={() => setShowBiodataModal(false)} className="btn btn-primary" style={{ padding: "8px 24px" }}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
