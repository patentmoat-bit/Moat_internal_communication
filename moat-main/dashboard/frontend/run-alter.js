const { createClient } = require('@supabase/supabase-js');
global.WebSocket = require('ws');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
    ALTER TABLE public.user_sessions 
    ADD COLUMN IF NOT EXISTS jti VARCHAR(255) UNIQUE,
    ADD COLUMN IF NOT EXISTS token_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS revoked_reason VARCHAR(255),
    ADD COLUMN IF NOT EXISTS user_agent TEXT,
    ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

    -- Also we must notify PostgREST to reload its schema cache
    NOTIFY pgrst, 'reload schema';
  `;
  
  const { data, error } = await supabase.rpc('execute_sql', { sql });
  if (error) {
    console.error("Error executing SQL:", error);
  } else {
    console.log("Successfully altered table user_sessions and reloaded schema.");
  }
}
run();
