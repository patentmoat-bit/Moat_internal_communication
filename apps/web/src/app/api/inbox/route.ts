import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const INBOX_FILE = path.join(process.cwd(), 'data', 'inbox_items.json');
const NOTIF_FILE = path.join(process.cwd(), 'data', 'notifications.json');
const ACT_FILE = path.join(process.cwd(), 'data', 'activity.json');

// No mock data - completely clean state for live production workflow
const INITIAL_INBOX_ITEMS: any[] = [];

function getInboxItems(): any[] {
  if (!fs.existsSync(INBOX_FILE)) {
    saveInboxItems(INITIAL_INBOX_ITEMS);
    return INITIAL_INBOX_ITEMS;
  }
  try {
    const data = JSON.parse(fs.readFileSync(INBOX_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function saveInboxItems(items: any[]) {
  const dir = path.dirname(INBOX_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(INBOX_FILE, JSON.stringify(items, null, 2));
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
    const role = searchParams.get('role');
    const type = searchParams.get('type');
    const search = searchParams.get('search')?.toLowerCase();

    let items = getInboxItems();

    if (role && role !== 'ALL') {
      items = items.filter(
        (i) => i.target_role === role || i.target_role === 'ALL' || !i.target_role
      );
    }

    if (type && type !== 'ALL') {
      if (type === 'UNREAD') {
        items = items.filter((i) => !i.is_read);
      } else {
        items = items.filter((i) => i.type === type);
      }
    }

    if (search) {
      items = items.filter(
        (i) =>
          (i.title || '').toLowerCase().includes(search) ||
          (i.description || '').toLowerCase().includes(search) ||
          (i.matter_ref || '').toLowerCase().includes(search) ||
          (i.sender_name || '').toLowerCase().includes(search) ||
          (i.attached_asset?.name || '').toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      items,
      unread_count: items.filter((i) => !i.is_read).length,
      total_count: items.length
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch inbox items" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      type, // "DOCUMENT_SHARE" | "APPROVAL_REQUEST" | "ASSIGNMENT" | "REVIEW_REQUEST"
      matter_ref,
      sender_name,
      sender_role,
      target_role,
      priority,
      description,
      attached_asset,
      action_type
    } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    let items = getInboxItems();

    const newItem = {
      id: "inb-" + Date.now(),
      type: type || "DOCUMENT_SHARE",
      title,
      sender_role: sender_role || "DESIGN_TEAM",
      sender_name: sender_name || "Team Member",
      target_role: target_role || "ALL",
      matter_ref: matter_ref || "INN-0012",
      timestamp: "Just now",
      is_read: false,
      priority: priority || "HIGH",
      description: description || "Document / Asset shared for cross-role review and action.",
      attached_asset: attached_asset || {
        name: "Shared_Asset.pdf",
        url: "/documents/Novelty_Research_Finding_Excerpt.pdf",
        type: "pdf",
        size: "1.2 MB",
        compliance: "Cross-Role Shared Asset"
      },
      action_type: action_type || "REVIEW_AND_WORK",
      status: "PENDING_REVIEW",
      created_at: new Date().toISOString()
    };

    items.unshift(newItem);
    saveInboxItems(items);

    // Create Notification
    addNotification(
      `New Document Shared: ${newItem.title}`,
      `${newItem.sender_name} (${newItem.sender_role}) shared '${newItem.attached_asset?.name}' on ${newItem.matter_ref} for review.`,
      newItem.target_role,
      newItem.sender_name,
      `/inbox?id=${newItem.id}`
    );

    // Record Activity Log
    logActivity(
      newItem.sender_name,
      "SHARED_DOCUMENT_IN_INBOX",
      newItem.matter_ref,
      `Shared '${newItem.attached_asset?.name}' (${newItem.attached_asset?.size}) with ${newItem.target_role}: "${newItem.title}"`
    );

    return NextResponse.json({ success: true, item: newItem }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to share document in inbox" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      is_read,
      review_decision, // "APPROVED" | "REVISIONS_REQUESTED" | "IN_PROGRESS"
      review_notes,
      reviewer_name,
      reviewer_role
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing item id" }, { status: 400 });
    }

    let items = getInboxItems();
    const idx = items.findIndex((i) => i.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: "Inbox item not found" }, { status: 404 });
    }

    if (typeof is_read === 'boolean') {
      items[idx].is_read = is_read;
    }

    if (review_decision) {
      items[idx].status = review_decision;
      items[idx].review_notes = review_notes || "";
      items[idx].reviewed_by = reviewer_name || "Reviewer";
      items[idx].reviewed_role = reviewer_role || "REVIEWER";
      items[idx].reviewed_at = new Date().toISOString();

      logActivity(
        reviewer_name || "Reviewer",
        `INBOX_DOC_${review_decision}`,
        items[idx].matter_ref,
        `Review decision '${review_decision}' on shared file '${items[idx].attached_asset?.name}': ${review_notes || 'Action logged.'}`
      );

      // Sync back to Design Studio project store if applicable
      const itemProjectId = items[idx].project_id || items[idx].matter_ref;
      const itemSubId = items[idx].submission_id;
      if (itemProjectId && (review_decision === "APPROVED" || review_decision === "REVISIONS_REQUESTED")) {
        try {
          const { DesignStudioService } = require("@/lib/design-team/studioService");
          DesignStudioService.recordReviewDecision(itemProjectId, {
            submissionId: itemSubId || "SUB-CURRENT",
            reviewerName: reviewer_name || "Reviewer",
            reviewerRole: (reviewer_role as any) || "PATENT_DRAFTER",
            decision: review_decision === "APPROVED" ? "APPROVED" : "REWORK",
            feedback: review_notes || (review_decision === "APPROVED" ? "Approved in Command Inbox." : "Revisions requested in Command Inbox.")
          });
        } catch (err) {
          console.error("Failed to sync inbox review decision to studio store:", err);
        }
      }
    }

    saveInboxItems(items);
    return NextResponse.json({ success: true, item: items[idx] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update inbox item" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      saveInboxItems([]);
      return NextResponse.json({ success: true, message: "All inbox items cleared" });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing item id" }, { status: 400 });
    }

    let items = getInboxItems();
    items = items.filter((i) => i.id !== id);
    saveInboxItems(items);

    return NextResponse.json({ success: true, remaining: items.length });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete inbox item" }, { status: 500 });
  }
}
