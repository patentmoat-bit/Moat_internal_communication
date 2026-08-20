import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  const res = await fetch(`${base}/rest/v1/organization_domains?domain=eq.pinochle.ai`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const data = await res.json();
  console.log('Domains:', JSON.stringify(data));
}
run();
