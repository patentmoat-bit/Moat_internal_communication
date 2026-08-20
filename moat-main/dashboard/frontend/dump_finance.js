const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const WebSocket = require('ws');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket }
});

async function run() {
  const { data, error } = await supabase.from("finance_transactions").select("*");
  console.log("All transactions:", data);
  console.log("Error:", error);
}

run();
