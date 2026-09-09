import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();
  const v1Id = crypto.randomUUID();
  const v2Id = crypto.randomUUID();
  
  const { data: v1, error: e1 } = await supabase.from('document_versions').insert({
    document_id: 'bf4121fa-8db5-41d0-a22d-b96c9ea738d7',
    version_number: '1.99',
    uploaded_by: 'ad7db890-99a0-4c46-ae2b-50325a6108c9',
    id: v1Id,
    file_url: 'test_url_1',
    file_name: 'test_1.pdf'
  }).select();
  
  const { data: v2, error: e2 } = await supabase.from('document_versions').insert({
    document_id: 'bf4121fa-8db5-41d0-a22d-b96c9ea738d7',
    version_number: '1.99', // same version number
    uploaded_by: 'ad7db890-99a0-4c46-ae2b-50325a6108c9',
    id: v2Id,
    file_url: 'test_url_2',
    file_name: 'test_2.pdf'
  }).select();
  
  return NextResponse.json({ e1, e2, v1, v2 });
}
