import { NextRequest, NextResponse } from "next/server";
import { EnvironmentSecretManager } from "@/lib/security/secrets/EnvironmentSecretManager";
import { GlobalExceptionHandler } from "@/lib/errors";
import { requireAdmin } from "@/lib/security/requireAdmin";

/**
 * List Stored Secrets API Route
 *
 * GET /api/security/secrets/list
 * Returns metadata, version count, and expiration status of all registered credentials
 * without ever exposing raw plaintext strings or ciphertexts. Admin-only.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const secrets = await EnvironmentSecretManager.listSecrets();

    return NextResponse.json({
      success: true,
      message: "Successfully retrieved centralized secret registry metadata.",
      totalSecrets: secrets.length,
      data: secrets
    }, { status: 200 });
  } catch (err: any) {
    console.error("[SecretsListAPI] Error:", err);
    return NextResponse.json({ success: false, message: "Failed to list secret registry.", error: err.message }, { status: 500 });
  }
}
