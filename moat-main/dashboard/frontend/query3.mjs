import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function query(table) {
  const res = await fetch(`${base}/rest/v1/${table}?limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const data = await res.json();
  if (res.ok) {
    if (Array.isArray(data) && data.length > 0) console.log(`${table}:`, Object.keys(data[0]).join(', '));
    else console.log(`${table}: empty but exists`);
  } else {
    console.log(`${table} error:`, data.message);
  }
}

await query('projects');
await query('documents');
await query('copyrights');
