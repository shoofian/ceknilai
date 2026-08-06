-- Skema Catatan Wali Kelas
CREATE TABLE IF NOT EXISTS public.catatan_walikelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nisn VARCHAR(50) NOT NULL,
    tahun_ajaran VARCHAR(20) NOT NULL,
    semester VARCHAR(10) NOT NULL,
    catatan TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(nisn, tahun_ajaran, semester)
);

-- RLS
ALTER TABLE public.catatan_walikelas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.catatan_walikelas FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable read access for all users" ON public.catatan_walikelas FOR SELECT USING (true);
