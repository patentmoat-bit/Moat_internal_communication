global.WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function test() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) console.log("Error users:", error.message);
  else console.log("Users:", data);

  const { data: d2, error: e2 } = await supabase.from('profiles').select('*').limit(1);
  if (e2) console.log("Error profiles:", e2.message);
  else console.log("Profiles:", d2);
}
test();
