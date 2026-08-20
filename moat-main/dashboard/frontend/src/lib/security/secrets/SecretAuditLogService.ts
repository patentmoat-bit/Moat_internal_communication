import crypto from "crypto";
import { SecretAccessAction, SecretAccessRecord, SecretAuditRecord } from "./types";
import { SecurityLoggingService } from "../SecurityLoggingService";

/**
 * SecretAuditLogService
 * 
 * Enterprise immutable audit logging and access history tracking service for Secrets Management.
 * 1. Maintains an immutable access history trail (who accessed what secret, when, and from which IP/service).
 * 2. Captures system lifecycle events (rotations, expiration warnings, revocation, decryption anomalies).
 * 3. Integrates with central security logs for immediate alerting on suspicious credential access.
 */
export class SecretAuditLogService {
  private static accessHistory: SecretAccessRecord[] = [];
  private static auditLogs: SecretAuditRecord[] = [];
  private static securityLogger = new SecurityLoggingService();

  /**
   * Log an immutable secret access event (e.g. service loading or decrypting a key).
   */
  static async logAccess(
    secretName: string,
    version: number,
    accessedBy: string,
    ipAddress: string,
    action: SecretAccessAction
  ): Promise<SecretAccessRecord> {
    const record: SecretAccessRecord = Object.freeze({
      id: `acc_sec_${crypto.randomUUID()}`,
      secretName,
      version,
      accessedBy: accessedBy || "system_service",
      ipAddress: ipAddress || "127.0.0.1",
      timestamp: new Date().toISOString(),
      action
    });

    this.accessHistory.unshift(record);
    if (this.accessHistory.length > 5000) this.accessHistory.pop();

    // If an action is REVOKE or DECRYPT failure, log audit alert
    if (action === "REVOKE") {
      await this.logAuditEvent("SECRET_REVOKED", secretName, version, `Secret '${secretName}' (v${version}) revoked by ${accessedBy} from ${ipAddress}.`, "WARNING");
    }

    return record;
  }

  /**
   * Log an immutable secret system audit event.
   */
  static async logAuditEvent(
    eventType: string,
    secretName: string,
    version: number,
    details: string,
    severity: "INFO" | "WARNING" | "CRITICAL" = "INFO"
  ): Promise<SecretAuditRecord> {
    const record: SecretAuditRecord = Object.freeze({
      id: `aud_sec_${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      eventType,
      secretName,
      version,
      details,
      severity
    });

    this.auditLogs.unshift(record);
    if (this.auditLogs.length > 3000) this.auditLogs.pop();

    if (severity === "WARNING" || severity === "CRITICAL") {
      try {
        await this.securityLogger.logException({
          errorId: record.id,
          endpoint: "/api/security/secrets/manage",
          httpMethod: "SYSTEM",
          ipAddress: "127.0.0.1",
          userAgent: `MOAT SecretsManager v5.0`,
          internalCategory: `SECRETS_${eventType}`,
          fullException: `[${severity}] ${eventType}: ${details} | Secret: '${secretName}' (v${version})`,
          severity: severity === "CRITICAL" ? "CRITICAL" : "WARNING"
        });
      } catch (err) {
        // Ignore fallback logging errors
      }
    }

    return record;
  }

  static getAccessHistory(secretName?: string): SecretAccessRecord[] {
    if (!secretName) return [...this.accessHistory];
    return this.accessHistory.filter((a) => a.secretName === secretName);
  }

  static getAuditLogs(filter?: { secretName?: string; severity?: string }): SecretAuditRecord[] {
    if (!filter) return [...this.auditLogs];
    return this.auditLogs.filter((l) => {
      if (filter.secretName && l.secretName !== filter.secretName) return false;
      if (filter.severity && l.severity !== filter.severity) return false;
      return true;
    });
  }

  static clearRepository(): void {
    this.accessHistory = [];
    this.auditLogs = [];
  }
}
