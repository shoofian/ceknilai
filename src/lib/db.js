import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false
    }
  });
} else {
  console.warn("WARNING: Supabase URL or Key is missing. Database calls will fail. Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.");
}

// Mapper to map snake_case DB schema to camelCase expected by the app
function mapKelasFromDb(k) {
  if (!k) return null;
  return {
    id: k.id,
    nama: k.nama,
    mataPelajaran: k.mata_pelajaran || 'Informatika',
    tahunAjaran: k.tahun_ajaran,
    semester: k.semester || 'Ganjil',
    archived: !!k.archived,
    isNilaiAkhirGenerated: !!k.is_nilai_akhir_generated,
    skemaPenilaian: k.skema_penilaian || { A: 85, B: 75, C: 65, D: 50, kkm: 75, statusA: "A", statusB: "B", statusC: "C", statusD: "D" },
    kolomNilai: (k.kolom_nilai || []).map(col => ({
      id: col.id,
      nama: col.nama,
      bobot: col.bobot
    })),
    siswa: (k.siswa || []).map(s => ({
      nisn: s.nisn,
      nama: s.nama,
      tanggalLahir: s.tanggal_lahir,
      nilai: s.nilai || {},
      catatan: s.catatan || ""
    }))
  };
}

// === GURU PROFILE ===
export async function getGuru(username = null) {
  if (!supabase) return { username: 'guru', password: 'password123', nama: 'Wahyu Shofian, S.Kom', email: 'ws@gmail.com' };
  try {
    let query = supabase.from('guru').select('*');
    if (username) {
      query = query.ilike('username', username.trim());
    }
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) {
      console.error('Error fetching guru:', error);
      return { username: 'guru', password: 'password123', nama: 'Wahyu Shofian, S.Kom', email: 'ws@gmail.com' };
    }
    return data || { username: 'guru', password: 'password123', nama: 'Wahyu Shofian, S.Kom', email: 'ws@gmail.com' };
  } catch (err) {
    console.error('Unexpected error in getGuru:', err);
    return { username: 'guru', password: 'password123', nama: 'Wahyu Shofian, S.Kom', email: 'ws@gmail.com' };
  }
}

export async function updateGuru(updatedProfile) {
  if (!supabase) return null;
  try {
    const current = await getGuru();
    const currentUsername = current?.username || 'guru';

    const updates = {
      username: updatedProfile.username,
      nama: updatedProfile.nama,
      email: updatedProfile.email
    };
    if (updatedProfile.password) {
      updates.password = updatedProfile.password;
    }

    const { data, error } = await supabase
      .from('guru')
      .update(updates)
      .eq('username', currentUsername)
      .select()
      .single();

    if (error) {
      console.error('Error updating guru:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Unexpected error in updateGuru:', err);
    return null;
  }
}

// === KELAS CRUD ===
export async function getKelas(includeArchived = false, guruUsername = null) {
  if (!supabase) return [];
  try {
    let query = supabase
      .from('kelas')
      .select('*, kolom_nilai(*), siswa(*)')
      .order('nama', { ascending: true });

    if (!includeArchived) {
      query = query.eq('archived', false);
    }
    
    if (guruUsername) {
      query = query.eq('guru_username', guruUsername);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching kelas:', error);
      return [];
    }
    return (data || []).map(mapKelasFromDb);
  } catch (err) {
    console.error('Unexpected error in getKelas:', err);
    return [];
  }
}

export async function getKelasById(id, guruUsername = null) {
  if (!supabase) return null;
  try {
    let query = supabase
      .from('kelas')
      .select('*, kolom_nilai(*), siswa(*)')
      .eq('id', id);
      
    if (guruUsername) {
      query = query.eq('guru_username', guruUsername);
    }
    
    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error(`Error fetching kelas with id ${id}:`, error);
      return null;
    }
    return mapKelasFromDb(data);
  } catch (err) {
    console.error('Unexpected error in getKelasById:', err);
    return null;
  }
}

export async function createKelas(newKelas, guruUsername = null) {
  if (!supabase) return null;
  try {
    const cleanNama = newKelas.nama.trim();
    const cleanMapel = (newKelas.mataPelajaran || 'Informatika').trim();
    const cleanTahun = (newKelas.tahunAjaran || '2025/2026').trim();
    const cleanSemester = (newKelas.semester || 'Ganjil').trim();

    // Validasi Keunikan: Cek apakah kombinasi Nama Kelas + Mata Pelajaran + Tahun Ajaran + Semester sudah terdaftar untuk guru ini
    let query = supabase
      .from('kelas')
      .select('id')
      .ilike('nama', cleanNama)
      .ilike('mata_pelajaran', cleanMapel)
      .eq('tahun_ajaran', cleanTahun)
      .ilike('semester', cleanSemester);
      
    if (guruUsername) {
      query = query.eq('guru_username', guruUsername);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      throw new Error(`Kelas "${cleanNama}" dengan Mata Pelajaran "${cleanMapel}" pada Tahun Ajaran "${cleanTahun}" Semester "${cleanSemester}" sudah terdaftar.`);
    }

    const id = newKelas.id || 'kelas-' + Math.random().toString(36).substring(2, 11);
    const kelasRow = {
      id,
      nama: cleanNama,
      mata_pelajaran: cleanMapel,
      tahun_ajaran: cleanTahun,
      semester: cleanSemester,
      archived: false,
      is_nilai_akhir_generated: false,
      guru_username: guruUsername || 'guru',
      skema_penilaian: newKelas.skemaPenilaian || { A: 85, B: 75, C: 65, D: 50, kkm: 75, statusA: "A", statusB: "B", statusC: "C", statusD: "D" }
    };

    const { data, error } = await supabase
      .from('kelas')
      .insert(kelasRow)
      .select()
      .single();

    if (error) {
      console.error('Error creating kelas:', error);
      throw error;
    }

    // Sync columns if present (usually empty arrays at creation, but let's be safe)
    if (newKelas.kolomNilai && newKelas.kolomNilai.length > 0) {
      const colsToInsert = newKelas.kolomNilai.map(col => ({
        kelas_id: id,
        id: col.id,
        nama: col.nama,
        bobot: col.bobot
      }));
      await supabase.from('kolom_nilai').insert(colsToInsert);
    }

    if (newKelas.siswa && newKelas.siswa.length > 0) {
      const studentsToInsert = newKelas.siswa.map(s => ({
        kelas_id: id,
        nisn: s.nisn,
        nama: s.nama,
        tanggal_lahir: s.tanggalLahir,
        nilai: s.nilai || {},
        catatan: s.catatan || ""
      }));
      await supabase.from('siswa').insert(studentsToInsert);
    }

    return getKelasById(id);
  } catch (err) {
    console.error('Unexpected error in createKelas:', err);
    throw err;
  }
}

export async function updateKelas(id, updatedFields, guruUsername = null) {
  if (!supabase) return null;
  try {
    const currentKelas = await getKelasById(id, guruUsername);
    if (!currentKelas) return null; // Jika tidak ditemukan atau bukan milik guru ini

    // Validasi Keunikan saat Update
    if (updatedFields.nama !== undefined || updatedFields.mataPelajaran !== undefined || updatedFields.tahunAjaran !== undefined || updatedFields.semester !== undefined) {
      const cleanNama = (updatedFields.nama !== undefined ? updatedFields.nama : currentKelas.nama).trim();
      const cleanMapel = (updatedFields.mataPelajaran !== undefined ? updatedFields.mataPelajaran : currentKelas.mataPelajaran).trim();
      const cleanTahun = (updatedFields.tahunAjaran !== undefined ? updatedFields.tahunAjaran : currentKelas.tahunAjaran).trim();
      const cleanSemester = (updatedFields.semester !== undefined ? updatedFields.semester : currentKelas.semester).trim();

      let query = supabase
        .from('kelas')
        .select('id')
        .ilike('nama', cleanNama)
        .ilike('mata_pelajaran', cleanMapel)
        .eq('tahun_ajaran', cleanTahun)
        .ilike('semester', cleanSemester)
        .neq('id', id);
        
      if (guruUsername) {
        query = query.eq('guru_username', guruUsername);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        throw new Error(`Kelas "${cleanNama}" dengan Mata Pelajaran "${cleanMapel}" pada Tahun Ajaran "${cleanTahun}" Semester "${cleanSemester}" sudah terdaftar.`);
      }
    }

    const updates = {};
    if (updatedFields.nama !== undefined) updates.nama = updatedFields.nama;
    if (updatedFields.mataPelajaran !== undefined) updates.mata_pelajaran = updatedFields.mataPelajaran;
    if (updatedFields.tahunAjaran !== undefined) updates.tahun_ajaran = updatedFields.tahunAjaran;
    if (updatedFields.semester !== undefined) updates.semester = updatedFields.semester;
    if (updatedFields.archived !== undefined) {
      updates.archived = updatedFields.archived;
    }
    
    if (updatedFields.isNilaiAkhirGenerated !== undefined) {
      updates.is_nilai_akhir_generated = updatedFields.isNilaiAkhirGenerated;
    }

    if (updatedFields.skemaPenilaian !== undefined) {
      updates.skema_penilaian = updatedFields.skemaPenilaian;
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('kelas')
        .update(updates)
        .eq('id', id);
      if (error) {
        console.error('Error updating kelas:', error);
        throw error;
      }
    }

    // Sync columns if kolomNilai is provided
    if (updatedFields.kolomNilai !== undefined) {
      const { error: delError } = await supabase.from('kolom_nilai').delete().eq('kelas_id', id);
      if (delError) console.error('Error deleting columns:', delError);

      if (updatedFields.kolomNilai.length > 0) {
        const colsToInsert = updatedFields.kolomNilai.map(col => ({
          kelas_id: id,
          id: col.id,
          nama: col.nama,
          bobot: col.bobot
        }));
        const { error: colError } = await supabase.from('kolom_nilai').insert(colsToInsert);
        if (colError) console.error('Error inserting columns:', colError);
      }
    }

    // Sync students if siswa is provided
    if (updatedFields.siswa !== undefined) {
      const { error: delError } = await supabase.from('siswa').delete().eq('kelas_id', id);
      if (delError) console.error('Error deleting students:', delError);

      if (updatedFields.siswa.length > 0) {
        const studentsToInsert = updatedFields.siswa.map(s => ({
          kelas_id: id,
          nisn: s.nisn,
          nama: s.nama,
          tanggal_lahir: s.tanggalLahir,
          nilai: s.nilai || {},
          catatan: s.catatan || ""
        }));
        const { error: sError } = await supabase.from('siswa').insert(studentsToInsert);
        if (sError) console.error('Error inserting students:', sError);
      }
    }

    return getKelasById(id);
  } catch (err) {
    console.error('Unexpected error in updateKelas:', err);
    throw err;
  }
}

export async function deleteKelas(id, guruUsername = null) {
  if (!supabase) return false;
  try {
    let query = supabase.from('kelas').delete().eq('id', id);
    if (guruUsername) {
      query = query.eq('guru_username', guruUsername);
    }
    const { error } = await query;
    if (error) {
      console.error('Error deleting kelas:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Unexpected error in deleteKelas:', err);
    return false;
  }
}

// === SISWA CRUD DI DALAM KELAS ===
export async function addSiswaToKelas(kelasId, siswaBaru, guruUsername = null) {
  if (!supabase) return null;
  try {
    // Dapatkan data kelas untuk otorisasi & inisialisasi kolom nilai
    const kelas = await getKelasById(kelasId, guruUsername);
    if (!kelas) return null;
    // Cek apakah NISN sudah ada di kelas ini
    const { data: existing, error: checkError } = await supabase
      .from('siswa')
      .select('nisn')
      .eq('kelas_id', kelasId)
      .eq('nisn', siswaBaru.nisn)
      .maybeSingle();

    if (existing) {
      throw new Error('Siswa dengan NISN tersebut sudah ada di kelas ini.');
    }


    const nilai = siswaBaru.nilai || {};
    kelas.kolomNilai.forEach(col => {
      if (nilai[col.id] === undefined) {
        nilai[col.id] = null;
      }
    });

    const studentRow = {
      kelas_id: kelasId,
      nisn: siswaBaru.nisn,
      nama: siswaBaru.nama,
      tanggal_lahir: siswaBaru.tanggalLahir,
      nilai: nilai,
      catatan: siswaBaru.catatan || ""
    };

    const { data, error } = await supabase
      .from('siswa')
      .insert(studentRow)
      .select()
      .single();

    if (error) {
      console.error('Error adding student:', error);
      return null;
    }

    return {
      nisn: data.nisn,
      nama: data.nama,
      tanggalLahir: data.tanggal_lahir,
      nilai: data.nilai || {},
      catatan: data.catatan || ""
    };
  } catch (err) {
    console.error('Unexpected error in addSiswaToKelas:', err);
    throw err;
  }
}

export async function updateSiswaInKelas(kelasId, nisn, updatedSiswa, guruUsername = null) {
  if (!supabase) return null;
  try {
    // Otorisasi
    const kelas = await getKelasById(kelasId, guruUsername);
    if (!kelas) return null;
    const updates = {};
    if (updatedSiswa.nama !== undefined) updates.nama = updatedSiswa.nama;
    if (updatedSiswa.tanggalLahir !== undefined) updates.tanggal_lahir = updatedSiswa.tanggalLahir;
    if (updatedSiswa.nilai !== undefined) updates.nilai = updatedSiswa.nilai;
    if (updatedSiswa.catatan !== undefined) updates.catatan = updatedSiswa.catatan;

    const { data, error } = await supabase
      .from('siswa')
      .update(updates)
      .eq('kelas_id', kelasId)
      .eq('nisn', nisn)
      .select()
      .single();

    if (error) {
      console.error('Error updating student:', error);
      return null;
    }

    return {
      nisn: data.nisn,
      nama: data.nama,
      tanggalLahir: data.tanggal_lahir,
      nilai: data.nilai || {},
      catatan: data.catatan || ""
    };
  } catch (err) {
    console.error('Unexpected error in updateSiswaInKelas:', err);
    return null;
  }
}

export async function deleteSiswaFromKelas(kelasId, nisn, guruUsername = null) {
  if (!supabase) return false;
  try {
    // Otorisasi
    const kelas = await getKelasById(kelasId, guruUsername);
    if (!kelas) return false;
    const { error } = await supabase
      .from('siswa')
      .delete()
      .eq('kelas_id', kelasId)
      .eq('nisn', nisn);

    if (error) {
      console.error('Error deleting student:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Unexpected error in deleteSiswaFromKelas:', err);
    return false;
  }
}

// === SEARCH STUDENT (SISWA PORTAL) ===
export async function pencarianSiswa(nisn, tanggalLahir) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('siswa')
      .select('*, kelas(*, kolom_nilai(*))')
      .eq('nisn', nisn.trim())
      .eq('tanggal_lahir', tanggalLahir);

    const hasil = [];
    if (error || !data) {
      if (error) console.error('Error searching student:', error);
      return hasil;
    }

    const guruCache = {};

    for (const s of data) {
      const k = s.kelas;
      if (!k) continue;

      let guruNama = "Guru";
      if (k.guru_username) {
        if (!guruCache[k.guru_username]) {
           const g = await getGuru(k.guru_username);
           guruCache[k.guru_username] = g?.nama || "Guru";
        }
        guruNama = guruCache[k.guru_username];
      }

      // Hitung nilai akhir & persentase (Running Average / Progresif)
      let totalNilaiTerisi = 0;
      let totalBobotTerisi = 0;
      let totalBobot = 0;
      let jumlahAspekTerisi = 0;
      const detailNilai = [];

      const kolomNilai = k.kolom_nilai || [];
      const nilaiObj = s.nilai || {};

      kolomNilai.forEach(col => {
        const scoreVal = nilaiObj[col.id];
        const isFilled = scoreVal !== undefined && scoreVal !== null && scoreVal !== "";
        const score = isFilled ? Number(scoreVal) : 0;
        const kontribusi = score * (col.bobot / 100);
        
        if (isFilled) {
          totalNilaiTerisi += kontribusi;
          totalBobotTerisi += col.bobot;
          jumlahAspekTerisi++;
        }
        totalBobot += col.bobot;

        detailNilai.push({
          kolomId: col.id,
          namaKolom: col.nama,
          bobot: col.bobot,
          nilaiAsli: scoreVal,
          kontribusi: isFilled ? Number(kontribusi.toFixed(2)) : "-"
        });
      });

      // Rumus baru: Menggunakan nilai akumulasi mentah (aktual)
      const finalScore = totalNilaiTerisi;
      const finalScoreRounded = Number(finalScore.toFixed(2));

      // Ambil skema penilaian kustom dari kelas atau gunakan default
      const skema = k.skema_penilaian || { A: 85, B: 75, C: 65, D: 50, kkm: 75 };

      // Tentukan Predikat berdasarkan Nilai Akhir sesuai Skema Penilaian
      let predikat = 'E';
      if (finalScoreRounded >= skema.A) predikat = 'A';
      else if (finalScoreRounded >= skema.B) predikat = 'B';
      else if (finalScoreRounded >= skema.C) predikat = 'C';
      else if (finalScoreRounded >= skema.D) predikat = 'D';

      const statusKelulusan = finalScoreRounded >= skema.kkm ? "LULUS" : "TIDAK LULUS";

      hasil.push({
        kelasId: k.id,
        namaKelas: k.nama,
        mataPelajaran: k.mata_pelajaran || 'Informatika',
        tahunAjaran: k.tahun_ajaran,
        semester: k.semester || 'Ganjil',
        archived: !!k.archived,
        isNilaiAkhirGenerated: !!k.is_nilai_akhir_generated,
        guruNama,
        siswa: {
          nisn: s.nisn,
          nama: s.nama,
          catatan: s.catatan || ""
        },
        detailNilai,
        nilaiAkhir: finalScoreRounded,
        predikat,
        statusKelulusan,
        kkm: skema.kkm,
        skema,
        isLengkap: totalBobot === 100,
        jumlahAspekTerisi,
        totalAspekCount: kolomNilai.length,
        totalBobotTerisi
      });
    }

    return hasil;
  } catch (err) {
    console.error('Unexpected error in pencarianSiswa:', err);
    return [];
  }
}
