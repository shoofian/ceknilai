-- ==========================================
-- SKEMA DATABASE E-RAPOR KURIKULUM MERDEKA
-- ==========================================

-- 1. Tabel Identitas Rapor (Berelasi dengan tabel siswa yang ada)
CREATE TABLE IF NOT EXISTS public.rapor_identitas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL, -- Ganti tipe data ini jika tabel siswa Anda menggunakan integer/bigint
    tahun_ajaran VARCHAR(20) NOT NULL,
    semester VARCHAR(10) NOT NULL CHECK (semester IN ('Ganjil', 'Genap')),
    fase VARCHAR(5) NOT NULL,
    kelas VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabel Nilai Mata Pelajaran
CREATE TABLE IF NOT EXISTS public.rapor_nilai (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rapor_id UUID REFERENCES public.rapor_identitas(id) ON DELETE CASCADE,
    mata_pelajaran VARCHAR(100) NOT NULL,
    nilai_akhir NUMERIC(5,2) NOT NULL,
    capaian_tertinggi TEXT,
    capaian_terendah TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabel Ekstrakurikuler
CREATE TABLE IF NOT EXISTS public.rapor_ekskul (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rapor_id UUID REFERENCES public.rapor_identitas(id) ON DELETE CASCADE,
    nama_kegiatan VARCHAR(100) NOT NULL,
    predikat VARCHAR(20) NOT NULL CHECK (predikat IN ('Sangat Baik', 'Baik', 'Cukup', 'Kurang')),
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tabel Absensi (Ketidakhadiran)
CREATE TABLE IF NOT EXISTS public.rapor_absensi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rapor_id UUID REFERENCES public.rapor_identitas(id) ON DELETE CASCADE,
    sakit INTEGER DEFAULT 0,
    izin INTEGER DEFAULT 0,
    tanpa_keterangan INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Tabel Catatan Wali Kelas
CREATE TABLE IF NOT EXISTS public.rapor_catatan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rapor_id UUID REFERENCES public.rapor_identitas(id) ON DELETE CASCADE,
    catatan TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexing untuk optimasi query
CREATE INDEX IF NOT EXISTS idx_rapor_identitas_siswa ON public.rapor_identitas(siswa_id);
CREATE INDEX IF NOT EXISTS idx_rapor_nilai_rapor_id ON public.rapor_nilai(rapor_id);
