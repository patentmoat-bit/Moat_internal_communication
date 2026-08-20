import crypto from "crypto";
import { DocumentPermissionRecord, DocumentPermissionRole, DocumentRecord } from "./types";
import { FileVersionService } from "./FileVersionService";

/**
 * FilePermissionService
 * 
 * Enterprise access authorization engine for the MOAT Patent Intelligence Platform.
 * Enforces zero-trust Broken Access Control defenses (OWASP Top 10 A01):
 * 1. CEO → All project documents across the enterprise.
 * 2. Patent Analyst → Full read/write access to assigned project documents.
 * 3. Design Team → Access to assigned design files (images, CAD, drawings, specifications) or assigned projects.
 * 4. Admin → Full administrative override and management access.
 */
export class FilePermissionService {
  // In-memory permission repository for fast evaluation and testing
  private static permissionsMap: Map<string, DocumentPermissionRecord[]> = new Map(); // Keyed by documentId
  private static userAssignedProjects: Map<string, Set<string>> = new Map(); // userId -> Set of projectIds

  /**
   * Assign a user to a project (membership mapping).
   */
  static assignUserToProject(userId: string, projectId: string): void {
    const projects = this.userAssignedProjects.get(userId) || new Set<string>();
    projects.add(projectId);
    this.userAssignedProjects.set(userId, projects);
  }

  /**
   * Check if user is assigned to a project.
   */
  static isUserInProject(userId: string, projectId: string): boolean {
    const projects = this.userAssignedProjects.get(userId);
    return projects ? projects.has(projectId) : false;
  }

  /**
   * Create default permissions for a newly uploaded document.
   */
  static createDefaultPermissions(documentId: string, projectId: string, uploaderId: string, uploaderRole: DocumentPermissionRole): DocumentPermissionRecord[] {
    const records: DocumentPermissionRecord[] = [
      // Uploader explicit permission
      {
        id: `perm_${crypto.randomUUID()}`,
        documentId,
        projectId,
        userId: uploaderId,
        role: uploaderRole,
        canRead: true,
        canWrite: true,
        canDelete: uploaderRole === "Admin" || uploaderRole === "CEO"
      },
      // CEO global project access
      {
        id: `perm_${crypto.randomUUID()}`,
        documentId,
        projectId,
        role: "CEO",
        canRead: true,
        canWrite: true,
        canDelete: true
      },
      // Admin global override
      {
        id: `perm_${crypto.randomUUID()}`,
        documentId,
        projectId,
        role: "Admin",
        canRead: true,
        canWrite: true,
        canDelete: true
      },
      // Patent Analyst project access
      {
        id: `perm_${crypto.randomUUID()}`,
        documentId,
        projectId,
        role: "Patent Analyst",
        canRead: true,
        canWrite: true,
        canDelete: false
      },
      // Design Team project access
      {
        id: `perm_${crypto.randomUUID()}`,
        documentId,
        projectId,
        role: "Design Team",
        canRead: true,
        canWrite: true,
        canDelete: false
      }
    ];

    this.permissionsMap.set(documentId, records);
    return records;
  }

  /**
   * Evaluate if a user has permission to read/download a document.
   */
  static canDownload(
    documentId: string,
    userId: string,
    userRole: DocumentPermissionRole,
    userAssignedProjects?: string[]
  ): { allowed: boolean; reason?: string } {
    const doc = FileVersionService.getDocument(documentId);
    if (!doc || doc.status === "DELETED") {
      return { allowed: false, reason: `Document ID '${documentId}' does not exist or has been deleted.` };
    }

    if (doc.status === "QUARANTINED") {
      return { allowed: false, reason: `Access Denied: Document ID '${documentId}' is quarantined due to malware or security violation.` };
    }

    // 1. Admin and CEO have global enterprise access to all project documents
    if (userRole === "Admin" || userRole === "CEO" || userRole === "super_admin" || userRole === "admin" || userRole === "ceo") {
      return { allowed: true };
    }

    // 2. Check uploader ownership
    if (doc.uploadedBy === userId) {
      return { allowed: true };
    }

    // 3. Register any dynamic projects passed in
    if (userAssignedProjects) {
      for (const prj of userAssignedProjects) {
        this.assignUserToProject(userId, prj);
      }
    }

    // 4. Check project assignment for Patent Analyst and Design Team
    const inProject = this.isUserInProject(userId, doc.projectId);
    if (!inProject && !userAssignedProjects?.includes(doc.projectId)) {
      // For general users, if they are not assigned to the project, deny access
      return {
        allowed: false,
        reason: `Access Denied: User role '${userRole}' is not assigned to project ID '${doc.projectId}'. Broken access control defense enforced.`
      };
    }

    // 5. Check specific role permissions
    if (userRole === "Patent Analyst" || userRole === "patent_analyst" || userRole === "analyst") {
      return { allowed: true };
    }

    if (userRole === "Design Team" || userRole === "design_team" || userRole === "designer") {
      // Design team can access design files (images, svg, cad) and assigned project documents
      return { allowed: true };
    }

    // Check specific permission records
    const perms = this.permissionsMap.get(documentId) || [];
    const userPerm = perms.find((p) => p.userId === userId || p.role === userRole);
    if (userPerm && userPerm.canRead) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `Access Denied: No valid read permission found for user '${userId}' with role '${userRole}' on document '${documentId}'.`
    };
  }

  /**
   * Evaluate if a user has permission to delete a document.
   */
  static canDelete(documentId: string, userId: string, userRole: DocumentPermissionRole): { allowed: boolean; reason?: string } {
    if (userRole === "Admin" || userRole === "super_admin" || userRole === "admin") {
      return { allowed: true };
    }

    const doc = FileVersionService.getDocument(documentId);
    if (!doc) {
      return { allowed: false, reason: `Document ID '${documentId}' not found.` };
    }

    if (userRole === "CEO" || userRole === "ceo") {
      return { allowed: true };
    }

    if (doc.uploadedBy === userId && (userRole === "Patent Analyst" || userRole === "patent_analyst")) {
      return { allowed: true };
    }

    return { allowed: false, reason: `Access Denied: Role '${userRole}' is not authorized to delete documents.` };
  }

  /**
   * Clear permissions repository (for testing).
   */
  static clearPermissions(): void {
    this.permissionsMap.clear();
    this.userAssignedProjects.clear();
  }
}
