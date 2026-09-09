import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { v4 as uuidv4 } from "uuid";
import { SecureFileStorageService } from "@/lib/security/fileupload/SecureFileStorageService";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("custom_access_token")?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: documentId } = await params;
    const formData = await req.formData();
    const files = formData.getAll("file") as File[];
    const folder = formData.get("folder") as string || "";

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get current version count so version numbers increment correctly
    const { count: existingCount } = await supabase
      .from("document_versions")
      .select("*", { count: "exact", head: true })
      .eq("document_id", documentId);

    const results = [];
    let versionIndex = existingCount || 0;

    for (const file of files) {
      const ext = file.name.split(".").pop() || "bin";
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload file to secure storage with unique random UUID path
      const { storagePath } = await SecureFileStorageService.storeFile(
        buffer,
        documentId,
        ext,
        file.type
      );

      // Encode folder into the stored URL to persist without schema changes
      const secureFileUrl = folder
        ? `${storagePath}?folder=${encodeURIComponent(folder)}`
        : storagePath;

      versionIndex++;
      const versionId = uuidv4();
      const versionData = {
        id: versionId,
        document_id: documentId,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: secureFileUrl,
        file_size: file.size,
        mime_type: file.type,
        version_number: `1.${versionIndex}`,
      };

      const { data, error } = await supabase
        .from("document_versions")
        .insert(versionData)
        .select()
        .single();

      if (error) {
        console.error("[bulk-upload] Supabase insert error:", error.message);
        results.push({ file_name: file.name, success: false, error: error.message });
        continue;
      }

      // Update current_version_id to the latest uploaded file
      await supabase
        .from("patent_documents")
        .update({ current_version_id: data.id })
        .eq("id", documentId);

      results.push({ file_name: file.name, success: true, id: data.id });
    }

    const allOk = results.every((r) => r.success);
    return NextResponse.json({ success: allOk, results });
  } catch (e: any) {
    console.error("[bulk-upload] Error:", e);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// Explicit GET for fetching ALL versions of a document (no FK ambiguity)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: documentId } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("document_versions")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
