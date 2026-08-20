import { AnyWorkflowStage, ApprovalActionType, WorkflowType } from "./types";

/**
 * ApprovalService
 * 
 * Enterprise approval engine for the MOAT Patent Intelligence Platform.
 * 1. Supports 5 core actions: APPROVE, REJECT, REQUEST_REVISION, REASSIGN, and ESCALATE.
 * 2. Strictly enforces mandatory comments for REJECT or REQUEST_REVISION actions.
 * 3. Maps approval outcomes to corresponding target workflow stages in the state machine.
 */
export class ApprovalService {
  /**
   * Process an approval action on a workflow stage.
   */
  static processApproval(
    type: WorkflowType,
    currentStage: AnyWorkflowStage,
    action: ApprovalActionType,
    userId: string,
    userRole: string,
    comments?: string
  ): { success: boolean; targetStage: AnyWorkflowStage; reason?: string } {
    // Rule: Comments should be mandatory for rejection or revision.
    if ((action === "REJECT" || action === "REQUEST_REVISION") && (!comments || comments.trim().length === 0)) {
      return {
        success: false,
        targetStage: currentStage,
        reason: `Approval Policy Violation: Comments are mandatory when executing action '${action}'. Please provide detailed feedback explaining the reason for revision or rejection.`
      };
    }

    if (action === "REASSIGN" || action === "ESCALATE") {
      return {
        success: true,
        targetStage: currentStage
      };
    }

    if (action === "REJECT") {
      return {
        success: true,
        targetStage: "Completed" // Moves to Completed/Terminated
      };
    }

    if (action === "REQUEST_REVISION") {
      return {
        success: true,
        targetStage: type === "PATENT" ? "Revision Required" : "Drafting"
      };
    }

    // action === "APPROVE"
    if (type === "PATENT") {
      if (currentStage === "Patent Analyst Review") return { success: true, targetStage: "CEO Review" };
      if (currentStage === "CEO Review") return { success: true, targetStage: "Approved" };
      if (currentStage === "Approved") return { success: true, targetStage: "Filing" };
      if (currentStage === "Filing") return { success: true, targetStage: "Filed" };
    } else {
      if (currentStage === "Patent Analyst Review") return { success: true, targetStage: "CEO Approval" };
      if (currentStage === "CEO Approval") return { success: true, targetStage: "Trademark Filing" };
      if (currentStage === "Trademark Filing") return { success: true, targetStage: "Registration" };
    }

    return {
      success: true,
      targetStage: currentStage
    };
  }
}
