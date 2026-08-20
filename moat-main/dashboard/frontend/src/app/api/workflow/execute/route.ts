import { NextRequest, NextResponse } from "next/server";
import { WorkflowEngineService } from "@/lib/workflow/WorkflowEngineService";
import { GlobalExceptionHandler } from "@/lib/errors";

/**
 * Centralized Enterprise Workflow Execution API Route
 * 
 * Manages the lifecycle of Patent and Trademark projects:
 * 1. POST /api/workflow/execute { action: "CREATE", type, name, ownerId, creatorRole } -> creates project.
 * 2. POST /api/workflow/execute { action: "TRANSITION", workflowId, targetStage, userId, userRole, comments } -> transitions stage.
 * 3. POST /api/workflow/execute { action: "APPROVE", workflowId, approvalAction, userId, userRole, comments } -> processes approval engine rules.
 * 4. POST /api/workflow/execute { action: "CHECK_SLA" } -> triggers system SLA monitoring and escalations.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, type, name, ownerId, creatorRole, workflowId, targetStage, userId, userRole, comments, approvalAction } = body;

    if (!action) {
      return NextResponse.json({ success: false, message: "Missing action parameter in request payload." }, { status: 400 });
    }

    if (action === "CREATE") {
      if (!type || !name || !ownerId) {
        return NextResponse.json({ success: false, message: "Missing type, name, or ownerId for workflow creation." }, { status: 400 });
      }
      const wf = await WorkflowEngineService.createWorkflow(type, name, ownerId, creatorRole || "CEO");
      return NextResponse.json({ success: true, message: `Successfully created ${type} workflow '${name}'.`, workflow: wf }, { status: 201 });
    }

    if (action === "TRANSITION") {
      if (!workflowId || !targetStage) {
        return NextResponse.json({ success: false, message: "Missing workflowId or targetStage for workflow transition." }, { status: 400 });
      }
      const res = await WorkflowEngineService.transitionWorkflow(workflowId, targetStage, userId || "system", userRole || "Patent Analyst", comments);
      if (!res.success) {
        return NextResponse.json({ success: false, message: "Workflow transition blocked by state machine.", reason: res.reason }, { status: 422 });
      }
      return NextResponse.json({ success: true, message: `Transitioned workflow to '${targetStage}'.`, workflow: res.workflow, previousStage: res.previousStage, newStage: res.newStage }, { status: 200 });
    }

    if (action === "APPROVE") {
      if (!workflowId || !approvalAction) {
        return NextResponse.json({ success: false, message: "Missing workflowId or approvalAction for approval processing." }, { status: 400 });
      }
      const res = await WorkflowEngineService.processApproval(workflowId, approvalAction, userId || "system", userRole || "CEO", comments);
      if (!res.success) {
        return NextResponse.json({ success: false, message: "Approval processing failed or rejected by policy.", reason: res.reason }, { status: 422 });
      }
      return NextResponse.json({ success: true, message: `Successfully processed approval action '${approvalAction}'.`, workflow: res.workflow, targetStage: res.targetStage }, { status: 200 });
    }

    if (action === "CHECK_SLA") {
      const slaRes = await WorkflowEngineService.checkSLAs();
      return NextResponse.json({ success: true, message: "SLA evaluation completed.", slaSummary: slaRes }, { status: 200 });
    }

    return NextResponse.json({ success: false, message: `Unsupported workflow action: '${action}'.` }, { status: 400 });
  } catch (err: any) {
    console.error("[WorkflowExecuteAPI] Error:", err);
    return NextResponse.json({ success: false, message: "Internal server error in workflow execution.", error: err.message }, { status: 500 });
  }
}
