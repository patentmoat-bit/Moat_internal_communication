import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const finalUserId = "8b9caff9-b91e-43c0-854c-58cdd8ede223";
  const { data, error } = await supabase.from("users").select("*").eq("id", finalUserId).single();
  console.log("User:", data);
  console.log("Error:", error);
}

run();
