const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking bank_siswa records...");
  let { data: bankSiswa, error: err1 } = await supabase
    .from('bank_siswa')
    .select('sekolah_id, tahun_pelajaran, tingkatan, rombel')
    .limit(10);
  
  if (err1) console.error("Error bank_siswa:", err1);
  else console.log("Bank Siswa:", bankSiswa);

  console.log("Checking kelas records...");
  let { data: kelas, error: err2 } = await supabase
    .from('kelas')
    .select('id, tahun_pelajaran, tingkatan, rombel_nama')
    .limit(5);

  if (err2) console.error("Error kelas:", err2);
  else console.log("Kelas:", kelas);
}

main();
