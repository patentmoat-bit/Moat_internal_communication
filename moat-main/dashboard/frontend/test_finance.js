const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const WebSocket = require('ws');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: {
    transport: WebSocket
  }
});

async function run() {
  const { data: tx, error: e2 } = await supabase.from('finance_transactions').select('*');
  console.log("Finance Transactions:", tx);
}

run();
