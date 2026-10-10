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
  const id = searchParams.get("id"); // Claim Set ID

  let claimSets = getClaimSets();

  if (id) {
    const claimSet = claimSets.find(c => c.id === id);
    return claimSet ? NextResponse.json({ success: true, claimSet }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (inventionId) {
    const claimSet = claimSets.find(c => c.invention_id === inventionId);
    return claimSet ? NextResponse.json({ success: true, claimSet }) : NextResponse.json({ success: false, message: "No claims found" });
  }

  return NextResponse.json({ success: true, claimSets });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let claimSets = getClaimSets();
    
    const newClaimSet = {
      id: 'CS-' + Math.random().toString(36).substring(7).toUpperCase(),
      invention_id: body.invention_id,
      draft_id: body.draft_id || null,
      version: 1,
      status: 'DRAFTING',
      created_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      owner: 'Alice Drafter',
      change_note: 'Initial draft',
      claims: body.claims || [],
      history: [],
      comments: [] // Added for Phase 5
    };
    
    claimSets.unshift(newClaimSet);
    saveClaimSets(claimSets);
    
    // Log Activity
    try {
      fetch('http://localhost:3000/api/patent-drafter/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor: 'Alice Drafter',
          action: 'CLAIM_SET_CREATED',
          invention_id: body.invention_id,
          details: 'Created new claim set for ' + body.invention_id
        })
      }).catch(()=>{});
    } catch(e) {}
    
    return NextResponse.json({ success: true, claimSet: newClaimSet });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create claim set" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, claims, status, version, change_note, comments } = body;
    
    let claimSets = getClaimSets();
    const idx = claimSets.findIndex(c => c.id === id);
    
    if (idx !== -1) {
      const current = claimSets[idx];
      
      if (version && version > current.version) {
        if (!current.history) current.history = [];
        current.history.push({
          version: current.version,
          status: current.status,
          change_note: current.change_note,
          last_modified: current.last_modified,
          claims: JSON.parse(JSON.stringify(current.claims)),
          comments: current.comments ? JSON.parse(JSON.stringify(current.comments)) : []
        });
      }
      
      if (claims) current.claims = claims;
      if (status) current.status = status;
      if (version) current.version = version;
      if (change_note) current.change_note = change_note;
      if (comments) current.comments = comments; // Added for Phase 5
      
      current.last_modified = new Date().toISOString();
      saveClaimSets(claimSets);
      
      // Log Activity based on what changed
      try {
        let action = 'CLAIMS_UPDATED';
        let details = 'Updated claims for ' + current.invention_id;
        let actor = 'Alice Drafter';
        
        if (status === 'SUBMITTED_FOR_REVIEW') {
          action = 'CLAIM_SET_SUBMITTED';
          details = 'Submitted Claim Set ' + current.id + ' for Analyst Review';
        } else if (status === 'REVISION_REQUIRED') {
          action = 'REVISION_REQUESTED';
          actor = 'John Reviewer';
          details = 'Requested revision on Claim Set ' + current.id;
        } else if (version && version > current.version) {
          action = 'NEW_VERSION_SAVED';
          details = 'Saved Version ' + version + ' for Claim Set ' + current.id;
        } else if (comments && current.comments && comments.length > current.comments.length) {
          action = 'COMMENT_ADDED';
          const newComment = comments[comments.length - 1];
          actor = newComment.author || actor;
          details = 'Added comment: "' + newComment.text.substring(0, 30) + '..."';
        }

        fetch('http://localhost:3000/api/patent-drafter/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actor,
            action,
            invention_id: current.invention_id,
            details
          })
        }).catch(()=>{});
      } catch(e) {}

      return NextResponse.json({ success: true, claimSet: current });
    }
    
    return NextResponse.json({ error: "Claim set not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update claim set" }, { status: 500 });
  }
}
