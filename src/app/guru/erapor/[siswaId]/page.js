"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer, AlertTriangle, Loader2 } from 'lucide-react';
import { use } from 'react';

export default function RaporPreview({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { siswaId } = resolvedParams;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/erapor/siswa/${siswaId}`);
        if (res.ok) {
          const result = await res.json();
          if (result.success && result.data) {
            setData(result.data);
          } else {
            setErrorMsg(result.error || "Gagal memuat data siswa.");
          }
        } else {
          const result = await res.json();
          setErrorMsg(result.error || "Gagal memuat data siswa.");
        }
      } catch (err) {
        console.error("Gagal memeriksa sesi", err);
        setErrorMsg("Terjadi kesalahan sistem saat memuat data.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [siswaId]);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      <Loader2 className="animate-spin" size={48} style={{ color: "var(--primary)" }} />
    </div>
  );

  if (errorMsg) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", padding: "40px", display: "flex", justifyContent: "center" }}>
        <div className="glass-card animate-fade-in" style={{ textAlign: "center", maxWidth: "500px", width: "100%", height: "fit-content", borderColor: "var(--danger)" }}>
          <AlertTriangle size={64} style={{ color: "var(--danger)", margin: "0 auto 16px auto" }} />
          <h3 style={{ fontSize: "1.5rem", color: "var(--danger)", marginBottom: "12px" }}>Akses Terbatas</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "32px" }}>{errorMsg}</p>
          <Link href="/guru/erapor" className="btn btn-secondary">
            <ArrowLeft size={18} /> Kembali
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-tertiary)", padding: "32px 0", fontFamily: "serif", color: "#000" }} className="print-bg-white print-p-0">
      
      {/* Tombol Navigasi (Disembunyikan saat dicetak) */}
      <div className="no-print" style={{ maxWidth: "210mm", margin: "0 auto 24px auto", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--font-body)" }}>
        <Link href="/guru/erapor" className="btn btn-secondary" style={{ backgroundColor: "#fff" }}>
          <ArrowLeft size={18} /> Kembali
        </Link>
        <button 
          onClick={() => window.print()}
          className="btn btn-primary"
        >
          <Printer size={18} /> Cetak PDF Rapor
        </button>
      </div>

      {/* CSS Khusus Print (Inline Style untuk Rapor) */}
      <style dangerouslySetInnerHTML={{__html: `
        .rapor-page {
          background-color: white;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto 32px auto;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          position: relative;
          box-sizing: border-box;
          page-break-after: always;
        }
        
        .table-rapor {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .table-rapor th, .table-rapor td {
          border: 1px solid black;
          padding: 8px 12px;
        }
        .table-rapor th {
          background-color: #f3f4f6;
          font-weight: bold;
          text-align: center;
        }
        
        .biodata-table td {
          padding: 8px 0;
          vertical-align: top;
        }

        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          body, html { background-color: white !important; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .rapor-page {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
          }
          .print-bg-white { background-color: white !important; }
          .print-p-0 { padding: 0 !important; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: black !important;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
        }
      `}} />

      {/* ==================== HALAMAN 1: COVER ==================== */}
      <div className="rapor-page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        
        <div style={{ textAlign: "center", position: "absolute", top: "120px", width: "100%", padding: "0 80px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "4px", marginBottom: "8px" }}>Laporan Hasil Belajar</h1>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "64px" }}>(RAPOR)</h2>
          
          <div style={{ width: "130px", height: "130px", margin: "0 auto 64px auto", display: "flex", alignItems: "center", justifyContent: "center", border: "4px solid black", borderRadius: "50%" }}>
            <span style={{ fontWeight: "bold", color: "#9ca3af", fontFamily: "var(--font-body)", fontSize: "14px" }}>LOGO SEKOLAH</span>
          </div>

          <h3 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", textTransform: "uppercase" }}>Nama Peserta Didik:</h3>
          <div style={{ border: "2px solid black", padding: "12px 32px", fontSize: "24px", fontWeight: "bold", textTransform: "uppercase", marginBottom: "32px", display: "inline-block", minWidth: "300px" }}>
            {data.identitas.nama}
          </div>

          <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase" }}>NISN / NIPD:</h3>
          <div style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "64px" }}>
            {data.identitas.nisn} / {data.identitas.nipd}
          </div>
        </div>

        <div style={{ textAlign: "center", position: "absolute", bottom: "80px", width: "100%" }}>
          <h3 style={{ fontSize: "24px", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px" }}>{data.identitas.sekolah}</h3>
          <p style={{ fontSize: "18px" }}>{data.identitas.alamat_sekolah}</p>
        </div>
      </div>

      {/* ==================== HALAMAN 2: BIODATA ==================== */}
      <div className="rapor-page" style={{ padding: "80px 64px" }}>
        
        <h1 style={{ fontSize: "20px", fontWeight: "bold", textAlign: "center", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "48px" }}>KETERANGAN TENTANG DIRI PESERTA DIDIK</h1>
        
        <table className="biodata-table" style={{ width: "100%", fontSize: "16px" }}>
          <tbody>
            <tr>
              <td style={{ width: "32px", textAlign: "center" }}>1.</td>
              <td style={{ width: "250px" }}>Nama Peserta Didik (Lengkap)</td>
              <td style={{ width: "16px" }}>:</td>
              <td style={{ fontWeight: "bold", textTransform: "uppercase" }}>{data.identitas.nama}</td>
            </tr>
            <tr>
              <td style={{ textAlign: "center" }}>2.</td>
              <td>Nomor Induk Siswa Nasional (NISN)</td>
              <td>:</td>
              <td>{data.identitas.nisn}</td>
            </tr>
            <tr>
              <td style={{ textAlign: "center" }}>3.</td>
              <td>Nomor Induk Peserta Didik (NIPD)</td>
              <td>:</td>
              <td>{data.identitas.nipd}</td>
            </tr>
            <tr>
              <td style={{ textAlign: "center" }}>4.</td>
              <td>Tempat, Tanggal Lahir</td>
              <td>:</td>
              <td>{data.identitas.tempat_lahir}, {data.identitas.tanggal_lahir}</td>
            </tr>
            <tr>
              <td style={{ textAlign: "center" }}>5.</td>
              <td>Jenis Kelamin</td>
              <td>:</td>
              <td>{data.identitas.jenis_kelamin}</td>
            </tr>
            <tr>
              <td style={{ textAlign: "center" }}>6.</td>
              <td>Agama</td>
              <td>:</td>
              <td>{data.identitas.agama}</td>
            </tr>
            <tr>
              <td style={{ textAlign: "center" }}>7.</td>
              <td>Status dalam Keluarga</td>
              <td>:</td>
              <td>{data.identitas.status_keluarga}</td>
            </tr>
            <tr>
              <td style={{ textAlign: "center" }}>8.</td>
              <td>Anak ke</td>
              <td>:</td>
              <td>{data.identitas.anak_ke}</td>
            </tr>
            <tr>
              <td style={{ textAlign: "center" }}>9.</td>
              <td>Alamat Peserta Didik</td>
              <td>:</td>
              <td style={{ lineHeight: "1.5" }}>{data.identitas.alamat}</td>
            </tr>
            <tr>
              <td style={{ textAlign: "center" }}>10.</td>
              <td>Nomor Telepon Rumah/HP</td>
              <td>:</td>
              <td>{data.identitas.telepon}</td>
            </tr>
            <tr>
              <td style={{ textAlign: "center", paddingTop: "16px" }}>11.</td>
              <td colSpan="3" style={{ fontWeight: "bold", paddingTop: "16px" }}>Orang Tua / Wali</td>
            </tr>
            <tr>
              <td></td>
              <td style={{ paddingLeft: "16px" }}>a. Nama Ayah</td>
              <td>:</td>
              <td>{data.identitas.nama_ayah}</td>
            </tr>
            <tr>
              <td></td>
              <td style={{ paddingLeft: "16px" }}>b. Pekerjaan Ayah</td>
              <td>:</td>
              <td>{data.identitas.pekerjaan_ayah}</td>
            </tr>
            <tr>
              <td></td>
              <td style={{ paddingLeft: "16px" }}>c. Nama Ibu</td>
              <td>:</td>
              <td>{data.identitas.nama_ibu}</td>
            </tr>
            <tr>
              <td></td>
              <td style={{ paddingLeft: "16px" }}>d. Pekerjaan Ibu</td>
              <td>:</td>
              <td>{data.identitas.pekerjaan_ibu}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ==================== HALAMAN 3: NILAI AKADEMIK ==================== */}
      <div className="rapor-page" style={{ padding: "40px 32px" }}>
        
        {/* Header Identitas (Kecil) */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "24px", paddingBottom: "16px", borderBottom: "2px solid black" }}>
          <div style={{ width: "48%" }}>
            <table style={{ width: "100%" }}>
              <tbody>
                <tr><td style={{ width: "100px", padding: "2px 0" }}>Nama Siswa</td><td style={{ width: "10px" }}>:</td><td style={{ fontWeight: "bold" }}>{data.identitas.nama}</td></tr>
                <tr><td style={{ padding: "2px 0" }}>NISN / NIPD</td><td>:</td><td>{data.identitas.nisn} / {data.identitas.nipd}</td></tr>
                <tr><td style={{ padding: "2px 0" }}>Sekolah</td><td>:</td><td>{data.identitas.sekolah}</td></tr>
              </tbody>
            </table>
          </div>
          <div style={{ width: "48%" }}>
            <table style={{ width: "100%" }}>
              <tbody>
                <tr><td style={{ width: "100px", padding: "2px 0" }}>Kelas / Fase</td><td style={{ width: "10px" }}>:</td><td>{data.identitas.kelas} / {data.identitas.fase}</td></tr>
                <tr><td style={{ padding: "2px 0" }}>Semester</td><td>:</td><td>{data.identitas.semester}</td></tr>
                <tr><td style={{ padding: "2px 0" }}>Tahun Ajaran</td><td>:</td><td>{data.identitas.tahun_ajaran}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabel Nilai */}
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ fontWeight: "bold", marginBottom: "12px", fontSize: "15px" }}>A. NILAI AKADEMIK</h3>
          <table className="table-rapor">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>No</th>
                <th style={{ width: "180px", textAlign: "left" }}>Mata Pelajaran</th>
                <th style={{ width: "80px" }}>Nilai Akhir</th>
                <th style={{ textAlign: "left" }}>Capaian Kompetensi</th>
              </tr>
            </thead>
            <tbody>
              {data.nilai.map((item, index) => (
                <tr key={index}>
                  <td style={{ textAlign: "center", verticalAlign: "top" }}>{index + 1}</td>
                  <td style={{ fontWeight: "bold", verticalAlign: "top" }}>{item.mapel}</td>
                  <td style={{ textAlign: "center", fontWeight: "bold", fontSize: "16px", verticalAlign: "top" }}>{item.nilai}</td>
                  <td style={{ verticalAlign: "top", lineHeight: "1.5" }}>
                    <div style={{ marginBottom: "8px" }}>
                      <span style={{ fontWeight: "bold" }}>Tercapai: </span>
                      {item.tertinggi}
                    </div>
                    <div>
                      <span style={{ fontWeight: "bold" }}>Perlu Peningkatan: </span>
                      {item.terendah}
                    </div>
                  </td>
                </tr>
              ))}
              {data.nilai.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", padding: "20px" }}>Belum ada data nilai akademik.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Ekstrakurikuler */}
        <div className="page-break-inside-avoid" style={{ marginBottom: "24px" }}>
          <h3 style={{ fontWeight: "bold", marginBottom: "12px", fontSize: "15px" }}>B. EKSTRAKURIKULER</h3>
          <table className="table-rapor">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>No</th>
                <th style={{ width: "180px", textAlign: "left" }}>Kegiatan Ekstrakurikuler</th>
                <th style={{ width: "80px" }}>Predikat</th>
                <th style={{ textAlign: "left" }}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {data.ekskul.map((item, index) => (
                <tr key={index}>
                  <td style={{ textAlign: "center", verticalAlign: "top" }}>{index + 1}</td>
                  <td style={{ fontWeight: "bold", verticalAlign: "top" }}>{item.nama}</td>
                  <td style={{ textAlign: "center", verticalAlign: "top" }}>{item.predikat}</td>
                  <td style={{ verticalAlign: "top" }}>{item.keterangan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Absensi & Catatan */}
        <div className="page-break-inside-avoid" style={{ display: "flex", justifyContent: "space-between", gap: "32px", marginBottom: "24px" }}>
          <div style={{ width: "45%" }}>
            <h3 style={{ fontWeight: "bold", marginBottom: "12px", fontSize: "15px" }}>C. KETIDAKHADIRAN</h3>
            <table className="table-rapor">
              <tbody>
                <tr>
                  <td style={{ width: "70%" }}>Sakit</td>
                  <td style={{ textAlign: "center", fontWeight: "bold" }}>{data.absensi.sakit} hari</td>
                </tr>
                <tr>
                  <td>Izin</td>
                  <td style={{ textAlign: "center", fontWeight: "bold" }}>{data.absensi.izin} hari</td>
                </tr>
                <tr>
                  <td>Tanpa Keterangan</td>
                  <td style={{ textAlign: "center", fontWeight: "bold" }}>{data.absensi.tanpa_keterangan} hari</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ width: "50%" }}>
            <h3 style={{ fontWeight: "bold", marginBottom: "12px", fontSize: "15px" }}>D. CATATAN WALI KELAS</h3>
            <div style={{ border: "1px solid black", padding: "16px", minHeight: "100px", fontStyle: "italic", lineHeight: "1.5" }}>
              "{data.catatan}"
            </div>
          </div>
        </div>

        {/* Tanda Tangan */}
        <div className="page-break-inside-avoid" style={{ marginTop: "48px", display: "flex", justifyContent: "space-between", textAlign: "center", fontSize: "14px" }}>
          <div style={{ width: "30%" }}>
            <p style={{ marginBottom: "4px" }}>Mengetahui,</p>
            <p>Orang Tua/Wali</p>
            <div style={{ marginTop: "80px", borderBottom: "1px solid black", display: "inline-block", width: "80%" }}></div>
          </div>
          <div style={{ width: "30%" }}></div>
          <div style={{ width: "35%" }}>
            <p style={{ marginBottom: "4px" }}>Jakarta, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
            <p>Wali Kelas</p>
            <div style={{ marginTop: "80px", borderBottom: "1px solid black", display: "inline-block", width: "90%", fontWeight: "bold" }}>
              {data.identitas.nama_wali_kelas || "Wali Kelas, S.Pd"}
            </div>
            <p style={{ marginTop: "4px" }}>NIP. -</p>
          </div>
        </div>

      </div>
    </div>
  );
}
