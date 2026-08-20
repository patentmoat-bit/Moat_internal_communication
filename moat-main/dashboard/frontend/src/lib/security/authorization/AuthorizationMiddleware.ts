import { AuthorizationContext, AuthorizationResult } from "./types";
import { AuthenticationMiddleware } from "./AuthenticationMiddleware";
import { PermissionService } from "./PermissionService";
import { ProjectAccessService } from "./ProjectAccessService";
import { WorkflowValidationService } from "./WorkflowValidationService";
import { DocumentAccessService } from "./DocumentAccessService";
import { AuthorizationAuditLogService } from "./AuthorizationAuditLogService";
import { AuthorizationNotificationService } from "./AuthorizationNotificationService";

/**
 * AuthorizationMiddleware
 * 
 * Master coordinator enforcing the 10-step zero-trust authorization pipeline across every API,
 * workflow, dashboard, document, project, patent, trademark, and administrative function:
 * 
 * Step 1: Authentication (JWT + MFA)
 * Step 2: Session Validation (Active User check)
 * Step 3: Role Validation (CEO, Patent Analyst, Design Team, Admin)
 * Step 4: Permission Validation (RBAC Function-Level check — OWASP BFLA defense)
 * Step 5: Project Membership Validation (IDOR / BOLA defense — OWASP Top 10 A01)
 * Step 6: Workflow State Validation (Strict 13-stage state machine)
 * Step 7: Business Rule Validation (Document ownership & mutation boundaries)
 * Step 8: Authorize Execution
 * Step 9: Immutable Audit Log generation
 * Step 10: Event-Driven Dashboard & Microsoft Graph Notification dispatch
 */
export class AuthorizationMiddleware {
  /**
   * Execute the full authorization pipeline for an API request or business logic operation.
   */
  static async authorize(context: AuthorizationContext): Promise<AuthorizationResult> {
    const clientIp = context.clientIp || "127.0.0.1";
    const endpoint = context.endpoint || "/api/protected";
    const httpMethod = context.httpMethod || "POST";

    // Step 1 & 2: Authentication & Session Validation
    const authRes = await AuthenticationMiddleware.authenticate(context.token, {
      userId: context.userId,
      userRole: context.userRole,
      isActive: context.isActive
    });

    if (!authRes.authenticated) {
      const auditLog = await AuthorizationAuditLogService.logEvent(
        "ACCESS_DENIED",
        authRes.userId,
        authRes.userRole,
        clientIp,
        authRes.reason || "Unauthenticated request blocked.",
        { endpoint, httpMethod, severity: "WARNING" }
      );
      return {
        authorized: false,
        userId: authRes.userId,
        userRole: authRes.userRole,
        reason: authRes.reason,
        violationType: authRes.reason?.includes("Inactive") ? "INACTIVE_USER" : "UNAUTHENTICATED",
        auditLogId: auditLog.id
      };
    }

    const userId = authRes.userId;
    const userRole = authRes.userRole;
    const organizationId = authRes.organizationId;

    // Step 3 & 4: Role & Permission Validation
    if (context.requiredPermission) {
      const permCheck = PermissionService.assertPermission(userRole, context.requiredPermission);
      if (!permCheck.allowed) {
        const auditLog = await AuthorizationAuditLogService.logEvent(
          "ACCESS_DENIED",
          userId,
          userRole,
          clientIp,
          permCheck.reason || `Lacks required permission: ${context.requiredPermission}`,
          { projectId: context.projectId, targetObjectId: context.targetObjectId, endpoint, httpMethod, severity: "WARNING" }
        );
        return {
          authorized: false,
          userId,
          userRole,
          projectId: context.projectId,
          reason: permCheck.reason,
          violationType: "BFLA_PRIVILEGE",
          auditLogId: auditLog.id
        };
      }
    }

    // Step 5: Project Membership Validation (IDOR / BOLA Defense)
    if (context.projectId) {
      const prjCheck = await ProjectAccessService.checkProjectAccess(context.projectId, userId, userRole, organizationId);
      if (!prjCheck.allowed) {
        const auditLog = await AuthorizationAuditLogService.logEvent(
          context.requiredPermission === "documents:download" ? "FILE_DOWNLOAD_DENIED" : "IDOR_ATTEMPT_BLOCKED",
          userId,
          userRole,
          clientIp,
          prjCheck.reason || `Unauthorized access attempt to project '${context.projectId}'`,
          { projectId: context.projectId, targetObjectId: context.targetObjectId, endpoint, httpMethod, severity: "CRITICAL" }
        );
        return {
          authorized: false,
          userId,
          userRole,
          projectId: context.projectId,
          reason: prjCheck.reason,
          violationType: "IDOR_BOLA",
          auditLogId: auditLog.id
        };
      }
    }

    // Step 6: Workflow State Validation
    if (context.targetWorkflowStage && context.targetObjectId) {
      const wfCheck = WorkflowValidationService.validateTransition(
        context.targetObjectId,
        context.targetWorkflowStage,
        userRole,
        context.currentWorkflowStage
      );

      if (!wfCheck.allowed) {
        const auditLog = await AuthorizationAuditLogService.logEvent(
          "WORKFLOW_TAMPERING_BLOCKED",
          userId,
          userRole,
          clientIp,
          wfCheck.reason || `Illegal workflow transition from '${wfCheck.currentStage}' to '${wfCheck.targetStage}' blocked.`,
          { projectId: context.projectId, targetObjectId: context.targetObjectId, endpoint, httpMethod, severity: "CRITICAL" }
        );
        return {
          authorized: false,
          userId,
          userRole,
          projectId: context.projectId,
          reason: wfCheck.reason,
          violationType: "WORKFLOW_TAMPERING",
          auditLogId: auditLog.id
        };
      }
    }

    // Step 7: Business Rule Validation (Document Ownership / Actions)
    if (context.targetObjectType === "document" && context.targetObjectId && context.requiredPermission) {
      let docAction: "upload" | "download" | "view" | "edit" | "delete" | "restore_version" = "view";
      if (context.requiredPermission === "documents:upload") docAction = "upload";
      if (context.requiredPermission === "documents:download") docAction = "download";
      if (context.requiredPermission === "documents:edit") docAction = "edit";
      if (context.requiredPermission === "documents:delete") docAction = "delete";
      if (context.requiredPermission === "documents:restore_version") docAction = "restore_version";

      const docCheck = await DocumentAccessService.verifyDocumentAction(
        context.targetObjectId,
        docAction,
        userId,
        userRole,
        context.projectId
      );

      if (!docCheck.allowed) {
        const auditLog = await AuthorizationAuditLogService.logEvent(
          docAction === "download" ? "FILE_DOWNLOAD_DENIED" : "ACCESS_DENIED",
          userId,
          userRole,
          clientIp,
          docCheck.reason || `Unauthorized document action '${docAction}' on '${context.targetObjectId}' blocked.`,
          { projectId: context.projectId, targetObjectId: context.targetObjectId, endpoint, httpMethod, severity: "WARNING" }
        );
        return {
          authorized: false,
          userId,
          userRole,
          projectId: context.projectId,
          reason: docCheck.reason,
          violationType: docCheck.violationType || "BFLA_PRIVILEGE",
          auditLogId: auditLog.id
        };
      }
    }

    // Step 8 & 9: Authorize Execution & Log Success
    let actionType: any = "ACCESS_GRANTED";
    if (context.requiredPermission?.includes("approve")) actionType = "APPROVAL_GRANTED";
    if (context.targetWorkflowStage) actionType = "WORKFLOW_TRANSITION";
    if (context.requiredPermission === "documents:download") actionType = "FILE_DOWNLOAD";

    const successLog = await AuthorizationAuditLogService.logEvent(
      actionType,
      userId,
      userRole,
      clientIp,
      `Successfully authorized request to '${endpoint}' (${httpMethod}). Required perm: '${context.requiredPermission || "none"}'.`,
      { projectId: context.projectId, targetObjectId: context.targetObjectId, endpoint, httpMethod, severity: "INFO" }
    );

    // Step 10: Trigger Notifications if workflow state changed
    if (context.targetWorkflowStage && context.targetObjectId) {
      const currentStage = context.currentWorkflowStage || WorkflowValidationService.getCurrentStage(context.targetObjectId);
      WorkflowValidationService.executeTransition(context.targetObjectId, context.targetWorkflowStage, userRole, currentStage);
      
      await AuthorizationNotificationService.triggerWorkflowNotification(
        context.targetObjectId,
        currentStage,
        context.targetWorkflowStage,
        userId,
        userRole,
        context.projectId
      );
    }

    return {
      authorized: true,
      userId,
      userRole,
      projectId: context.projectId,
      auditLogId: successLog.id
    };
  }
}
