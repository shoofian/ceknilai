-- ========================================================
-- SKEMA TABEL WEB PUSH NOTIFICATION & ANTREAN NOTIFIKASI
-- ========================================================

-- 1. Tabel Penyimpanan Langganan Push Siswa (Push Subscriptions)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nisn VARCHAR(50) NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_sub_nisn ON push_subscriptions(nisn);

-- 2. Tabel Antrean Notifikasi Nilai (Debounce 5 Menit)
CREATE TABLE IF NOT EXISTS antrean_notifikasi_nilai (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nisn VARCHAR(50) NOT NULL,
  kelas_id VARCHAR(50) NOT NULL,
  nama_kelas TEXT,
  mata_pelajaran TEXT,
  nama_siswa TEXT,
  kolom_diubah JSONB DEFAULT '[]'::jsonb NOT NULL,
  kirim_pada TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL, -- 'pending', 'sent', 'failed'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_antrean_pending ON antrean_notifikasi_nilai(status, kirim_pada);
CREATE INDEX IF NOT EXISTS idx_antrean_nisn_kelas ON antrean_notifikasi_nilai(nisn, kelas_id, status);
