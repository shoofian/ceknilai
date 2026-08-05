-- Tabel untuk mendefinisikan jenis ekstrakurikuler yang ada di sekolah
CREATE TABLE master_ekskul (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sekolah_id UUID REFERENCES sekolah(id) ON DELETE CASCADE,
    nama_ekskul VARCHAR(100) NOT NULL,
    pembina VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabel untuk menyimpan nilai ekstrakurikuler per siswa
CREATE TABLE nilai_ekskul (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sekolah_id UUID REFERENCES sekolah(id) ON DELETE CASCADE,
    tahun_ajaran VARCHAR(20) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    nisn VARCHAR(50) NOT NULL,
    ekskul_id UUID REFERENCES master_ekskul(id) ON DELETE CASCADE,
    predikat VARCHAR(10) NOT NULL, -- Sangat Baik, Baik, Cukup, Kurang
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tahun_ajaran, semester, nisn, ekskul_id) -- Mencegah duplikasi nilai ekskul yang sama di semester yang sama
);

-- RLS Policies
ALTER TABLE master_ekskul ENABLE ROW LEVEL SECURITY;
ALTER TABLE nilai_ekskul ENABLE ROW LEVEL SECURITY;

-- Master Ekskul Policies
CREATE POLICY "Public read master_ekskul" ON master_ekskul FOR SELECT USING (true);
CREATE POLICY "Superadmin all master_ekskul" ON master_ekskul FOR ALL USING (true);

-- Nilai Ekskul Policies
CREATE POLICY "Public read nilai_ekskul" ON nilai_ekskul FOR SELECT USING (true);
CREATE POLICY "Guru all nilai_ekskul" ON nilai_ekskul FOR ALL USING (true);
