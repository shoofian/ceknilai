const { createClient } = require('@supabase/supabase-js');
const url = "https://ffrucebdhhrpkuszlshy.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmcnVjZWJkaGhycGt1c3psc2h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ5Mjg3MywiZXhwIjoyMDk1MDY4ODczfQ.zfnwU_VIzf8K1zZKEhd7H8R9GkJP8xfYiK6f-StxWY0";

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('guru').select('*').limit(1);
  console.log("Guru table columns:", Object.keys(data[0] || {}));
  
  // Let's check what other tables are available in the public schema by listing them from pg_class/pg_namespace or RPC if any
  // But wait, we can also check if we can add columns to the 'guru' table using a PostgreSQL function or check if we have permission to run raw SQL
  // Let's query information_schema.columns for 'guru'
  const { data: cols, error: err } = await supabase.from('guru').select('*, sekolah_id(*)');
  console.log("Joined data sample:", cols[0]);
}
run();
