import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'design_assignments.json');
const ACT_FILE = path.join(process.cwd(), 'data', 'activity.json');
const NOTIF_FILE = path.join(process.cwd(), 'data', 'notifications.json');

const AUTHORIZED_SENDER_ROLES = ["PATENT_DRAFTER", "PATENT_ANALYST", "CEO", "ADMIN"];
const AUTHORIZED_ASSIGNEE_ROLES = ["DESIGN_TEAM", "ADMIN"];

// No mock data - clean production state
const defaultAssignments: any[] = [];

function getAssignments(): any[] {
  if (!fs.existsSync(DB_FILE)) {
    saveAssignments([]);
    return [];
  }
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function saveAssignments(data: any[]) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
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
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search')?.toLowerCase();
    const inventionId = searchParams.get('inventionId');

    let assignments = getAssignments();

    if (status && status !== 'ALL') {
      assignments = assignments.filter((a) => a.status === status);
    }

    if (priority && priority !== 'ALL') {
      assignments = assignments.filter((a) => a.priority === priority);
    }

    if (inventionId) {
      assignments = assignments.filter((a) => a.invention_id === inventionId);
    }

    if (search) {
      assignments = assignments.filter((a) =>
        a.title.toLowerCase().includes(search) ||
        a.instructions?.toLowerCase().includes(search) ||
        a.project_title?.toLowerCase().includes(search) ||
        a.id.toLowerCase().includes(search) ||
        a.invention_id?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      assignments,
      total: assignments.length,
      counts: {
        assigned: assignments.filter((a) => a.status === 'ASSIGNED').length,
        in_progress: assignments.filter((a) => a.status === 'IN_PROGRESS').length,
        under_review: assignments.filter((a) => a.status === 'UNDER_REVIEW').length,
        rework: assignments.filter((a) => a.status === 'REWORK').length,
        completed: assignments.filter((a) => a.status === 'COMPLETED').length,
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      invention_id,
      project_title,
      invention_title,
      title,
      figure_numbers,
      instructions,
      priority,
      due_date,
      assigned_by,
      sender_role,
      source_files
    } = body;

    // RBAC Security Check
    const normalizedRole = (sender_role || "PATENT_DRAFTER").toUpperCase().replace(/[\s-]/g, "_");
    const activeSenderRole = normalizedRole;
    if (!AUTHORIZED_SENDER_ROLES.includes(activeSenderRole)) {
      logActivity(
        assigned_by || "Unauthorized User",
        "SECURITY_ALERT_UNAUTHORIZED_ASSIGNMENT_ATTEMPT",
        invention_id || "SYSTEM",
        `Access denied: Role '${activeSenderRole}' attempted to create a design assignment.`
      );
      return NextResponse.json({
        error: `Forbidden: Role '${activeSenderRole}' is not authorized to create design assignments. Permitted roles: ${AUTHORIZED_SENDER_ROLES.join(', ')}`
      }, { status: 403 });
    }

    if (!invention_id || !title) {
      return NextResponse.json({ error: "Missing required fields (invention_id, title)" }, { status: 400 });
    }

    const assignments = getAssignments();

    // Generate new DSG sequence ID
    const maxNum = assignments.reduce((max, a) => {
      const match = a.id?.match(/DSG-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 1000);

    const newId = `DSG-${maxNum + 1}`;

    const newAssignment = {
      id: newId,
      invention_id,
      project_title: project_title || "Patent Architecture Project",
      invention_title: invention_title || title,
      title,
      figure_numbers: figure_numbers || [1],
      assigned_to: body.assigned_member_email || "Design Team",
      assigned_member_email: body.assigned_member_email || null,
      assigned_by: assigned_by || "Alice Drafter",
      sender_role: activeSenderRole,
      status: "ASSIGNED",
      priority: priority || "NORMAL",
      due_date: due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      assigned_at: new Date().toISOString(),
      instructions: instructions || "Please formalize figures into vector line art complying with 37 CFR § 1.84.",
      source_files: source_files || [],
      current_version: 1,
      versions: [
        {
          version: 1,
          title: "Initial Assignment Brief",
          file_name: source_files?.[0]?.name || "Source_Brief.pdf",
          file_url: source_files?.[0]?.url || "#",
          file_size: source_files?.[0]?.size || "500 KB",
          file_type: source_files?.[0]?.type || "reference",
          notes: instructions || "Original requirement from Drafter.",
          uploaded_by: assigned_by || "Patent Drafter",
          created_at: new Date().toISOString()
        }
      ]
    };

    assignments.unshift(newAssignment);
    saveAssignments(assignments);

    // Audit Log & Notification
    logActivity(
      assigned_by || "Patent Drafter",
      "CREATED_DESIGN_ASSIGNMENT",
      invention_id,
      `Dispatched design assignment '${title}' (${newId}) targeting FIG ${figure_numbers ? figure_numbers.join(', ') : '1'} to Design Team`
    );

    addNotification(
      `New Drawing Assignment: ${title}`,
      `${assigned_by || 'Patent Drafter'} assigned ${title} (${newId}) for formalization.`,
      "DESIGN_TEAM",
      assigned_by || "Patent Drafter",
      `/dashboard/design-team/workspace/assigned?id=${newId}`
    );

    return NextResponse.json({ success: true, assignment: newAssignment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, action, actor, actor_role, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing assignment id" }, { status: 400 });
    }

    const assignments = getAssignments();
    const index = assignments.findIndex((a) => a.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const current = assignments[index];

    if (action === "assign_member" || action === "share") {
      const { member_email, share_note, shared_by } = body;
      current.assigned_member_email = member_email;
      current.assigned_to = member_email;
      current.shared_at = new Date().toISOString();
      current.shared_by = shared_by || actor || "Design Team";
      if (!current.share_history) current.share_history = [];
      current.share_history.unshift({
        member_email,
        shared_by: shared_by || actor || "Design Team",
        shared_at: new Date().toISOString(),
        note: share_note || "Assigned via Mail ID"
      });

      logActivity(
        actor || "Design Team",
        "ASSIGNED_TO_MEMBER_EMAIL",
        current.invention_id,
        `Assigned design task '${current.title}' to member email: ${member_email}`
      );

      addNotification(
        "Design Task Assigned to You",
        `You have been assigned design work for '${current.title}' (${current.id}) by ${actor || 'Design Team'}. [Azure/Outlook Notification Queued]`,
        member_email,
        actor || "Design Team",
        `/dashboard/design-team/workspace/assigned?id=${current.id}`
      );
    } else if (action === "accept") {
      const activeRole = actor_role || "DESIGN_TEAM";
      if (!AUTHORIZED_ASSIGNEE_ROLES.includes(activeRole)) {
        logActivity(
          actor || "Unauthorized User",
          "SECURITY_ALERT_UNAUTHORIZED_ACCEPT_ATTEMPT",
          current.invention_id,
          `Access denied: Role '${activeRole}' attempted to accept design assignment ${id}.`
        );
        return NextResponse.json({
          error: `Forbidden: Role '${activeRole}' cannot accept design tasks. Only DESIGN_TEAM or ADMIN can start assignments.`
        }, { status: 403 });
      }

      current.status = "IN_PROGRESS";
      current.accepted_at = new Date().toISOString();
      current.accepted_by = actor || "Design Team";

      logActivity(
        actor || "Design Team",
        "STARTED_DESIGN_TASK",
        current.invention_id,
        `Design Team accepted and started work on task '${current.title}' (${current.id})`
      );

      addNotification(
        "Design Work Started",
        `Work started on '${current.title}' by ${actor || 'Design Team'}.`,
        current.sender_role || "PATENT_DRAFTER",
        actor || "Design Team",
        `/dashboard/design-team/workspace/in-progress?id=${current.id}`
      );
    } else if (status) {
      current.status = status;
      if (notes) current.last_notes = notes;
    }

    assignments[index] = current;
    saveAssignments(assignments);

    return NextResponse.json({ success: true, assignment: current });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      saveAssignments([]);
      return NextResponse.json({ success: true, message: "All design assignments cleared" });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing assignment id" }, { status: 400 });
    }

    let assignments = getAssignments();
    assignments = assignments.filter((a) => a.id !== id);
    saveAssignments(assignments);

    return NextResponse.json({ success: true, remaining: assignments.length });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
  }
}

export const PATCH = PUT;
