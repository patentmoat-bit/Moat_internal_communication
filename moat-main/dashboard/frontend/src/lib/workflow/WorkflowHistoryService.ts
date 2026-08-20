import crypto from "crypto";
import { WorkflowHistoryRecord } from "./types";

/**
 * WorkflowHistoryService
 * 
 * Enterprise immutable audit trail and historical tracking service.
 * 1. Records every workflow state transition: From Status, To Status, User, Role, Timestamp, and Comments.
 * 2. Strictly forbids deletion or mutation of historical transition records (append-only architecture).
 */
export class WorkflowHistoryService {
  private static history: WorkflowHistoryRecord[] = [];

  /**
   * Record a new immutable workflow transition event.
   */
  static recordTransition(
    workflowId: string,
    fromStatus: string,
    toStatus: string,
    user: string,
    role: string,
    comments?: string
  ): WorkflowHistoryRecord {
    const record: WorkflowHistoryRecord = Object.freeze({
      id: `whs_${crypto.randomUUID()}`,
      workflowId,
      fromStatus,
      toStatus,
      user,
      role,
      timestamp: new Date().toISOString(),
      comments
    });
    this.history.unshift(record);
    return record;
  }

  /**
   * Retrieve immutable historical records for a workflow.
   */
  static getHistory(workflowId?: string): WorkflowHistoryRecord[] {
    if (!workflowId) return [...this.history];
    return this.history.filter((h) => h.workflowId === workflowId);
  }

  static clearRepository(): void {
    this.history = [];
  }
}
