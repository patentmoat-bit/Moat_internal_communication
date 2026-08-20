import { NextRequest, NextResponse } from "next/server";
import { WorkflowEngineService } from "@/lib/workflow/WorkflowEngineService";
import { GlobalExceptionHandler } from "@/lib/errors";

/**
 * Enterprise Workflow Tracker API Route
 * 
 * Returns full tracking telemetry for a project workflow:
 * 1. Current Status, Previous Status, Assigned User, Assigned Role.
 * 2. Due Date, Completion Percentage, Timeline, and SLA Status.
 * 3. Immutable transition history, active tasks, and escalation records.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workflowId = searchParams.get("workflowId");

    if (!workflowId) {
      const all = WorkflowEngineService.getAllWorkflows();
      return NextResponse.json({ success: true, count: all.length, workflows: all }, { status: 200 });
    }

    const tracker = WorkflowEngineService.getWorkflowTracker(workflowId);
    if (!tracker.workflow) {
      return NextResponse.json({ success: false, message: `Workflow ID '${workflowId}' not found in repository.` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      workflowId,
      status: tracker.workflow.currentStage,
      previousStatus: tracker.workflow.previousStage || "NONE",
      assignedUser: tracker.workflow.assignedUserId,
      assignedRole: tracker.workflow.assignedRole,
      dueDate: tracker.workflow.dueDate,
      completionPercentage: tracker.workflow.completionPercentage,
      slaStatus: tracker.workflow.slaStatus,
      tasksCount: tracker.tasks.length,
      historyCount: tracker.history.length,
      escalationsCount: tracker.escalations.length,
      data: tracker
    }, { status: 200 });
  } catch (err: any) {
    console.error("[WorkflowTrackerAPI] Error:", err);
    return NextResponse.json({ success: false, message: "Internal server error fetching workflow tracker.", error: err.message }, { status: 500 });
  }
}
