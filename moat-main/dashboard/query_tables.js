const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "frontend/.env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
async function run() {
  const { data, error } = await supabase.from("patent_search").select("id").limit(1);
  console.log(error || data);
}
run();
