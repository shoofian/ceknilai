-- ========================================================
-- SKEMA TABEL BIODATA SISWA E-RAPOR (DAPODIK COMPATIBLE)
-- ========================================================
-- Tabel ini dirancang untuk menyimpan kelengkapan data
-- pribadi siswa dan orang tua khusus untuk kebutuhan cetak rapor.

CREATE TABLE biodata_siswa (
  nisn VARCHAR(50) PRIMARY KEY,
  
  -- Identitas Pribadi (Primary Identifier)
  nipd VARCHAR(50),
  
  -- Kelahiran & Fisik
  tempat_lahir VARCHAR(100),
  tanggal_lahir DATE,
  jenis_kelamin VARCHAR(20),
  agama VARCHAR(50),
  
  -- Keluarga
  status_keluarga VARCHAR(50),
  anak_ke INTEGER,
  
  -- Kontak & Alamat
  alamat_lengkap TEXT,
  telepon VARCHAR(50),
  
  -- Data Orang Tua / Wali
  nama_ayah VARCHAR(150),
  pekerjaan_ayah VARCHAR(100),
  nama_ibu VARCHAR(150),
  pekerjaan_ibu VARCHAR(100),
  nama_wali VARCHAR(150),
  pekerjaan_wali VARCHAR(100),
  alamat_wali TEXT,
  
  -- Meta
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indeks untuk mempercepat pencarian berdasarkan NISN
CREATE INDEX idx_biodata_nisn ON biodata_siswa(nisn);

-- ========================================================
-- FITUR TRIGGER UPDATE (OTOMATIS)
-- ========================================================
CREATE OR REPLACE FUNCTION update_biodata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_biodata
BEFORE UPDATE ON biodata_siswa
FOR EACH ROW
EXECUTE FUNCTION update_biodata_updated_at();

-- Note: Untuk dokumen pendukung (scan KK, dll), 
-- Anda perlu membuat Bucket 'berkas_siswa' di Supabase Storage secara manual.
