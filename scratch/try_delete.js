const { createClient } = require('@supabase/supabase-js');
const url = "https://ffrucebdhhrpkuszlshy.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmcnVjZWJkaGhycGt1c3psc2h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ5Mjg3MywiZXhwIjoyMDk1MDY4ODczfQ.zfnwU_VIzf8K1zZKEhd7H8R9GkJP8xfYiK6f-StxWY0";

const supabase = createClient(url, key);

async function run() {
  const id = 'kelas-8iqy1364u';
  const { error } = await supabase.from('kelas').delete().eq('id', id);
  if (error) {
    console.error("Failed to delete kelas:", error);
  } else {
    console.log("Successfully deleted kelas from DB!");
  }
}
run();
