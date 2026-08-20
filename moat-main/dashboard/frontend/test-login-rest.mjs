import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function run() {
  const res = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { 
      apikey: key, 
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: "nmahalingam@pinochle.ai",
      password: "Financemoat123@"
    })
  });
  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Response:", JSON.stringify(data, null, 2));
}
run();
