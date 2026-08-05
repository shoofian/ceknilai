"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer, AlertTriangle } from 'lucide-react';
import { use } from 'react';

export default function RaporPreview({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { siswaId } = resolvedParams;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [guru, setGuru] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const authData = await res.json();
          if (authData.loggedIn && authData.user) {
            setGuru(authData.user);
            
            if (!authData.user.walikelas_tingkatan || !authData.user.walikelas_rombel_nama) {
              setErrorMsg("Akses Ditolak: Anda bukan Wali Kelas aktif.");
              setLoading(false);
              return;
            }

            // Simulasi fetch data (termasuk Biodata lengkap)
            setData({
              identitas: {
                nama: "Ahmad Faisal",
                nisn: "0012345678",
                nipd: "2024001",
                tempat_lahir: "Jakarta",
                tanggal_lahir: "15 Agustus 2008",
                jenis_kelamin: "Laki-laki",
                agama: "Islam",
                status_keluarga: "Anak Kandung",
                anak_ke: "1",
                alamat: "Jl. Merdeka No. 45, Jakarta Selatan",
                telepon: "081234567890",
                sekolah: "SMP Negeri 1 Merdeka",
                alamat_sekolah: "Jl. Pendidikan No. 1, Jakarta",
                kelas: "VII (Tujuh) - A",
                fase: "D",
                semester: "1 (Ganjil)",
                tahun_ajaran: "2024/2025",
                nama_ayah: "Budi Santoso",
                pekerjaan_ayah: "Pegawai Negeri Sipil",
                nama_ibu: "Siti Aminah",
                pekerjaan_ibu: "Ibu Rumah Tangga",
                nama_wali: "-",
                pekerjaan_wali: "-",
                alamat_wali: "-"
              },
              nilai: [
                { mapel: "Pendidikan Agama dan Budi Pekerti", nilai: 88, tertinggi: "Memahami makna iman kepada Allah dengan sangat baik", terendah: "Perlu bimbingan dalam membaca Al-Quran dengan tartil" },
                { mapel: "Pancasila", nilai: 92, tertinggi: "Sangat baik dalam menerapkan nilai-nilai gotong royong", terendah: "Mulai berkembang dalam menyampaikan pendapat" },
                { mapel: "Bahasa Indonesia", nilai: 85, tertinggi: "Mampu menyusun teks laporan hasil observasi", terendah: "Perlu peningkatan dalam berbicara di depan umum" },
                { mapel: "Matematika", nilai: 78, tertinggi: "Memahami konsep aljabar dasar", terendah: "Perlu bimbingan intensif dalam pemecahan masalah pecahan" }
              ],
              ekskul: [
                { nama: "Pramuka", predikat: "Baik", keterangan: "Aktif mengikuti kegiatan baris-berbaris" }
              ],
              absensi: { sakit: 1, izin: 0, tanpa_keterangan: 0 },
              catatan: "Ahmad adalah siswa yang rajin. Tingkatkan lagi rasa percaya diri saat presentasi di depan kelas."
            });
            setLoading(false);
          } else {
            router.push("/login");
          }
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Gagal memeriksa sesi", err);
        router.push("/login");
      }
    };
    
    checkAuth();
  }, [router, siswaId]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gray-100 p-10 flex justify-center">
        <div className="bg-white max-w-lg w-full text-center border border-red-200 p-8 rounded-2xl shadow-lg h-fit">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-3 text-red-600">Akses Terbatas</h3>
          <p className="text-gray-600 mb-8">{errorMsg}</p>
          <Link href="/guru/erapor" className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl transition-colors">
            <ArrowLeft size={18} /> Kembali
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 py-8 print:p-0 print:bg-white text-black font-serif">
      
      {/* Tombol Navigasi (Disembunyikan saat dicetak) */}
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden font-sans">
        <Link href="/guru/erapor" className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 font-medium">
          <ArrowLeft size={18} />
          Kembali
        </Link>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 font-medium transition-colors"
        >
          <Printer size={18} />
          Cetak PDF Rapor
        </button>
      </div>

      {/* ==================== HALAMAN 1: COVER ==================== */}
      <div className="bg-white mx-auto shadow-xl mb-8 p-10 print:shadow-none print:m-0 print:p-0 break-after-page flex flex-col items-center justify-center relative"
           style={{ width: '210mm', height: '297mm' }}>
        
        <div className="text-center absolute top-32 w-full px-20">
          <h1 className="text-3xl font-bold uppercase tracking-widest mb-2">Laporan Hasil Belajar</h1>
          <h2 className="text-2xl font-bold uppercase tracking-wide mb-16">(RAPOR)</h2>
          
          <div className="w-32 h-32 mx-auto mb-16 flex items-center justify-center border-4 border-black rounded-full">
            {/* Tempat Logo Sekolah */}
            <span className="font-bold text-gray-400 font-sans">LOGO SEKOLAH</span>
          </div>

          <h3 className="text-xl font-bold mb-4 uppercase">Nama Peserta Didik:</h3>
          <div className="border-2 border-black py-3 px-8 text-2xl font-bold uppercase mb-8 inline-block min-w-[300px]">
            {data.identitas.nama}
          </div>

          <h3 className="text-lg font-bold mb-2 uppercase">NISN / NIPD:</h3>
          <div className="text-xl font-bold mb-16">
            {data.identitas.nisn} / {data.identitas.nipd}
          </div>
        </div>

        <div className="text-center absolute bottom-20 w-full">
          <h3 className="text-2xl font-bold uppercase mb-2">{data.identitas.sekolah}</h3>
          <p className="text-lg">{data.identitas.alamat_sekolah}</p>
        </div>
      </div>

      {/* ==================== HALAMAN 2: BIODATA ==================== */}
      <div className="bg-white mx-auto shadow-xl mb-8 py-20 px-16 print:shadow-none print:m-0 print:p-12 break-after-page"
           style={{ width: '210mm', minHeight: '297mm' }}>
        
        <h1 className="text-xl font-bold text-center uppercase tracking-wide mb-12">KETERANGAN TENTANG DIRI PESERTA DIDIK</h1>
        
        <table className="w-full text-base border-collapse">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="w-8 py-3 align-top text-center">1.</td>
              <td className="w-64 py-3 align-top">Nama Peserta Didik (Lengkap)</td>
              <td className="w-4 py-3 align-top">:</td>
              <td className="py-3 align-top font-bold uppercase">{data.identitas.nama}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="w-8 py-3 align-top text-center">2.</td>
              <td className="w-64 py-3 align-top">Nomor Induk Siswa Nasional (NISN)</td>
              <td className="w-4 py-3 align-top">:</td>
              <td className="py-3 align-top">{data.identitas.nisn}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="w-8 py-3 align-top text-center">3.</td>
              <td className="w-64 py-3 align-top">Nomor Induk Peserta Didik (NIPD)</td>
              <td className="w-4 py-3 align-top">:</td>
              <td className="py-3 align-top">{data.identitas.nipd}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="w-8 py-3 align-top text-center">4.</td>
              <td className="w-64 py-3 align-top">Tempat, Tanggal Lahir</td>
              <td className="w-4 py-3 align-top">:</td>
              <td className="py-3 align-top">{data.identitas.tempat_lahir}, {data.identitas.tanggal_lahir}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="w-8 py-3 align-top text-center">5.</td>
              <td className="w-64 py-3 align-top">Jenis Kelamin</td>
              <td className="w-4 py-3 align-top">:</td>
              <td className="py-3 align-top">{data.identitas.jenis_kelamin}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="w-8 py-3 align-top text-center">6.</td>
              <td className="w-64 py-3 align-top">Agama</td>
              <td className="w-4 py-3 align-top">:</td>
              <td className="py-3 align-top">{data.identitas.agama}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="w-8 py-3 align-top text-center">7.</td>
              <td className="w-64 py-3 align-top">Status dalam Keluarga</td>
              <td className="w-4 py-3 align-top">:</td>
              <td className="py-3 align-top">{data.identitas.status_keluarga}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="w-8 py-3 align-top text-center">8.</td>
              <td className="w-64 py-3 align-top">Anak ke</td>
              <td className="w-4 py-3 align-top">:</td>
              <td className="py-3 align-top">{data.identitas.anak_ke}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="w-8 py-3 align-top text-center">9.</td>
              <td className="w-64 py-3 align-top">Alamat Peserta Didik</td>
              <td className="w-4 py-3 align-top">:</td>
              <td className="py-3 align-top leading-relaxed">{data.identitas.alamat}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="w-8 py-3 align-top text-center">10.</td>
              <td className="w-64 py-3 align-top">Nomor Telepon Rumah/HP</td>
              <td className="w-4 py-3 align-top">:</td>
              <td className="py-3 align-top">{data.identitas.telepon}</td>
            </tr>
            <tr>
              <td className="w-8 py-3 align-top text-center">11.</td>
              <td colSpan="3" className="py-3 align-top font-bold">Orang Tua / Wali</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="w-8 py-1 align-top text-center"></td>
              <td className="w-64 py-1 align-top pl-4">a. Nama Ayah</td>
              <td className="w-4 py-1 align-top">:</td>
              <td className="py-1 align-top">{data.identitas.nama_ayah}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="w-8 py-1 align-top text-center"></td>
              <td className="w-64 py-1 align-top pl-4">b. Pekerjaan Ayah</td>
              <td className="w-4 py-1 align-top">:</td>
              <td className="py-1 align-top">{data.identitas.pekerjaan_ayah}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="w-8 py-1 align-top text-center"></td>
              <td className="w-64 py-1 align-top pl-4">c. Nama Ibu</td>
              <td className="w-4 py-1 align-top">:</td>
              <td className="py-1 align-top">{data.identitas.nama_ibu}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="w-8 py-1 align-top text-center"></td>
              <td className="w-64 py-1 align-top pl-4">d. Pekerjaan Ibu</td>
              <td className="w-4 py-1 align-top">:</td>
              <td className="py-1 align-top">{data.identitas.pekerjaan_ibu}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ==================== HALAMAN 3: NILAI AKADEMIK ==================== */}
      <div className="bg-white mx-auto shadow-xl rounded-sm p-10 print:shadow-none print:m-0 print:p-8"
           style={{ width: '210mm', minHeight: '297mm' }}>
        
        {/* Header Identitas (Kecil) */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-6 pb-4 border-b-2 border-black">
          <div>
            <table className="w-full">
              <tbody>
                <tr><td className="w-32 py-0.5">Nama Siswa</td><td className="w-2">:</td><td className="font-semibold">{data.identitas.nama}</td></tr>
                <tr><td className="py-0.5">NISN / NIPD</td><td>:</td><td>{data.identitas.nisn} / {data.identitas.nipd}</td></tr>
                <tr><td className="py-0.5">Sekolah</td><td>:</td><td>{data.identitas.sekolah}</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <table className="w-full">
              <tbody>
                <tr><td className="w-32 py-0.5">Kelas / Fase</td><td className="w-2">:</td><td>{data.identitas.kelas} / {data.identitas.fase}</td></tr>
                <tr><td className="py-0.5">Semester</td><td>:</td><td>{data.identitas.semester}</td></tr>
                <tr><td className="py-0.5">Tahun Ajaran</td><td>:</td><td>{data.identitas.tahun_ajaran}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabel Nilai */}
        <div className="mb-6">
          <h3 className="font-bold mb-3">A. NILAI AKADEMIK</h3>
          <table className="w-full border-collapse border border-black text-sm">
            <thead className="bg-gray-100 font-bold">
              <tr>
                <th className="border border-black py-2 px-3 w-8 text-center">No</th>
                <th className="border border-black py-2 px-3 w-40 text-left">Mata Pelajaran</th>
                <th className="border border-black py-2 px-3 w-16 text-center">Nilai Akhir</th>
                <th className="border border-black py-2 px-3 text-left">Capaian Kompetensi</th>
              </tr>
            </thead>
            <tbody>
              {data.nilai.map((item, index) => (
                <tr key={index}>
                  <td className="border border-black py-2 px-3 text-center align-top">{index + 1}</td>
                  <td className="border border-black py-2 px-3 font-semibold align-top">{item.mapel}</td>
                  <td className="border border-black py-2 px-3 text-center font-bold text-base align-top">{item.nilai}</td>
                  <td className="border border-black py-2 px-3 align-top leading-relaxed text-sm">
                    <div className="mb-2">
                      <span className="font-semibold print:text-black">Tercapai: </span>
                      {item.tertinggi}
                    </div>
                    <div>
                      <span className="font-semibold print:text-black">Perlu Peningkatan: </span>
                      {item.terendah}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ekstrakurikuler */}
        <div className="mb-6 page-break-inside-avoid">
          <h3 className="font-bold mb-3">B. EKSTRAKURIKULER</h3>
          <table className="w-full border-collapse border border-black text-sm">
            <thead className="bg-gray-100 font-bold">
              <tr>
                <th className="border border-black py-2 px-3 w-8 text-center">No</th>
                <th className="border border-black py-2 px-3 w-40 text-left">Kegiatan Ekstrakurikuler</th>
                <th className="border border-black py-2 px-3 w-20 text-center">Predikat</th>
                <th className="border border-black py-2 px-3 text-left">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {data.ekskul.map((item, index) => (
                <tr key={index}>
                  <td className="border border-black py-2 px-3 text-center align-top">{index + 1}</td>
                  <td className="border border-black py-2 px-3 font-semibold align-top">{item.nama}</td>
                  <td className="border border-black py-2 px-3 text-center align-top">{item.predikat}</td>
                  <td className="border border-black py-2 px-3 align-top">{item.keterangan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Absensi & Catatan */}
        <div className="grid grid-cols-2 gap-8 page-break-inside-avoid">
          <div>
            <h3 className="font-bold mb-3">C. KETIDAKHADIRAN</h3>
            <table className="w-full border-collapse border border-black text-sm">
              <tbody>
                <tr>
                  <td className="border border-black py-2 px-3 w-3/4">Sakit</td>
                  <td className="border border-black py-2 px-3 text-center font-semibold">{data.absensi.sakit} hari</td>
                </tr>
                <tr>
                  <td className="border border-black py-2 px-3">Izin</td>
                  <td className="border border-black py-2 px-3 text-center font-semibold">{data.absensi.izin} hari</td>
                </tr>
                <tr>
                  <td className="border border-black py-2 px-3">Tanpa Keterangan</td>
                  <td className="border border-black py-2 px-3 text-center font-semibold">{data.absensi.tanpa_keterangan} hari</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="font-bold mb-3">D. CATATAN WALI KELAS</h3>
            <div className="border border-black p-4 text-sm h-32 italic leading-relaxed">
              "{data.catatan}"
            </div>
          </div>
        </div>

        {/* Tanda Tangan */}
        <div className="mt-12 grid grid-cols-3 text-center text-sm page-break-inside-avoid">
          <div>
            <p className="mb-1">Mengetahui,</p>
            <p>Orang Tua/Wali</p>
            <br /><br /><br /><br />
            <p className="font-bold border-b border-black inline-block px-4 min-w-[150px]">...................................</p>
          </div>
          <div></div>
          <div>
            <p className="mb-1">Jakarta, 15 Desember 2024</p>
            <p>Wali Kelas</p>
            <br /><br /><br /><br />
            <p className="font-bold border-b border-black inline-block px-4 min-w-[200px]">
              {guru?.nama || "Nama Wali Kelas, S.Pd"}
            </p>
            <p>NIP. {guru?.nip || "-"}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
