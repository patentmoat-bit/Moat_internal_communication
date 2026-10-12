import { NextResponse } from 'next/server';
import { resolveActor } from '@/lib/actingRole';
import { notify } from '@/lib/notifications';
import { logActivity } from '@/lib/activityLog';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'claims.json');

function getClaimSets(): any[] {
  if (!fs.existsSync(DB_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) { return []; }
}

function saveClaimSets(claimSets: any[]) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(claimSets, null, 2));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const inventionId = searchParams.get("inventionId");
  
  let allClaimSets = getClaimSets();

  if (!inventionId) {
    return NextResponse.json({
      success: true,
      reviews: allClaimSets.map((c) => ({
        invention_id: c.invention_id,
        status: c.status || "DRAFTING",
        version: c.version || 1,
        history: c.history || [],
        comments: c.comments || [],
        last_submitted: c.last_updated,
      })),
    });
  }
  let claimSet = allClaimSets.find(c => c.invention_id === inventionId);

  if (!claimSet) {
    return NextResponse.json({ error: "No draft found for review" }, { status: 404 });
  }

  // Return review metadata (status, versions, feedback)
  return NextResponse.json({ 
    success: true, 
    reviewData: {
      status: claimSet.status || 'DRAFTING',
      version: claimSet.version || 1,
      history: claimSet.history || [],
      comments: claimSet.comments || [],
      last_submitted: claimSet.last_updated
    }
  });
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { inventionId, newStatus, decisionNote } = body;
    // Identity and role come from the server session, not the request body.
    const actor = await resolveActor(body.role);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!actor.role) return NextResponse.json({ error: "Forbidden: you do not hold that role." }, { status: 403 });
    if (actor.role !== 'PATENT_ANALYST' && actor.role !== 'PATENT_DRAFTER') {
      return NextResponse.json({ error: "Forbidden: only analysts and drafters take part in review." }, { status: 403 });
    }
    const role = actor.role === 'PATENT_ANALYST' ? 'Patent Analyst' : 'Patent Drafter';
    
    if (!inventionId || !newStatus) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

    let allClaimSets = getClaimSets();
    let idx = allClaimSets.findIndex(c => c.invention_id === inventionId);
    
    if (idx === -1) return NextResponse.json({ error: "No draft found" }, { status: 404 });

    const currentStatus = allClaimSets[idx].status || 'DRAFTING';
    
    // RBAC Security Checks
    if (newStatus === 'APPROVED' && role !== 'Patent Analyst') {
      return NextResponse.json({ error: "Unauthorized: Only an Analyst can approve a draft." }, { status: 403 });
    }
    
    if (newStatus === 'REVISION_REQUIRED' && role !== 'Patent Analyst') {
      return NextResponse.json({ error: "Unauthorized: Only an Analyst can request revisions." }, { status: 403 });
    }
    
    // Valid state transitions
    const validTransitions: any = {
      'DRAFTING': ['SUBMITTED_FOR_REVIEW'],
      'REVISION_REQUIRED': ['SUBMITTED_FOR_REVIEW'],
      'SUBMITTED_FOR_REVIEW': ['UNDER_REVIEW', 'REVISION_REQUIRED', 'APPROVED'],
      'UNDER_REVIEW': ['REVISION_REQUIRED', 'APPROVED'],
      'APPROVED': []
    };
    
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return NextResponse.json({ error: `Invalid transition from ${currentStatus} to ${newStatus}` }, { status: 400 });
    }

    // Apply state
    allClaimSets[idx].status = newStatus;
    
    if (decisionNote) {
      if (!allClaimSets[idx].comments) allClaimSets[idx].comments = [];
      allClaimSets[idx].comments.push({
        id: Date.now(),
        author: actor.name,
        role: role,
        text: decisionNote,
        timestamp: new Date().toISOString()
      });
    }
    
    saveClaimSets(allClaimSets);

    const isAnalyst = actor.role === 'PATENT_ANALYST';
    const msgs = [{
      to: (isAnalyst ? 'PATENT_DRAFTER' : 'PATENT_ANALYST') as 'PATENT_DRAFTER' | 'PATENT_ANALYST',
      title: 'Workflow State Changed',
      message: `${inventionId} moved to ${newStatus.replace(/_/g, ' ')}${decisionNote ? `: ${decisionNote}` : ''}`,
      sender: actor.name,
      actionUrl: isAnalyst ? '/dashboard/patent-drafter/review/approvals' : '/dashboard/patent-drafter/review/approvals',
      kind: 'workflow',
      priority: (newStatus === 'REVISION_REQUIRED' ? 'high' : 'medium') as 'high' | 'medium',
    }];
    // Analyst sign-off is what puts a matter in front of the CEO.
    if (newStatus === 'APPROVED') {
      msgs.push({
        to: 'CEO' as any,
        title: 'Draft awaiting your approval',
        message: `${inventionId} passed analyst review and needs executive approval.`,
        sender: actor.name,
        actionUrl: '/dashboard/ceo/approvals',
        kind: 'approval',
        priority: 'high',
      });
    }
    notify(msgs as any);

    logActivity(actor.name, 'WORKFLOW_STATE_CHANGED', inventionId, `Changed state from ${currentStatus} to ${newStatus}`);

    return NextResponse.json({ success: true, newStatus });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update review status" }, { status: 500 });
  }
}
