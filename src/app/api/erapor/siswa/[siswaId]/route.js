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
    const { siswaId } = params; // This is the NISN
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

    // 1. Ambil data siswa dasar dari bank_siswa
    const { data: bankSiswa, error: errBank } = await supabase
      .from('bank_siswa')
      .select('*')
      .eq('nisn', siswaId)
      .single();

    if (errBank || !bankSiswa) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan di bank data' }, { status: 404 });
    }

    // 2. Ambil Biodata e-Rapor dari biodata_siswa
    const { data: biodata, error: errBiodata } = await supabase
      .from('biodata_siswa')
      .select('*')
      .eq('nisn', siswaId)
      .single();

    // Biodata default jika belum mengisi
    const baseBiodata = biodata || {
      nipd: '-', tempat_lahir: '-', tanggal_lahir: '-', jenis_kelamin: '-', agama: '-', 
      status_keluarga: '-', anak_ke: '-', alamat_lengkap: '-', telepon: '-',
      nama_ayah: '-', pekerjaan_ayah: '-', nama_ibu: '-', pekerjaan_ibu: '-',
      nama_wali: '-', pekerjaan_wali: '-', alamat_wali: '-'
    };

    // 3. Ambil data nilai akademik dari leger
    // Gunakan semester ganjil (1) atau genap (2). Sementara hardcode 1 atau baca setting.
    const leger = await getLegerData(
      guru.sekolah_id, 
      guru.walikelas_tingkatan, 
      guru.walikelas_rombel_nama, 
      guru.tahun_ajaran || '2025/2026', 
      1
    );

    let nilaiAkademik = [];
    let ekskul = [{ nama: "Pramuka", predikat: "B", keterangan: "Baik" }]; // Mock ekskul karena di db ceknilai belum ada tabel ekskul
    let absensi = { sakit: 0, izin: 0, tanpa_keterangan: 0 };
    let catatanWaliKelas = "-";

    if (leger && leger.siswa) {
      const studentLeger = leger.siswa.find(s => s.nisn === siswaId);
      if (studentLeger) {
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
            // Jika tidak ada catatan, buat deskripsi kompetensi otomatis
            tertinggi: studentLeger.catatanMapel?.[mapel] || `Mencapai kompetensi pada mata pelajaran ${mapel}`,
            terendah: "Perlu pendampingan untuk materi yang lebih kompleks"
          }));
        }
      }
    }

    const payload = {
      identitas: {
        nama: bankSiswa.nama,
        nisn: bankSiswa.nisn,
        nipd: baseBiodata.nipd,
        tempat_lahir: baseBiodata.tempat_lahir,
        tanggal_lahir: baseBiodata.tanggal_lahir ? new Date(baseBiodata.tanggal_lahir).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : '-',
        jenis_kelamin: baseBiodata.jenis_kelamin,
        agama: baseBiodata.agama,
        status_keluarga: baseBiodata.status_keluarga,
        anak_ke: baseBiodata.anak_ke,
        alamat: baseBiodata.alamat_lengkap,
        telepon: baseBiodata.telepon,
        sekolah: guru.sekolah?.nama || 'Sekolahku',
        alamat_sekolah: '-', // Bisa diisi dari tabel sekolah
        kelas: `${guru.walikelas_tingkatan} ${guru.walikelas_rombel_nama}`,
        fase: guru.walikelas_tingkatan <= 6 ? (guru.walikelas_tingkatan <= 2 ? 'A' : (guru.walikelas_tingkatan <= 4 ? 'B' : 'C')) : (guru.walikelas_tingkatan <= 9 ? 'D' : (guru.walikelas_tingkatan <= 10 ? 'E' : 'F')), // Logika Fase Kurmer
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
