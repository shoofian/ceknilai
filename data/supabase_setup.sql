-- 1. Tabel Guru (Profil & Auth)
CREATE TABLE IF NOT EXISTS guru (
  username text PRIMARY KEY,
  password text NOT NULL,
  nama text NOT NULL,
  email text NOT NULL
);

-- 2. Tabel Kelas
CREATE TABLE IF NOT EXISTS kelas (
  id text PRIMARY KEY,
  nama text NOT NULL,
  mata_pelajaran text DEFAULT 'Informatika',
  tahun_ajaran text NOT NULL,
  semester text DEFAULT 'Ganjil',
  tingkatan integer DEFAULT NULL,
  archived boolean DEFAULT false,
  guru_username text REFERENCES guru(username) ON DELETE CASCADE ON UPDATE CASCADE DEFAULT 'guru',
  is_nilai_akhir_generated boolean DEFAULT false,
  skema_penilaian jsonb DEFAULT '{"A": 85, "B": 75, "C": 65, "D": 50, "kkm": 75, "statusA": "A", "statusB": "B", "statusC": "C", "statusD": "D"}'::jsonb
);

-- 3. Tabel Kolom Nilai (Aspek & Bobot)
CREATE TABLE IF NOT EXISTS kolom_nilai (
  kelas_id text REFERENCES kelas(id) ON DELETE CASCADE,
  id text NOT NULL,
  nama text NOT NULL,
  bobot integer NOT NULL,
  PRIMARY KEY (kelas_id, id)
);

-- 4. Tabel Siswa (Profil, Nilai, Catatan)
CREATE TABLE IF NOT EXISTS siswa (
  kelas_id text REFERENCES kelas(id) ON DELETE CASCADE,
  nisn text NOT NULL,
  nama text NOT NULL,
  tanggal_lahir text NOT NULL,
  nilai jsonb DEFAULT '{}'::jsonb,
  catatan text,
  PRIMARY KEY (kelas_id, nisn)
);

-- Inisialisasi Akun Guru Default (Jika kosong)
INSERT INTO guru (username, password, nama, email)
VALUES ('guru', 'password123', 'Wahyu Shofian, S.Kom', 'ws@gmail.com')
ON CONFLICT (username) DO NOTHING;
