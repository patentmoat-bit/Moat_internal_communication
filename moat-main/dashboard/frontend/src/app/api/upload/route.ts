import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { SecureFileStorageService } from "@/lib/security/fileupload/SecureFileStorageService";

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
    const documentId = formData.get("document_id") as string || "temp_doc";

    if (!file) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name.split('.').pop() || 'bin';

    // Store the file securely using the SecureFileStorageService
    const { storagePath } = await SecureFileStorageService.storeFile(
      buffer,
      documentId,
      ext,
      file.type
    );

    // Return the internal storage path as the 'url' so the frontend can save it.
    // The download endpoint knows how to serve these paths securely.
    return NextResponse.json({ success: true, url: storagePath });
  } catch (e: any) {
    console.error("Upload API Error:", e);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
