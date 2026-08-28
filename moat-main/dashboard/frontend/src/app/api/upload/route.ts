import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";

// The only bucket every real caller of this endpoint uses (designer/, patent-drafter/,
// patent-analyst/ document pages). This previously accepted ANY client-supplied bucket
// name and, if it didn't already exist, created it on the fly as PUBLIC via the admin
// client — an authenticated user of any role could spin up arbitrary public storage
// buckets and write to any path in them, including paths that collide with other
// features' buckets, entirely bypassing storage RLS.
const ALLOWED_BUCKET = "patent_documents";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("custom_access_token")?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const bucket = formData.get("bucket") as string;
    const path = formData.get("path") as string;

    if (!file || !bucket || !path) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (bucket !== ALLOWED_BUCKET) {
      return NextResponse.json({ error: "Invalid bucket." }, { status: 400 });
    }
    if (path.includes("..") || path.startsWith("/")) {
      return NextResponse.json({ error: "Invalid path." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

    if (error) {
      console.error("Upload API storage error:", error);
      return NextResponse.json({ error: "Upload failed." }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ success: true, url: urlData.publicUrl });
  } catch (e: any) {
    console.error("Upload API Error:", e);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
