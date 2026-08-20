import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { UserService } from "./src/services/auth/UserService";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const userService = new UserService(supabase);
  const res = await supabase.from("users").update({
      mfa_enabled: true,
      mfa_enrolled_at: new Date().toISOString()
  }).eq("id", "90abf51f-725e-439b-8a8f-741577bd92f5"); // nmahalingam@pinochle.ai
  console.log("Supabase response:", res);

  const fallbackPath = require("path").join(process.cwd(), 'mfa_fallback.json');
  console.log("fallback path:", fallbackPath);
}

check();
