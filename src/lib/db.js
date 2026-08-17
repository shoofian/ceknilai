import { createClient } from '@supabase/supabase-js';
import { cache } from 'react';

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
}

export { supabase };

export function normalizeRombelNama(str) {
  if (!str) return "";
  let clean = str.toString().trim().toUpperCase();
  clean = clean.replace(/[-_]/g, " ");
  clean = clean.replace(/\s+/g, " ");
  clean = clean.replace(/\b0+(\d+)\b/g, "$1");
  return clean.trim();
}

// Helper to sort kolomNilai stably, preserving any custom order stored in skema_penilaian
export function sortKolomNilai(kolomNilaiArray, skemaPenilaian) {
  const kolomOrder = skemaPenilaian?.kolomOrder;
  if (Array.isArray(kolomOrder) && kolomOrder.length > 0) {
    const orderMap = new Map();
    kolomOrder.forEach((id, idx) => {
      orderMap.set(id, idx);
    });
    
    return [...kolomNilaiArray].sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id) : 999999;
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id) : 999999;
      if (idxA !== idxB) {
        return idxA - idxB;
      }
      const partsA = (a.id || '').split('-');
      const partsB = (b.id || '').split('-');
      const timeA = parseInt(partsA[1]) || 0;
      const timeB = parseInt(partsB[1]) || 0;
      if (timeA !== timeB) return timeA - timeB;
      const indexA = parseInt(partsA[2]) || 0;
      const indexB = parseInt(partsB[2]) || 0;
      if (indexA !== indexB) return indexA - indexB;
      return (a.id || '').localeCompare(b.id || '');
    });
  }
  
  return [...kolomNilaiArray].sort((a, b) => {
    const partsA = (a.id || '').split('-');
    const partsB = (b.id || '').split('-');
    const timeA = parseInt(partsA[1]) || 0;
    const timeB = parseInt(partsB[1]) || 0;
    if (timeA !== timeB) return timeA - timeB;
    const indexA = parseInt(partsA[2]) || 0;
    const indexB = parseInt(partsB[2]) || 0;
    if (indexA !== indexB) return indexA - indexB;
    return (a.id || '').localeCompare(b.id || '');
  });
}

// Mapper to map snake_case DB schema to camelCase expected by the app
function mapKelasFromDb(k) {
  if (!k) return null;
  return {
    id: k.id,
    nama: k.nama,
    guru_username: k.guru_username || null,
    rombelNama: k.rombel_nama || null,
    namaKustom: k.nama_kustom || null,
    mataPelajaran: k.mata_pelajaran || 'Informatika',
    tahunAjaran: k.tahun_ajaran,
    semester: k.semester || 'Ganjil',
    tingkatan: k.tingkatan || null,
    archived: !!k.archived,
    isNilaiAkhirGenerated: !!k.is_nilai_akhir_generated,
    skemaPenilaian: {
      A: 85, B: 75, C: 65, D: 50, kkm: "", statusA: "A", statusB: "B", statusC: "C", statusD: "D",
      remedialPolicy: "max_kkm",
      maxCap: 100,
      cappingScope: "bonus_only",
      enableBonusStars: false,
      ...(k.skema_penilaian || {})
    },
    kolomNilai: sortKolomNilai(k.kolom_nilai || [], k.skema_penilaian).map(col => {
      const groupConfig = k.skema_penilaian?.kolomAspekGroup?.[col.id];
      return {
        id: col.id,
        nama: col.nama,
        bobot: col.bobot,
        isGroup: groupConfig ? !!groupConfig.isGroup : false,
        isPresensi: groupConfig ? !!groupConfig.isPresensi : false,
        hitungMetode: groupConfig ? (groupConfig.hitungMetode || "rata-rata") : "rata-rata",
        subKolom: groupConfig ? (groupConfig.subKolom || []).map(sub => ({
          id: sub.id,
          nama: sub.nama,
          bobot: sub.bobot !== undefined && sub.bobot !== null ? Number(sub.bobot) : null
        })) : []
      };
    }),
    siswa: (k.siswa || []).map(s => ({
      nisn: s.nisn,
      nama: s.nama,
      tanggalLahir: s.tanggal_lahir === '1900-01-01' ? '' : s.tanggal_lahir,
      nilai: s.nilai || {},
      catatan: s.catatan || ""
    }))
  };
}

// === GURU PROFILE ===
export const getGuru = cache(async function getGuru(username = null) {
  if (!supabase) return { username: 'guru', password: 'password123', nama: 'Wahyu Shofian, S.Kom', email: 'ws@gmail.com', is_locked: false, lock_message: null, sekolah_id: null, walikelas_tingkatan: null, walikelas_rombel_nama: null, tahun_ajaran: '2025/2026' };
  try {
    let query = supabase.from('guru').select('*, sekolah:sekolah_id(nama, npsn)');
    if (username) {
      query = query.ilike('username', username.trim());
    }
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) {
      // Fallback if sekolah relationship does not exist
      let fallbackQuery = supabase.from('guru').select('*');
      if (username) {
        fallbackQuery = fallbackQuery.ilike('username', username.trim());
      }
      const { data: fbData, error: fbError } = await fallbackQuery.limit(1).maybeSingle();
      if (fbError) {
        console.error('Error fetching guru (fallback):', fbError);
        return { username: 'guru', password: 'password123', nama: 'Wahyu Shofian, S.Kom', email: 'ws@gmail.com', is_locked: false, lock_message: null, tahun_ajaran: '2025/2026' };
      }
      const result = fbData || { username: 'guru', password: 'password123', nama: 'Wahyu Shofian, S.Kom', email: 'ws@gmail.com' };
      return {
        ...result,
        is_locked: result.is_locked ?? false,
        lock_message: result.lock_message ?? null,
        is_admin_sekolah: result.is_admin_sekolah ?? false,
        sekolah_id: null,
        walikelas_tingkatan: null,
        walikelas_rombel_nama: null,
        tahun_ajaran: '2025/2026',
        sekolah: null,
        premium_until: result.premium_until ?? null
      };
    }
    const result = data || { username: 'guru', password: 'password123', nama: 'Wahyu Shofian, S.Kom', email: 'ws@gmail.com' };
    return {
      ...result,
      is_locked: result.is_locked ?? false,
      lock_message: result.lock_message ?? null,
      is_admin_sekolah: result.is_admin_sekolah ?? false,
      sekolah_id: result.sekolah_id ?? null,
      walikelas_tingkatan: result.walikelas_tingkatan ?? null,
      walikelas_rombel_nama: result.walikelas_rombel_nama ?? null,
      tahun_ajaran: result.tahun_ajaran ?? '2025/2026',
      sekolah: result.sekolah ?? null,
      premium_until: result.premium_until ?? null
    };
  } catch (err) {
    console.error('Unexpected error in getGuru:', err);
  }
});

export async function getGuruByEmail(email) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('guru')
      .select('*, sekolah:sekolah_id(nama, npsn)')
      .ilike('email', email.trim())
      .maybeSingle();
      
    if (error) {
      // Fallback if sekolah relationship does not exist
      const { data: fbData, error: fbError } = await supabase
        .from('guru')
        .select('*')
        .ilike('email', email.trim())
        .maybeSingle();
      if (fbError) {
        console.error('Error fetching guru by email (fallback):', fbError);
        return null;
      }
      return fbData ? {
        ...fbData,
        is_locked: fbData.is_locked ?? false,
        lock_message: fbData.lock_message ?? null,
        sekolah_id: null,
        walikelas_tingkatan: null,
        walikelas_rombel_nama: null,
        tahun_ajaran: '2025/2026',
        sekolah: null
      } : null;
    }
    
    return data ? {
      ...data,
      is_locked: data.is_locked ?? false,
      lock_message: data.lock_message ?? null,
      sekolah_id: data.sekolah_id ?? null,
      walikelas_tingkatan: data.walikelas_tingkatan ?? null,
      walikelas_rombel_nama: data.walikelas_rombel_nama ?? null,
      tahun_ajaran: data.tahun_ajaran ?? '2025/2026',
      sekolah: data.sekolah ?? null
    } : null;
  } catch (err) {
    console.error('Unexpected error in getGuruByEmail:', err);
    return null;
  }
}

async function cascadeUsernameChange(oldUsername, newUsername) {
  if (!supabase || !oldUsername || !newUsername) return;
  const oldLower = oldUsername.trim().toLowerCase();
  const newLower = newUsername.trim().toLowerCase();
  if (oldLower === newLower) return;
  try {
    // 1. Update kelas table
    await supabase
      .from('kelas')
      .update({ guru_username: newLower })
      .eq('guru_username', oldLower);
      
    // 2. Update log_aktivitas_guru table
    await supabase
      .from('log_aktivitas_guru')
      .update({ guru_username: newLower })
      .eq('guru_username', oldLower);
  } catch (err) {
    console.error('Failed to cascade username change:', err);
  }
}

export async function updateGuru(currentUsername, updatedProfile) {
  if (!supabase) return null;
  try {
    let oldUsername = currentUsername;
    let updates = updatedProfile;

    // Handle single-argument calls or backwards compatibility
    if (typeof currentUsername === 'object' && updatedProfile === undefined) {
      updates = currentUsername;
      const current = await getGuru();
      oldUsername = current?.username || 'guru';
    }

    const updatesPayload = {
      username: updates.username,
      nama: updates.nama,
      email: updates.email
    };
    if (updates.password) {
      updatesPayload.password = updates.password;
    }
    if (updates.sekolah_id !== undefined) {
      updatesPayload.sekolah_id = updates.sekolah_id;
    }
    if (updates.walikelas_tingkatan !== undefined) {
      updatesPayload.walikelas_tingkatan = updates.walikelas_tingkatan;
    }
    if (updates.walikelas_rombel_nama !== undefined) {
      updatesPayload.walikelas_rombel_nama = updates.walikelas_rombel_nama;
    }
    if (updates.tahun_ajaran !== undefined) {
      updatesPayload.tahun_ajaran = updates.tahun_ajaran;
    }

    let { data, error } = await supabase
      .from('guru')
      .update(updatesPayload)
      .eq('username', oldUsername)
      .select()
      .single();

    if (error) {
      console.error('Error updating guru:', error);
      // Self-healing: If column "tahun_ajaran" does not exist in the database (error 42703)
      if (error.code === '42703' && updatesPayload.tahun_ajaran !== undefined) {
        console.warn('tahun_ajaran column missing, retrying update without it...');
        const healedPayload = { ...updatesPayload };
        delete healedPayload.tahun_ajaran;
        
        const retry = await supabase
          .from('guru')
          .update(healedPayload)
          .eq('username', oldUsername)
          .select()
          .single();
          
        if (!retry.error) {
          if (updatesPayload.username) {
            await cascadeUsernameChange(oldUsername, updatesPayload.username);
          }
          return retry.data;
        }
        console.error('Retry failed:', retry.error);
      }
      return null;
    }

    if (updatesPayload.username) {
      await cascadeUsernameChange(oldUsername, updatesPayload.username);
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
    const rombelNamaNormalized = newKelas.rombelNama ? normalizeRombelNama(newKelas.rombelNama) : null;
    const kelasRow = {
      id,
      nama: cleanNama,
      rombel_nama: rombelNamaNormalized,
      nama_kustom: newKelas.namaKustom ? newKelas.namaKustom.trim() : null,
      mata_pelajaran: cleanMapel,
      tahun_ajaran: cleanTahun,
      semester: cleanSemester,
      tingkatan: newKelas.tingkatan || null,
      archived: false,
      is_nilai_akhir_generated: false,
      guru_username: guruUsername || 'guru',
      skema_penilaian: newKelas.skemaPenilaian || { A: 85, B: 75, C: 65, D: 50, kkm: "", statusA: "A", statusB: "B", statusC: "C", statusD: "D" }
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
        tanggal_lahir: (s.tanggalLahir && s.tanggalLahir.toString().trim() !== "") ? s.tanggalLahir : '1900-01-01',
        nilai: s.nilai || {},
        catatan: s.catatan || ""
      }));
      const { error: sInsertError } = await supabase.from('siswa').insert(studentsToInsert);
      if (sInsertError) {
        console.error('Error inserting students in createKelas:', sInsertError);
        throw sInsertError;
      }
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
    if (updatedFields.tingkatan !== undefined) updates.tingkatan = updatedFields.tingkatan;
    if (updatedFields.rombelNama !== undefined) {
      updates.rombel_nama = updatedFields.rombelNama ? normalizeRombelNama(updatedFields.rombelNama) : null;
    }
    if (updatedFields.namaKustom !== undefined) {
      updates.nama_kustom = updatedFields.namaKustom ? updatedFields.namaKustom.trim() : null;
    }
    if (updatedFields.archived !== undefined) {
      updates.archived = updatedFields.archived;
    }
    
    if (updatedFields.isNilaiAkhirGenerated !== undefined) {
      updates.is_nilai_akhir_generated = updatedFields.isNilaiAkhirGenerated;
    }

    // Sinkronisasikan kolomAspekGroup di skema_penilaian
    let currentSkema = updatedFields.skemaPenilaian !== undefined 
      ? { ...updatedFields.skemaPenilaian } 
      : { ...(currentKelas.skemaPenilaian || {}) };
      
    if (updatedFields.kolomNilai !== undefined) {
      const groupConfigs = {};
      updatedFields.kolomNilai.forEach(col => {
        if (col.isGroup) {
          groupConfigs[col.id] = {
            isGroup: true,
            hitungMetode: col.hitungMetode || "rata-rata",
            subKolom: (col.subKolom || []).map(sub => ({
              id: sub.id,
              nama: sub.nama,
              bobot: sub.bobot !== undefined && sub.bobot !== null ? Number(sub.bobot) : null
            }))
          };
        } else if (col.isPresensi) {
          groupConfigs[col.id] = {
            isGroup: false,
            isPresensi: true
          };
        }
      });
      currentSkema.kolomAspekGroup = groupConfigs;
      currentSkema.kolomOrder = updatedFields.kolomNilai.map(col => col.id);
      updates.skema_penilaian = currentSkema;
    } else if (updatedFields.skemaPenilaian !== undefined) {
      // Pastikan kolomAspekGroup & kolomOrder lama dipertahankan saat skemaPenilaian diperbarui
      currentSkema.kolomAspekGroup = currentKelas.skemaPenilaian?.kolomAspekGroup || {};
      currentSkema.kolomOrder = currentKelas.skemaPenilaian?.kolomOrder || [];
      updates.skema_penilaian = currentSkema;
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
      if (delError) {
        console.error('Error deleting columns:', delError);
        throw delError;
      }

      if (updatedFields.kolomNilai.length > 0) {
        const colsToInsert = updatedFields.kolomNilai.map(col => ({
          kelas_id: id,
          id: col.id,
          nama: col.nama,
          bobot: col.bobot
        }));
        const { error: colError } = await supabase.from('kolom_nilai').insert(colsToInsert);
        if (colError) {
          console.error('Error inserting columns:', colError);
          throw colError;
        }
      }
    }

    // Sync students if siswa is provided — use upsert to avoid losing data
    if (updatedFields.siswa !== undefined) {
      if (updatedFields.siswa.length > 0) {
        const studentsToUpsert = updatedFields.siswa.map(s => ({
          kelas_id: id,
          nisn: s.nisn,
          nama: s.nama,
          tanggal_lahir: (s.tanggalLahir && s.tanggalLahir.toString().trim() !== "") ? s.tanggalLahir : '1900-01-01',
          nilai: s.nilai || {},
          catatan: s.catatan || ""
        }));
        const { error: sError } = await supabase
          .from('siswa')
          .upsert(studentsToUpsert, { onConflict: 'kelas_id,nisn' });
        if (sError) {
          console.error('Error upserting students:', sError);
          throw sError;
        }
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
      tanggal_lahir: (siswaBaru.tanggalLahir && siswaBaru.tanggalLahir.toString().trim() !== "") ? siswaBaru.tanggalLahir : '1900-01-01',
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
      tanggalLahir: data.tanggal_lahir === '1900-01-01' ? '' : data.tanggal_lahir,
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
    if (updatedSiswa.kelasIdBaru !== undefined) updates.kelas_id = updatedSiswa.kelasIdBaru;
    if (updatedSiswa.nisn !== undefined) updates.nisn = updatedSiswa.nisn;
    if (updatedSiswa.nama !== undefined) updates.nama = updatedSiswa.nama;
    if (updatedSiswa.tanggalLahir !== undefined) {
      updates.tanggal_lahir = (updatedSiswa.tanggalLahir && updatedSiswa.tanggalLahir.toString().trim() !== "") ? updatedSiswa.tanggalLahir : '1900-01-01';
    }
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
      tanggalLahir: data.tanggal_lahir === '1900-01-01' ? '' : data.tanggal_lahir,
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

export async function deleteSiswaBulkFromKelas(kelasId, nisnArray, guruUsername = null) {
  if (!supabase || !nisnArray || nisnArray.length === 0) return false;
  try {
    const kelas = await getKelasById(kelasId, guruUsername);
    if (!kelas) return false;
    const { error } = await supabase
      .from('siswa')
      .delete()
      .eq('kelas_id', kelasId)
      .in('nisn', nisnArray);

    if (error) {
      console.error('Error bulk deleting students:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Unexpected error in deleteSiswaBulkFromKelas:', err);
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
      // LOG ACTIVITY: Catat waktu akses siswa secara fire-and-forget
      const currentNilai = s.nilai || {};
      const history = Array.isArray(currentNilai._login_history) ? [...currentNilai._login_history] : [];
      history.push(new Date().toISOString());
      
      // Simpan maksimal 15 log terakhir agar JSON tidak membengkak
      if (history.length > 15) history.shift();
      
      const updatedNilai = { ...currentNilai, _login_history: history };
      supabase.from('siswa')
        .update({ nilai: updatedNilai })
        .eq('kelas_id', s.kelas_id)
        .eq('nisn', s.nisn)
        .then(() => {})
        .catch(err => console.error("Gagal mencatat log aktifitas:", err));

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

      const kolomNilai = [...(k.kolom_nilai || [])].sort((a, b) => {
        const partsA = (a.id || '').split('-');
        const partsB = (b.id || '').split('-');
        const timeA = parseInt(partsA[1]) || 0;
        const timeB = parseInt(partsB[1]) || 0;
        if (timeA !== timeB) return timeA - timeB;
        const indexA = parseInt(partsA[2]) || 0;
        const indexB = parseInt(partsB[2]) || 0;
        if (indexA !== indexB) return indexA - indexB;
        return (a.id || '').localeCompare(b.id || '');
      });
      const nilaiObj = s.nilai || {};

      // Ambil skema penilaian kustom dari kelas atau gunakan default
      const skema = k.skema_penilaian || { A: 85, B: 75, C: 65, D: 50, kkm: "" };
      const hiddenAspek = Array.isArray(skema.hiddenAspek) ? skema.hiddenAspek : [];

      // Ambil seluruh data nilai siswa di kelas ini untuk perbandingan & hitung rata-rata
      let allSiswa = [];
      try {
        const { data } = await supabase
          .from('siswa')
          .select('nilai')
          .eq('kelas_id', k.id);
        if (data) allSiswa = data;
      } catch (err) {
        console.error("Gagal mengambil data siswa kelas untuk perbandingan:", err);
      }

      kolomNilai.forEach(col => {
        const groupConfig = skema.kolomAspekGroup?.[col.id];
        const isGroup = groupConfig ? !!groupConfig.isGroup : false;
        const isPresensi = groupConfig ? !!groupConfig.isPresensi : false;
        const hitungMetode = groupConfig ? (groupConfig.hitungMetode || "rata-rata") : "rata-rata";
        const subKolom = groupConfig ? (groupConfig.subKolom || []) : [];

        let scoreVal = null;
        let isFilled = false;

        if (isPresensi) {
          // Kolom terintegrasi presensi: hitung otomatis dari persentase kehadiran
          const pertemuanList = skema.pertemuan || [];
          const totalP = pertemuanList.length;
          if (totalP > 0) {
            let countH = 0;
            let totalDiisi = 0;
            pertemuanList.forEach(p => {
              const val = nilaiObj[`_presensi_${p.id}`];
              if (val) {
                totalDiisi++;
                if (val === 'H') countH++;
              }
            });
            if (totalDiisi > 0) {
              scoreVal = (countH / totalP) * 100;
              isFilled = true;
            }
          }
        } else if (isGroup && subKolom.length > 0) {
          let subTotal = 0;
          let subFilledWeight = 0;
          let subFilledCount = 0;

          subKolom.forEach(sub => {
            const sc = nilaiObj[sub.id];
            if (sc !== undefined && sc !== null && sc !== "") {
              const scNum = Number(sc);
              if (hitungMetode === "persentase") {
                const subBobot = sub.bobot !== undefined && sub.bobot !== null ? Number(sub.bobot) : 0;
                subTotal += scNum * subBobot;
                subFilledWeight += subBobot;
              } else {
                subTotal += scNum;
              }
              subFilledCount++;
            }
          });

          if (subFilledCount > 0) {
            isFilled = true;
            if (hitungMetode === "persentase") {
              scoreVal = subFilledWeight > 0 ? (subTotal / subFilledWeight) : 0;
            } else {
              scoreVal = subTotal / subFilledCount;
            }
          }
        } else {
          const rawVal = nilaiObj[col.id];
          isFilled = rawVal !== undefined && rawVal !== null && rawVal !== "";
          scoreVal = isFilled ? Number(rawVal) : null;
        }

        const score = isFilled ? Number(scoreVal) : 0;
        const kontribusi = score * (col.bobot / 100);
        
        if (isFilled) {
          totalNilaiTerisi += kontribusi;
          totalBobotTerisi += col.bobot;
          // Untuk kolom grup, hitung setiap sub-komponen yang terisi secara individual
          // agar progres "X/Y komponen terisi" mencerminkan jumlah sub-komponen yang sudah diisi
          if (isGroup && subKolom.length > 0) {
            // subFilledCount sudah dihitung di blok isGroup di atas, ambil ulang
            jumlahAspekTerisi += subKolom.filter(sub => {
              const sc = nilaiObj[sub.id];
              return sc !== undefined && sc !== null && sc !== "";
            }).length;
          } else {
            jumlahAspekTerisi++;
          }
        }
        totalBobot += col.bobot;

        // Cek apakah nilai komponen ini sudah terisi untuk mayoritas siswa di kelasnya (> 50%)
        let isMayoritasSudah = false;
        if (!isFilled) {
          let filledCountInClass = 0;
          allSiswa.forEach(ss => {
            const ssNilai = ss.nilai || {};
            if (isPresensi) {
              const pertemuanList = skema.pertemuan || [];
              const hasPresensi = pertemuanList.some(p => {
                const val = ssNilai[`_presensi_${p.id}`];
                return val !== undefined && val !== null && val !== "";
              });
              if (hasPresensi) filledCountInClass++;
            } else if (isGroup && subKolom.length > 0) {
              const hasGroupValue = subKolom.some(sub => {
                const sc = ssNilai[sub.id];
                return sc !== undefined && sc !== null && sc !== "";
              });
              if (hasGroupValue) filledCountInClass++;
            } else {
              const rawVal = ssNilai[col.id];
              const hasVal = rawVal !== undefined && rawVal !== null && rawVal !== "";
              if (hasVal) filledCountInClass++;
            }
          });
          const filledPercentage = allSiswa.length > 0 ? (filledCountInClass / allSiswa.length) : 0;
          isMayoritasSudah = filledPercentage > 0.5;
        }

        const isHidden = hiddenAspek.includes(col.id);
        let displayScore = isFilled ? Number(score.toFixed(2)) : "-";
        let displayKontribusi = isFilled ? Number(kontribusi.toFixed(2)) : "-";

        if (isHidden && isFilled) {
          displayScore = score >= (skema.kkm ?? 75) ? "Tuntas" : "Belum Tuntas";
          displayKontribusi = "-";
        } else if (!isFilled) {
          displayScore = "-";
        }

        // Bangun subDetail agar UI bisa menampilkan nilai tiap sub-komponen secara individual
        const subDetail = (isGroup && subKolom.length > 0) ? subKolom.map(sub => {
          const sc = nilaiObj[sub.id];
          const isSFilled = sc !== undefined && sc !== null && sc !== "";
          
          let subFilledCount = 0;
          if (!isSFilled) {
            allSiswa.forEach(ss => {
              const ssNilai = ss.nilai || {};
              const val = ssNilai[sub.id];
              if (val !== undefined && val !== null && val !== "") {
                subFilledCount++;
              }
            });
          }
          const subFilledPercentage = allSiswa.length > 0 ? (subFilledCount / allSiswa.length) : 0;
          
          return {
            subId: sub.id,
            nama: sub.nama,
            bobot: sub.bobot,
            nilaiAsli: isSFilled ? Number(sc) : null,
            isMayoritasSudah: !isSFilled && (subFilledPercentage > 0.5),
          };
        }) : [];

        detailNilai.push({
          kolomId: col.id,
          namaKolom: col.nama,
          bobot: col.bobot,
          nilaiAsli: displayScore,
          kontribusi: displayKontribusi,
          isTersembunyi: isHidden,
          isGroup: isGroup && subKolom.length > 0,
          isPresensi,
          hitungMetode,
          subDetail,
          isMayoritasSudah,
        });
      });

      // Hitung Poin Bonus Keaktifan
      let totalPoinBonus = 0;
      if (skema.enableBonusStars) {
        Object.keys(nilaiObj).forEach(k => {
          if (k.endsWith("_bonus")) totalPoinBonus += (Number(nilaiObj[k]?.poin) || 0);
        });
      }

      // Rumus baru: Menggunakan nilai akumulasi mentah (aktual) + Nilai Katrol (jika ada) + Poin Bonus
      const maxCap = Number(skema.maxCap) || 100;
      const rawFinalScore = totalNilaiTerisi + (Number(nilaiObj._katrol) || 0) + totalPoinBonus;
      const finalScore = Math.min(maxCap, rawFinalScore);
      const finalScoreRounded = Number(finalScore.toFixed(2));

      // Tentukan Predikat berdasarkan Nilai Akhir sesuai Skema Penilaian
      let predikat = 'E';
      if (finalScoreRounded >= skema.A) predikat = 'A';
      else if (finalScoreRounded >= skema.B) predikat = 'B';
      else if (finalScoreRounded >= skema.C) predikat = 'C';
      else if (finalScoreRounded >= skema.D) predikat = 'D';

      const statusKelulusan = finalScoreRounded >= skema.kkm ? "LULUS" : "TIDAK LULUS";

      // Hitung Rata-Rata Kelas
      let rataRataKelas = "-";
      try {
        if (allSiswa && allSiswa.length > 0) {
          let totalClassScore = 0;
          let validStudentCount = 0;
          allSiswa.forEach(ss => {
            let studentScore = 0;
            let filled = false;
            kolomNilai.forEach(col => {
              // Tangani kolom grup: hitung rata-rata dari sub-komponen
              const colGroupConfig = skema.kolomAspekGroup?.[col.id];
              const colIsGroup = colGroupConfig ? !!colGroupConfig.isGroup : false;
              const colHitungMetode = colGroupConfig ? (colGroupConfig.hitungMetode || "rata-rata") : "rata-rata";
              const colSubKolom = colGroupConfig ? (colGroupConfig.subKolom || []) : [];

              const colIsPresensi = colGroupConfig ? !!colGroupConfig.isPresensi : false;

              let v = null;
              if (colIsPresensi) {
                // Kolom terintegrasi presensi: hitung dari data kehadiran siswa
                const pertemuanListAvg = skema.pertemuan || [];
                const totalPAvg = pertemuanListAvg.length;
                if (totalPAvg > 0) {
                  let cH = 0, cDiisi = 0;
                  const ssNilai = ss.nilai || {};
                  pertemuanListAvg.forEach(p => {
                    const sv = ssNilai[`_presensi_${p.id}`];
                    if (sv) {
                      cDiisi++;
                      if (sv === 'H') cH++;
                    }
                  });
                  if (cDiisi > 0) {
                    v = (cH / totalPAvg) * 100;
                  }
                }
              } else if (colIsGroup && colSubKolom.length > 0) {
                let subTotal = 0, subFilledCount = 0, subFilledWeight = 0;
                colSubKolom.forEach(sub => {
                  const sc = (ss.nilai || {})[sub.id];
                  if (sc !== undefined && sc !== null && sc !== "") {
                    const scNum = Number(sc);
                    if (colHitungMetode === "persentase") {
                      const subBobot = sub.bobot != null ? Number(sub.bobot) : 0;
                      subTotal += scNum * subBobot;
                      subFilledWeight += subBobot;
                    } else {
                      subTotal += scNum;
                    }
                    subFilledCount++;
                  }
                });
                if (subFilledCount > 0) {
                  v = colHitungMetode === "persentase"
                    ? (subFilledWeight > 0 ? subTotal / subFilledWeight : 0)
                    : subTotal / subFilledCount;
                }
              } else {
                v = (ss.nilai || {})[col.id];
              }

              if (v !== undefined && v !== null && v !== "") {
                studentScore += Number(v) * (col.bobot / 100);
                filled = true;
              }
            });
            if (filled) {
              totalClassScore += studentScore;
              validStudentCount++;
            }
          });
          if (validStudentCount > 0) {
            rataRataKelas = Number((totalClassScore / validStudentCount).toFixed(2));
          }
        }
      } catch (err) {
        console.error("Gagal menghitung rata-rata kelas:", err);
      }

      // Hitung Rekap Presensi Siswa
      const presensiConfig = skema.presensi || { digunakan: false, bobot: 0 };
      const pertemuanList = [...(skema.pertemuan || [])].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
      
      let totalH = 0, totalI = 0, totalS = 0, totalA = 0, totalD = 0;
      const daftarHadir = [];

      pertemuanList.forEach(p => {
        const status = nilaiObj[`_presensi_${p.id}`] || null;
        if (status === 'H') totalH++;
        else if (status === 'I') totalI++;
        else if (status === 'S') totalS++;
        else if (status === 'A') totalA++;
        else if (status === 'D') totalD++;
        
        daftarHadir.push({
          pertemuanId: p.id,
          nama: p.nama,
          tanggal: p.tanggal,
          materi: p.materi || "",
          status: status || "-"
        });
      });

      const totalPertemuan = pertemuanList.length;
      const avgAttendance = totalPertemuan > 0 ? Math.round((totalH / totalPertemuan) * 100) : 0;

      const rekapPresensi = {
        digunakan: !!presensiConfig.digunakan,
        bobot: presensiConfig.bobot || 0,
        totalPertemuan,
        summary: { H: totalH, I: totalI, S: totalS, A: totalA, D: totalD },
        persentase: avgAttendance,
        detail: daftarHadir
      };

      hasil.push({
        kelasId: k.id,
        rekapPresensi,
        namaKelas: k.nama,
        mataPelajaran: k.mata_pelajaran || 'Informatika',
        tahunAjaran: k.tahun_ajaran,
        semester: k.semester || 'Ganjil',
        tingkatan: k.tingkatan || null,
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
        katrol: Number(nilaiObj._katrol) || 0,
        bonusStars: totalPoinBonus,
        predikat,
        statusKelulusan,
        kkm: skema.kkm,
        skema,
        rataRataKelas,
        isLengkap: totalBobot === 100,
        jumlahAspekTerisi,
        // Hitung total daun komponen: sub-komponen dihitung satu per satu untuk kolom grup
        totalAspekCount: kolomNilai.reduce((sum, col) => {
          const gc = skema.kolomAspekGroup?.[col.id];
          const isG = gc ? !!gc.isGroup : false;
          const subs = gc ? (gc.subKolom || []) : [];
          return sum + (isG && subs.length > 0 ? subs.length : 1);
        }, 0),
        totalBobotTerisi
      });
    }

    return hasil;
  } catch (err) {
    console.error('Unexpected error in pencarianSiswa:', err);
    return [];
  }
}

// === SUPERADMIN PANEL FUNCTIONS ===
export async function getSuperadminLogs() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('siswa')
      .select('nisn, nama, kelas_id, nilai, kelas(nama, mata_pelajaran)')
      .not('nilai', 'is', null);
      
    if (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
    
    const logs = [];
    data.forEach(s => {
      if (s.nilai && Array.isArray(s.nilai._login_history) && s.nilai._login_history.length > 0) {
        s.nilai._login_history.forEach(timestamp => {
          logs.push({
            nisn: s.nisn,
            namaSiswa: s.nama,
            kelasNama: s.kelas?.nama || 'Tanpa Kelas',
            mataPelajaran: s.kelas?.mata_pelajaran || 'Informatika',
            timestamp: timestamp
          });
        });
      }
    });
    
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return logs;
  } catch (err) {
    console.error('Unexpected error in getSuperadminLogs:', err);
    return [];
  }
}

export async function getAllGurus() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('guru')
      .select('username, nama, email, password, is_locked, lock_message, sekolah_id, is_admin_sekolah, walikelas_tingkatan, walikelas_rombel_nama, tahun_ajaran, premium_until, sekolah:sekolah_id(nama, npsn)');
    if (error) {
      // Fallback without premium_until
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('guru')
        .select('username, nama, email, password, is_locked, lock_message, sekolah_id, walikelas_tingkatan, walikelas_rombel_nama, sekolah:sekolah_id(nama, npsn)');
      if (fallbackError) {
        // Fallback level 2
        const { data: fallbackData2, error: fallbackError2 } = await supabase
          .from('guru')
          .select('username, nama, email, password');
        if (fallbackError2) {
          console.log('Error fetching all gurus (fallback 2):', fallbackError2);
          return [];
        }
        return fallbackData2.map(g => ({ ...g, is_locked: false, lock_message: null, sekolah_id: null, walikelas_tingkatan: null, walikelas_rombel_nama: null, tahun_ajaran: '2025/2026', sekolah: null, premium_until: null }));
      }
      return fallbackData.map(g => ({
        ...g,
        is_locked: g.is_locked ?? false,
        lock_message: g.lock_message ?? null,
        sekolah_id: g.sekolah_id ?? null,
        walikelas_tingkatan: g.walikelas_tingkatan ?? null,
        walikelas_rombel_nama: g.walikelas_rombel_nama ?? null,
        tahun_ajaran: '2025/2026',
        sekolah: g.sekolah ?? null,
        premium_until: null
      }));
    }
    return data.map(g => ({
      ...g,
      is_locked: g.is_locked ?? false,
      lock_message: g.lock_message ?? null,
      sekolah_id: g.sekolah_id ?? null,
      walikelas_tingkatan: g.walikelas_tingkatan ?? null,
      walikelas_rombel_nama: g.walikelas_rombel_nama ?? null,
      tahun_ajaran: g.tahun_ajaran ?? '2025/2026',
      sekolah: g.sekolah ?? null,
      premium_until: g.premium_until ?? null
    }));
  } catch (err) {
    console.error('Unexpected error in getAllGurus:', err);
    return [];
  }
}

import bcrypt from 'bcryptjs';

export async function createGuruByAdmin(guruData) {
  if (!supabase) return null;
  try {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(guruData.password, salt);

    const { data, error } = await supabase
      .from('guru')
      .insert({
        username: guruData.username.trim().toLowerCase(),
        nama: guruData.nama.trim(),
        email: guruData.email ? guruData.email.trim() : null,
        password: hashedPassword,
        sekolah_id: guruData.sekolah_id || null,
        is_admin_sekolah: guruData.is_admin_sekolah ?? false,
        premium_until: guruData.premium_until || null
      })
      .select()
      .single();
    if (error) {
      console.error('Error creating guru by admin:', error);
      throw new Error(error.message || 'Gagal membuat akun guru');
    }
    return data;
  } catch (err) {
    console.error('Unexpected error in createGuruByAdmin:', err);
    throw err;
  }
}

export async function updateGuruByAdmin(username, updatedData) {
  if (!supabase) return null;
  try {
    const payload = {
      nama: updatedData.nama.trim(),
      email: updatedData.email ? updatedData.email.trim() : null
    };
    if (updatedData.password) {
      const salt = bcrypt.genSaltSync(10);
      payload.password = bcrypt.hashSync(updatedData.password, salt);
    }
    if (updatedData.is_locked !== undefined) {
      payload.is_locked = updatedData.is_locked;
      payload.lock_message = updatedData.lock_message || null;
    }
    if (updatedData.sekolah_id !== undefined) {
      payload.sekolah_id = updatedData.sekolah_id || null;
    }
    if (updatedData.is_admin_sekolah !== undefined) {
      payload.is_admin_sekolah = updatedData.is_admin_sekolah;
    }
    if (updatedData.premium_until !== undefined) {
      payload.premium_until = updatedData.premium_until || null;
    }
    if (updatedData.walikelas_tingkatan !== undefined) {
      payload.walikelas_tingkatan = updatedData.walikelas_tingkatan !== null ? Number(updatedData.walikelas_tingkatan) : null;
    }
    if (updatedData.walikelas_rombel_nama !== undefined) {
      payload.walikelas_rombel_nama = updatedData.walikelas_rombel_nama ? normalizeRombelNama(updatedData.walikelas_rombel_nama) : null;
    }
    if (updatedData.tahun_ajaran !== undefined) {
      payload.tahun_ajaran = updatedData.tahun_ajaran || '2025/2026';
    }
    let { data, error } = await supabase
      .from('guru')
      .update(payload)
      .eq('username', username)
      .select()
      .single();
    if (error) {
      console.error('Error updating guru by admin:', error);
      // Self-healing: If column "tahun_ajaran" does not exist in the database (error 42703)
      if (error.code === '42703' && payload.tahun_ajaran !== undefined) {
        console.warn('tahun_ajaran column missing, retrying update without it...');
        const healedPayload = { ...payload };
        delete healedPayload.tahun_ajaran;
        
        const retry = await supabase
          .from('guru')
          .update(healedPayload)
          .eq('username', username)
          .select()
          .single();
          
        if (!retry.error) {
          return retry.data;
        }
        console.error('Retry by admin failed:', retry.error);
      }
      throw new Error(error.message || 'Gagal memperbarui akun guru');
    }
    return data;
  } catch (err) {
    console.error('Unexpected error in updateGuruByAdmin:', err);
    throw err;
  }
}

export async function migrateGuruPassword(username, plainPassword) {
  if (!supabase) return false;
  try {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(plainPassword, salt);
    const { error } = await supabase
      .from('guru')
      .update({ password: hashedPassword })
      .eq('username', username);
    if (error) {
      console.error('Error migrating password:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Unexpected error in migrateGuruPassword:', err);
    return false;
  }
}

export async function recalculatePremiumUntil(username) {
  if (!supabase) return null;
  try {
    // Fetch logs
    const { data: logs, error } = await supabase
      .from('log_aktivitas_guru')
      .select('aksi, detail, created_at')
      .eq('guru_username', username)
      .in('aksi', ['REFERRAL_POINTS', 'REDEEM_POINTS', 'PAYMENT_APPROVED'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching logs for premium recalculation:', error);
      return null;
    }

    let premiumUntil = null;

    if (logs && logs.length > 0) {
      for (const log of logs) {
        let daysToAdd = 0;
        if (log.aksi === 'PAYMENT_APPROVED') {
          const isYearly = log.detail.toUpperCase().includes('PAKET:TAHUNAN');
          const isMonthly = log.detail.toUpperCase().includes('PAKET:BULANAN');
          if (isYearly) daysToAdd = 365;
          else if (isMonthly) daysToAdd = 30;
        } else if (log.aksi === 'REDEEM_POINTS') {
          const isYearly = log.detail.includes('Gratis 1 Tahun Premium');
          const isMonthly = log.detail.includes('Gratis 1 Bulan Premium');
          if (isYearly) daysToAdd = 365;
          else if (isMonthly) daysToAdd = 30;
        }

        if (daysToAdd > 0) {
          const txDate = new Date(log.created_at);
          if (!premiumUntil || txDate > premiumUntil) {
            premiumUntil = new Date(txDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
          } else {
            premiumUntil = new Date(premiumUntil.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
          }
        }
      }
    }

    const premiumUntilStr = premiumUntil ? premiumUntil.toISOString() : null;

    // Update the guru record with the new premium_until
    const { error: updateError } = await supabase
      .from('guru')
      .update({ premium_until: premiumUntilStr })
      .eq('username', username);

    if (updateError) {
      console.error('Error updating premium_until in database:', updateError);
    }

    return premiumUntilStr;
  } catch (err) {
    console.error('Error in recalculatePremiumUntil:', err);
    return null;
  }
}

export async function isGuruLocked(username) {
  if (!username) return false;
  const SUPERADMIN_USERNAMES = ['superadmin', 'shoofian'];
  if (SUPERADMIN_USERNAMES.includes(username.toLowerCase())) {
    return false;
  }
  try {
    const guru = await getGuru(username);
    if (!guru) return false;
    
    // Akun dikunci jika flag is_locked bernilai true
    if (guru.is_locked) return true;
    
    // Atau jika premium_until kadaluarsa (jika ada nilainya)
    if (guru.premium_until) {
      const isExpired = new Date() > new Date(guru.premium_until);
      return isExpired;
    }
    
    return false;
  } catch (err) {
    console.error('Error checking lock status:', err);
    return false;
  }
}

export async function getGuruLockStatus(username) {
  if (!username) return { isLocked: false, lockMessage: null };
  const SUPERADMIN_USERNAMES = ['superadmin', 'shoofian'];
  if (SUPERADMIN_USERNAMES.includes(username.toLowerCase())) {
    return { isLocked: false, lockMessage: null };
  }
  try {
    const guru = await getGuru(username);
    if (!guru) return { isLocked: false, lockMessage: null };
    
    if (guru.is_locked) {
      return {
        isLocked: true,
        lockMessage: guru.lock_message || "Akun Anda sementara dikunci oleh superadmin."
      };
    }
    
    if (guru.premium_until) {
      const isExpired = new Date() > new Date(guru.premium_until);
      if (isExpired) {
        return {
          isLocked: true,
          lockMessage: "Masa aktif premium Anda telah berakhir. Silakan lakukan aktivasi/perpanjangan paket di menu Masa Aktif."
        };
      }
    }
    
    return { isLocked: false, lockMessage: null };
  } catch (err) {
    console.error('Error getting lock status:', err);
    return { isLocked: false, lockMessage: null };
  }
}

export async function deleteGuruByAdmin(username) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('guru')
      .delete()
      .eq('username', username);
    if (error) {
      console.error('Error deleting guru by admin:', error);
      throw new Error(error.message || 'Gagal menghapus akun guru');
    }
    return true;
  } catch (err) {
    console.error('Unexpected error in deleteGuruByAdmin:', err);
    throw err;
  }
}

// === TEACHER ACTIVITY LOG FUNCTIONS ===
export async function logAktivitasGuru(guruUsername, aksi, detail) {
  if (!supabase || !guruUsername) return null;
  try {
    const { data } = await supabase
      .from('log_aktivitas_guru')
      .insert({
        guru_username: guruUsername,
        aksi,
        detail
      })
      .select()
      .single();
    return data;
  } catch (err) {
    console.error('Failed to log teacher activity:', err);
    return null;
  }
}

export async function logAktivitasNilai(guruUsername, kelasNama, siswaNama, nisn) {
  if (!supabase || !guruUsername) return null;
  try {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60000).toISOString();
    const { data: recentLogs } = await supabase
      .from('log_aktivitas_guru')
      .select('*')
      .eq('guru_username', guruUsername)
      .eq('aksi', 'EDIT_NILAI_PRESENSI')
      .gte('created_at', fifteenMinsAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentLogs && recentLogs.length > 0) {
      const recentLog = recentLogs[0];
      try {
        const detailObj = JSON.parse(recentLog.detail);
        if (detailObj.kelasNama === kelasNama) {
          const existingSiswa = detailObj.siswa || [];
          if (!existingSiswa.some(s => s.nisn === nisn)) {
            existingSiswa.push({ nama: siswaNama, nisn });
          }
          detailObj.siswa = existingSiswa;
          
          const { data } = await supabase
            .from('log_aktivitas_guru')
            .update({ detail: JSON.stringify(detailObj) })
            .eq('id', recentLog.id)
            .select()
            .single();
          return data;
        }
      } catch (e) {
        // Fallback to insert
      }
    }

    const initialDetail = JSON.stringify({
      kelasNama,
      siswa: [{ nama: siswaNama, nisn }]
    });
    
    const { data } = await supabase
      .from('log_aktivitas_guru')
      .insert({
        guru_username: guruUsername,
        aksi: 'EDIT_NILAI_PRESENSI',
        detail: initialDetail
      })
      .select()
      .single();
    return data;
  } catch (err) {
    console.error('Failed to log teacher nilai activity:', err);
    return null;
  }
}

export async function getSuperadminTeacherLogs() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('log_aktivitas_guru')
      .select('id, guru_username, aksi, detail, created_at, guru(nama)')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching teacher logs:', error);
      return [];
    }
    
    return data.map(log => ({
      id: log.id,
      username: log.guru_username,
      namaGuru: log.guru?.nama || log.guru_username || 'Guru',
      aksi: log.aksi,
      detail: log.detail,
      timestamp: log.created_at
    }));
  } catch (err) {
    console.error('Unexpected error in getSuperadminTeacherLogs:', err);
    return [];
  }
}

export async function getLegerData(sekolahId, walikelasTingkatan, walikelasRombelNama, tahunAjaran, semester) {
  if (!supabase) return { siswa: [], mataPelajaranList: [] };
  try {
    // 1. Fetch all classes matching rombel name, academic year, and semester
    const { data: classes, error: errClasses } = await supabase
      .from('kelas')
      .select('*, guru:guru_username(sekolah_id), kolom_nilai(*), siswa(*)')
      .eq('tingkatan', walikelasTingkatan)
      .eq('rombel_nama', walikelasRombelNama)
      .eq('tahun_ajaran', tahunAjaran)
      .eq('semester', semester)
      .eq('archived', false);
      
    if (errClasses) {
      console.error('Error fetching classes for leger:', errClasses);
      return { siswa: [], mataPelajaranList: [] };
    }
    
    // Filter by same school id of teachers
    const schoolClasses = (classes || []).filter(k => k.guru && k.guru.sekolah_id === sekolahId);
    if (schoolClasses.length === 0) {
      return { siswa: [], mataPelajaranList: [] };
    }
    
    // Map using original mapKelasFromDb helper
    const mappedClasses = schoolClasses.map(mapKelasFromDb);
    
    // 2. Aggregate unique subject list with attendance summaries
    const mataPelajaranList = mappedClasses.map(k => {
      const pertemuanList = k.skemaPenilaian?.pertemuan || [];
      const totalPertemuan = pertemuanList.length;

      let attClass = { H: 0, I: 0, S: 0, A: 0, D: 0 };
      (k.siswa || []).forEach(s => {
        pertemuanList.forEach(p => {
          const val = s.nilai?.[`_presensi_${p.id}`];
          if (val && attClass[val] !== undefined) {
            attClass[val]++;
          }
        });
      });
      const totalEntries = attClass.H + attClass.I + attClass.S + attClass.A + attClass.D;
      const percentHadir = totalEntries > 0 ? Number(((attClass.H / totalEntries) * 100).toFixed(1)) : 0;

      return {
        id: k.id,
        mataPelajaran: k.mataPelajaran,
        kkm: k.skemaPenilaian?.kkm || 75,
        isNilaiAkhirGenerated: !!k.isNilaiAkhirGenerated,
        guru_username: k.guru_username || '',
        guru: k.guru || null,
        semester: k.semester || semester,
        totalPertemuan,
        rekapPresensi: {
          ...attClass,
          totalEntries,
          percentHadir
        }
      };
    });
    
    // 3. Aggregate unique students across all subject classes
    const studentsMap = {};
    
    mappedClasses.forEach(k => {
      k.siswa.forEach(s => {
        if (!studentsMap[s.nisn]) {
          studentsMap[s.nisn] = {
            nisn: s.nisn,
            nama: s.nama,
            tanggalLahir: s.tanggalLahir,
            nilaiMapel: {},
            isSelesaiMapel: {},
            catatanMapel: {},
            tpMapel: {},
            kehadiran: { H: 0, S: 0, I: 0, A: 0, D: 0 },
            kehadiranMapel: {}
          };
        }
        
        let totalNilaiTerisi = 0;
        let jumlahAspekTerisi = 0;
        
        const getColScore = (student, col) => {
          if (col.isGroup && col.subKolom) {
            let subTotal = 0;
            let subFilledCount = 0;
            let subFilledWeight = 0;
            
            col.subKolom.forEach(sub => {
              const sc = student.nilai[sub.id];
              if (sc !== undefined && sc !== null && sc !== "") {
                const scNum = Number(sc);
                if (col.hitungMetode === "persentase") {
                  const subBobot = sub.bobot !== undefined && sub.bobot !== null ? Number(sub.bobot) : 0;
                  subTotal += scNum * subBobot;
                  subFilledWeight += subBobot;
                } else {
                  subTotal += scNum;
                }
                subFilledCount++;
              }
            });
            
            if (subFilledCount === 0) return { score: null, isFilled: false, isAllFilled: false };
            
            const score = col.hitungMetode === "persentase"
              ? (subFilledWeight > 0 ? subTotal / subFilledWeight : 0)
              : (subTotal / subFilledCount);
              
            return {
              score,
              isFilled: true,
              isAllFilled: subFilledCount === col.subKolom.length
            };
          } else {
            const sc = student.nilai[col.id];
            const isFilled = sc !== undefined && sc !== null && sc !== "";
            return {
              score: isFilled ? Number(sc) : null,
              isFilled,
              isAllFilled: isFilled
            };
          }
        };

        let highestScore = -1;
        let lowestScore = 101;
        let highestColId = null;
        let lowestColId = null;

        k.kolomNilai.forEach(col => {
          const { score, isFilled, isAllFilled } = getColScore(s, col);
          if (isFilled) {
            totalNilaiTerisi += score * (col.bobot / 100);
            if (isAllFilled) {
              jumlahAspekTerisi++;
            }
            if (score > highestScore) {
              highestScore = score;
              highestColId = col.id;
            }
            if (score < lowestScore) {
              lowestScore = score;
              lowestColId = col.id;
            }
          }
        });
        
        // Save highest and lowest TP descriptions
        if (highestColId !== null && lowestColId !== null) {
          const tpConfig = k.skemaPenilaian?.tpConfig || {};
          
          let tertinggiTp = "";
          const highestCol = k.kolomNilai.find(col => col.id === highestColId);
          if (highestCol && highestCol.isGroup && highestCol.subKolom && highestCol.subKolom.length > 0) {
            let maxSubScore = -1;
            let bestSubId = null;
            highestCol.subKolom.forEach(sub => {
              const val = s.nilai?.[sub.id];
              if (val !== undefined && val !== null && val !== "") {
                const num = Number(val);
                if (num > maxSubScore) {
                  maxSubScore = num;
                  bestSubId = sub.id;
                }
              }
            });
            if (bestSubId && tpConfig[bestSubId]) {
              tertinggiTp = tpConfig[bestSubId];
            } else {
              tertinggiTp = tpConfig[highestColId] || "";
            }
          } else {
            tertinggiTp = tpConfig[highestColId] || "";
          }

          let terendahTp = "";
          if (highestColId !== lowestColId) {
            const lowestCol = k.kolomNilai.find(col => col.id === lowestColId);
            if (lowestCol && lowestCol.isGroup && lowestCol.subKolom && lowestCol.subKolom.length > 0) {
              let minSubScore = 101;
              let worstSubId = null;
              lowestCol.subKolom.forEach(sub => {
                const val = s.nilai?.[sub.id];
                if (val !== undefined && val !== null && val !== "") {
                  const num = Number(val);
                  if (num < minSubScore) {
                    minSubScore = num;
                    worstSubId = sub.id;
                  }
                }
              });
              if (worstSubId && tpConfig[worstSubId]) {
                terendahTp = tpConfig[worstSubId];
              } else {
                terendahTp = tpConfig[lowestColId] || "";
              }
            } else {
              terendahTp = tpConfig[lowestColId] || "";
            }
          }

          studentsMap[s.nisn].tpMapel[k.mataPelajaran] = {
            tertinggi: tertinggiTp,
            terendah: terendahTp
          };
        } else {
          studentsMap[s.nisn].tpMapel[k.mataPelajaran] = { tertinggi: "", terendah: "" };
        }
        
        // Hitung Kehadiran (Presensi) jika digunakan
        const skema = k.skemaPenilaian || { A: 85, B: 75, C: 65, D: 50, kkm: "" };
        const presensiConfig = skema.presensi || { digunakan: false, bobot: 0 };
        const pertemuanList = skema.pertemuan || [];
        let totalPresensiScore = 0;
        
        if (presensiConfig.digunakan && presensiConfig.bobot > 0 && pertemuanList.length > 0) {
          let attSummary = { H: 0, I: 0, S: 0, A: 0, D: 0 };
          pertemuanList.forEach(p => {
            const val = s.nilai?.[`_presensi_${p.id}`];
            if (val && attSummary[val] !== undefined) {
              attSummary[val]++;
            }
          });
          const totalPertemuan = pertemuanList.length;
          const attAvg = totalPertemuan > 0 ? ((attSummary.H / totalPertemuan) * 100) : 0;
          totalPresensiScore = attAvg * (presensiConfig.bobot / 100);
        }
        
        // Rekap Kehadiran Siswa Global dan Per Mapel
        const allPertemuan = skema.pertemuan || [];
        const attPerMapel = { H: 0, S: 0, I: 0, A: 0, D: 0, totalPertemuan: allPertemuan.length };
        
        allPertemuan.forEach(p => {
          const val = s.nilai?.[`_presensi_${p.id}`];
          if (val && attPerMapel[val] !== undefined) {
            attPerMapel[val]++;
            if (studentsMap[s.nisn].kehadiran[val] !== undefined) {
              studentsMap[s.nisn].kehadiran[val]++;
            }
          }
        });
        studentsMap[s.nisn].kehadiranMapel[k.mataPelajaran] = attPerMapel;
        
        const finalScore = totalNilaiTerisi + totalPresensiScore + (Number(s.nilai?._katrol) || 0);
        
        studentsMap[s.nisn].nilaiMapel[k.mataPelajaran] = Number(finalScore.toFixed(2));
        studentsMap[s.nisn].isSelesaiMapel[k.mataPelajaran] = (jumlahAspekTerisi === k.kolomNilai.length);
        studentsMap[s.nisn].catatanMapel[k.mataPelajaran] = s.catatan || "";
      });
    });
    
    // Sort students alphabetically
    const siswa = Object.values(studentsMap).sort((a, b) => a.nama.localeCompare(b.nama));
    
    // Calculate overall average
    siswa.forEach(s => {
      const scores = Object.values(s.nilaiMapel);
      if (scores.length > 0) {
        const sum = scores.reduce((sumVal, val) => sumVal + val, 0);
        s.rataRata = Number((sum / scores.length).toFixed(2));
      } else {
        s.rataRata = 0;
      }
    });
    
    // Calculate rankings based on overall averages
    const ranked = [...siswa].sort((a, b) => b.rataRata - a.rataRata);
    siswa.forEach(s => {
      s.ranking = ranked.findIndex(r => r.nisn === s.nisn) + 1;
    });
    
    return {
      siswa,
      mataPelajaranList
    };
  } catch (err) {
    console.error('Unexpected error in getLegerData:', err);
    return { siswa: [], mataPelajaranList: [] };
  }
}

// === BANK DATA SISWA FUNCTIONS ===

export async function getBankSiswa(sekolahId, tahunPelajaran) {
  if (!supabase) return [];
  try {
    let query = supabase
      .from('bank_siswa')
      .select('*')
      .order('tingkatan', { ascending: true })
      .order('rombel', { ascending: true })
      .order('nama', { ascending: true })
      .limit(10000);
      
    if (sekolahId) {
      query = query.eq('sekolah_id', sekolahId);
    }
    if (tahunPelajaran) {
      query = query.eq('tahun_pelajaran', tahunPelajaran);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching bank siswa:', error);
      return [];
    }
    return data;
  } catch (err) {
    console.error('Unexpected error in getBankSiswa:', err);
    return [];
  }
}

export async function upsertBankSiswa(dataArray) {
  if (!supabase || !dataArray || dataArray.length === 0) return { success: false, error: 'Tidak ada data untuk diimpor' };
  try {
    const { data, error } = await supabase
      .from('bank_siswa')
      .upsert(dataArray, { onConflict: 'nisn,sekolah_id,tahun_pelajaran' })
      .select();
      
    if (error) {
      console.error('Error upserting bank siswa:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error in upsertBankSiswa:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteBankSiswa(id) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('bank_siswa')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting from bank siswa:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Unexpected error in deleteBankSiswa:', err);
    return false;
  }
}

export async function resetBankData(sekolahId, tahunPelajaran) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('bank_siswa')
      .delete()
      .eq('sekolah_id', sekolahId)
      .eq('tahun_pelajaran', tahunPelajaran);

    if (error) {
      console.error('Error resetting bank data:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Unexpected error in resetBankData:', err);
    return false;
  }
}

export async function getBankRombels(sekolahId, tahunPelajaran) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('bank_siswa')
      .select('tingkatan, rombel')
      .eq('sekolah_id', sekolahId)
      .eq('tahun_pelajaran', tahunPelajaran);

    if (error) {
      console.error('Error fetching bank rombels:', error);
      return [];
    }

    const rombelMap = new Map();
    data.forEach(item => {
      const key = `${item.tingkatan}-${item.rombel}`;
      if (!rombelMap.has(key)) {
        rombelMap.set(key, { tingkatan: item.tingkatan, rombel: item.rombel, siswaCount: 1 });
      } else {
        rombelMap.get(key).siswaCount++;
      }
    });

    const uniqueRombels = Array.from(rombelMap.values());

    uniqueRombels.sort((a, b) => {
      if (a.tingkatan !== b.tingkatan) {
        return String(a.tingkatan).localeCompare(String(b.tingkatan), undefined, { numeric: true });
      }
      return String(a.rombel).localeCompare(String(b.rombel), undefined, { numeric: true });
    });

    return uniqueRombels;
  } catch (err) {
    console.error('Unexpected error in getBankRombels:', err);
    return [];
  }
}

