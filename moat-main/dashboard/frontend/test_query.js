const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const WebSocket = require('ws');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket }
});

async function run() {
  const authUserId = "00000000-0000-0000-0000-000000000000"; // Doesn't matter since we check is.null
  let query = supabase.from("finance_transactions").select("*").order("created_at", { ascending: false });
  query = query.or(`assigned_finance_manager.eq.${authUserId},assigned_finance_manager.is.null`);
  
  const { data, error } = await query;
  console.log("Data length:", data ? data.length : 0);
  console.log("Error:", error);
}

run();
