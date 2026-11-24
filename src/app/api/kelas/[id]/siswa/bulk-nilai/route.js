import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { getKelasById, updateSiswaInKelas, isGuruLocked, logAktivitasGuru } from '@/lib/db';

export async function PATCH(request, { params }) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    if (await isGuruLocked(username)) {
      return NextResponse.json({ error: 'Akun Anda sedang dikunci (Read-Only)' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const updates = Array.isArray(body?.updates) ? body.updates : [];

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Daftar pembaruan nilai kosong' }, { status: 400 });
    }

    const kelas = await getKelasById(id, username);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    }

    const siswaMap = new Map((kelas.siswa || []).map(s => [String(s.nisn), s]));
    const tasks = [];
    const notifPayloads = [];

    const resolveColName = (colId) => {
      if (colId.startsWith('_presensi_')) {
        const pId = colId.replace('_presensi_', '');
        const p = (kelas.skemaPenilaian?.pertemuan || []).find(x => x.id === pId);
        return p ? `Presensi ${p.nama || p.tanggal}` : 'Presensi';
      }
      const col = (kelas.kolomNilai || []).find(c => c.id === colId);
      if (col) return col.nama;
      for (const parent of (kelas.kolomNilai || [])) {
        if (parent.subKolom) {
          const sub = parent.subKolom.find(s => s.id === colId);
          if (sub) return `${parent.nama} - ${sub.nama}`;
        }
      }
      return colId;
    };

    for (const item of updates) {
      const nisn = item?.nisn ? String(item.nisn) : null;
      const nilaiPatch = item?.nilai;
      if (!nisn || !nilaiPatch || typeof nilaiPatch !== 'object') continue;

      const siswaLama = siswaMap.get(nisn);
      if (!siswaLama) continue;

      const mergedNilai = { ...(siswaLama.nilai || {}) };
      const changedColNames = [];

      Object.keys(nilaiPatch).forEach((k) => {
        if ((nilaiPatch[k] === null || nilaiPatch[k] === "") && (k.endsWith('_remedial') || k.endsWith('_catatan'))) {
          delete mergedNilai[k];
        } else {
          mergedNilai[k] = nilaiPatch[k];
          if (!k.endsWith('_catatan') && !k.endsWith('_remedial') && !k.endsWith('_bonus') && k !== '_katrol') {
            const oldVal = siswaLama.nilai ? siswaLama.nilai[k] : null;
            const newVal = nilaiPatch[k];
            if (oldVal !== newVal && newVal !== null && newVal !== undefined && newVal !== "") {
              changedColNames.push(resolveColName(k));
            }
          }
        }
      });

      if (changedColNames.length > 0) {
        notifPayloads.push({
          nisn: siswaLama.nisn,
          kelasId: id,
          namaKelas: kelas.nama,
          mataPelajaran: kelas.mataPelajaran || '',
          namaSiswa: siswaLama.nama,
          kolomDiubah: changedColNames
        });
      }

      tasks.push(
        updateSiswaInKelas(
          id,
          nisn,
          {
            nisn: siswaLama.nisn,
            nama: siswaLama.nama,
            tanggalLahir: siswaLama.tanggalLahir,
            nilai: mergedNilai,
            catatan: siswaLama.catatan || ""
          },
          username
        )
      );
    }

    // Execute in chunks of 10 to avoid overwhelming DB connections
    let updatedCount = 0;
    for (let i = 0; i < tasks.length; i += 10) {
      const results = await Promise.all(tasks.slice(i, i + 10));
      updatedCount += results.filter(Boolean).length;
    }

    if (updatedCount > 0) {
      await logAktivitasGuru(
        username,
        'EDIT_NILAI_MASSAL',
        `Memperbarui nilai ${updatedCount} siswa sekaligus di kelas "${kelas.nama}"`
      );

      if (notifPayloads.length > 0) {
        import('@/lib/webPush')
          .then(({ enqueueGradeNotification }) => {
            notifPayloads.forEach((payload) => {
              enqueueGradeNotification(payload).catch((err) =>
                console.error('Error enqueuing bulk grade push notification:', err)
              );
            });
          })
          .catch((err) => console.error('Error importing webPush module:', err));
      }
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (error) {
    console.error('Error in PATCH bulk-nilai API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
