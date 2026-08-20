import crypto from "crypto";
import { SecurityLoggingService } from "../security/SecurityLoggingService";

export interface WorkflowAuditLogRecord {
  id: string;
  workflowId: string;
  eventType: string;
  userId: string;
  role: string;
  timestamp: string;
  details: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
}

/**
 * WorkflowAuditLogService
 * 
 * Enterprise immutable audit logging service for the Workflow Engine.
 * 1. Captures all lifecycle events: stage transitions, task creations, approvals, SLA breaches, and escalations.
 * 2. Forwards critical SLA breaches and workflow anomalies to the central server logs.
 */
export class WorkflowAuditLogService {
  private static auditLogs: WorkflowAuditLogRecord[] = [];
  private static securityLogger = new SecurityLoggingService();

  /**
   * Log an immutable workflow event.
   */
  static async logEvent(
    workflowId: string,
    eventType: string,
    userId: string,
    role: string,
    details: string,
    severity: "INFO" | "WARNING" | "CRITICAL" = "INFO"
  ): Promise<WorkflowAuditLogRecord> {
    const record: WorkflowAuditLogRecord = Object.freeze({
      id: `aud_wf_${crypto.randomUUID()}`,
      workflowId,
      eventType,
      userId: userId || "system",
      role: role || "system",
      timestamp: new Date().toISOString(),
      details,
      severity
    });

    this.auditLogs.unshift(record);
    if (this.auditLogs.length > 3000) this.auditLogs.pop();

    if (severity === "CRITICAL" || severity === "WARNING") {
      try {
        await this.securityLogger.logException({
          errorId: record.id,
          endpoint: "/api/workflow/execute",
          httpMethod: "SYSTEM",
          ipAddress: "127.0.0.1",
          userAgent: `MOAT WorkflowEngine v5.0 (${role})`,
          internalCategory: `WORKFLOW_${eventType}`,
          fullException: `[${severity}] Workflow Engine Audit: ${details} | Workflow: '${workflowId}' | User: '${userId}' (${role})`,
          severity: severity === "CRITICAL" ? "CRITICAL" : "WARNING"
        });
      } catch (err) {
        // Ignore fallback logging errors
      }
    }

    return record;
  }

  static getAuditLogs(workflowId?: string): WorkflowAuditLogRecord[] {
    if (!workflowId) return [...this.auditLogs];
    return this.auditLogs.filter((l) => l.workflowId === workflowId);
  }

  static clearRepository(): void {
    this.auditLogs = [];
  }
}
