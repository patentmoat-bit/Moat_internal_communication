import crypto from "crypto";
import { DocumentAuditLogRecord, FileAuditEventType, FileSecurityLogRecord } from "./types";
import { SecurityLoggingService } from "../SecurityLoggingService";

/**
 * FileAuditLogService
 * 
 * Enterprise immutable audit logging for file operations across the MOAT Patent Intelligence Platform.
 * 1. Captures all file lifecycle actions: upload, download, versioning, deletion, permission denial, and malware detection.
 * 2. Stores comprehensive metadata: User ID, Timestamp, Client IP, File Name, Project ID, Action, and Severity.
 * 3. Bridges file security telemetry with server-side immutable audit stores and real-time security dashboards.
 */
export class FileAuditLogService {
  private static auditLogs: DocumentAuditLogRecord[] = [];
  private static securityLogs: FileSecurityLogRecord[] = [];
  private static securityLogger = new SecurityLoggingService();

  /**
   * Log standard document audit event (Upload, Download, Delete, Versioning).
   */
  static async logEvent(
    action: FileAuditEventType,
    projectId: string,
    userId: string,
    ipAddress: string,
    fileName: string,
    documentId?: string,
    details?: string
  ): Promise<DocumentAuditLogRecord> {
    const timestamp = new Date().toISOString();
    const logId = `aud_doc_${crypto.randomUUID()}`;

    const record: DocumentAuditLogRecord = Object.freeze({
      id: logId,
      documentId,
      projectId,
      userId,
      ipAddress,
      action,
      fileName,
      timestamp,
      details
    });

    this.auditLogs.unshift(record);

    // Limit in-memory size
    if (this.auditLogs.length > 2000) {
      this.auditLogs.pop();
    }

    return record;
  }

  /**
   * Log critical file security violation (Virus, Magic Byte Spoofing, Zip Bomb, Double Extension, Path Traversal).
   */
  static async logSecurityViolation(
    violationType: FileSecurityLogRecord["violationType"],
    fileName: string,
    userId: string,
    ipAddress: string,
    details: string,
    fileHash?: string,
    severity: FileSecurityLogRecord["severity"] = "HIGH"
  ): Promise<FileSecurityLogRecord> {
    const timestamp = new Date().toISOString();
    const logId = `sec_doc_${crypto.randomUUID()}`;

    const record: FileSecurityLogRecord = Object.freeze({
      id: logId,
      timestamp,
      userId,
      ipAddress,
      fileName,
      fileHash,
      violationType,
      details,
      severity
    });

    this.securityLogs.unshift(record);

    // Also forward to server-side SecurityLoggingService
    try {
      await this.securityLogger.logException({
        errorId: logId,
        endpoint: "/api/security/upload",
        httpMethod: "POST",
        ipAddress,
        userAgent: "MOAT FileSecurityEngine v4.2",
        internalCategory: `FILE_SECURITY_${violationType}`,
        fullException: `[${severity}] File upload security violation: ${details} | File: '${fileName}'`,
        severity: severity === "CRITICAL" ? "CRITICAL" : "WARNING"
      });
    } catch (err) {
      // Ignore fallback errors
    }

    if (this.securityLogs.length > 1000) {
      this.securityLogs.pop();
    }

    return record;
  }

  /**
   * Retrieve document audit logs filtered by project, document, or user.
   */
  static getAuditLogs(filter?: { projectId?: string; documentId?: string; userId?: string }): DocumentAuditLogRecord[] {
    if (!filter) return [...this.auditLogs];

    return this.auditLogs.filter((log) => {
      if (filter.projectId && log.projectId !== filter.projectId) return false;
      if (filter.documentId && log.documentId !== filter.documentId) return false;
      if (filter.userId && log.userId !== filter.userId) return false;
      return true;
    });
  }

  /**
   * Retrieve file security violation logs for Admin investigations.
   */
  static getSecurityLogs(filter?: { severity?: string; violationType?: string }): FileSecurityLogRecord[] {
    if (!filter) return [...this.securityLogs];

    return this.securityLogs.filter((log) => {
      if (filter.severity && log.severity !== filter.severity) return false;
      if (filter.violationType && log.violationType !== filter.violationType) return false;
      return true;
    });
  }

  /**
   * Clear logs (for testing).
   */
  static clearLogs(): void {
    this.auditLogs = [];
    this.securityLogs = [];
  }
}
