import { EnterpriseRole, WorkflowStage, VALID_WORKFLOW_TRANSITIONS, STAGE_TRANSITION_PERMISSIONS } from "./types";
import { PermissionService } from "./PermissionService";

/**
 * WorkflowValidationService
 * 
 * Enterprise business logic state machine engine for the MOAT Patent Intelligence Platform.
 * Enforces zero-trust workflow integrity and prevents workflow stage tampering:
 * 1. Strictly enforces the 13-stage lifecycle: New -> Assigned -> Research -> Drafting -> Design Review ->
 *    Patent Analyst Review -> CEO Review -> Approved -> Filing -> Filed -> Renewal -> Completed.
 * 2. Prevents illegal state jumps (e.g., attempting to transition directly from 'New' to 'Approved').
 * 3. Enforces role-based stage gatekeepers (e.g., ONLY CEO and Admin can transition from 'CEO Review' to 'Approved').
 */
export class WorkflowValidationService {
  private static objectStates: Map<string, WorkflowStage> = new Map();

  /**
   * Set initial workflow stage for an object.
   */
  static setInitialStage(objectId: string, stage: WorkflowStage = "New"): void {
    this.objectStates.set(objectId, stage);
  }

  /**
   * Get current workflow stage of an object.
   */
  static getCurrentStage(objectId: string): WorkflowStage {
    return this.objectStates.get(objectId) || "New";
  }

  /**
   * Validate a proposed workflow state transition.
   */
  static validateTransition(
    objectId: string,
    targetStage: WorkflowStage,
    userRole: EnterpriseRole,
    currentStageOverride?: WorkflowStage
  ): { allowed: boolean; currentStage: WorkflowStage; targetStage: WorkflowStage; reason?: string; violationType?: "WORKFLOW_TAMPERING" | "BFLA_PRIVILEGE" } {
    const currentStage = currentStageOverride || this.getCurrentStage(objectId);

    if (currentStage === targetStage) {
      return { allowed: true, currentStage, targetStage };
    }

    // 1. Admin override check (Admin can override transitions if explicitly permitted or for recovery)
    const normalizedRole = PermissionService.normalizeRole(userRole);

    // 2. Check if transition is valid in the lifecycle state machine
    const validTargets = VALID_WORKFLOW_TRANSITIONS[currentStage] || [];
    if (!validTargets.includes(targetStage)) {
      return {
        allowed: false,
        currentStage,
        targetStage,
        reason: `Business Logic State Machine Violation: Cannot transition directly from stage '${currentStage}' to '${targetStage}'. Illegal step-skipping or state tampering blocked.`,
        violationType: "WORKFLOW_TAMPERING"
      };
    }

    // 3. Check role authorization for the target stage (e.g., CEO Review -> Approved requires CEO or Admin)
    const allowedRoles = STAGE_TRANSITION_PERMISSIONS[targetStage] || ["Admin", "CEO"];
    if (!allowedRoles.includes(normalizedRole)) {
      return {
        allowed: false,
        currentStage,
        targetStage,
        reason: `Role Restriction Enforced: Role '${userRole}' is not authorized to execute workflow transition to stage '${targetStage}'. Required roles: [${allowedRoles.join(", ")}].`,
        violationType: "BFLA_PRIVILEGE"
      };
    }

    // 4. Special rule: Patent Analyst can NEVER approve final filings or move to 'Approved'
    if (normalizedRole === "Patent Analyst" && (targetStage === "Approved" || targetStage === "Completed")) {
      return {
        allowed: false,
        currentStage,
        targetStage,
        reason: "Role Bypass Blocked: Patent Analyst is strictly restricted from approving final filings or marking patents as completed.",
        violationType: "BFLA_PRIVILEGE"
      };
    }

    return { allowed: true, currentStage, targetStage };
  }

  /**
   * Execute workflow stage transition if valid.
   */
  static executeTransition(
    objectId: string,
    targetStage: WorkflowStage,
    userRole: EnterpriseRole,
    currentStageOverride?: WorkflowStage
  ): { success: boolean; previousStage: WorkflowStage; newStage: WorkflowStage; reason?: string } {
    const check = this.validateTransition(objectId, targetStage, userRole, currentStageOverride);
    if (!check.allowed) {
      return {
        success: false,
        previousStage: check.currentStage,
        newStage: check.currentStage,
        reason: check.reason
      };
    }

    this.objectStates.set(objectId, targetStage);
    return {
      success: true,
      previousStage: check.currentStage,
      newStage: targetStage
    };
  }

  /**
   * Clear repository (for testing).
   */
  static clearRepository(): void {
    this.objectStates.clear();
  }
}
