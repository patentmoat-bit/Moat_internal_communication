import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'claims.json');

function getClaimSets() {
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
  
  if (!inventionId) return NextResponse.json({ error: "Missing inventionId" }, { status: 400 });

  let allClaimSets = getClaimSets();
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
    const { inventionId, newStatus, role, decisionNote } = body;
    
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
        author: body.author || (role === 'Patent Analyst' ? 'Mock Analyst' : 'Mock Drafter'),
        role: role,
        text: decisionNote,
        timestamp: new Date().toISOString()
      });
    }
    
    saveClaimSets(allClaimSets);

    // Send Global Cross-Role Notification
    try {
      const notifsPath = path.join(process.cwd(), 'data', 'notifications.json');
      let notifs = [];
      if (fs.existsSync(notifsPath)) {
        notifs = JSON.parse(fs.readFileSync(notifsPath, 'utf8'));
      }
      notifs.push({
        id: 'NOTIF-' + Date.now(),
        title: 'Workflow State Changed',
        message: `${inventionId} moved to ${newStatus}`,
        target_role: role === 'Patent Analyst' ? 'PATENT_DRAFTER' : 'PATENT_ANALYST',
        sender: body.author || role,
        actionUrl: role === 'Patent Analyst' ? '/dashboard/patent-drafter/review/approvals' : '/dashboard',
        readAt: null,
        createdAt: new Date().toISOString()
      });
      fs.writeFileSync(notifsPath, JSON.stringify(notifs, null, 2));
    } catch(e) {}

    
    // Log Activity
    try {
      fetch('http://localhost:3000/api/patent-drafter/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor: body.author || (role === 'Patent Analyst' ? 'Mock Analyst' : 'Mock Drafter'),
          action: 'WORKFLOW_STATE_CHANGED',
          invention_id: inventionId,
          details: `Changed state from ${currentStatus} to ${newStatus}`
        })
      }).catch(()=>{});
    } catch(e) {}
    
    return NextResponse.json({ success: true, newStatus });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update review status" }, { status: 500 });
  }
}
