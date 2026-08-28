// ─────────────────────────────────────────────────────────────────────────────
// MOAT — Workflow Transition API
// POST /api/workflow/transition
// Validates and executes a workflow status transition, publishing all events.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventBus, type EventType } from "@/lib/events/eventBus";
import { getNextStatus, canTransition, type WorkflowStatus } from "@/lib/events/workflowStateMachine";
import { GlobalExceptionHandler } from "@/lib/errors";
import { requireAuth } from "@/lib/security/requireAdmin";

export async function POST(req: NextRequest) {
  try {
    // actorId/actorRole are derived from the verified session, not trusted from
    // the request body — this previously had NO auth check at all and let the
    // client self-declare who performed the transition (e.g. claiming
    // actorRole: "CEO" to drive an approval-stage transition/notification).
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { projectId, eventType, metadata, resourceType } = body;
    const actorId = auth.id;
    const actorRole = auth.role;

    if (!projectId || !eventType) {
      return NextResponse.json(
        { error: "projectId and eventType are required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const table = resourceType === "trademark" ? "trademarks" : "inventions";

    // 1. Fetch the current project
    const { data: project, error: fetchErr } = await supabase
      .from(table)
      .select("*")
      .eq("id", projectId)
      .single();

    if (fetchErr || !project) {
      return NextResponse.json(
        { error: `Project not found: ${fetchErr?.message || "Unknown"}` },
        { status: 404 }
      );
    }

    // 2. Determine the new status
    const newStatus = getNextStatus(eventType);
    if (!newStatus) {
      return NextResponse.json(
        { error: `Event type '${eventType}' does not trigger a status change.` },
        { status: 400 }
      );
    }

    // 3. Validate the transition
    const currentStatus = project.status as WorkflowStatus;
    const isValid = canTransition(currentStatus, newStatus);

    if (!isValid) {
      return NextResponse.json(
        {
          error: `Invalid transition: '${currentStatus}' → '${newStatus}'. Allowed transitions from '${currentStatus}' are: ${
            getValidTransitionsForStatus(currentStatus).join(", ") || "none"
          }`,
          currentStatus,
          requestedStatus: newStatus,
        },
        { status: 422 }
      );
    }

    // 4. Publish the event (all side effects happen asynchronously)
    EventBus.publishEvent({
      type: eventType as EventType,
      actorId: actorId || "System",
      actorRole: actorRole || undefined,
      resourceId: projectId,
      resourceType: resourceType || "invention",
      notificationTitle: getNotificationTitle(eventType, project.title),
      notificationMessage: getNotificationMessage(eventType, project.title),
      actionUrl: `/dashboard/projects/${projectId}`,
      priority: getPriority(eventType),
      projectData: project,
      metadata: {
        title: project.title,
        old_status: currentStatus,
        new_status: newStatus,
        ...metadata,
      },
    });

    return NextResponse.json({
      success: true,
      projectId,
      oldStatus: currentStatus,
      newStatus,
      eventType,
      message: `Workflow transition: ${currentStatus} → ${newStatus}`,
    });
  } catch (err: any) {
    console.error("[Workflow API] Error:", err);
    return await GlobalExceptionHandler.handle(err);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getValidTransitionsForStatus(status: WorkflowStatus): string[] {
  const { VALID_TRANSITIONS } = require("@/lib/events/workflowStateMachine");
  return VALID_TRANSITIONS[status] || [];
}

function getNotificationTitle(eventType: string, projectTitle: string): string {
  const titles: Record<string, string> = {
    PROJECT_CREATED: "New Project Created",
    PROJECT_ASSIGNED: "Project Assigned",
    RESEARCH_STARTED: "Research Started",
    DOCUMENT_UPLOADED: "Document Uploaded",
    DESIGN_REQUESTED: "Design Work Required",
    DESIGN_STARTED: "Design In Progress",
    DESIGN_COMPLETED: "Design Completed",
    REPORT_SUBMITTED: "Report Submitted for Review",
    CEO_APPROVED: "Project Approved",
    CEO_REJECTED: "Revision Required",
    REVISION_REQUIRED: "Revision Required",
    REVISION_COMPLETED: "Revision Completed",
    FILING_STARTED: "Filing Started",
    FILED: "Patent Filed",
    RENEWAL_REMINDER: "Renewal Reminder",
    PROJECT_COMPLETED: "Project Completed",
  };
  return titles[eventType] || `Workflow Update: ${eventType.replace(/_/g, " ")}`;
}

function getNotificationMessage(eventType: string, projectTitle: string): string {
  return `Project "${projectTitle}" — ${getNotificationTitle(eventType, projectTitle)}`;
}

function getPriority(eventType: string): "low" | "normal" | "high" | "critical" {
  const highPriority = ["CEO_REJECTED", "REVISION_REQUIRED", "RENEWAL_REMINDER"];
  const criticalPriority = ["FILING_STARTED", "FILED"];
  if (criticalPriority.includes(eventType)) return "critical";
  if (highPriority.includes(eventType)) return "high";
  return "normal";
}
