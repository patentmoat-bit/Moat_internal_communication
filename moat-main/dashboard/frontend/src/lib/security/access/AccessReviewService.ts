import { SupabaseClient } from "@supabase/supabase-js";
import { PermissionService } from "../authorization/PermissionService";
import { PermissionAction, EnterpriseRole } from "../authorization/types";

export interface UserAccessDetail {
  id: string;
  name: string;
  email: string;
  role: EnterpriseRole;
  department: string;
  status: string;
  mfaEnabled: boolean;
  created_at: string;
  last_login: string;
  permissions: {
    action: PermissionAction;
    source: "Role-based" | "Direct-Grant" | "Direct-Revoke";
  }[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskReasons: string[];
}

export class AccessReviewService {
  constructor(private supabase: SupabaseClient) {}

  async getAllUsersAccess(): Promise<UserAccessDetail[]> {
    // 1. Fetch users
    const { data: users, error: usersErr } = await this.supabase
      .from("users")
      .select("id, name, email, roles(role_name), department, status, created_at, last_login");
    if (usersErr || !users) throw new Error("Failed to fetch users: " + usersErr?.message);

    // 2. Fetch MFA settings
    const { data: mfaData } = await this.supabase.from("mfa_settings").select("user_id, is_enabled");
    const mfaMap = new Map((mfaData || []).map((m) => [m.user_id, m.is_enabled]));

    // 3. Fetch explicit user permissions
    // We catch errors just in case the table doesn't exist yet
    let permOverrides: any[] = [];
    try {
      const { data: perms } = await this.supabase.from("user_permissions").select("*");
      if (perms) permOverrides = perms;
    } catch (e) {
      console.warn("user_permissions table might not exist yet");
    }

    const overridesMap = new Map<string, any[]>();
    for (const po of permOverrides) {
      if (!overridesMap.has(po.user_id)) overridesMap.set(po.user_id, []);
      overridesMap.get(po.user_id)!.push(po);
    }

    const allPermissionsList = [
      "patents:read", "patents:write", "patents:approve", "patents:submit_review", "patents:delete",
      "trademarks:read", "trademarks:write", "trademarks:approve", "trademarks:delete",
      "portfolio:read", "portfolio:analytics", "executive:dashboard",
      "projects:read", "projects:create", "projects:edit", "projects:delete", "projects:assign_members",
      "documents:read", "documents:download", "documents:upload", "documents:edit", "documents:delete", "documents:restore_version",
      "workflows:read", "workflows:transition", "workflows:override",
      "admin:full", "users:manage", "roles:manage", "security:manage", "settings:manage", "email_rules:manage", "audit_logs:read"
    ] as PermissionAction[];

    return users.map((u: any) => {
      const role = (Array.isArray(u.roles) ? u.roles[0]?.role_name : u.roles?.role_name) as EnterpriseRole || "admin";
      const rolePerms = new Set(PermissionService.getRolePermissions(role));
      const userOverrides = overridesMap.get(u.id) || [];
      
      const computedPerms: { action: PermissionAction; source: "Role-based" | "Direct-Grant" | "Direct-Revoke" }[] = [];
      
      // Calculate effective permissions
      for (const p of allPermissionsList) {
        const override = userOverrides.find((o) => o.permission === p);
        if (override) {
          if (override.action === "GRANT") computedPerms.push({ action: p, source: "Direct-Grant" });
          else computedPerms.push({ action: p, source: "Direct-Revoke" });
        } else if (rolePerms.has(p) || rolePerms.has("admin:full")) {
          computedPerms.push({ action: p, source: "Role-based" });
        }
      }

      const { riskLevel, riskReasons } = this.analyzeRisk(u, role, computedPerms, mfaMap.get(u.id) || false);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role,
        department: u.department || "General",
        status: u.status || "Active",
        mfaEnabled: mfaMap.get(u.id) || false,
        created_at: u.created_at,
        last_login: u.last_login,
        permissions: computedPerms,
        riskLevel,
        riskReasons,
      };
    });
  }

  private analyzeRisk(user: any, role: string, perms: { action: PermissionAction; source: string }[], mfaEnabled: boolean): { riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; riskReasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    const isPrivileged = role === "Admin" || role === "super_admin" || perms.some(p => p.action.startsWith("admin:") || p.action.startsWith("users:") || p.action.startsWith("roles:"));
    
    if (isPrivileged && !mfaEnabled) {
      score += 4;
      reasons.push("Privileged role without MFA enabled.");
    }
    
    if (user.status !== "Active" && isPrivileged) {
      score += 3;
      reasons.push("Inactive user still holds privileged administrative access.");
    }

    const grantedOverrides = perms.filter(p => p.source === "Direct-Grant");
    if (grantedOverrides.length > 0) {
      score += 1;
      grantedOverrides.forEach(p => reasons.push(`User has direct permission (${p.action}) outside of standard role base.`));
      if (grantedOverrides.some(p => p.action.includes("admin:") || p.action.includes("users:"))) {
         score += 2;
         reasons.push("User has direct administrative permissions bypassing normal role.");
      }
    }
    
    let level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    if (score >= 4) level = "CRITICAL";
    else if (score >= 3) level = "HIGH";
    else if (score >= 1) level = "MEDIUM";

    return { riskLevel: level, riskReasons: reasons };
  }

  async getDashboardStats() {
    const users = await this.getAllUsersAccess();
    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === "Active").length,
      inactiveUsers: users.filter(u => u.status !== "Active").length,
      mfaEnabled: users.filter(u => u.mfaEnabled).length,
      mfaDisabled: users.filter(u => !u.mfaEnabled).length,
      adminUsers: users.filter(u => u.role === "Admin" || u.role === "super_admin").length,
      highRiskUsers: users.filter(u => u.riskLevel === "HIGH" || u.riskLevel === "CRITICAL").length,
      usersWithOverrides: users.filter(u => u.permissions.some(p => p.source.startsWith("Direct-"))).length,
    };
  }

  async changeUserRole(userId: string, newRole: EnterpriseRole, adminId: string, adminEmail: string, reason: string, reqIp: string, reqDevice: string) {
    // Fetch old role
    const { data: oldUser } = await this.supabase.from("users").select("role").eq("id", userId).single();
    const oldRole = oldUser?.role || "Unknown";

    const { error } = await this.supabase.from("users").update({ role: newRole }).eq("id", userId);
    if (error) throw new Error("Failed to update role: " + error.message);
    
    // Attempt to invalidate session here (in a real app, delete from user_sessions or revoke JWT)
    try { await this.supabase.from("user_sessions").delete().eq("user_id", userId); } catch (e) {}

    const { AuditLogService } = require("../auditLogService");
    const audit = new AuditLogService(this.supabase);
    await audit.logEvent({
      eventType: "ROLE_CHANGED",
      userId: adminId,
      email: adminEmail,
      ipAddress: reqIp,
      userAgent: reqDevice,
      status: "SUCCESS",
      metadata: {
        targetUserId: userId,
        oldRole,
        newRole,
        reason
      }
    });
  }

  async modifyUserPermission(userId: string, permission: string, action: "GRANT" | "REVOKE" | "RESET", adminId: string, adminEmail: string, reason: string, reqIp: string, reqDevice: string) {
    if (action === "RESET") {
      await this.supabase.from("user_permissions").delete().eq("user_id", userId).eq("permission", permission);
    } else {
      const { error } = await this.supabase.from("user_permissions").upsert({
        user_id: userId,
        permission,
        action,
        granted_by: adminId,
        reason
      }, { onConflict: "user_id, permission" });
      if (error) throw new Error("Failed to modify permission: " + error.message);
    }

    const { AuditLogService } = require("../auditLogService");
    const audit = new AuditLogService(this.supabase);
    await audit.logEvent({
      eventType: action === "GRANT" ? "PERMISSION_GRANTED" : (action === "REVOKE" ? "PERMISSION_REVOKED" : "PERMISSION_MODIFIED"),
      userId: adminId,
      email: adminEmail,
      ipAddress: reqIp,
      userAgent: reqDevice,
      status: "SUCCESS",
      metadata: {
        targetUserId: userId,
        permission,
        action,
        reason
      }
    });
  }
}
