import { createClient } from "@supabase/supabase-js";
import { EnterpriseAuthenticationService } from "./src/lib/security/authenticationService.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const authService = new EnterpriseAuthenticationService(supabase);
  try {
    await authService.authenticateLogin("jhaldurai@pinochle.ai", "jo1122002@", "127.0.0.1", "test-script", "test");
    console.log("Success!");
  } catch (err) {
    console.error("Caught error:", err);
  }
}

run();
