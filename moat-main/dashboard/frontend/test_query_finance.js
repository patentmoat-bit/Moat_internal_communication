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
  let query = supabase.from("finance_transactions").select("*").order("created_at", { ascending: false });
  query = query.or(`assigned_finance_manager.is.null`);

  const { data, error } = await query;
  console.log("Finance transactions where assigned_finance_manager is null:", data);
  if (error) console.error(error);
}

run();
