import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function checkTable(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=1`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  if (res.ok) {
    console.log(`Table ${table} EXISTS (HTTP ${res.status})`);
    return true;
  } else {
    console.log(`Table ${table} DOES NOT EXIST or Error (HTTP ${res.status}: ${await res.text()})`);
    return false;
  }
}

async function run() {
  console.log("Checking tables...");
  await checkTable("password_reset_tokens"); // from 01
  await checkTable("user_invitations"); // from 20260729000001
  await checkTable("project_members"); // from 20260801000000
}

run();
