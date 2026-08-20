import { NextRequest, NextResponse } from "next/server";
import { DocumentsRepository } from "@/modules/documents/repository";
import { createClient } from "@/lib/supabase/server";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { GlobalExceptionHandler } from "@/lib/errors";

const repo = new DocumentsRepository();

async function getAuthUser(req?: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("custom_access_token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return { id: payload.sub as string, role: payload.role as string };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const versionId = body.version_id;
    if (!versionId) return NextResponse.json({ error: "Version ID is required" }, { status: 400 });

    const supabase = await createClient();
    const resolvedParams = await params;

    // Verify document exists via repository (handles local DB fallback)
    let doc;
    try {
      const result = await repo.getDocumentById(resolvedParams.id, user.id, user.role);
      doc = result.data;
    } catch (e: any) {
      return NextResponse.json({ error: e.message || "Document not found" }, { status: 404 });
    }

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    // Get the file path for the requested version
    const version = doc.document_versions?.find((v: any) => v.id === versionId);

    if (!version) return NextResponse.json({ error: "Document version not found" }, { status: 404 });

    let downloadUrl = version.file_url;
    
    // Extract path if it's a full URL to handle host migrations or incorrect domains
    let storagePath = downloadUrl;
    if (downloadUrl && downloadUrl.includes("/storage/v1/object/public/patent_documents/")) {
      storagePath = downloadUrl.split("/storage/v1/object/public/patent_documents/")[1];
    } else if (downloadUrl && downloadUrl.includes("/storage/v1/object/sign/patent_documents/")) {
      storagePath = downloadUrl.split("/storage/v1/object/sign/patent_documents/")[1];
    }
    
    // Generate signed URL
    if (storagePath) {
      // Strip any query params (like token) that might be attached to old URLs
      storagePath = storagePath.split('?')[0];
      const { createAdminClient } = require("@/lib/supabase/admin");
      const supabaseAdmin = createAdminClient();
      
      const { data: signedData, error: signError } = await supabaseAdmin.storage
        .from("patent_documents")
        .createSignedUrl(storagePath, 300); // 5 minutes temporary access

      if (signError) {
        console.warn("Could not generate signed URL:", signError.message);
      } else if (signedData?.signedUrl) {
        downloadUrl = signedData.signedUrl;
      }
    }

    // Log the download request
    const { error: logError } = await supabase.from("design_download_logs").insert({
      document_id: resolvedParams.id,
      version_id: versionId,
      user_id: user.id,
    });

    if (logError) {
      console.warn("Could not log download to Supabase:", logError.message);
    }

    return NextResponse.json({ success: true, downloadUrl, message: "Temporary signed URL generated." });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
