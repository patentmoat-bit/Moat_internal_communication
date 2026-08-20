import crypto from "crypto";
import { AnyWorkflowStage, WorkflowAssignmentRecord, WorkflowType } from "./types";

/**
 * AssignmentService
 * 
 * Enterprise assignment engine managing role and user responsibilities across workflow transitions.
 * 1. Automatically assigns appropriate users and roles when a workflow stage changes.
 * 2. Implements automatic assignment rules (e.g., project created by CEO automatically assigns Patent Analyst;
 *    moving to Design Review automatically assigns Design Team; moving to CEO Review automatically assigns CEO).
 * 3. Maintains immutable assignment logs for auditability.
 */
export class AssignmentService {
  private static assignments: WorkflowAssignmentRecord[] = [];

  /**
   * Determine the automatic assignee for a given workflow stage.
   */
  static resolveAssigneeForStage(type: WorkflowType, stage: AnyWorkflowStage): { userId: string; role: string } {
    // Patent rules
    if (type === "PATENT") {
      if (stage === "New" || stage === "Assigned" || stage === "Research" || stage === "Patent Search" || stage === "Novelty Analysis" || stage === "Prior Art Analysis" || stage === "Drafting" || stage === "Patent Analyst Review" || stage === "Revision Required" || stage === "Filing" || stage === "Filed" || stage === "Renewal") {
        return { userId: "usr_analyst_auto", role: "Patent Analyst" };
      }
      if (stage === "Design Review") {
        return { userId: "usr_designer_auto", role: "Design Team" };
      }
      if (stage === "CEO Review" || stage === "Approved" || stage === "Completed") {
        return { userId: "usr_ceo_auto", role: "CEO" };
      }
    }

    // Trademark rules
    if (type === "TRADEMARK") {
      if (stage === "Trademark Created" || stage === "Word / Logo Selection" || stage === "Trademark Search" || stage === "Conflict Check" || stage === "Drafting" || stage === "Patent Analyst Review" || stage === "Trademark Filing" || stage === "Registration" || stage === "Renewal") {
        return { userId: "usr_analyst_auto", role: "Patent Analyst" };
      }
      if (stage === "CEO Approval" || stage === "Completed") {
        return { userId: "usr_ceo_auto", role: "CEO" };
      }
    }

    return { userId: "usr_admin_auto", role: "Admin" };
  }

  /**
   * Record a new assignment for a workflow.
   */
  static assignWorkflow(
    workflowId: string,
    userId: string,
    role: string,
    assignedBy: string = "system_auto"
  ): WorkflowAssignmentRecord {
    const record: WorkflowAssignmentRecord = {
      id: `asg_${crypto.randomUUID()}`,
      workflowId,
      userId,
      role,
      assignedAt: new Date().toISOString(),
      assignedBy
    };
    this.assignments.unshift(record);
    return record;
  }

  /**
   * Retrieve all assignment records for a workflow.
   */
  static getAssignments(workflowId?: string): WorkflowAssignmentRecord[] {
    if (!workflowId) return [...this.assignments];
    return this.assignments.filter((a) => a.workflowId === workflowId);
  }

  static clearRepository(): void {
    this.assignments = [];
  }
}
