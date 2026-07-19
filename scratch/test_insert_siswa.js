const { createClient } = require('@supabase/supabase-js');
const url = "https://ffrucebdhhrpkuszlshy.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmcnVjZWJkaGhycGt1c3psc2h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ5Mjg3MywiZXhwIjoyMDk1MDY4ODczfQ.zfnwU_VIzf8K1zZKEhd7H8R9GkJP8xfYiK6f-StxWY0";

const supabase = createClient(url, key);

async function run() {
  const studentRow = {
    kelas_id: 'kelas-ttzfowr1j',
    nisn: '0096650835',
    nama: 'NABIL',
    tanggal_lahir: null,
    nilai: {},
    catatan: ''
  };

  const { data, error } = await supabase
    .from('siswa')
    .insert(studentRow)
    .select();

  if (error) {
    console.error("FAILED to insert student:", error);
  } else {
    console.log("SUCCESS to insert student:", data);
  }
}
run();
