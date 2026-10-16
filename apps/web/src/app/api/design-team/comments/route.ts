import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CMT_FILE = path.join(process.cwd(), 'data', 'design_comments.json');
const ACT_FILE = path.join(process.cwd(), 'data', 'activity.json');
const NOTIF_FILE = path.join(process.cwd(), 'data', 'notifications.json');

function getComments(): any[] {
  if (!fs.existsSync(CMT_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(CMT_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveComments(data: any[]) {
  const dir = path.dirname(CMT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CMT_FILE, JSON.stringify(data, null, 2));
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

function sanitizeCommentText(text: string): string {
  if (!text) return "";
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/onerror\s*=/gi, "")
    .replace(/onload\s*=/gi, "")
    .trim();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('assignmentId');
    const inventionId = searchParams.get('inventionId');

    let comments = getComments();

    if (assignmentId) {
      comments = comments.filter((c: any) => c.assignment_id === assignmentId);
    }
    if (inventionId && inventionId !== 'ALL') {
      comments = comments.filter((c: any) => c.invention_id === inventionId);
    }

    return NextResponse.json({ success: true, comments });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch design comments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      parent_id, // optional: if replying to existing comment
      assignment_id,
      invention_id,
      figure_number,
      content,
      author,
      role
    } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: "Missing or invalid comment content" }, { status: 400 });
    }

    const cleanContent = sanitizeCommentText(content);
    if (!cleanContent) {
      return NextResponse.json({ error: "Comment content cannot be empty after sanitization" }, { status: 400 });
    }

    let comments = getComments();
    const actor = author || "Design Team";
    const userRole = role || "DESIGN_TEAM";

    if (parent_id) {
      // Replying to existing comment
      const parentIdx = comments.findIndex((c: any) => c.id === parent_id);
      if (parentIdx === -1) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }

      const reply = {
        id: `CMT-${Date.now()}-R`,
        author: actor,
        role: userRole,
        avatar: actor.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase(),
        content: cleanContent,
        created_at: new Date().toISOString()
      };

      if (!comments[parentIdx].replies) comments[parentIdx].replies = [];
      comments[parentIdx].replies.push(reply);
      saveComments(comments);

      logActivity(
        actor,
        "POSTED_DESIGN_REPLY",
        comments[parentIdx].invention_id || "INN-0012",
        `Replied on figure feedback thread for ${comments[parentIdx].assignment_id}`
      );

      return NextResponse.json({ success: true, reply, comment: comments[parentIdx] }, { status: 201 });
    } else {
      // New top-level comment
      const newComment = {
        id: `CMT-${Date.now()}`,
        assignment_id: assignment_id || "DSG-1003",
        invention_id: invention_id || "INN-0012",
        figure_number: figure_number || 1,
        author: actor,
        role: userRole,
        avatar: actor.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase(),
        content: cleanContent,
        created_at: new Date().toISOString(),
        replies: []
      };

      comments.unshift(newComment);
      saveComments(comments);

      // Notify other roles if posted by Design Team
      if (userRole === "DESIGN_TEAM") {
        addNotification(
          "Design Comment Posted",
          `${actor} posted feedback on FIG ${newComment.figure_number}: "${cleanContent.substring(0, 60)}..."`,
          "PATENT_DRAFTER",
          actor,
          `/dashboard/design-team/collab/comments`
        );
      }

      logActivity(
        actor,
        "POSTED_DESIGN_COMMENT",
        invention_id || "INN-0012",
        `Posted design feedback on ${assignment_id || 'drawing task'}: "${cleanContent.substring(0, 50)}"`
      );

      return NextResponse.json({ success: true, comment: newComment }, { status: 201 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
