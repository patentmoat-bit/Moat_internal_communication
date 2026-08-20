import crypto from "crypto";
import { AuthorizationAuditRecord, AuthorizationAuditEventType, EnterpriseRole } from "./types";
import { SecurityLoggingService } from "../SecurityLoggingService";

/**
 * AuthorizationAuditLogService
 * 
 * Enterprise immutable audit logging engine for API authorization and business logic security.
 * 1. Captures all authorization-sensitive events: access granted/denied, approvals/rejections, workflow transitions, and file downloads.
 * 2. Stores complete forensic metadata: User ID, Role, Project ID, Target Object ID, Action, Timestamp, Endpoint, and IP Address.
 * 3. Immediately dispatches critical security violations (IDOR attempts, privilege escalation, workflow tampering) to server security logs.
 */
export class AuthorizationAuditLogService {
  private static auditLogs: AuthorizationAuditRecord[] = [];
  private static securityLogger = new SecurityLoggingService();

  /**
   * Log an authorization event.
   */
  static async logEvent(
    action: AuthorizationAuditEventType,
    userId: string,
    userRole: EnterpriseRole,
    ipAddress: string,
    details: string,
    options: {
      projectId?: string;
      targetObjectId?: string;
      endpoint?: string;
      httpMethod?: string;
      severity?: AuthorizationAuditRecord["severity"];
    } = {}
  ): Promise<AuthorizationAuditRecord> {
    const timestamp = new Date().toISOString();
    const logId = `aud_auth_${crypto.randomUUID()}`;

    let severity: AuthorizationAuditRecord["severity"] = options.severity || "INFO";
    if (action === "ACCESS_DENIED" || action === "APPROVAL_DENIED" || action === "FILE_DOWNLOAD_DENIED") {
      severity = "WARNING";
    } else if (action === "IDOR_ATTEMPT_BLOCKED" || action === "PRIVILEGE_ESCALATION_BLOCKED" || action === "WORKFLOW_TAMPERING_BLOCKED") {
      severity = "CRITICAL";
    }

    const record: AuthorizationAuditRecord = Object.freeze({
      id: logId,
      timestamp,
      userId: userId || "anonymous",
      userRole: userRole || "viewer",
      projectId: options.projectId,
      targetObjectId: options.targetObjectId,
      action,
      endpoint: options.endpoint,
      httpMethod: options.httpMethod,
      ipAddress: ipAddress || "127.0.0.1",
      details,
      severity
    });

    this.auditLogs.unshift(record);
    if (this.auditLogs.length > 3000) {
      this.auditLogs.pop();
    }

    // Forward critical violations to server SecurityLoggingService
    if (severity === "CRITICAL" || severity === "WARNING") {
      try {
        await this.securityLogger.logException({
          errorId: logId,
          endpoint: options.endpoint || "/api/security/authorize",
          httpMethod: options.httpMethod || "POST",
          ipAddress: ipAddress || "127.0.0.1",
          userAgent: `MOAT AuthEngine v4.2 (${userRole})`,
          internalCategory: `AUTH_VIOLATION_${action}`,
          fullException: `[${severity}] Authorization security violation: ${details} | User: '${userId}' | Role: '${userRole}' | Project: '${options.projectId || "none"}'`,
          severity: severity === "CRITICAL" ? "CRITICAL" : "WARNING"
        });
      } catch (err) {
        // Ignore fallback logging errors
      }
    }

    return record;
  }

  /**
   * Retrieve authorization audit logs filtered by user, project, or action.
   */
  static getAuditLogs(filter?: { userId?: string; projectId?: string; action?: AuthorizationAuditEventType; severity?: string }): AuthorizationAuditRecord[] {
    if (!filter) return [...this.auditLogs];

    return this.auditLogs.filter((log) => {
      if (filter.userId && log.userId !== filter.userId) return false;
      if (filter.projectId && log.projectId !== filter.projectId) return false;
      if (filter.action && log.action !== filter.action) return false;
      if (filter.severity && log.severity !== filter.severity) return false;
      return true;
    });
  }

  /**
   * Clear repository (for testing).
   */
  static clearLogs(): void {
    this.auditLogs = [];
  }
}
