import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'design_submissions.json');
const ASG_FILE = path.join(process.cwd(), 'data', 'design_assignments.json');
const NOTIF_FILE = path.join(process.cwd(), 'data', 'notifications.json');
const ACT_FILE = path.join(process.cwd(), 'data', 'activity.json');

const AUTHORIZED_REVIEWER_ROLES = ["PATENT_DRAFTER", "PATENT_ANALYST", "CEO", "ADMIN"];
const AUTHORIZED_RECIPIENT_ROLES = ["PATENT_DRAFTER", "PATENT_ANALYST", "CEO"];
const AUTHORIZED_SUBMITTER_ROLES = ["DESIGN_TEAM", "ADMIN"];

function getSubmissions(): any[] {
  if (!fs.existsSync(DB_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveSubmissions(data: any[]) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function getAssignments(): any[] {
  if (!fs.existsSync(ASG_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(ASG_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveAssignments(data: any[]) {
  const dir = path.dirname(ASG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ASG_FILE, JSON.stringify(data, null, 2));
}

function logActivity(actor: string, action: string, invention_id: string, details: string) {
  try {
    let list: any[] = [];
    if (fs.existsSync(ACT_FILE)) {
      try { list = JSON.parse(fs.readFileSync(ACT_FILE, 'utf8')); } catch(e) {}
    }
    list.unshift({
      id: 'ACT-' + Date.now() + Math.random().toString(36).substring(7),
      actor,
      action,
      invention_id,
      details,
      timestamp: new Date().toISOString()
    });
    fs.writeFileSync(ACT_FILE, JSON.stringify(list, null, 2));
  } catch(e) {}
}

function addNotification(title: string, message: string, target_role: string, sender: string, actionUrl: string) {
  try {
    let notifs: any[] = [];
    if (fs.existsSync(NOTIF_FILE)) {
      try { notifs = JSON.parse(fs.readFileSync(NOTIF_FILE, 'utf8')); } catch(e) {}
    }
    notifs.unshift({
      id: 'NOTIF-' + Date.now(),
      title,
      message,
      target_role,
      sender,
      actionUrl,
      readAt: null,
      createdAt: new Date().toISOString()
    });
    fs.writeFileSync(NOTIF_FILE, JSON.stringify(notifs, null, 2));
  } catch(e) {}
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('assignmentId');
    const recipientRole = searchParams.get('role');
    const status = searchParams.get('status');

    let list = getSubmissions();

    if (assignmentId) {
      list = list.filter((s: any) => s.assignment_id === assignmentId);
    }
    if (recipientRole && recipientRole !== 'ALL') {
      list = list.filter((s: any) => s.recipient_role === recipientRole);
    }
    if (status && status !== 'ALL') {
      list = list.filter((s: any) => s.status === status);
    }

    return NextResponse.json({ success: true, submissions: list });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      assignment_id,
      version,
      recipient_role,
      recipient_user,
      message,
      notes,
      files,
      actor,
      submitter_role
    } = body;

    if (!assignment_id || !recipient_role) {
      return NextResponse.json({ error: "Missing required fields: assignment_id and recipient_role" }, { status: 400 });
    }

    // RBAC: Submitter role verification (if provided)
    if (submitter_role && !AUTHORIZED_SUBMITTER_ROLES.includes(submitter_role)) {
      logActivity(
        actor || "Unknown",
        "UNAUTHORIZED_SUBMITTER_BLOCKED",
        "SYSTEM",
        `Blocked submission from unauthorized role '${submitter_role}'`
      );
      return NextResponse.json({ error: `Forbidden: Submitter role '${submitter_role}' is not authorized to submit design deliverables.` }, { status: 403 });
    }

    // RBAC: Recipient role verification
    if (!AUTHORIZED_RECIPIENT_ROLES.includes(recipient_role)) {
      return NextResponse.json({ error: "Invalid recipient role. Must be PATENT_DRAFTER, PATENT_ANALYST, or CEO." }, { status: 403 });
    }

    let assignments = getAssignments();
    const asgIdx = assignments.findIndex((a: any) => a.id === assignment_id);

    if (asgIdx === -1) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const assignment = assignments[asgIdx];
    const subVersion = version || assignment.current_version || 1;

    let submissions = getSubmissions();

    const newSubmission = {
      id: "SUB-" + Date.now(),
      assignment_id,
      invention_id: assignment.invention_id,
      project_title: assignment.project_title,
      title: assignment.title,
      figure_numbers: assignment.figure_numbers || [1],
      submitted_version: subVersion,
      recipient_role,
      recipient_user: recipient_user || "Authorized Reviewer",
      message: message || "Design revision submitted for review.",
      notes: notes || "",
      files: files || (assignment.versions?.[0] ? [assignment.versions[0]] : []),
      submitted_by: actor || "Design Team",
      submitted_at: new Date().toISOString(),
      status: "PENDING_REVIEW"
    };

    submissions.unshift(newSubmission);
    saveSubmissions(submissions);

    // Update assignment status to UNDER_REVIEW
    assignment.status = "UNDER_REVIEW";
    assignment.last_submitted_at = new Date().toISOString();
    assignment.last_recipient_role = recipient_role;
    assignment.last_recipient_user = recipient_user;
    assignments[asgIdx] = assignment;
    saveAssignments(assignments);

    // Determine target route for notification
    let targetActionUrl = "/dashboard";
    if (recipient_role === "PATENT_DRAFTER") {
      targetActionUrl = `/dashboard/patent-drafter/documents/drawings?id=${assignment.invention_id}`;
    } else if (recipient_role === "CEO") {
      targetActionUrl = `/dashboard/ceo/approvals`;
    } else if (recipient_role === "PATENT_ANALYST") {
      targetActionUrl = `/inventions/${assignment.invention_id}`;
    }

    // Dispatch in-app notification to the recipient
    addNotification(
      "Design Review Request",
      `${actor || 'Design Team'} submitted '${assignment.title}' (v${subVersion}) for your review.`,
      recipient_role,
      actor || "Design Team",
      targetActionUrl
    );

    // Log Activity
    logActivity(
      actor || "Design Team",
      "SUBMITTED_FOR_REVIEW",
      assignment.invention_id,
      `Submitted '${assignment.title}' (v${subVersion}) to ${recipient_role} (${recipient_user || 'Reviewer'})`
    );

    return NextResponse.json({
      success: true,
      submission: newSubmission,
      assignment
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to submit work for review" }, { status: 500 });
  }
}

// PATCH handles Reviewer Actions: ACCEPT (Complete), REWORK (Rework loop), REMIND (Ping)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const {
      submission_id,
      action, // "ACCEPT" | "REWORK" | "REMIND"
      reviewer_name,
      reviewer_role,
      feedback_notes
    } = body;

    if (!submission_id || !action) {
      return NextResponse.json({ error: "Missing submission_id or action" }, { status: 400 });
    }

    if (!["ACCEPT", "REWORK", "REMIND"].includes(action)) {
      return NextResponse.json({ error: `Invalid action '${action}'. Must be ACCEPT, REWORK, or REMIND.` }, { status: 400 });
    }

    let submissions = getSubmissions();
    const subIdx = submissions.findIndex((s: any) => s.id === submission_id);

    if (subIdx === -1) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const submission = submissions[subIdx];
    let assignments = getAssignments();
    const asgIdx = assignments.findIndex((a: any) => a.id === submission.assignment_id);

    if (asgIdx === -1) {
      return NextResponse.json({ error: "Associated assignment not found" }, { status: 404 });
    }

    const assignment = assignments[asgIdx];
    const reviewer = reviewer_name || submission.recipient_user || "Authorized Reviewer";
    const role = reviewer_role || submission.recipient_role || "REVIEWER";

    // SECURITY & RBAC ENFORCEMENT:
    // 1. Prevent Self-Approval: Design Team cannot approve their own work
    if (action === "ACCEPT" || action === "REWORK") {
      const isDesignerRole = role === "DESIGN_TEAM";
      const isDesignerName = reviewer.toLowerCase().includes("design team") || reviewer.toLowerCase() === "designer";
      const isSameSubmitter = reviewer === submission.submitted_by && isDesignerRole;

      if (isDesignerRole || isDesignerName || isSameSubmitter) {
        logActivity(
          reviewer,
          "RBAC_SELF_APPROVAL_BLOCKED",
          assignment.invention_id,
          `Blocked self-approval attempt by '${reviewer}' (${role}) on submission '${submission.title}'`
        );
        return NextResponse.json({
          error: "Forbidden: Self-approval is strictly forbidden. Design deliverables must be reviewed and approved by an authorized external reviewer (Patent Drafter, Patent Analyst, CEO, or Admin)."
        }, { status: 403 });
      }

      // 2. Validate that reviewer possesses authorized reviewer role
      if (!AUTHORIZED_REVIEWER_ROLES.includes(role)) {
        logActivity(
          reviewer,
          "RBAC_UNAUTHORIZED_REVIEWER_BLOCKED",
          assignment.invention_id,
          `Blocked review action by unauthorized role '${role}' on submission '${submission.title}'`
        );
        return NextResponse.json({
          error: `Forbidden: Role '${role}' is not authorized to review design deliverables. Authorized roles: ${AUTHORIZED_REVIEWER_ROLES.join(", ")}.`
        }, { status: 403 });
      }
    }

    if (action === "ACCEPT") {
      submission.status = "APPROVED";
      submission.reviewed_at = new Date().toISOString();
      submission.reviewed_by = reviewer;
      submission.review_notes = feedback_notes || "All figures accepted and approved without revisions.";
      submissions[subIdx] = submission;
      saveSubmissions(submissions);

      assignment.status = "COMPLETED";
      assignment.completed_at = new Date().toISOString();
      assignment.approved_by = reviewer;
      assignment.last_notes = feedback_notes || "Deliverables approved.";
      assignments[asgIdx] = assignment;
      saveAssignments(assignments);

      addNotification(
        "Design Submission Approved!",
        `'${submission.title}' (v${submission.submitted_version}) has been approved by ${reviewer} (${role}). Status updated to COMPLETED.`,
        "DESIGN_TEAM",
        reviewer,
        `/dashboard/design-team/workspace/completed`
      );

      logActivity(
        reviewer,
        "APPROVED_DESIGN_DELIVERABLE",
        assignment.invention_id,
        `Approved design '${submission.title}' (v${submission.submitted_version}) as final deliverable.`
      );

      return NextResponse.json({
        success: true,
        action: "ACCEPT",
        submission,
        assignment
      });
    } else if (action === "REWORK") {
      submission.status = "REWORK_REQUESTED";
      submission.reviewed_at = new Date().toISOString();
      submission.reviewed_by = reviewer;
      submission.review_notes = feedback_notes || "Please revise reference callouts and margin spacing.";
      submissions[subIdx] = submission;
      saveSubmissions(submissions);

      assignment.status = "REWORK";
      assignment.rework_requested_at = new Date().toISOString();
      assignment.last_notes = feedback_notes || "Reviewer requested design revisions.";
      assignments[asgIdx] = assignment;
      saveAssignments(assignments);

      addNotification(
        "Rework Requested on Design",
        `Reviewer ${reviewer} requested revisions on '${submission.title}': "${feedback_notes || 'Please adjust drawing details'}"`,
        "DESIGN_TEAM",
        reviewer,
        `/dashboard/design-team/workspace/in-progress?id=${assignment.id}`
      );

      logActivity(
        reviewer,
        "REQUESTED_DESIGN_REWORK",
        assignment.invention_id,
        `Requested rework on '${submission.title}': ${feedback_notes || 'Adjustments needed.'}`
      );

      return NextResponse.json({
        success: true,
        action: "REWORK",
        submission,
        assignment
      });
    } else if (action === "REMIND") {
      submission.last_reminded_at = new Date().toISOString();
      submissions[subIdx] = submission;
      saveSubmissions(submissions);

      addNotification(
        "Design Review Reminder",
        `Friendly reminder: Design deliverable '${submission.title}' (v${submission.submitted_version}) is awaiting your review.`,
        submission.recipient_role,
        "Design Team",
        `/dashboard/design-team/workspace/under-review`
      );

      logActivity(
        "Design Team",
        "SENT_REVIEW_REMINDER",
        assignment.invention_id,
        `Sent review reminder to ${submission.recipient_role} (${submission.recipient_user}) for '${submission.title}'.`
      );

      return NextResponse.json({
        success: true,
        action: "REMIND",
        submission
      });
    }

    return NextResponse.json({ error: "Unsupported review action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process review action" }, { status: 500 });
  }
}
