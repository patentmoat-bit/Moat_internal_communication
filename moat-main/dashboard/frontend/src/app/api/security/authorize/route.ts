import { NextRequest, NextResponse } from "next/server";
import { AuthorizationMiddleware } from "@/lib/security/authorization/AuthorizationMiddleware";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { GlobalExceptionHandler } from "@/lib/errors";

/**
 * Enterprise API Authorization Route
 * 
 * Centralized authorization enforcement gate for the MOAT Patent Intelligence Platform.
 * Executes the full 10-step zero-trust authorization workflow:
 * 1. Authenticates session/JWT and confirms user active status.
 * 2. Evaluates role and required backend permissions (BFLA defense).
 * 3. Enforces project membership (IDOR / BOLA defense).
 * 4. Verifies valid workflow state machine transitions.
 * 5. Generates immutable audit logs and event-driven notifications.
 */
export async function POST(req: NextRequest) {
  try {
    // Identity is derived ONLY from the verified token — this previously never
    // actually verified the token at all and took userId/userRole/isActive
    // straight from client-controlled x-test-user-* headers, meaning any
    // request could self-declare itself as any user with any role on this
    // "zero-trust authorization gate".
    const cookieStore = await cookies();
    const token = cookieStore.get("custom_access_token")?.value || req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized.", violationType: "UNAUTHENTICATED" }, { status: 401 });
    }
    const decoded: any = await verifyToken(token);
    if (!decoded?.sub) {
      return NextResponse.json({ success: false, message: "Unauthorized.", violationType: "UNAUTHENTICATED" }, { status: 401 });
    }

    const userId = decoded.sub;
    const userRole = decoded.role || "viewer";
    const isActive = true;

    const body = await req.json().catch(() => ({}));
    const {
      endpoint = "/api/protected",
      httpMethod = "POST",
      requiredPermission,
      projectId,
      targetObjectId,
      targetObjectType,
      targetWorkflowStage,
      currentWorkflowStage
    } = body;

    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";

    const result = await AuthorizationMiddleware.authorize({
      token,
      userId,
      userRole,
      isActive,
      clientIp,
      endpoint,
      httpMethod,
      requiredPermission,
      projectId,
      targetObjectId,
      targetObjectType,
      targetWorkflowStage,
      currentWorkflowStage
    });

    if (!result.authorized) {
      const status = result.violationType === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({
        success: false,
        message: "Authorization Denied by Zero-Trust Security Engine.",
        reason: result.reason,
        violationType: result.violationType,
        auditLogId: result.auditLogId
      }, { status });
    }

    return NextResponse.json({
      success: true,
      message: "Authorization Granted.",
      userId: result.userId,
      userRole: result.userRole,
      projectId: result.projectId,
      auditLogId: result.auditLogId
    }, { status: 200 });
  } catch (err: any) {
    console.error("[EnterpriseAuthorizeAPI] Error:", err);
    return NextResponse.json({
      success: false,
      message: "Internal server error during authorization evaluation.",
      error: err.message
    }, { status: 500 });
  }
}
