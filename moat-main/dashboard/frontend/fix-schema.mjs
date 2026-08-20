import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

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

    -- Make expires_at not null only for new rows
    -- or just leave it nullable but handle it in code.
  `;
  
  // We can't execute raw SQL directly via standard supabase-js unless there's an RPC or we use Postgres JS.
  // Wait, I can use postgres client since it's a node project.
  // Let me check if 'pg' or 'postgres' is installed.
}
run();
