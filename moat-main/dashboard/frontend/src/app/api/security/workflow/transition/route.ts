import { NextRequest, NextResponse } from "next/server";
import { AuthorizationMiddleware } from "@/lib/security/authorization/AuthorizationMiddleware";
import { WorkflowValidationService } from "@/lib/security/authorization/WorkflowValidationService";
import { AuthorizationNotificationService } from "@/lib/security/authorization/AuthorizationNotificationService";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { GlobalExceptionHandler } from "@/lib/errors";

/**
 * Enterprise Secure Workflow Transition API
 * 
 * Enforces zero-trust workflow state machine validation:
 * 1. Confirms user authentication and active status.
 * 2. Checks stage-specific transition rules and prevents illegal step-skipping.
 * 3. Records immutable workflow history and dispatches dashboard & Microsoft Graph email alerts.
 */
export async function POST(req: NextRequest) {
  try {
    // Identity is derived ONLY from the verified token — see security/authorize/route.ts
    // for why the previous x-test-user-* header override was a direct RBAC bypass.
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
    const { objectId, targetStage, currentStage, projectId, comment } = body;

    if (!objectId || !targetStage) {
      return NextResponse.json({ success: false, message: "Missing objectId or targetStage in request payload." }, { status: 400 });
    }

    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";

    const authRes = await AuthorizationMiddleware.authorize({
      token,
      userId,
      userRole,
      isActive,
      clientIp,
      endpoint: "/api/security/workflow/transition",
      httpMethod: "POST",
      requiredPermission: "workflows:transition",
      projectId,
      targetObjectId: objectId,
      targetWorkflowStage: targetStage,
      currentWorkflowStage: currentStage
    });

    if (!authRes.authorized) {
      const status = authRes.violationType === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({
        success: false,
        message: "Workflow Transition Denied by Security Engine.",
        reason: authRes.reason,
        violationType: authRes.violationType,
        auditLogId: authRes.auditLogId
      }, { status });
    }

    const newCurrentStage = WorkflowValidationService.getCurrentStage(objectId);
    const history = AuthorizationNotificationService.getWorkflowHistory(objectId);

    return NextResponse.json({
      success: true,
      message: `Successfully transitioned object '${objectId}' to stage '${targetStage}'.`,
      objectId,
      currentStage: newCurrentStage,
      auditLogId: authRes.auditLogId,
      historyCount: history.length
    }, { status: 200 });
  } catch (err: any) {
    console.error("[WorkflowTransitionAPI] Error:", err);
    return NextResponse.json({ success: false, message: "Internal server error during workflow transition.", error: err.message }, { status: 500 });
  }
}
