import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Workaround for Node < 22 WebSocket issue
globalThis.WebSocket = class {};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function run() {
  const { data, error } = await supabase.from('users').select('email').limit(5);
  console.log("Users in DB:", data);
  if (error) console.error("Error:", error);
}
run();
