import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  const listRes = await fetch(`${base}/auth/v1/admin/users`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const data = await listRes.json();
  const users = data.users || [];
  
  const targetEmail = "nmahalingam@pinochle.ai";
  const user = users.find(u => u.email === targetEmail);
  
  if (user) {
    console.log("User found:", !!user);
    console.log("Confirmed at:", user.email_confirmed_at);
  } else {
    console.log("User not found in auth.users.");
  }
}
run();
