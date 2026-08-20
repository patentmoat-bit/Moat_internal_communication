// ─────────────────────────────────────────────────────────────────────────────
// MOAT Patent Intelligence Platform — Event Bus
// Centralized asynchronous event publisher for the Workflow Engine.
// ─────────────────────────────────────────────────────────────────────────────

import { handleAuditLog, handleNotification, handleWorkflowUpdate, handleEmailDispatch, handleFinanceWorkflow } from "./handlers";

/**
 * All workflow event types supported by the system.
 */
export type EventType =
  // Project Lifecycle
  | "PROJECT_CREATED"
  | "PROJECT_UPDATED"
  | "PROJECT_ASSIGNED"
  // Research Phase
  | "RESEARCH_STARTED"
  | "RESEARCH_COMPLETED"
  // Drafting Phase
  | "DRAFT_STARTED"
  | "DOCUMENT_UPLOADED"
  // Design Phase
  | "DESIGN_REQUESTED"
  | "DESIGN_STARTED"
  | "DESIGN_COMPLETED"
  // Review Phase
  | "PATENT_ANALYST_REVIEW"
  | "REPORT_SUBMITTED"
  | "CEO_REVIEW_STARTED"
  | "CEO_APPROVED"
  | "CEO_REJECTED"
  // Revision
  | "REVISION_REQUIRED"
  | "REVISION_COMPLETED"
  // Filing
  | "FILING_STARTED"
  | "FILED"
  // Renewal
  | "RENEWAL_REMINDER"
  | "RENEWAL_COMPLETED"
  // Completion
  | "PROJECT_COMPLETED"
  // Finance
  | "FINANCE_PAYMENT_COMPLETED"
  // Legacy events (backward compat)
  | "ASSIGNED"
  | "IDEA_SUBMITTED"
  | "IDEA_APPROVED"
  | "IDEA_REJECTED"
  | "IDEA_REVISION_REQUESTED"
  | "REVISION_REQUESTED"
  | "STATUS_UPDATED"
  | "FILING_INITIATED"
  | "FILING_COMPLETED"
  | "RENEWAL_ALERT"
  | "COMMENT_ADDED"
  | "USER_CREATED";

/**
 * Event payload — carries all data needed for downstream processing.
 */
export interface EventPayload {
  /** The workflow event type */
  type: EventType;
  /** User ID who triggered the action */
  actorId?: string;
  /** Role of the user who triggered the action */
  actorRole?: string;
  /** ID of the project/invention/trademark */
  resourceId?: string;
  /** Resource type: 'invention' or 'trademark' */
  resourceType?: string;
  /** Arbitrary event metadata */
  metadata?: any;
  /** Notification title for dashboard notifications */
  notificationTitle?: string;
  /** Notification message body */
  notificationMessage?: string;
  /** URL for the "Open in Dashboard" action button */
  actionUrl?: string;
  /** Notification priority */
  priority?: "low" | "normal" | "high" | "critical";
  /**
   * @deprecated Use the routing rules engine instead.
   * Kept for backward compat — the new system ignores this field.
   */
  targetRole?: "CEO" | "Patent Analyst" | "Designer" | "Design Team" | "System Admin" | "Admin";
  /**
   * Full project data row (from inventions table).
   * Used by the recipient resolver to look up assigned_to, designer_id, etc.
   */
  projectData?: Record<string, any>;
}

/**
 * EventBus — Central event publisher
 *
 * Every published event triggers (asynchronously, non-blocking):
 * 1. Immutable audit log entry
 * 2. Workflow status transition (if applicable)
 * 3. Dashboard notifications for relevant users
 * 4. Email dispatch via Microsoft Graph with TO/CC routing
 *
 * All steps run in the background — API responses are never blocked.
 */
export const EventBus = {
  publishEvent: async (payload: EventPayload) => {
    console.log(`[EventBus] Publishing Event: ${payload.type} | Resource: ${payload.resourceId || "N/A"}`);
    
    await Promise.allSettled([
      handleAuditLog(payload).catch(err => console.error("[EventBus] Audit Error:", err)),
      handleWorkflowUpdate(payload).catch(err => console.error("[EventBus] Workflow Error:", err)),
      handleNotification(payload).catch(err => console.error("[EventBus] Notification Error:", err)),
      handleEmailDispatch(payload).catch(err => console.error("[EventBus] Email Error:", err)),
      handleFinanceWorkflow(payload).catch(err => console.error("[EventBus] Finance Error:", err))
    ]);
    
    console.log(`[EventBus] Finished Processing Event: ${payload.type}`);
  },
};
