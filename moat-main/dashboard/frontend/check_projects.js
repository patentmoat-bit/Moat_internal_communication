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
  console.log("Checking inventions...");
  const { data: inventions, error: err1 } = await supabase.from('inventions').select('id, title, status');
  if (err1) console.error(err1);
  else {
    console.log(`Inventions: ${inventions.length}`);
    inventions.forEach(inv => console.log(`- ${inv.title} (${inv.status})`));
  }
}

run();
