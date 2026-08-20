const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
global.WebSocket = require('ws');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applySchema() {
  const sql = fs.readFileSync('src/lib/security/monitoring/schema.sql', 'utf8');
  console.log("Applying schema...");
  
  const { data, error } = await supabase.rpc('execute_sql', { sql });
  
  if (error) {
    console.error("Error applying schema via RPC:", error);
    // Maybe execute_sql does not exist, let's just print that
  } else {
    console.log("Schema applied successfully.");
  }
}

applySchema();
