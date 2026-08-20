const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function run() {
  const { data: historyData, error } = await supabase
    .from("activity_events")
    .select("entity_id, new_state, created_at")
    .eq("action", "MANUAL_STATUS_UPDATE")
    .in("entity_id", ["19e52dbf-8920-4216-970d-b9de40ae0775"])
    .order("created_at", { ascending: false });
  console.log("historyData:", historyData);
  console.log("error:", error);
}
run();
