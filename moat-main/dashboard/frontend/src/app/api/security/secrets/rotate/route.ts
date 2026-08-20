import { NextRequest, NextResponse } from "next/server";
import { KeyRotationService } from "@/lib/security/secrets/KeyRotationService";
import { EnvironmentSecretManager } from "@/lib/security/secrets/EnvironmentSecretManager";
import { GlobalExceptionHandler } from "@/lib/errors";

/**
 * Secret Rotation API Route
 * 
 * POST /api/security/secrets/rotate
 * Body: { "secretType": "JWT_SECRET" | "GRAPH_SECRET" | "SUPABASE_KEY" | "AES_MASTER_KEY" | "ALL" }
 * Rotates the specified credentials, increments versions, deprecates old keys, and returns audit summary.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const secretType = body.secretType || "ALL";
    const initiatedBy = req.headers.get("x-test-user-id") || "admin_security";

    await EnvironmentSecretManager.initialize();

    const summaries: any[] = [];

    if (secretType === "JWT_SECRET" || secretType === "ALL") {
      const res = await KeyRotationService.rotateJWTSecret("MOAT_JWT_SECRET", initiatedBy);
      summaries.push(res);
    }
    if (secretType === "GRAPH_SECRET" || secretType === "ALL") {
      const res = await KeyRotationService.rotateGraphSecret("GRAPH_CLIENT_SECRET", initiatedBy);
      summaries.push(res);
    }
    if (secretType === "SUPABASE_KEY" || secretType === "ALL") {
      const res = await KeyRotationService.rotateSupabaseKey("SUPABASE_SERVICE_ROLE_KEY", initiatedBy);
      summaries.push(res);
    }
    if (secretType === "AES_MASTER_KEY" || secretType === "ALL") {
      const res = await KeyRotationService.rotateAESEncryptionKey(initiatedBy);
      summaries.push({
        secretName: "MASTER_AES_ENCRYPTION_KEY",
        rotatedAt: new Date().toISOString(),
        status: "SUCCESS",
        details: `Re-encrypted ${res.reEncryptedCount} stored secret payloads with new 256-bit AES-GCM key.`
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully rotated ${summaries.length} enterprise credential(s) and encryption key(s).`,
      rotations: summaries
    }, { status: 200 });
  } catch (err: any) {
    console.error("[SecretsRotateAPI] Error:", err);
    return NextResponse.json({ success: false, message: "Failed to execute secret rotation.", error: err.message }, { status: 500 });
  }
}
