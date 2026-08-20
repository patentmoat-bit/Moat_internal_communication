const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function run() {
  const { data, error } = await supabase
    .from("inventions")
    .update({ status: "Research" })
    .eq("id", "19e52dbf-8920-4216-970d-b9de40ae0775");
  console.log("Update Error:", error?.message);
}
run();
