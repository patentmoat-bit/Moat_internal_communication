import { SupabaseClient } from "@supabase/supabase-js";
import { SystemMonitoringEvent } from "./types";

/**
 * MOAT Phase 8 — Workflow Monitoring Service
 * Monitors workflow transitions, pending approvals, overdue tasks, revision requests, and processing times.
 */
export class WorkflowMonitoringService {
  constructor(private supabase?: SupabaseClient) {}

  public async recordWorkflowEvent(payload: {
    workflowId: string;
    transitionName: string;
    eventType:
      | "WORKFLOW_SUCCESS"
      | "WORKFLOW_ERROR"
      | "INVALID_WORKFLOW_TRANSITION"
      | "PENDING_APPROVAL"
      | "OVERDUE_TASK"
      | "REVISION_REQUESTED";
    userId?: string | null;
    processingTimeMs?: number;
    errorMessage?: string;
  }): Promise<SystemMonitoringEvent> {
    const isFailure = payload.eventType === "WORKFLOW_ERROR" || payload.eventType === "INVALID_WORKFLOW_TRANSITION";

    const event: SystemMonitoringEvent = {
      category: "WORKFLOW",
      eventType: payload.eventType,
      userId: payload.userId || null,
      status: isFailure ? "FAILURE" : payload.eventType === "OVERDUE_TASK" ? "WARNING" : "SUCCESS",
      reason: payload.errorMessage || null,
      metadata: {
        workflowId: payload.workflowId,
        transitionName: payload.transitionName,
        processingTimeMs: payload.processingTimeMs || 0,
      },
      timestamp: new Date().toISOString(),
    };

    if (this.supabase) {
      try {
        await this.supabase.from("WorkflowLogs").insert({
          log_id: `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          workflow_id: payload.workflowId,
          transition_name: payload.transitionName,
          status: event.status,
          user_id: payload.userId || null,
          processing_time_ms: payload.processingTimeMs || 0,
          error_message: payload.errorMessage || null,
          created_at: event.timestamp,
        });
      } catch {
        // Fallback silently
      }
    }

    return event;
  }
}
