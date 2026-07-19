const { createClient } = require('@supabase/supabase-js');
const url = "https://ffrucebdhhrpkuszlshy.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmcnVjZWJkaGhycGt1c3psc2h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ5Mjg3MywiZXhwIjoyMDk1MDY4ODczfQ.zfnwU_VIzf8K1zZKEhd7H8R9GkJP8xfYiK6f-StxWY0";

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('guru').select('*').limit(1);
  if (error) {
    console.error("Failed to fetch guru schema:", error);
  } else {
    console.log("Guru table columns:", Object.keys(data[0] || {}));
    console.log("Full data:", data[0]);
  }
}
run();
