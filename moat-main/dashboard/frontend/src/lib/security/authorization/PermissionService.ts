import { EnterpriseRole, PermissionAction } from "./types";

/**
 * PermissionService
 * 
 * Enterprise Role-Based Access Control (RBAC) engine for the MOAT Patent Intelligence Platform.
 * Strictly enforces backend permission matrices:
 * 1. CEO: View all patents and trademarks, approve or reject submissions, view portfolio analytics, executive dashboards.
 * 2. Patent Analyst: Create and edit assigned projects, upload reports, submit for CEO review. CANNOT approve final filings.
 * 3. Design Team: Download assigned documents, upload revised designs, view only assigned work.
 * 4. Admin: Full system administration, user/role management, security settings, email notification rules, audit logs.
 */
export class PermissionService {
  private static readonly ROLE_PERMISSIONS: Record<string, Set<PermissionAction>> = {
    "CEO": new Set([
      "patents:read", "patents:write", "patents:approve", "patents:submit_review",
      "trademarks:read", "trademarks:write", "trademarks:approve",
      "portfolio:read", "portfolio:analytics", "executive:dashboard",
      "projects:read", "projects:create", "projects:edit",
      "documents:read", "documents:download", "documents:upload", "documents:edit", "documents:restore_version",
      "workflows:read", "workflows:transition", "workflows:override"
    ]),
    "Patent Analyst": new Set([
      "patents:read", "patents:write", "patents:submit_review",
      "trademarks:read", "trademarks:write",
      "portfolio:read",
      "projects:read", "projects:create", "projects:edit",
      "documents:read", "documents:download", "documents:upload", "documents:edit", "documents:restore_version",
      "workflows:read", "workflows:transition"
      // Note: patents:approve is intentionally EXCLUDED for Patent Analyst
    ]),
    "Design Team": new Set([
      "patents:read", "trademarks:read",
      "projects:read",
      "documents:read", "documents:download", "documents:upload", "documents:edit",
      "workflows:read", "workflows:transition"
      // Cannot approve or submit patent claims for final filing
    ]),
    "Patent Drafter": new Set([
      "patents:read", "patents:write",
      "projects:read", "projects:create", "projects:edit",
      "documents:read", "documents:download", "documents:upload", "documents:edit", "documents:restore_version",
      "workflows:read", "workflows:transition"
    ]),
    "Admin": new Set([
      "admin:full", "users:manage", "roles:manage", "security:manage", "settings:manage", "email_rules:manage", "audit_logs:read",
      "patents:read", "patents:write", "patents:delete", "patents:approve", "patents:submit_review",
      "trademarks:read", "trademarks:write", "trademarks:delete", "trademarks:approve",
      "portfolio:read", "portfolio:analytics", "executive:dashboard",
      "projects:read", "projects:create", "projects:edit", "projects:delete", "projects:assign_members",
      "documents:read", "documents:download", "documents:upload", "documents:edit", "documents:delete", "documents:restore_version",
      "workflows:read", "workflows:transition", "workflows:override"
    ]),
    "super_admin": new Set([
      "admin:full", "users:manage", "roles:manage", "security:manage", "settings:manage", "email_rules:manage", "audit_logs:read",
      "patents:read", "patents:write", "patents:delete", "patents:approve", "patents:submit_review",
      "trademarks:read", "trademarks:write", "trademarks:delete", "trademarks:approve",
      "portfolio:read", "portfolio:analytics", "executive:dashboard",
      "projects:read", "projects:create", "projects:edit", "projects:delete", "projects:assign_members",
      "documents:read", "documents:download", "documents:upload", "documents:edit", "documents:delete", "documents:restore_version",
      "workflows:read", "workflows:transition", "workflows:override"
    ]),
    "viewer": new Set([
      "patents:read", "trademarks:read", "portfolio:read", "projects:read", "documents:read", "workflows:read"
    ])
  };

  /**
   * Normalize role names (handles lowercase, underscores, and aliases).
   */
  static normalizeRole(role: EnterpriseRole): string {
    if (!role) return "viewer";
    const clean = role.trim().toLowerCase();
    if (clean === "ceo" || clean === "executive" || clean === "chief executive officer") return "CEO";
    if (clean === "patent analyst" || clean === "patent_analyst" || clean === "analyst") return "Patent Analyst";
    if (clean === "patent drafter" || clean === "patent_drafter" || clean === "drafter") return "Patent Drafter";
    if (clean === "design team" || clean === "design_team" || clean === "designer" || clean === "designing team") return "Design Team";
    if (clean === "admin" || clean === "administrator") return "Admin";
    if (clean === "super_admin" || clean === "superadmin" || clean === "super admin") return "super_admin";
    return "viewer";
  }

  /**
   * Check if a role possesses a required backend permission action.
   */
  static hasPermission(role: EnterpriseRole, permission: PermissionAction): boolean {
    const normalizedRole = this.normalizeRole(role);
    const perms = this.ROLE_PERMISSIONS[normalizedRole] || this.ROLE_PERMISSIONS["viewer"];
    
    // Admin full override
    if (perms.has("admin:full")) return true;

    return perms.has(permission);
  }

  /**
   * Assert permission or throw authorization exception.
   */
  static assertPermission(role: EnterpriseRole, permission: PermissionAction): { allowed: boolean; reason?: string } {
    const allowed = this.hasPermission(role, permission);
    if (!allowed) {
      return {
        allowed: false,
        reason: `Broken Function Level Authorization (BFLA) blocked: Role '${role}' lacks required permission '${permission}'.`
      };
    }
    return { allowed: true };
  }

  /**
   * Retrieve all permissions for a specific role.
   */
  static getRolePermissions(role: EnterpriseRole): PermissionAction[] {
    const normalizedRole = this.normalizeRole(role);
    const perms = this.ROLE_PERMISSIONS[normalizedRole] || this.ROLE_PERMISSIONS["viewer"];
    return Array.from(perms);
  }
}
