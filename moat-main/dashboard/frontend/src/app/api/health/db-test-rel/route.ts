import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('patent_documents').select('*, document_versions(*)').limit(1);
  return NextResponse.json({ 
    document_versions_is_array: Array.isArray(data?.[0]?.document_versions),
    data 
  });
}
