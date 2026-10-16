import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ASG_FILE = path.join(process.cwd(), 'data', 'design_assignments.json');
const SUB_FILE = path.join(process.cwd(), 'data', 'design_submissions.json');
const REM_FILE = path.join(process.cwd(), 'data', 'design_reminders.json');
const ACT_FILE = path.join(process.cwd(), 'data', 'activity.json');

function getReminders(): any[] {
  if (!fs.existsSync(REM_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(REM_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveReminders(data: any[]) {
  const dir = path.dirname(REM_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(REM_FILE, JSON.stringify(data, null, 2));
}

function getAssignments(): any[] {
  if (!fs.existsSync(ASG_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(ASG_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function getSubmissions(): any[] {
  if (!fs.existsSync(SUB_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(SUB_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
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

export async function GET(req: Request) {
  try {
    const assignments = getAssignments();
    const submissions = getSubmissions();
    const reminders = getReminders();

    // 1. Calculate Deadlines
    const deadlines: any[] = [];
    assignments.forEach((asg) => {
      if (asg.due_date && asg.status !== 'COMPLETED') {
        const dueDate = new Date(asg.due_date);
        const now = new Date();
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let urgency: "CRITICAL" | "HIGH" | "NORMAL" = "NORMAL";
        if (diffDays < 2) urgency = "CRITICAL";
        else if (diffDays <= 7) urgency = "HIGH";

        deadlines.push({
          id: `DL-${asg.id}`,
          assignment_id: asg.id,
          invention_id: asg.invention_id,
          project_title: asg.project_title,
          title: asg.title,
          figure_numbers: asg.figure_numbers || [1],
          due_date: asg.due_date,
          days_remaining: diffDays,
          urgency,
          status: asg.status,
          assigned_by: asg.assigned_by,
          sender_role: asg.sender_role
        });
      }
    });

    deadlines.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    // 2. Calculate Action Items
    const action_items: any[] = [];
    assignments.forEach((asg) => {
      if (asg.status === 'ASSIGNED') {
        action_items.push({
          id: `ACT-${asg.id}-ACCEPT`,
          type: "ACCEPT_ASSIGNMENT",
          title: `Accept New Assignment: ${asg.title}`,
          description: `Requested by ${asg.assigned_by} (${asg.sender_role}) for ${asg.invention_id}. You must accept to begin drawing.`,
          priority: "HIGH",
          assignment_id: asg.id,
          invention_id: asg.invention_id,
          link: `/dashboard/design-team/workspace/assigned`
        });
      } else if (asg.status === 'REWORK') {
        action_items.push({
          id: `ACT-${asg.id}-REWORK`,
          type: "REWORK_REQUIRED",
          title: `Address Reviewer Revisions: ${asg.title}`,
          description: `Reviewer feedback: "${asg.last_notes || 'Adjust reference numerals and sheet margins.'}"`,
          priority: "CRITICAL",
          assignment_id: asg.id,
          invention_id: asg.invention_id,
          link: `/dashboard/design-team/workspace/in-progress?id=${asg.id}`
        });
      } else if (asg.status === 'IN_PROGRESS') {
        action_items.push({
          id: `ACT-${asg.id}-DRAFT`,
          type: "ACTIVE_DRAFTING",
          title: `Finalize Active Figures for ${asg.title}`,
          description: `Due on ${new Date(asg.due_date).toLocaleDateString()}. Export sheet or submit to reviewer upon completion.`,
          priority: "NORMAL",
          assignment_id: asg.id,
          invention_id: asg.invention_id,
          link: `/dashboard/design-team/workspace/in-progress?id=${asg.id}`
        });
      }
    });

    // Check if any submissions pending reviewer action
    submissions.forEach((sub) => {
      if (sub.status === 'PENDING_REVIEW') {
        action_items.push({
          id: `ACT-${sub.id}-PENDING`,
          type: "AWAITING_REVIEW",
          title: `Awaiting Review: ${sub.title}`,
          description: `Submitted to ${sub.recipient_user} (${sub.recipient_role}) on ${new Date(sub.submitted_at).toLocaleDateString()}.`,
          priority: "NORMAL",
          submission_id: sub.id,
          invention_id: sub.invention_id,
          link: `/dashboard/design-team/workspace/under-review`
        });
      }
    });

    return NextResponse.json({
      success: true,
      deadlines,
      reminders,
      action_items,
      counts: {
        deadlines: deadlines.length,
        reminders: reminders.filter((r) => r.status === 'PENDING').length,
        action_items: action_items.length,
        critical_items: action_items.filter((a) => a.priority === 'CRITICAL').length
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch docket data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, due_date, priority, target_invention, actor } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    let reminders = getReminders();
    const newReminder = {
      id: `REM-${Date.now()}`,
      title,
      description: description || "",
      due_date: due_date || new Date(Date.now() + 86400000 * 3).toISOString(),
      priority: priority || "NORMAL",
      target_invention: target_invention || "INN-0012",
      status: "PENDING",
      created_at: new Date().toISOString()
    };

    reminders.unshift(newReminder);
    saveReminders(reminders);

    logActivity(
      actor || "Design Team",
      "CREATED_DOCKET_REMINDER",
      target_invention || "INN-0012",
      `Set reminder: '${title}'`
    );

    return NextResponse.json({ success: true, reminder: newReminder }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { reminder_id, status } = body; // status: "COMPLETED" | "DISMISSED"

    if (!reminder_id) {
      return NextResponse.json({ error: "reminder_id is required" }, { status: 400 });
    }

    let reminders = getReminders();
    const idx = reminders.findIndex((r) => r.id === reminder_id);
    if (idx === -1) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    reminders[idx].status = status || "COMPLETED";
    reminders[idx].resolved_at = new Date().toISOString();
    saveReminders(reminders);

    return NextResponse.json({ success: true, reminder: reminders[idx] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update reminder" }, { status: 500 });
  }
}
