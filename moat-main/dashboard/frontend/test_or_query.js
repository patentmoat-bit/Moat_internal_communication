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
  const userId = '90abf51f-725e-439b-8a8f-741577bd92f5'; // nmahalingam@pinochle.ai
  let query = supabase.from("finance_transactions").select("*").order("created_at", { ascending: false });
  query = query.or(`assigned_finance_manager.eq.${userId},assigned_finance_manager.is.null`);

  const { data, error } = await query;
  console.log("Result:", data);
  if (error) console.error(error);
}

run();
