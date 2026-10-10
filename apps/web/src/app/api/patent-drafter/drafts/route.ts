import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'drafts.json');

function getDrafts() {
  if (!fs.existsSync(DB_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) { return []; }
}

function saveDrafts(drafts: any[]) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(drafts, null, 2));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let drafts = getDrafts();

  if (status) {
    if (status === 'IN_PROGRESS') {
      drafts = drafts.filter(d => ['DRAFTING', 'REVISION_REQUIRED'].includes(d.status));
    } else {
      drafts = drafts.filter(d => d.status === status);
    }
  }

  return NextResponse.json({ drafts });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let drafts = getDrafts();
    
    // Attempt backend sync (will fail gracefully)
    try {
      await fetch("http://localhost:8000/api/v1/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }).catch(() => {});
    } catch(e) {}

    let draftId = body.id;
    
    if (!draftId) {
      draftId = "DRAFT-" + Math.random().toString(36).substring(7).toUpperCase();
      const newDraft = {
        id: draftId,
        project_id: body.project_id || 'INN-0012',
        title: body.title || 'Untitled Draft',
        content: body.content || {},
        status: 'DRAFTING',
        last_modified: new Date().toISOString(),
        feedback: ''
      };
      drafts.unshift(newDraft);
    } else {
      const idx = drafts.findIndex(d => d.id === draftId);
      if (idx !== -1) {
        drafts[idx] = {
          ...drafts[idx],
          title: body.title || drafts[idx].title,
          content: body.content || drafts[idx].content,
          last_modified: new Date().toISOString(),
        };
      }
    }

    saveDrafts(drafts);
    return NextResponse.json({ success: true, draft: drafts.find(d => d.id === draftId) });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, status, feedback } = body;
    
    let drafts = getDrafts();
    const idx = drafts.findIndex(d => d.id === id);
    
    if (idx !== -1) {
      drafts[idx].status = status || drafts[idx].status;
      drafts[idx].feedback = feedback !== undefined ? feedback : drafts[idx].feedback;
      drafts[idx].last_modified = new Date().toISOString();
      saveDrafts(drafts);
      return NextResponse.json({ success: true, draft: drafts[idx] });
    }
    
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update draft" }, { status: 500 });
  }
}
