import { NextRequest, NextResponse } from "next/server";
import { SecureDownloadService } from "@/lib/security/fileupload/SecureDownloadService";
import { SecureFileStorageService } from "@/lib/security/fileupload/SecureFileStorageService";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";

/**
 * Enterprise Secure File Download API
 * 
 * Enforces zero-trust download authorization and temporary token expiration:
 * 1. POST: Requests a short-lived signed URL (default 60 seconds) after validating RBAC permissions and project membership.
 * 2. GET: Validates download token, checks expiration, and streams secure file buffer if authorized.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("custom_access_token")?.value || req.headers.get("authorization")?.replace("Bearer ", "");
    
    // Identity is derived ONLY from the verified token — this previously let any
    // request override its own userId/userRole via x-test-user-* headers, a
    // direct bypass on a signed-download-URL issuance endpoint.
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }
    const decoded: any = await verifyToken(token);
    if (!decoded?.sub) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }
    const userId = decoded.sub;
    const userRole = decoded.role || "Patent Analyst";

    const body = await req.json();
    const { documentId, versionNumber, expirationSeconds } = body;

    if (!documentId) {
      return NextResponse.json({ success: false, error: "Missing documentId in request payload." }, { status: 400 });
    }

    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";

    const result = await SecureDownloadService.requestSignedDownloadUrl(
      documentId,
      userId,
      userRole,
      clientIp,
      versionNumber,
      expirationSeconds || 60
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: result.signedUrlData }, { status: 200 });
  } catch (err: any) {
    console.error("[SecureDownloadAPI POST] Error:", err);
    return NextResponse.json({ success: false, error: "Server error generating signed download URL." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing required download token." }, { status: 400 });
    }

    const validation = SecureDownloadService.validateTokenAndGetPath(token);
    if (!validation.isValid || !validation.storagePath) {
      return NextResponse.json({ error: validation.reason || "Invalid or expired download token." }, { status: 403 });
    }

    const fileBuffer = await SecureFileStorageService.retrieveFile(validation.storagePath);
    if (!fileBuffer) {
      return NextResponse.json({ error: "File asset not found in storage repository." }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="secure_document_${Date.now()}.bin"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
      }
    });
  } catch (err: any) {
    console.error("[SecureDownloadAPI GET] Error:", err);
    return NextResponse.json({ error: "Server error streaming file." }, { status: 500 });
  }
}
