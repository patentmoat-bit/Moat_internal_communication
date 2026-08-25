import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Build connection string from supabase url
// Example: https://gaanedxlwtjftqxhncfw.supabase.co
const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL.split("//")[1].split(".")[0];
// Need DB password. Let's try standard supabase connection string if we have it, else we can't connect directly.
// Actually, we can just trigger a schema reload via the REST API by calling the rpc if there's one, or we can just try to fetch from the DB using another way.
