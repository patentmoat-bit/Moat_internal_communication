import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GlobalExceptionHandler } from "@/lib/errors";
import { requireAuth } from "@/lib/security/requireAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("copyright_documents")
      .select("*")
      .eq("copyright_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ data: [] });
      }
      throw error;
    }
    
    // Create signed URLs for download if needed, or rely on client
    const enriched = await Promise.all(
      (data || []).map(async (doc) => {
        const { data: urlData } = await supabase
          .storage
          .from('copyrights')
          .createSignedUrl(doc.storage_path, 3600); // 1 hour expiry
          
        return {
          ...doc,
          download_url: urlData?.signedUrl || null
        };
      })
    );

    return NextResponse.json({ data: enriched });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await req.json();

    // storage_path must live under this copyright's own folder — otherwise a
    // caller could point this record at (or claim access to) a file that
    // actually belongs to a different copyright/org's folder in the shared
    // 'copyrights' bucket.
    if (typeof body.storage_path !== "string" || !body.storage_path.startsWith(`${id}/`)) {
      return NextResponse.json({ error: "Invalid storage_path for this copyright." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("copyright_documents")
      .insert([{
        copyright_id: id,
        file_name: body.file_name,
        file_type: body.file_type,
        file_size: body.file_size,
        storage_path: body.storage_path,
        version: body.version || 1
      }])
      .select()
      .single();

    if (error) throw error;

    // Trigger Audit Log
    await supabase.from("activity_logs").insert([{
      entity_type: "copyright",
      entity_id: id,
      action: "UPDATE",
      message: `Uploaded new document: ${body.file_name} (v${body.version || 1})`
    }]);

    return NextResponse.json({ data });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
