import { EnterpriseRole, PermissionAction } from "./types";
import { PermissionService } from "./PermissionService";
import { ProjectAccessService } from "./ProjectAccessService";

/**
 * DocumentAccessService
 * 
 * Enterprise document authorization engine for the MOAT Patent Intelligence Platform.
 * Enforces zero-trust document security across 6 core operations: Upload, Download, View, Edit, Delete, and Version Restore.
 * Strictly checks role permissions, uploader ownership, and project membership (IDOR defense).
 */
export class DocumentAccessService {
  private static documentOwnership: Map<string, { ownerId: string; projectId: string }> = new Map();

  /**
   * Register document ownership and project mapping.
   */
  static registerDocumentOwnership(documentId: string, ownerId: string, projectId: string): void {
    this.documentOwnership.set(documentId, { ownerId, projectId });
  }

  /**
   * Verify permission to perform an action on a document.
   */
  static async verifyDocumentAction(
    documentId: string,
    action: "upload" | "download" | "view" | "edit" | "delete" | "restore_version",
    userId: string,
    userRole: EnterpriseRole,
    projectIdOverride?: string
  ): Promise<{ allowed: boolean; reason?: string; violationType?: "IDOR_BOLA" | "BFLA_PRIVILEGE" }> {
    const normalizedRole = PermissionService.normalizeRole(userRole);

    // 1. Map action to required backend permission action
    let requiredPerm: PermissionAction = "documents:read";
    if (action === "upload") requiredPerm = "documents:upload";
    if (action === "download") requiredPerm = "documents:download";
    if (action === "view") requiredPerm = "documents:read";
    if (action === "edit") requiredPerm = "documents:edit";
    if (action === "delete") requiredPerm = "documents:delete";
    if (action === "restore_version") requiredPerm = "documents:restore_version";

    // 2. Check role permission
    if (!PermissionService.hasPermission(userRole, requiredPerm)) {
      return {
        allowed: false,
        reason: `Broken Function Level Authorization (BFLA) blocked: Role '${userRole}' lacks permission '${requiredPerm}' required to perform document '${action}'.`,
        violationType: "BFLA_PRIVILEGE"
      };
    }

    // 3. Resolve document ownership and project mapping
    const docInfo = this.documentOwnership.get(documentId);
    const targetProject = projectIdOverride || (docInfo ? docInfo.projectId : undefined);

    // If CEO or Admin, allow global access
    if (normalizedRole === "CEO" || normalizedRole === "Admin" || normalizedRole === "super_admin") {
      return { allowed: true };
    }

    // Check project membership (IDOR defense)
    if (targetProject) {
      const prjCheck = await ProjectAccessService.checkProjectAccess(targetProject, userId, userRole);
      if (!prjCheck.allowed) {
        return {
          allowed: false,
          reason: `IDOR / BOLA Document Access Denied: Cannot perform '${action}' on document '${documentId}'. ${prjCheck.reason}`,
          violationType: "IDOR_BOLA"
        };
      }
    }

    // If deleting or restoring version, check if user is uploader/owner or Admin/CEO
    if (action === "delete" || action === "restore_version") {
      if (docInfo && docInfo.ownerId !== userId && normalizedRole !== "CEO" && normalizedRole !== "Admin") {
        return {
          allowed: false,
          reason: `Document Authorization Denied: User '${userId}' is not the uploader/owner of document '${documentId}' and cannot perform '${action}'.`,
          violationType: "BFLA_PRIVILEGE"
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Clear repository (for testing).
   */
  static clearRepository(): void {
    this.documentOwnership.clear();
  }
}
