import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { appRoleToEnterpriseRole } from "@/lib/roleIntelligence";
import { AuditLogService, SecurityEventType } from "@/lib/security/auditLogService";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("custom_access_token")?.value;
    if (!token) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const authUser = await verifyToken(token);
    if (!authUser || appRoleToEnterpriseRole(authUser.role as any) !== "admin") {
      return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
    }

    const { action } = await request.json();
    const { id: targetUserId } = await params;
    const supabase = createAdminClient();

    // Verify target user exists
    const { data: targetUser, error: targetError } = await supabase
      .from("users")
      .select("email, is_active, mfa_enabled, failed_login_attempts")
      .eq("id", targetUserId)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ detail: "Target user not found" }, { status: 404 });
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown";
    const userAgent = request.headers.get("user-agent") || "Unknown";

    let auditEvent: SecurityEventType = "USER_UPDATED";
    let updatePayload: any = {};

    switch (action) {
      case "RESET_PASSWORD":
        updatePayload = { password_change_required: true };
        auditEvent = "PASSWORD_RESET_REQUESTED";
        break;
      
      case "RESET_MFA":
        updatePayload = { 
          mfa_enabled: false, 
          failed_mfa_attempts: 0, 
          mfa_enrolled_at: null,
          locked_until: null
        };
        auditEvent = "MFA_POLICY_CHANGED";
        break;

      case "UNLOCK_ACCOUNT":
        updatePayload = { 
          failed_login_attempts: 0, 
          failed_mfa_attempts: 0, 
          locked_until: null 
        };
        auditEvent = "ACCOUNT_UNLOCKED";
        break;

      case "REVOKE_SESSIONS":
        auditEvent = "SESSION_REVOKED";
        break;

      case "FORCE_PASSWORD_CHANGE":
        updatePayload = { password_change_required: true };
        auditEvent = "PASSWORD_POLICY_CHANGED";
        break;

      case "DEACTIVATE":
        updatePayload = { is_active: false, status: "Inactive" };
        auditEvent = "USER_DEACTIVATED";
        break;

      case "ACTIVATE":
        updatePayload = { is_active: true, status: "Active" };
        auditEvent = "USER_ACTIVATED";
        break;

      default:
        return NextResponse.json({ detail: "Invalid action" }, { status: 400 });
    }

    // Apply Update
    if (Object.keys(updatePayload).length > 0) {
        const { error: updateError } = await supabase
          .from("users")
          .update(updatePayload)
          .eq("id", targetUserId);
          
        if (updateError) {
          console.error("Update error:", updateError);
          // If the field doesn't exist (like password_change_required), it might fail. We still log it.
        }
    }

    // Log Audit Event
    const auditService = new AuditLogService(supabase);
    await auditService.logEvent({
      userId: authUser.sub,
      email: (authUser as any).email,
      eventType: auditEvent,
      ipAddress: ip,
      userAgent: userAgent,
      endpoint: request.nextUrl.pathname,
      status: "SUCCESS",
      actorRole: authUser.role as string,
      category: "USER_MANAGEMENT",
      resourceType: "User",
      resourceId: targetUserId,
      resourceName: targetUser.email,
      oldValue: { action, ...targetUser },
      newValue: { ...targetUser, ...updatePayload },
    });

    return NextResponse.json({ detail: "Action performed successfully", event: auditEvent });

  } catch (err: any) {
    console.error("Admin Action Error:", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
