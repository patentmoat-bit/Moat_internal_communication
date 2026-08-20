import crypto from "crypto";
import {
  AnyWorkflowStage,
  ApprovalActionType,
  STAGE_SLA_DAYS,
  WorkflowRecord,
  WorkflowType
} from "./types";
import { StateMachineService } from "./StateMachineService";
import { AssignmentService } from "./AssignmentService";
import { TaskManagementService } from "./TaskManagementService";
import { ApprovalService } from "./ApprovalService";
import { WorkflowHistoryService } from "./WorkflowHistoryService";
import { DashboardSyncService } from "./DashboardSyncService";
import { WorkflowEmailService } from "./WorkflowEmailService";
import { WorkflowNotificationService } from "./WorkflowNotificationService";
import { SLAMonitoringService } from "./SLAMonitoringService";
import { WorkflowAuditLogService } from "./WorkflowAuditLogService";

/**
 * WorkflowEngineService
 * 
 * Centralized master facade for the MOAT Enterprise Workflow Engine.
 * Automatically manages the complete lifecycle of Patent and Trademark projects:
 * 1. Coordinates state machine transitions, task generation, and user/role assignments.
 * 2. Enforces approval engine rules (mandatory comments for rejection/revision).
 * 3. Synchronizes CEO, Patent Analyst, Designer, and Admin dashboards in real time.
 * 4. Dispatches Microsoft Graph emails and internal UI alerts.
 * 5. Maintains immutable historical audit logs and SLA compliance monitoring.
 */
export class WorkflowEngineService {
  private static workflows: Map<string, WorkflowRecord> = new Map();

  /**
   * Create and initialize a new Patent or Trademark project workflow.
   */
  static async createWorkflow(
    type: WorkflowType,
    name: string,
    ownerId: string,
    creatorRole: string = "CEO",
    customInitialStage?: AnyWorkflowStage
  ): Promise<WorkflowRecord> {
    const id = `wf_${type.toLowerCase()}_${crypto.randomUUID()}`;
    const initialStage = customInitialStage || StateMachineService.getInitialStage(type);
    const slaDays = STAGE_SLA_DAYS[initialStage] || 3;
    const now = new Date().toISOString();
    const dueDate = new Date(Date.now() + slaDays * 24 * 60 * 60 * 1000).toISOString();

    // Determine initial assignee
    const assignee = AssignmentService.resolveAssigneeForStage(type, initialStage);

    const record: WorkflowRecord = {
      id,
      name,
      type,
      currentStage: initialStage,
      previousStage: undefined,
      assignedUserId: assignee.userId,
      assignedRole: assignee.role,
      ownerId,
      dueDate,
      completionPercentage: StateMachineService.calculateCompletionPercentage(type, initialStage),
      slaStatus: "ON_TRACK",
      createdAt: now,
      updatedAt: now
    };

    this.workflows.set(id, record);

    // 1. Assign project member
    AssignmentService.assignWorkflow(id, assignee.userId, assignee.role, ownerId);

    // 2. Automatically generate actionable task
    TaskManagementService.generateTaskForStage(id, type, initialStage, assignee.userId, assignee.role);

    // 3. Record immutable history
    WorkflowHistoryService.recordTransition(id, "NONE", initialStage, ownerId, creatorRole, `Project workflow '${name}' created by ${creatorRole}.`);

    // 4. Dispatch notifications & emails
    WorkflowNotificationService.createNotification(
      id,
      assignee.role,
      `New Assigned Project: ${name}`,
      `You have been automatically assigned to project '${name}' in stage '${initialStage}'. Due date: ${new Date(dueDate).toLocaleDateString()}.`,
      assignee.userId
    );

    WorkflowEmailService.sendEmail(
      assignee.role,
      `[MOAT Task Assigned] Project '${name}' Initiated in Stage '${initialStage}'`,
      `Hello, project '${name}' (${id}) has been created by ${creatorRole} and assigned to your role (${assignee.role}). Please review your dashboard for pending tasks.`
    );

    // 5. Broadcast real-time dashboard sync
    DashboardSyncService.broadcastSyncEvent("WORKFLOW_CREATED", id, {
      workflowId: id,
      name,
      type,
      stage: initialStage,
      assignedRole: assignee.role,
      completionPercentage: record.completionPercentage
    }, "ALL");

    // 6. Log audit event
    await WorkflowAuditLogService.logEvent(id, "WORKFLOW_CREATED", ownerId, creatorRole, `Initialized ${type} workflow '${name}' in stage '${initialStage}'.`, "INFO");

    return record;
  }

  /**
   * Execute a workflow state transition.
   */
  static async transitionWorkflow(
    workflowId: string,
    targetStage: AnyWorkflowStage,
    userId: string,
    userRole: string,
    comments?: string,
    isRollbackOrAdminOverride: boolean = false
  ): Promise<{ success: boolean; workflow?: WorkflowRecord; previousStage?: AnyWorkflowStage; newStage?: AnyWorkflowStage; reason?: string }> {
    const wf = this.workflows.get(workflowId);
    if (!wf) {
      return { success: false, reason: `Workflow ID '${workflowId}' does not exist.` };
    }

    const previousStage = wf.currentStage;
    if (previousStage === targetStage) {
      return { success: true, workflow: wf, previousStage, newStage: targetStage };
    }

    // Validate transition against State Machine
    const validation = StateMachineService.validateTransition(wf.type, previousStage, targetStage, isRollbackOrAdminOverride);
    if (!validation.allowed) {
      await WorkflowAuditLogService.logEvent(workflowId, "TRANSITION_BLOCKED", userId, userRole, validation.reason!, "WARNING");
      return { success: false, reason: validation.reason };
    }

    // Apply transition
    wf.previousStage = previousStage;
    wf.currentStage = targetStage;
    wf.updatedAt = new Date().toISOString();
    wf.completionPercentage = StateMachineService.calculateCompletionPercentage(wf.type, targetStage);

    // Update SLA & due date
    const slaDays = STAGE_SLA_DAYS[targetStage] || 3;
    wf.dueDate = new Date(Date.now() + slaDays * 24 * 60 * 60 * 1000).toISOString();
    wf.slaStatus = "ON_TRACK";

    // Resolve new assignee
    const assignee = AssignmentService.resolveAssigneeForStage(wf.type, targetStage);
    wf.assignedUserId = assignee.userId;
    wf.assignedRole = assignee.role;

    // 1. Record new assignment
    AssignmentService.assignWorkflow(workflowId, assignee.userId, assignee.role, userId);

    // 2. Generate task for new stage
    TaskManagementService.generateTaskForStage(workflowId, wf.type, targetStage, assignee.userId, assignee.role);

    // 3. Record immutable transition history
    WorkflowHistoryService.recordTransition(workflowId, previousStage, targetStage, userId, userRole, comments || `Transitioned to '${targetStage}' by ${userRole}.`);

    // 4. Trigger notifications & emails
    WorkflowNotificationService.createNotification(
      workflowId,
      assignee.role,
      `Action Required: '${wf.name}' moved to '${targetStage}'`,
      `Project '${wf.name}' transitioned from '${previousStage}' to '${targetStage}'. Action required by ${assignee.role}.`,
      assignee.userId
    );

    WorkflowEmailService.sendEmail(
      assignee.role,
      `[MOAT Workflow Update] Project '${wf.name}' Entered Stage '${targetStage}'`,
      `Project '${wf.name}' has advanced from stage '${previousStage}' to '${targetStage}' by ${userRole}. Please log in to review assigned tasks.`
    );

    // Special rule: When moved to 'CEO Review' or 'CEO Approval', notify CEO specifically
    if (targetStage === "CEO Review" || targetStage === "CEO Approval") {
      WorkflowNotificationService.createNotification(
        workflowId,
        "CEO",
        `🎯 Executive Review Required: ${wf.name}`,
        `Patent Analyst review completed for '${wf.name}'. Ready for executive approval and formal filing authorization.`
      );
      WorkflowEmailService.sendEmail(
        "CEO",
        `[MOAT Executive Action] Filing Approval Needed: ${wf.name}`,
        `An IP project '${wf.name}' (${workflowId}) has entered stage '${targetStage}'. Please review specifications and formally authorize USPTO/EPO filing.`
      );
    }

    // Special rule: When moved to 'Approved', notify Analyst & Designer
    if (targetStage === "Approved") {
      WorkflowNotificationService.createNotification(workflowId, "Patent Analyst", `✅ Executive Approval Granted: ${wf.name}`, `CEO formally approved project '${wf.name}'. Proceeding to formal filing stage.`);
      WorkflowNotificationService.createNotification(workflowId, "Design Team", `✅ Design Assets Approved: ${wf.name}`, `Executive leadership approved design assets for '${wf.name}'.`);
      WorkflowEmailService.sendEmail("Patent Analyst", `[MOAT Approved] Filing Authorization Granted: ${wf.name}`, `CEO approved project '${wf.name}'. You may now execute formal USPTO/EPO filing.`);
    }

    // 5. Synchronize all dashboards in real time
    DashboardSyncService.broadcastSyncEvent("WORKFLOW_STAGE_TRANSITIONED", workflowId, {
      workflowId,
      name: wf.name,
      previousStage,
      newStage: targetStage,
      assignedRole: assignee.role,
      completionPercentage: wf.completionPercentage,
      transitionedBy: userRole,
      comments
    }, "ALL");

    // 6. Log audit event
    await WorkflowAuditLogService.logEvent(
      workflowId,
      "STAGE_TRANSITIONED",
      userId,
      userRole,
      `Successfully transitioned from '${previousStage}' to '${targetStage}'. Assigned to ${assignee.role}. Comments: '${comments || "none"}'`,
      "INFO"
    );

    return { success: true, workflow: wf, previousStage, newStage: targetStage };
  }

  /**
   * Process an approval engine action (Approve, Reject, Request Revision, Reassign, Escalate).
   */
  static async processApproval(
    workflowId: string,
    action: ApprovalActionType,
    userId: string,
    userRole: string,
    comments?: string
  ): Promise<{ success: boolean; workflow?: WorkflowRecord; targetStage?: AnyWorkflowStage; reason?: string }> {
    const wf = this.workflows.get(workflowId);
    if (!wf) {
      return { success: false, reason: `Workflow ID '${workflowId}' not found.` };
    }

    // Execute approval engine check
    const approvalRes = ApprovalService.processApproval(wf.type, wf.currentStage, action, userId, userRole, comments);
    if (!approvalRes.success) {
      await WorkflowAuditLogService.logEvent(workflowId, "APPROVAL_VIOLATION", userId, userRole, approvalRes.reason!, "WARNING");
      return { success: false, reason: approvalRes.reason };
    }

    if (action === "REASSIGN") {
      // Manual reassignment
      wf.assignedUserId = userId;
      wf.assignedRole = userRole;
      AssignmentService.assignWorkflow(workflowId, userId, userRole, "manual_reassign");
      WorkflowNotificationService.createNotification(workflowId, userRole, `🔄 Task Reassigned: ${wf.name}`, `Project '${wf.name}' manually reassigned to ${userRole}.`);
      DashboardSyncService.broadcastSyncEvent("WORKFLOW_REASSIGNED", workflowId, { workflowId, assignedRole: userRole }, "ALL");
      await WorkflowAuditLogService.logEvent(workflowId, "WORKFLOW_REASSIGNED", userId, userRole, `Manually reassigned to ${userRole}. Comments: ${comments || "none"}`, "INFO");
      return { success: true, workflow: wf, targetStage: wf.currentStage };
    }

    if (action === "ESCALATE") {
      // Manual escalation
      SLAMonitoringService.forceTriggerSLABreach(wf);
      return { success: true, workflow: wf, targetStage: wf.currentStage };
    }

    // If stage changes as a result of approval, request revision, or rejection
    if (approvalRes.targetStage !== wf.currentStage) {
      const isRollback = action === "REQUEST_REVISION" || action === "REJECT";
      const transRes = await this.transitionWorkflow(workflowId, approvalRes.targetStage, userId, userRole, comments, isRollback);
      return {
        success: transRes.success,
        workflow: transRes.workflow,
        targetStage: approvalRes.targetStage,
        reason: transRes.reason
      };
    }

    return { success: true, workflow: wf, targetStage: wf.currentStage };
  }

  /**
   * Monitor and evaluate SLAs across active workflows.
   */
  static async checkSLAs(simulatedCurrentTime?: number) {
    return await SLAMonitoringService.checkSLAs(this.workflows, simulatedCurrentTime);
  }

  /**
   * Retrieve workflow tracker details.
   */
  static getWorkflowTracker(workflowId: string): {
    workflow?: WorkflowRecord;
    tasks: any[];
    assignments: any[];
    history: any[];
    notifications: any[];
    escalations: any[];
  } {
    const wf = this.workflows.get(workflowId);
    return {
      workflow: wf,
      tasks: TaskManagementService.getTasks({ workflowId }),
      assignments: AssignmentService.getAssignments(workflowId),
      history: WorkflowHistoryService.getHistory(workflowId),
      notifications: WorkflowNotificationService.getNotifications({}),
      escalations: SLAMonitoringService.getEscalations(workflowId)
    };
  }

  static getWorkflow(workflowId: string): WorkflowRecord | undefined {
    return this.workflows.get(workflowId);
  }

  static getAllWorkflows(): WorkflowRecord[] {
    return Array.from(this.workflows.values());
  }

  static clearRepository(): void {
    this.workflows.clear();
    StateMachineService;
    AssignmentService.clearRepository();
    TaskManagementService.clearRepository();
    WorkflowHistoryService.clearRepository();
    DashboardSyncService.clearRepository();
    WorkflowEmailService.clearRepository();
    WorkflowNotificationService.clearRepository();
    SLAMonitoringService.clearRepository();
    WorkflowAuditLogService.clearRepository();
  }
}
