const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching all kelas...");
  let { data: kelasList, error: err1 } = await supabase
    .from('kelas')
    .select('id, nama, skema_penilaian');
  
  if (err1) {
    console.error("Error fetching kelas:", err1);
    return;
  }
  
  console.log(`Found ${kelasList.length} kelas.`);
  let updatedCount = 0;

  for (let k of kelasList) {
    let skema = k.skema_penilaian || {};
    if (skema.presensi && skema.presensi.digunakan === true) {
      console.log(`Fixing kelas: ${k.nama} (${k.id})`);
      skema.presensi.digunakan = false;
      skema.presensi.bobot = 0;
      
      let { error: updateErr } = await supabase
        .from('kelas')
        .update({ skema_penilaian: skema })
        .eq('id', k.id);
      
      if (updateErr) {
        console.error(`Failed to update kelas ${k.id}:`, updateErr);
      } else {
        updatedCount++;
      }
    }
  }
  
  console.log(`Successfully fixed ${updatedCount} kelas.`);
}

main();
