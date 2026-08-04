import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { getKelasById, updateKelas } from '@/lib/db';



/**
 * POST /api/kelas/[id]/kolom/merge
 * Menggabungkan beberapa kolom mandiri yang sudah ada menjadi satu kolom kelompok (grup).
 *
 * Kunci: Sub-kolom di dalam grup memakai ID yang IDENTIK dengan kolom aslinya,
 * sehingga data siswa.nilai["col-abc"] tidak perlu dimigrasikan sama sekali.
 *
 * Body: { groupName: string, colIds: string[] }
 */
export async function POST(request, { params }) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { isGuruLocked } = await import('@/lib/db');
    if (await isGuruLocked(username)) {
      return NextResponse.json({ error: 'Akun Anda sedang dikunci (Read-Only)' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { groupName, colIds } = body;

    if (!groupName || !groupName.trim()) {
      return NextResponse.json({ error: 'Nama kelompok harus diisi' }, { status: 400 });
    }
    if (!Array.isArray(colIds) || colIds.length < 2) {
      return NextResponse.json({ error: 'Pilih minimal 2 komponen untuk digabung' }, { status: 400 });
    }

    const kelas = await getKelasById(id, username);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    }

    // Temukan kolom-kolom yang dipilih
    const selectedCols = kelas.kolomNilai.filter(col => colIds.includes(col.id));

    if (selectedCols.length !== colIds.length) {
      return NextResponse.json({ error: 'Beberapa kolom yang dipilih tidak ditemukan' }, { status: 400 });
    }

    // Pastikan tidak ada yang sudah merupakan grup
    const alreadyGroup = selectedCols.find(col => col.isGroup);
    if (alreadyGroup) {
      return NextResponse.json(
        { error: `Kolom "${alreadyGroup.nama}" sudah merupakan kelompok nilai dan tidak bisa digabung ulang` },
        { status: 400 }
      );
    }

    // Hitung total bobot dari kolom-kolom terpilih
    const totalBobot = selectedCols.reduce((sum, col) => sum + (Number(col.bobot) || 0), 0);

    // Normalisasi bobot sub-komponen: proporsional terhadap total bobot kelompok
    // Misalnya KD3.1 = 20%, KD3.2 = 30% → dalam grup: 40%, 60%
    const subKolom = selectedCols.map(col => {
      const bobotAsli = Number(col.bobot) || 0;
      const bobotNormalisasi = totalBobot > 0
        ? Math.round((bobotAsli / totalBobot) * 100 * 100) / 100  // 2 desimal
        : 0;
      return {
        id: col.id,           // Pakai ID yang sama — data nilai siswa otomatis terjaga
        nama: col.nama,
        bobot: bobotNormalisasi
      };
    });

    // Bulatkan agar total pasti = 100 (hindari floating point error)
    // Sesuaikan sub terakhir jika total belum tepat 100
    const sumSubBobot = subKolom.reduce((s, sub) => s + sub.bobot, 0);
    if (subKolom.length > 0 && Math.abs(sumSubBobot - 100) < 1) {
      subKolom[subKolom.length - 1].bobot = Math.round((subKolom[subKolom.length - 1].bobot + (100 - sumSubBobot)) * 100) / 100;
    }

    // Buat kolom grup baru
    const groupId = 'col-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const newGroupCol = {
      id: groupId,
      nama: groupName.trim(),
      bobot: totalBobot,
      isGroup: true,
      hitungMetode: 'persentase',   // Pakai bobot kustom agar proporsi asli terjaga
      subKolom
    };

    // Cari posisi kolom pertama yang dihapus (agar grup disisipkan di sana)
    const firstMergedIndex = kelas.kolomNilai.findIndex(col => colIds.includes(col.id));

    // Bangun ulang kolomNilai: hapus kolom terpilih, sisipkan grup di posisi pertama
    const remainingCols = kelas.kolomNilai.filter(col => !colIds.includes(col.id));
    const newKolomNilai = [
      ...remainingCols.slice(0, firstMergedIndex),
      newGroupCol,
      ...remainingCols.slice(firstMergedIndex)
    ];

    // Simpan ke database secara atomik (tanpa menyentuh siswa.nilai)
    await updateKelas(id, {
      kolomNilai: newKolomNilai,
      skemaPenilaian: kelas.skemaPenilaian
    }, username);

    return NextResponse.json({ success: true, newGroupCol });
  } catch (error) {
    console.error('Error in POST kolom/merge:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
