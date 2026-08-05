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
  
  // Auth and Role States
  const [authorized, setAuthorized] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [guru, setGuru] = useState(null);

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
              setStudents(mockStudents); 
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/50 backdrop-blur-md p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-blue-600" />
            e-Rapor Kurikulum Merdeka
          </h1>
          <p className="text-gray-500 mt-1">Kelola dan cetak rapor peserta didik Kelas {guru?.walikelas_tingkatan} {guru?.walikelas_rombel_nama}</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-4 flex-wrap">
          <div className="bg-blue-50 px-4 py-2 rounded-xl flex items-center gap-3 border border-blue-100">
            <Users className="text-blue-600" size={20} />
            <div>
              <p className="text-xs text-blue-600 font-medium">Total Siswa</p>
              <p className="text-lg font-bold text-blue-700">{students.length}</p>
            </div>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Upload size={18} />
            {isUploading ? "Mengimpor..." : "Impor Dapodik"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari siswa..." 
              className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-64 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 text-gray-500 text-sm border-b border-gray-100">
                <th className="px-6 py-4 font-semibold">Nama Siswa</th>
                <th className="px-6 py-4 font-semibold">NISN</th>
                <th className="px-6 py-4 font-semibold">Status Pengisian</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800">{student.name}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{student.nisn}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                      student.status === 'Selesai' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                    }`}>
                      {student.status === 'Selesai' && <CheckCircle size={14} />}
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/guru/erapor/${student.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md"
                    >
                      <Printer size={16} />
                      Pratinjau / Cetak
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
