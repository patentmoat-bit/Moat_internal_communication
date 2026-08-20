import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { UserService } from "./src/services/auth/UserService";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const userService = new UserService(supabase);
  const result = await userService.getMfaEnrollment("90abf51f-725e-439b-8a8f-741577bd92f5"); // nmahalingam@pinochle.ai
  console.log("Enrollment result:", result);
}

check();
