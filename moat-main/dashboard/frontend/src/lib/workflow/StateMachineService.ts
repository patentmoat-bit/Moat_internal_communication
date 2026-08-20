import {
  WorkflowType,
  AnyWorkflowStage,
  PatentWorkflowStage,
  TrademarkWorkflowStage,
  VALID_PATENT_TRANSITIONS,
  VALID_TRADEMARK_TRANSITIONS
} from "./types";

/**
 * StateMachineService
 * 
 * Enterprise state machine engine governing the lifecycle of Patent and Trademark workflows.
 * 1. Enforces strict sequential transitions across 16 patent stages and 11 trademark stages.
 * 2. Prevents illegal step-skipping and arbitrary state tampering.
 * 3. Supports controlled rollback and revision loop routing (e.g. CEO Review -> Revision Required -> Drafting).
 * 4. Calculates dynamic completion percentages based on stage progression.
 */
export class StateMachineService {
  private static readonly PATENT_STAGE_ORDER: PatentWorkflowStage[] = [
    "New",
    "Assigned",
    "Research",
    "Patent Search",
    "Novelty Analysis",
    "Prior Art Analysis",
    "Drafting",
    "Design Review",
    "Patent Analyst Review",
    "CEO Review",
    "Approved",
    "Revision Required",
    "Filing",
    "Filed",
    "Renewal",
    "Completed"
  ];

  private static readonly TRADEMARK_STAGE_ORDER: TrademarkWorkflowStage[] = [
    "Trademark Created",
    "Word / Logo Selection",
    "Trademark Search",
    "Conflict Check",
    "Drafting",
    "Patent Analyst Review",
    "CEO Approval",
    "Trademark Filing",
    "Registration",
    "Renewal",
    "Completed"
  ];

  /**
   * Validate if a proposed stage transition is legally permitted by the state machine.
   */
  static validateTransition(
    type: WorkflowType,
    currentStage: AnyWorkflowStage,
    targetStage: AnyWorkflowStage,
    isRollbackOrAdminOverride: boolean = false
  ): { allowed: boolean; reason?: string } {
    if (currentStage === targetStage) {
      return { allowed: true };
    }

    if (isRollbackOrAdminOverride) {
      return { allowed: true };
    }

    let validTargets: string[] = [];
    if (type === "PATENT") {
      validTargets = VALID_PATENT_TRANSITIONS[currentStage as PatentWorkflowStage] || [];
    } else {
      validTargets = VALID_TRADEMARK_TRANSITIONS[currentStage as TrademarkWorkflowStage] || [];
    }

    if (!validTargets.includes(targetStage)) {
      return {
        allowed: false,
        reason: `State Machine Violation: Cannot transition ${type} workflow directly from '${currentStage}' to '${targetStage}'. Illegal step-skipping or invalid workflow trajectory blocked.`
      };
    }

    return { allowed: true };
  }

  /**
   * Calculate project completion percentage based on current workflow stage.
   */
  static calculateCompletionPercentage(type: WorkflowType, stage: AnyWorkflowStage): number {
    if (type === "PATENT") {
      const idx = this.PATENT_STAGE_ORDER.indexOf(stage as PatentWorkflowStage);
      if (idx === -1) return 0;
      if (stage === "Completed") return 100;
      if (stage === "Revision Required") return 50; // Holds at 50% during revision loop
      return Math.min(99, Math.round(((idx + 1) / (this.PATENT_STAGE_ORDER.length - 1)) * 100));
    } else {
      const idx = this.TRADEMARK_STAGE_ORDER.indexOf(stage as TrademarkWorkflowStage);
      if (idx === -1) return 0;
      if (stage === "Completed") return 100;
      return Math.min(99, Math.round(((idx + 1) / (this.TRADEMARK_STAGE_ORDER.length - 1)) * 100));
    }
  }

  /**
   * Resolve default starting stage for a new workflow.
   */
  static getInitialStage(type: WorkflowType): AnyWorkflowStage {
    return type === "PATENT" ? "New" : "Trademark Created";
  }
}
