import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) { console.error(error); return; }
  
  const targetEmail = "nmahalingam@pinochle.ai";
  const user = users.users.find(u => u.email === targetEmail);
  
  if (user) {
    console.log("Found orphaned user:", user.id);
    const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.log("Failed to delete:", delErr);
    } else {
      console.log("Successfully purged orphaned user.");
    }
  } else {
    console.log("User not found in auth.users.");
  }
}
run();
