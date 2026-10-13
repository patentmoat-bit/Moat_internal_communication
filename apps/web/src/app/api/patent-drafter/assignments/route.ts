import { NextResponse } from 'next/server';
import { DATA_DIR } from '@/lib/jsonStore';
import { resolveActor } from '@/lib/actingRole';
import { notify } from '@/lib/notifications';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(DATA_DIR, 'assignments.json');

// Initialize DB with default assignment if missing
// A fresh deployment starts with no assignments; nothing is seeded.
const defaultAssignments: any[] = [];

function getAssignments(): any[] {
  if (!fs.existsSync(DB_FILE)) {
    saveAssignments(defaultAssignments);
    return defaultAssignments;
  }
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) { return defaultAssignments; }
}

function saveAssignments(assignments: any[]) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(assignments, null, 2));
}

export async function GET() {
  const assignments = getAssignments();
  return NextResponse.json({ success: true, assignments });
}

export async function POST(req: Request) {
  try {
    const actor = await resolveActor();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!actor.roles.some((r) => r === 'CEO' || r === 'PATENT_ANALYST' || r === 'ADMIN')) {
      return NextResponse.json({ error: "Forbidden: only the CEO or an analyst can assign work." }, { status: 403 });
    }
    const body = await req.json();
    let assignments = getAssignments();

    // CEO docket assignments carry docket_id rather than invention_id.
    const key = body.invention_id ?? body.docket_id;
    if (key && !assignments.find(a => (a.invention_id ?? a.docket_id) === key)) {
      assignments.push({ ...body, assigned_by: actor.name, assigned_at: new Date().toISOString() });
      saveAssignments(assignments);
      notify({
        to: 'PATENT_DRAFTER',
        title: 'New drafting assignment',
        message: `${actor.name} assigned you ${body.title ?? key}${body.instructions ? `: ${body.instructions}` : ''}`,
        sender: actor.name,
        actionUrl: '/dashboard/patent-drafter/drafts/assigned',
        kind: 'assignment',
        priority: 'high',
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save assignment" }, { status: 500 });
  }
}
