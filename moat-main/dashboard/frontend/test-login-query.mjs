import WebSocket from "ws";
globalThis.WebSocket = WebSocket;
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const email = "jhaldurai@pinochle.ai";
  const password = "jo1122002@";
  const domain = email.split("@")[1];

  console.log("Checking domain...");
  const { data: orgDomain, error: orgError } = await supabase
    .from("organization_domains")
    .select("id, is_enabled, organizations(id, is_enabled, name)")
    .eq("domain", domain)
    .single();
    
  console.log("orgDomain:", orgDomain, "error:", orgError);

  if (!orgDomain) return console.log("Failed at domain");

  console.log("Checking user...");
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, name, email, password_hash, role_id, is_active, status, roles(role_name)")
    .eq("email", email)
    .single();

  console.log("user:", user ? { ...user, password_hash: "***" } : null, "error:", userError);

  if (!user) return console.log("Failed at user");

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  console.log("isPasswordValid:", isPasswordValid);
}

run();
