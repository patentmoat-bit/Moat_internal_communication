import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Get recent activity logs
const res = await fetch(`${base}/rest/v1/activity_logs?order=created_at.desc&limit=5`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` }
});
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
