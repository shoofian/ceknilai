import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { getGuru, getLegerData } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

export async function GET(request, { params }) {
  try {
    const { siswaId } = await params; // This is the NISN
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const guru = await getGuru(username);
    if (!guru || !guru.walikelas_tingkatan || !guru.walikelas_rombel_nama) {
      return NextResponse.json({ error: 'Anda bukan wali kelas' }, { status: 403 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database tidak terhubung' }, { status: 500 });
    }

    // 1. Ambil data nilai akademik dari leger terlebih dahulu
    const { getLegerData } = await import('@/lib/db');
    let leger = await getLegerData(
      guru.sekolah_id, 
      guru.walikelas_tingkatan, 
      guru.walikelas_rombel_nama, 
      guru.tahun_ajaran || '2025/2026', 
      "Ganjil"
    );

    let studentLeger = null;
    if (leger && leger.siswa) {
      studentLeger = leger.siswa.find(s => String(s.nisn).trim() === String(siswaId).trim());
    }

    if (!studentLeger) {
      leger = await getLegerData(
        guru.sekolah_id, 
        guru.walikelas_tingkatan, 
        guru.walikelas_rombel_nama, 
        guru.tahun_ajaran || '2025/2026', 
        "Genap"
      );
      if (leger && leger.siswa) {
        studentLeger = leger.siswa.find(s => String(s.nisn).trim() === String(siswaId).trim());
      }
    }

    if (!studentLeger) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan di data nilai kelas ini' }, { status: 404 });
    }

    // 2. Coba ambil dari bank_siswa (opsional)
    const { data: bankSiswa } = await supabase
      .from('bank_siswa')
      .select('*')
      .eq('nisn', siswaId)
      .maybeSingle();

    // 3. Ambil Biodata e-Rapor dari biodata_siswa
    const { data: biodata } = await supabase
      .from('biodata_siswa')
      .select('*')
      .eq('nisn', siswaId)
      .maybeSingle();

    // Biodata default jika belum mengisi
    const baseBiodata = biodata || {
      nipd: '-', tempat_lahir: '-', tanggal_lahir: '-', jenis_kelamin: '-', agama: '-', 
      status_keluarga: '-', anak_ke: '-', alamat_lengkap: '-', telepon: '-',
      nama_ayah: '-', pekerjaan_ayah: '-', nama_ibu: '-', pekerjaan_ibu: '-',
      nama_wali: '-', pekerjaan_wali: '-', alamat_wali: '-'
    };

    let nilaiAkademik = [];
    let ekskul = []; 
    let absensi = { sakit: 0, izin: 0, tanpa_keterangan: 0 };
    let catatanWaliKelas = "-";

    // 4. Ambil data ekstrakurikuler dari nilai_ekskul
    const { data: dbEkskul } = await supabase
      .from('nilai_ekskul')
      .select(`
        predikat,
        keterangan,
        master_ekskul (nama_ekskul)
      `)
      .eq('nisn', siswaId)
      .eq('tahun_ajaran', guru.tahun_ajaran || '2025/2026')
      // Note: we might need to filter by semester if we want, or just get all for the year
      // For now we get Ganjil by default, or Genap if fallback.
      .limit(10);
      
    if (dbEkskul && dbEkskul.length > 0) {
      ekskul = dbEkskul.map(e => ({
        nama: e.master_ekskul?.nama_ekskul || 'Ekskul',
        predikat: e.predikat,
        keterangan: e.keterangan || '-'
      }));
    }

    // Ambil absensi
    absensi = {
      sakit: studentLeger.absensi?.S || 0,
      izin: studentLeger.absensi?.I || 0,
      tanpa_keterangan: studentLeger.absensi?.A || 0,
    };

    // Format nilai
    if (studentLeger.nilaiMapel) {
      nilaiAkademik = Object.keys(studentLeger.nilaiMapel).map(mapel => ({
        mapel: mapel,
        nilai: studentLeger.nilaiMapel[mapel],
        catatan_guru: studentLeger.catatanMapel?.[mapel] || "",
        tertinggi: `Menunjukkan penguasaan kompetensi yang baik dalam mata pelajaran ${mapel}`,
        terendah: "Perlu peningkatan dan pendampingan pada beberapa materi yang lebih kompleks"
      }));
    }

    const studentName = studentLeger.nama || bankSiswa?.nama || 'Siswa';

    // Fetch full school data for the report card
    let sekolahData = guru.sekolah || {};
    if (guru.sekolah_id) {
      const { data: dbSekolah } = await supabase.from('sekolah').select('*').eq('id', guru.sekolah_id).maybeSingle();
      if (dbSekolah) sekolahData = dbSekolah;
    }

    const formatTanggalLahir = (tgl, fallbackTgl) => {
      let dateToUse = tgl;
      if (!dateToUse || dateToUse === '-' || dateToUse === '1900-01-01' || dateToUse === 'Invalid Date') {
        dateToUse = fallbackTgl;
      }
      if (!dateToUse || dateToUse === '-' || dateToUse === '1900-01-01' || dateToUse === 'Invalid Date') {
        return '-';
      }
      const d = new Date(dateToUse);
      if (isNaN(d.getTime())) return dateToUse; 
      const formatted = d.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'});
      if (formatted.toLowerCase().includes('invalid')) return dateToUse;
      return formatted;
    };

    const payload = {
      sekolah: sekolahData,
      identitas: {
        nama: studentName,
        nisn: siswaId,
        nipd: baseBiodata.nipd,
        tempat_lahir: baseBiodata.tempat_lahir,
        tanggal_lahir: formatTanggalLahir(baseBiodata.tanggal_lahir, bankSiswa?.tanggal_lahir),
        jenis_kelamin: baseBiodata.jenis_kelamin,
        agama: baseBiodata.agama,
        status_keluarga: baseBiodata.status_keluarga,
        anak_ke: baseBiodata.anak_ke,
        alamat: baseBiodata.alamat_lengkap,
        telepon: baseBiodata.telepon,
        sekolah: sekolahData.nama || 'Sekolahku',
        alamat_sekolah: sekolahData.alamat || sekolahData.desa_kelurahan || '-',
        kelas: `${guru.walikelas_tingkatan} ${guru.walikelas_rombel_nama}`,
        fase: guru.walikelas_tingkatan <= 6 ? (guru.walikelas_tingkatan <= 2 ? 'A' : (guru.walikelas_tingkatan <= 4 ? 'B' : 'C')) : (guru.walikelas_tingkatan <= 9 ? 'D' : (guru.walikelas_tingkatan <= 10 ? 'E' : 'F')), 
        semester: "1 (Ganjil)",
        tahun_ajaran: guru.tahun_ajaran || '2025/2026',
        
        nama_ayah: baseBiodata.nama_ayah,
        pekerjaan_ayah: baseBiodata.pekerjaan_ayah,
        nama_ibu: baseBiodata.nama_ibu,
        pekerjaan_ibu: baseBiodata.pekerjaan_ibu,
        nama_wali: baseBiodata.nama_wali,
        pekerjaan_wali: baseBiodata.pekerjaan_wali,
        alamat_wali: baseBiodata.alamat_wali,
        nama_wali_kelas: guru.nama
      },
      nilai: nilaiAkademik,
      ekskul: ekskul,
      absensi: absensi,
      catatan: catatanWaliKelas
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    console.error('Error in GET erapor/siswa/[siswaId]:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal server' }, { status: 500 });
  }
}
