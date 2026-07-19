const { createClient } = require('@supabase/supabase-js');
const url = "https://ffrucebdhhrpkuszlshy.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmcnVjZWJkaGhycGt1c3psc2h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ5Mjg3MywiZXhwIjoyMDk1MDY4ODczfQ.zfnwU_VIzf8K1zZKEhd7H8R9GkJP8xfYiK6f-StxWY0";
const supabase = createClient(url, key);

async function run() {
  const tests = ['exec_sql', 'execute_sql', 'run_sql', 'sql'];
  for (const t of tests) {
    const { data, error } = await supabase.rpc(t, { query: 'SELECT 1', sql: 'SELECT 1' });
    console.log(`RPC ${t}:`, data ? "SUCCESS" : "ERROR", error ? error.message : "");
  }
}
run();
