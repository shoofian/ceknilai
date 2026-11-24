import { NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { getKelasById, getKelasMetaAndSiswa, updateSiswaInKelas, deleteSiswaFromKelas } from '@/lib/db';



export async function PATCH(request, { params }) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { isGuruLocked } = await import('@/lib/db');
    if (await isGuruLocked(username)) {
      return NextResponse.json({ error: 'Akun Anda sedang dikunci (Read-Only)' }, { status: 403 });
    }

    const { id, nisn } = await params;
    const updates = await request.json();
    
    // Dapatkan metadata kelas dan data siswa target (tanpa memuat seluruh siswa kelas)
    const { kelas, siswa: siswaLama } = await getKelasMetaAndSiswa(id, nisn, username);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    }

    if (!siswaLama) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
    }

    // Validasi NISN baru jika diubah
    const cleanNewNisn = updates.nisn !== undefined ? updates.nisn.toString().trim() : null;
    const targetNisn = cleanNewNisn || nisn;

    let targetKelas = null;
    if (updates.kelasIdBaru && updates.kelasIdBaru !== id) {
      targetKelas = await getKelasById(updates.kelasIdBaru, username);
      if (!targetKelas) {
        return NextResponse.json({ error: 'Kelas tujuan tidak ditemukan atau tidak diizinkan' }, { status: 403 });
      }
      
      const existsInTarget = targetKelas.siswa.some(s => s.nisn === targetNisn);
      if (existsInTarget) {
        return NextResponse.json({ error: 'Siswa dengan NISN tersebut sudah terdaftar di kelas tujuan' }, { status: 400 });
      }
    } else if (cleanNewNisn && cleanNewNisn !== nisn) {
      const { siswa: duplicateSiswa } = await getKelasMetaAndSiswa(id, cleanNewNisn, username);
      if (duplicateSiswa) {
        return NextResponse.json({ error: 'NISN baru sudah digunakan oleh siswa lain di kelas ini' }, { status: 400 });
      }
    }

    // Lakukan merge untuk nilai agar tidak menimpa nilai yang lain
    let mergedNilai = { ...siswaLama.nilai };
    if (updates.nilai) {
      Object.keys(updates.nilai).forEach((k) => {
        if ((updates.nilai[k] === null || updates.nilai[k] === "") && (k.endsWith('_remedial') || k.endsWith('_catatan'))) {
          delete mergedNilai[k];
        } else {
          mergedNilai[k] = updates.nilai[k];
        }
      });
    }

    const siswaUpdate = {
      kelasIdBaru: updates.kelasIdBaru || undefined,
      nisn: targetNisn,
      nama: updates.nama !== undefined ? updates.nama.trim() : siswaLama.nama,
      tanggalLahir: updates.tanggalLahir !== undefined ? updates.tanggalLahir : siswaLama.tanggalLahir,
      nilai: mergedNilai,
      catatan: updates.catatan !== undefined ? updates.catatan.trim() : (siswaLama.catatan || "")
    };

    const updated = await updateSiswaInKelas(id, nisn, siswaUpdate, username);
    if (!updated) {
      return NextResponse.json({ error: 'Gagal memperbarui siswa' }, { status: 400 });
    }

    // Log teacher activity (hanya jika bukan update nilai/catatan saja)
    const updateKeys = Object.keys(updates);
    const isOnlyNilaiCatatan = updateKeys.length > 0 && updateKeys.every(key => ['nilai', 'catatan'].includes(key));

    const { logAktivitasGuru, logAktivitasNilai } = await import('@/lib/db');
    if (!isOnlyNilaiCatatan) {
      let logDetail = `Memperbarui data siswa "${siswaLama.nama}" (NISN: ${nisn}) di kelas "${kelas.nama}"`;
      if (targetKelas) {
        logDetail = `Memindahkan siswa "${siswaLama.nama}" (NISN: ${targetNisn}) dari kelas "${kelas.nama}" ke kelas "${targetKelas.nama}"`;
      } else if (cleanNewNisn && cleanNewNisn !== nisn) {
        logDetail = `Memperbarui data siswa "${siswaLama.nama}" (NISN lama: ${nisn}, NISN baru: ${cleanNewNisn}) di kelas "${kelas.nama}"`;
      }
      await logAktivitasGuru(
        username,
        'EDIT_SISWA',
        logDetail
      );
    } else {
      // Aggregate logs for grades/attendance input
      await logAktivitasNilai(username, kelas.nama, siswaLama.nama, nisn);
    }

    // Antrean Web Push Notifikasi Nilai Siswa (Jeda 5 Menit / Debounce)
    if (updates.nilai) {
      const changedColNames = [];
      Object.keys(updates.nilai).forEach((colId) => {
        if (colId.endsWith('_catatan') || colId.endsWith('_remedial')) return;

        const oldVal = siswaLama.nilai ? siswaLama.nilai[colId] : null;
        const newVal = updates.nilai[colId];
        if (oldVal !== newVal && newVal !== null && newVal !== undefined && newVal !== "") {
          let colName = colId;
          if (colId.startsWith('_presensi_')) {
            const pId = colId.replace('_presensi_', '');
            const p = (kelas.skemaPenilaian?.pertemuan || []).find(x => x.id === pId);
            colName = p ? `Presensi ${p.nama || p.tanggal}` : 'Presensi';
          } else {
            const col = (kelas.kolomNilai || []).find(c => c.id === colId);
            if (col) {
              colName = col.nama;
            } else {
              for (const parent of (kelas.kolomNilai || [])) {
                if (parent.subKolom) {
                  const sub = parent.subKolom.find(s => s.id === colId);
                  if (sub) {
                    colName = `${parent.nama} - ${sub.nama}`;
                    break;
                  }
                }
              }
            }
          }
          changedColNames.push(colName);
        }
      });

      if (changedColNames.length > 0) {
        import('@/lib/webPush').then(({ enqueueGradeNotification }) => {
          enqueueGradeNotification({
            nisn: targetNisn,
            kelasId: id,
            namaKelas: kelas.nama,
            mataPelajaran: kelas.mataPelajaran || '',
            namaSiswa: siswaLama.nama,
            kolomDiubah: changedColNames
          }).catch(err => console.error('Error enqueuing grade push notification:', err));
        }).catch(err => console.error('Error importing webPush module:', err));
      }
    }

    return NextResponse.json({ success: true, siswa: updated });
  } catch (error) {
    console.error('Error in PATCH siswa individual API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const username = await checkAuth();
    if (!username) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
    }

    const { isGuruLocked } = await import('@/lib/db');
    if (await isGuruLocked(username)) {
      return NextResponse.json({ error: 'Akun Anda sedang dikunci (Read-Only)' }, { status: 403 });
    }

    const { id, nisn } = await params;
    const kelas = await getKelasById(id, username);
    if (!kelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });
    }

    const siswaLama = kelas.siswa.find(s => s.nisn === nisn);
    if (!siswaLama) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
    }

    const success = await deleteSiswaFromKelas(id, nisn, username);
    
    if (!success) {
      return NextResponse.json({ error: 'Gagal menghapus siswa' }, { status: 400 });
    }

    // Log teacher activity
    const { logAktivitasGuru } = await import('@/lib/db');
    await logAktivitasGuru(
      username,
      'HAPUS_SISWA',
      `Menghapus siswa "${siswaLama.nama}" (NISN: ${nisn}) dari kelas "${kelas.nama}"`
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE siswa individual API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export const PUT = PATCH;
