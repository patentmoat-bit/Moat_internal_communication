const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const finalUserId = "8b9caff9-b91e-43c0-854c-58cdd8ede223";
  const { data, error } = await supabase.from('users').select('*').eq('id', finalUserId).single();
  console.log("User:", data);
  console.log("Error:", error);
}
test();
