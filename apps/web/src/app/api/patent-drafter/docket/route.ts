import { NextResponse } from 'next/server';
import { DATA_DIR } from '@/lib/jsonStore';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(DATA_DIR, 'docket.json');

function getReminders(): any[] {
  if (!fs.existsSync(DB_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) { return []; }
}

function saveReminders(rems: any[]) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(rems, null, 2));
}

const ASG_FILE = path.join(DATA_DIR, 'assignments.json');

function getAssignments(): any[] {
  if (!fs.existsSync(ASG_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(ASG_FILE, 'utf8')); } catch { return []; }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const inventionId = searchParams.get("inventionId");
  
  let allRems = getReminders();
  
  if (inventionId) {
    allRems = allRems.filter(r => r.invention_id === inventionId);
  }

  const assignments = getAssignments();
  const actionItems = assignments.flatMap((asg) => {
    const list: any[] = [];
    if (asg.status === "ASSIGNED") {
      list.push({
        id: `act-${asg.id}-accept`,
        title: "Accept New Assignment",
        description: `You have been assigned ${asg.title} (${asg.invention_id}). You must accept it to begin drafting.`,
        priority: "High",
        invention_id: asg.invention_id,
        link: `/dashboard/patent-drafter/invention/details?id=${asg.invention_id}`,
      });
    }
    if (asg.status === "REVISION_REQUIRED") {
      list.push({
        id: `act-${asg.id}-rev`,
        title: "Address Reviewer Revisions",
        description: `The Patent Analyst has requested revisions for ${asg.invention_id}.`,
        priority: "Critical",
        invention_id: asg.invention_id,
        link: `/dashboard/patent-drafter/review/annotations?id=${asg.invention_id}`,
      });
    }
    if (asg.status === "DRAFTING" || asg.status === "IN_PROGRESS") {
      list.push({
        id: `act-${asg.id}-draft`,
        title: "Continue Drafting",
        description: `Draft for ${asg.invention_id} is currently in progress. Finish claims and submit for review.`,
        priority: "Medium",
        invention_id: asg.invention_id,
        link: `/dashboard/patent-drafter/claims/list?id=${asg.invention_id}`,
      });
    }
    return list;
  });

  return NextResponse.json({ success: true, reminders: allRems, actionItems });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title || !body.due_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let allRems = getReminders();
    const newRem = {
      id: 'REM-' + Date.now(),
      title: body.title,
      description: body.description || "",
      due_date: body.due_date,
      invention_id: body.invention_id || null, // Optional link to project
      author: body.author || 'System',
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    };
    
    allRems.push(newRem);
    saveReminders(allRems);
    
    return NextResponse.json({ success: true, reminder: newRem });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    let allRems = getReminders();
    let idx = allRems.findIndex(r => r.id === body.id);
    
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    
    // Allow updating status (e.g., DISMISSED, COMPLETED)
    if (body.status) allRems[idx].status = body.status;
    
    saveReminders(allRems);
    return NextResponse.json({ success: true, reminder: allRems[idx] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    let allRems = getReminders();
    allRems = allRems.filter(r => r.id !== id);
    
    saveReminders(allRems);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
