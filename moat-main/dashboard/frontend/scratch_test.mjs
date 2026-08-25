import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
  const url = `${supabaseUrl}/rest/v1/users?limit=1`;
  const res = await fetch(url, {
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  console.log("First user keys:", data.length > 0 ? Object.keys(data[0]) : "no data");
  
  const logsUrl = `${supabaseUrl}/rest/v1/email_logs?order=created_at.desc&limit=5`;
  const logsRes = await fetch(logsUrl, {
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`
    }
  });
  const logsData = await logsRes.json();
  console.log("Recent Email Logs:");
  logsData.forEach(l => {
    console.log(`- ${l.event_type} | To: ${JSON.stringify(l.recipients)} | Status: ${l.status} | Err: ${l.error_message}`);
  });
}

main();
