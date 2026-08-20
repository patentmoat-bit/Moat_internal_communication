import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: users, error } = await supabase.from('users').select('email').limit(5);
  console.log("Users:", users);
  
  // Create a test user for F-09 specifically
  const { data: user } = await supabase.auth.admin.createUser({
    email: 'f09-test@example.com',
    password: 'Password123!',
    email_confirm: true
  });
  console.log("Created user:", user);
}
run();
