import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gaanedxlwtjftqxhncfw.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhYW5lZHhsd3RqZnRxeGhuY2Z3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTMzODkyMSwiZXhwIjoyMDk0OTE0OTIxfQ.Cw_HxfhEmpUY4gYSJbixmQRT1-w9bfj-FxnG8WbwECo";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Error fetching users:", error);
    return;
  }
  console.log("Found users:", users.users.length);
  if (users.users.length > 0) {
    console.log("First user ID:", users.users[0].id);
    console.log("First user email:", users.users[0].email);
  }
}

run();
