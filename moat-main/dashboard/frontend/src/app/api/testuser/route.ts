import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("users").select("*").eq("id", "8b9caff9-b91e-43c0-854c-58cdd8ede223").single();
  return NextResponse.json({ data, error });
}
