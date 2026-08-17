const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manual env file parser to avoid dependency on 'dotenv'
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  const envDefaultPath = path.join(__dirname, '../.env');
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf-8');
    console.log("Loaded environment from .env.local");
  } else if (fs.existsSync(envDefaultPath)) {
    content = fs.readFileSync(envDefaultPath, 'utf-8');
    console.log("Loaded environment from .env");
  } else {
    console.warn("No env files found.");
  }
  
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    
    const match = trimmed.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      // Strip outer quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in process.env!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function recalculatePremiumUntil(username) {
  try {
    const { data: logs, error } = await supabase
      .from('log_aktivitas_guru')
      .select('aksi, detail, created_at')
      .eq('guru_username', username)
      .in('aksi', ['REFERRAL_POINTS', 'REDEEM_POINTS', 'PAYMENT_APPROVED'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error(`Error fetching logs for ${username}:`, error);
      return null;
    }

    let premiumUntil = null;

    if (logs && logs.length > 0) {
      for (const log of logs) {
        let daysToAdd = 0;
        if (log.aksi === 'PAYMENT_APPROVED') {
          const isYearly = log.detail.toUpperCase().includes('PAKET:TAHUNAN');
          const isMonthly = log.detail.toUpperCase().includes('PAKET:BULANAN');
          if (isYearly) daysToAdd = 365;
          else if (isMonthly) daysToAdd = 30;
        } else if (log.aksi === 'REDEEM_POINTS') {
          const isYearly = log.detail.includes('Gratis 1 Tahun Premium');
          const isMonthly = log.detail.includes('Gratis 1 Bulan Premium');
          if (isYearly) daysToAdd = 365;
          else if (isMonthly) daysToAdd = 30;
        }

        if (daysToAdd > 0) {
          const txDate = new Date(log.created_at);
          if (!premiumUntil || txDate > premiumUntil) {
            premiumUntil = new Date(txDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
          } else {
            premiumUntil = new Date(premiumUntil.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
          }
        }
      }
    }

    const premiumUntilStr = premiumUntil ? premiumUntil.toISOString() : null;

    const { error: updateError } = await supabase
      .from('guru')
      .update({ premium_until: premiumUntilStr })
      .eq('username', username);

    if (updateError) {
      console.error(`Error updating premium_until for ${username}:`, updateError);
      return null;
    }

    return premiumUntilStr;
  } catch (err) {
    console.error(`Unexpected error for ${username}:`, err);
    return null;
  }
}

async function run() {
  console.log("Starting premium_until backfill migration...");

  // Fetch all teachers
  const { data: gurus, error } = await supabase
    .from('guru')
    .select('username');

  if (error) {
    console.error("Failed to fetch gurus list:", error);
    process.exit(1);
  }

  console.log(`Found ${gurus.length} gurus. Recalculating premium active periods...`);

  let successCount = 0;
  for (const guru of gurus) {
    const result = await recalculatePremiumUntil(guru.username);
    console.log(`- @${guru.username}: premium_until = ${result || 'null'}`);
    successCount++;
  }

  console.log(`Migration finished! Successfully processed ${successCount}/${gurus.length} gurus.`);
}

run();
