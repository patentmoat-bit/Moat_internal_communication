import { NextRequest, NextResponse } from "next/server";
import { EnvironmentSecretManager } from "@/lib/security/secrets/EnvironmentSecretManager";
import { GlobalExceptionHandler } from "@/lib/errors";
import { requireAdmin } from "@/lib/security/requireAdmin";

/**
 * Secret Access History & Audit Log API Route
 *
 * GET /api/security/secrets/audit
 * Returns immutable forensic access logs (who accessed what secret, when, from where)
 * and system security logs (expiration alerts, rotations, revocation). Admin-only.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (admin instanceof NextResponse) return admin;

    const { accessHistory, systemLogs } = EnvironmentSecretManager.getAuditTrail();

    return NextResponse.json({
      success: true,
      message: "Successfully retrieved immutable secrets management audit trail.",
      accessCount: accessHistory.length,
      auditEventCount: systemLogs.length,
      data: {
        accessHistory,
        systemLogs
      }
    }, { status: 200 });
  } catch (err: any) {
    console.error("[SecretsAuditAPI] Error:", err);
    return NextResponse.json({ success: false, message: "Failed to retrieve secret audit logs.", error: err.message }, { status: 500 });
  }
}
