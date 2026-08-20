import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config({path: '.env.local'});
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  const hash = await bcrypt.hash("Financemoat123@", 10);
  
  const res = await fetch(`${base}/rest/v1/users?email=eq.nmahalingam@pinochle.ai`, {
    method: "PATCH",
    headers: { 
      apikey: key, 
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify({ password_hash: hash })
  });
  
  if (res.ok) {
    console.log("Successfully fixed password hash for user.");
  } else {
    console.log("Failed:", await res.text());
  }
}
run();
