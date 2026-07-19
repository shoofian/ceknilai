const { createClient } = require('@supabase/supabase-js');
const url = "https://ffrucebdhhrpkuszlshy.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmcnVjZWJkaGhycGt1c3psc2h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ5Mjg3MywiZXhwIjoyMDk1MDY4ODczfQ.zfnwU_VIzf8K1zZKEhd7H8R9GkJP8xfYiK6f-StxWY0";

const supabase = createClient(url, key);

async function run() {
  const { data: siswa } = await supabase.from('siswa').select('*').eq('kelas_id', 'kelas-ttzfowr1j');
  console.log("Students count for kelas-ttzfowr1j:", siswa ? siswa.length : 0);
  if (siswa) console.log("Students names:", siswa.map(s => s.nama));
}
run();
