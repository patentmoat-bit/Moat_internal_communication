import crypto from "crypto";
import { WorkflowRecord, WorkflowEscalationRecord, STAGE_SLA_DAYS } from "./types";
import { WorkflowEmailService } from "./WorkflowEmailService";
import { WorkflowNotificationService } from "./WorkflowNotificationService";
import { DashboardSyncService } from "./DashboardSyncService";
import { WorkflowAuditLogService } from "./WorkflowAuditLogService";

/**
 * SLAMonitoringService
 * 
 * Enterprise SLA tracking and escalation engine for the MOAT Patent Intelligence Platform.
 * 1. Monitors active workflows against configurable SLA duration boundaries (in days).
 * 2. Identifies overdue items and updates SLA status to 'BREACHED' or 'AT_RISK'.
 * 3. Enforces automatic escalation rules: when an SLA is exceeded (e.g., Research phase overdue after 3 days),
 *    immediately dispatches high-priority alerts and Microsoft Graph emails to CEO and Admin!
 */
export class SLAMonitoringService {
  private static escalations: WorkflowEscalationRecord[] = [];

  /**
   * Evaluate active workflows for SLA compliance and trigger escalations for breached items.
   */
  static async checkSLAs(workflows: Map<string, WorkflowRecord>, simulatedCurrentTime?: number): Promise<{ checked: number; breachedCount: number; escalations: WorkflowEscalationRecord[] }> {
    const nowMs = simulatedCurrentTime || Date.now();
    let breachedCount = 0;
    const triggeredEscalations: WorkflowEscalationRecord[] = [];

    for (const wf of workflows.values()) {
      if (wf.currentStage === "Completed") {
        wf.slaStatus = "ON_TRACK";
        continue;
      }

      const dueMs = new Date(wf.dueDate).getTime();
      const slaDays = STAGE_SLA_DAYS[wf.currentStage] || 3;

      if (nowMs > dueMs || wf.slaStatus === "BREACHED") {
        if (wf.slaStatus !== "BREACHED") {
          wf.slaStatus = "BREACHED";
        }
        breachedCount++;

        // Calculate breached days
        const diffDays = Math.max(1, Math.round((nowMs - dueMs) / (1000 * 60 * 60 * 24)));

        // Create escalation record
        const escalation: WorkflowEscalationRecord = {
          id: `esc_${crypto.randomUUID()}`,
          workflowId: wf.id,
          stage: wf.currentStage,
          breachedSlaDays: diffDays,
          escalatedToRoles: ["CEO", "Admin"],
          reason: `SLA Breached: Stage '${wf.currentStage}' exceeded mandatory due date (${slaDays} days allowed).`,
          timestamp: new Date().toISOString(),
          resolved: false
        };

        this.escalations.unshift(escalation);
        triggeredEscalations.push(escalation);

        // Notify CEO and Admin
        WorkflowNotificationService.createNotification(
          wf.id,
          "CEO",
          "🚨 SLA Breach Escalation",
          `Project '${wf.name}' breached SLA during '${wf.currentStage}' stage (${diffDays} days overdue). Executive intervention required.`
        );
        WorkflowNotificationService.createNotification(
          wf.id,
          "Admin",
          "🚨 System SLA Breach Escalation",
          `Project '${wf.name}' exceeded SLA threshold in stage '${wf.currentStage}'.`
        );

        WorkflowEmailService.sendEmail(
          "CEO",
          `[MOAT SLA Escalation] Project '${wf.name}' Overdue in Stage '${wf.currentStage}'`,
          `Urgent: The IP asset workflow '${wf.name}' (${wf.id}) has exceeded its mandatory SLA threshold by ${diffDays} day(s). Immediate resolution or reassignment is advised.`
        );
        WorkflowEmailService.sendEmail(
          "Admin",
          `[MOAT SLA Escalation] Project '${wf.name}' SLA Breach`,
          `System alert: Workflow '${wf.id}' breached SLA in stage '${wf.currentStage}'.`
        );

        DashboardSyncService.broadcastSyncEvent("SLA_BREACH_ESCALATED", wf.id, {
          workflowId: wf.id,
          stage: wf.currentStage,
          breachedSlaDays: diffDays,
          escalatedTo: ["CEO", "Admin"]
        }, "ALL");

        await WorkflowAuditLogService.logEvent(
          wf.id,
          "SLA_BREACHED",
          "system_sla_monitor",
          "system",
          `SLA breached in stage '${wf.currentStage}' by ${diffDays} day(s). Escalated to CEO and Admin.`,
          "CRITICAL"
        );
      } else {
        // Check if at risk (within 24 hours of due date)
        if (dueMs - nowMs < 24 * 60 * 60 * 1000) {
          wf.slaStatus = "AT_RISK";
        } else {
          wf.slaStatus = "ON_TRACK";
        }
      }
    }

    return {
      checked: workflows.size,
      breachedCount,
      escalations: triggeredEscalations
    };
  }

  /**
   * Manually trigger SLA breach for testing and administrative override.
   */
  static async forceTriggerSLABreach(workflow: WorkflowRecord): Promise<WorkflowEscalationRecord> {
    workflow.slaStatus = "BREACHED";
    const tempMap = new Map<string, WorkflowRecord>();
    tempMap.set(workflow.id, workflow);
    const res = await this.checkSLAs(tempMap, Date.now() + 100 * 24 * 60 * 60 * 1000);
    return res.escalations[0];
  }

  static getEscalations(workflowId?: string): WorkflowEscalationRecord[] {
    if (!workflowId) return [...this.escalations];
    return this.escalations.filter((e) => e.workflowId === workflowId);
  }

  static clearRepository(): void {
    this.escalations = [];
  }
}
