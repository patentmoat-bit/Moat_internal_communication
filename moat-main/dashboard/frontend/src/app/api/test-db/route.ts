import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('document_versions').select('*').limit(1);
  return NextResponse.json({ keys: data && data.length > 0 ? Object.keys(data[0]) : "no data", error });
}
