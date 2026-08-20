import crypto from "crypto";
import { EnterpriseRole, ProjectRecord } from "./types";
import { PermissionService } from "./PermissionService";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * ProjectAccessService
 * 
 * Enterprise project-level access control engine for the MOAT Patent Intelligence Platform.
 * Enforces zero-trust IDOR / BOLA (Broken Object Level Authorization) defense (OWASP Top 10 A01):
 * 1. Verifies that the requested project exists in the system repository.
 * 2. Verifies that the requesting user is explicitly assigned to the project or possesses global executive access (CEO / Admin).
 * 3. Prevents unauthorized project enumeration and direct database object access across organization boundaries.
 */
export class ProjectAccessService {
  private static projectsMap: Map<string, ProjectRecord> = new Map();

  /**
   * Register or create a project in the repository.
   */
  static registerProject(id: string, name: string, ownerId: string, initialMembers: string[] = []): ProjectRecord {
    const record: ProjectRecord = {
      id,
      name,
      description: `Project ${name} workspace`,
      ownerId,
      status: "ACTIVE",
      members: Array.from(new Set([ownerId, ...initialMembers])),
      createdAt: new Date().toISOString()
    };
    this.projectsMap.set(id, record);
    return record;
  }

  /**
   * Assign a user member to a project.
   */
  static assignMember(projectId: string, userId: string): boolean {
    const prj = this.projectsMap.get(projectId);
    if (!prj) return false;
    if (!prj.members.includes(userId)) {
      prj.members.push(userId);
      this.projectsMap.set(projectId, prj);
    }
    return true;
  }

  /**
   * Remove a user member from a project.
   */
  static removeMember(projectId: string, userId: string): boolean {
    const prj = this.projectsMap.get(projectId);
    if (!prj) return false;
    prj.members = prj.members.filter((m) => m !== userId);
    this.projectsMap.set(projectId, prj);
    return true;
  }

  /**
   * Check project access authorization (IDOR / BOLA defense).
   */
  static async checkProjectAccess(
    projectId: string,
    userId: string,
    userRole: EnterpriseRole,
    userOrganizationId?: string
  ): Promise<{ allowed: boolean; project?: ProjectRecord; reason?: string; violationType?: "IDOR_BOLA" | "BFLA_PRIVILEGE" }> {
    if (!projectId) {
      return { allowed: false, reason: "Project ID is required for access evaluation.", violationType: "IDOR_BOLA" };
    }

    // 1. Confirm the project exists
    const prj = this.projectsMap.get(projectId);
    if (!prj) {
      return {
        allowed: false,
        reason: `Broken Object Level Authorization (IDOR) blocked: Project ID '${projectId}' does not exist or has been deleted. Project enumeration prevented.`,
        violationType: "IDOR_BOLA"
      };
    }

    // New: Enterprise Organization/Tenant Validation (BOLA)
    if (userOrganizationId && prj.organizationId && userOrganizationId !== prj.organizationId) {
        // Log BOLA attempt? Caller should handle it.
        return {
           allowed: false,
           reason: `Cross-Tenant BOLA Defense Enforced: User from organization '${userOrganizationId}' attempted to access project '${projectId}' belonging to organization '${prj.organizationId}'. Unauthorized direct object access blocked.`,
           violationType: "IDOR_BOLA"
        };
    }

    if (prj.status === "DELETED" || prj.status === "ARCHIVED") {
      return {
        allowed: false,
        reason: `Access Denied: Project '${projectId}' is inactive or archived.`,
        violationType: "IDOR_BOLA"
      };
    }

    // 2. Confirm global executive access (CEO and Admin have enterprise-wide project visibility)
    const normalizedRole = PermissionService.normalizeRole(userRole);
    if (normalizedRole === "CEO" || normalizedRole === "Admin" || normalizedRole === "super_admin") {
      return { allowed: true, project: prj };
    }

    // 3. Check ownership or explicit membership
    if (prj.ownerId === userId || prj.members.includes(userId)) {
      return { allowed: true, project: prj };
    }

    // 4. Deny access if not authorized (IDOR / BOLA blocked)
    return {
      allowed: false,
      reason: `IDOR / BOLA Defense Enforced: User '${userId}' (Role: '${userRole}') is not assigned to project '${projectId}' ('${prj.name}'). Unauthorized direct object access blocked.`,
      violationType: "IDOR_BOLA"
    };
  }

  /**
   * Retrieve all projects authorized for a user.
   */
  static getAuthorizedProjects(userId: string, userRole: EnterpriseRole): ProjectRecord[] {
    const normalizedRole = PermissionService.normalizeRole(userRole);
    if (normalizedRole === "CEO" || normalizedRole === "Admin" || normalizedRole === "super_admin") {
      return Array.from(this.projectsMap.values()).filter((p) => p.status === "ACTIVE");
    }

    const results: ProjectRecord[] = [];
    for (const prj of this.projectsMap.values()) {
      if (prj.status === "ACTIVE" && (prj.ownerId === userId || prj.members.includes(userId))) {
        results.push(prj);
      }
    }
    return results;
  }

  /**
   * Get project by ID.
   */
  static getProject(projectId: string): ProjectRecord | undefined {
    return this.projectsMap.get(projectId);
  }

  /**
   * Clear repository (for testing).
   */
  static clearRepository(): void {
    this.projectsMap.clear();
  }
}
