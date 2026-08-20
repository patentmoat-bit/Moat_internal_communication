import crypto from "crypto";
import { AnyWorkflowStage, WorkflowTaskRecord, WorkflowType, STAGE_SLA_DAYS } from "./types";

/**
 * TaskManagementService
 * 
 * Enterprise task automation engine for the MOAT Patent Intelligence Platform.
 * 1. Automatically generates actionable tasks when a workflow stage transitions or is initialized.
 * 2. Assigns tasks to the correct users and roles based on workflow stage boundaries.
 * 3. Sets due dates based on SLA rules.
 * 4. Tracks task statuses (PENDING, IN_PROGRESS, COMPLETED, CANCELLED).
 */
export class TaskManagementService {
  private static tasks: Map<string, WorkflowTaskRecord> = new Map();

  /**
   * Automatically generate a task for a workflow entering a new stage.
   */
  static generateTaskForStage(
    workflowId: string,
    type: WorkflowType,
    stage: AnyWorkflowStage,
    assignedUserId: string,
    assignedRole: string
  ): WorkflowTaskRecord {
    // Complete or cancel pending previous tasks for this workflow
    for (const task of this.tasks.values()) {
      if (task.workflowId === workflowId && task.status === "PENDING") {
        task.status = "COMPLETED";
      }
    }

    const slaDays = STAGE_SLA_DAYS[stage] || 3;
    const dueDate = new Date(Date.now() + slaDays * 24 * 60 * 60 * 1000).toISOString();

    let title = `Execute ${stage} Workflow Phase`;
    let description = `Perform necessary analysis, documentation, and review for stage '${stage}' in ${type} workflow.`;

    if (stage === "New" || stage === "Assigned" || stage === "Trademark Created") {
      title = `Initial Analysis & Project Setup: ${stage}`;
      description = `Conduct preliminary scoping and assign project team members for ${type} workflow.`;
    } else if (stage === "Research" || stage === "Patent Search" || stage === "Trademark Search") {
      title = `IP Search & Prior Art Investigation`;
      description = `Execute comprehensive global patent/trademark database searches and document potential art.`;
    } else if (stage === "Novelty Analysis" || stage === "Prior Art Analysis" || stage === "Conflict Check") {
      title = `Novelty & Conflict Evaluation`;
      description = `Analyze search results against proposed claims or brand assets to ensure legal novelty.`;
    } else if (stage === "Drafting") {
      title = `Draft IP Specification & Claims`;
      description = `Formulate detailed specifications, legal claims, and formal document structure.`;
    } else if (stage === "Design Review" || stage === "Word / Logo Selection") {
      title = `Design & Visual Asset Verification`;
      description = `Review, revise, and upload formal drawings, diagrams, or trademark logo assets.`;
    } else if (stage === "Patent Analyst Review") {
      title = `Final Technical Review & Quality Assurance`;
      description = `Verify compliance with USPTO/EPO standards and prepare executive summary for CEO approval.`;
    } else if (stage === "CEO Review" || stage === "CEO Approval") {
      title = `Executive Approval & Filing Authorization`;
      description = `Executive evaluation required. Review final specifications and formally approve or request revision.`;
    } else if (stage === "Filing" || stage === "Trademark Filing") {
      title = `Execute Formal Patent/Trademark Office Filing`;
      description = `Submit authorized application package to relevant national/international patent office.`;
    } else if (stage === "Revision Required") {
      title = `Address Review Comments & Revise Assets`;
      description = `Incorporate mandatory review feedback from executive leadership or analysts.`;
    }

    const task: WorkflowTaskRecord = {
      id: `tsk_${crypto.randomUUID()}`,
      workflowId,
      title,
      description,
      assignedUserId,
      assignedRole,
      stage,
      status: "PENDING",
      dueDate,
      createdAt: new Date().toISOString()
    };

    this.tasks.set(task.id, task);
    return task;
  }

  /**
   * Retrieve tasks for a workflow or specific user.
   */
  static getTasks(filter?: { workflowId?: string; assignedUserId?: string; status?: WorkflowTaskRecord["status"] }): WorkflowTaskRecord[] {
    const all = Array.from(this.tasks.values());
    if (!filter) return all;

    return all.filter((t) => {
      if (filter.workflowId && t.workflowId !== filter.workflowId) return false;
      if (filter.assignedUserId && t.assignedUserId !== filter.assignedUserId) return false;
      if (filter.status && t.status !== filter.status) return false;
      return true;
    });
  }

  /**
   * Update task status.
   */
  static updateTaskStatus(taskId: string, status: WorkflowTaskRecord["status"]): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.status = status;
    return true;
  }

  static clearRepository(): void {
    this.tasks.clear();
  }
}
