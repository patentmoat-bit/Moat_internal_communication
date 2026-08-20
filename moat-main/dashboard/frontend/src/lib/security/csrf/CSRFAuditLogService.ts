import crypto from "crypto";
import { CORSAuditRecord, CSRFCORSViolationType } from "./types";
import { SecurityLoggingService } from "../SecurityLoggingService";

/**
 * CSRFAuditLogService
 * 
 * Enterprise immutable audit logging service for CSRF protection and CORS hardening.
 * 1. Captures all valid and blocked requests with IP address, Origin, Referer, endpoint, and severity.
 * 2. Integrates with central server logs to flag potential Cross-Site Request Forgery or session hijacking attempts.
 */
export class CSRFAuditLogService {
  private static auditLogs: CORSAuditRecord[] = [];
  private static securityLogger = new SecurityLoggingService();

  /**
   * Record an immutable CSRF or CORS security audit event.
   */
  static async logEvent(
    endpoint: string,
    httpMethod: string,
    ipAddress: string,
    violationType: CSRFCORSViolationType | "VALID_REQUEST" | "VALID_PREFLIGHT",
    details: string,
    severity: "INFO" | "WARNING" | "CRITICAL" = "INFO",
    origin?: string,
    referer?: string,
    userId: string = "anonymous"
  ): Promise<CORSAuditRecord> {
    const record: CORSAuditRecord = Object.freeze({
      id: `aud_csrf_${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      ipAddress,
      origin: origin || "NONE",
      referer: referer || "NONE",
      endpoint,
      httpMethod,
      violationType,
      details,
      severity,
      userId
    });

    this.auditLogs.unshift(record);
    if (this.auditLogs.length > 3000) this.auditLogs.pop();

    if (severity === "WARNING" || severity === "CRITICAL") {
      try {
        await this.securityLogger.logException({
          errorId: record.id,
          endpoint,
          httpMethod,
          ipAddress,
          userAgent: `MOAT CSRF/CORS Defense (${origin || "unknown"})`,
          internalCategory: `SECURITY_${violationType}`,
          fullException: `[${severity}] ${violationType}: ${details} | Origin: '${origin}' | Referer: '${referer}' | IP: '${ipAddress}'`,
          severity: severity === "CRITICAL" ? "CRITICAL" : "WARNING"
        });
      } catch (err) {
        // Ignore fallback logging errors
      }
    }

    return record;
  }

  static getAuditLogs(filter?: { violationType?: string; endpoint?: string }): CORSAuditRecord[] {
    if (!filter) return [...this.auditLogs];
    return this.auditLogs.filter((l) => {
      if (filter.violationType && l.violationType !== filter.violationType) return false;
      if (filter.endpoint && l.endpoint !== filter.endpoint) return false;
      return true;
    });
  }

  static clearRepository(): void {
    this.auditLogs = [];
  }
}
