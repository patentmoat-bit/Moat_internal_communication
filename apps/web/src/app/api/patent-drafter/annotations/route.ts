import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'annotations.json');

function getAnnotations() {
  if (!fs.existsSync(DB_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) { return []; }
}

function saveAnnotations(anns: any[]) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(anns, null, 2));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const inventionId = searchParams.get("inventionId");
  
  if (!inventionId) return NextResponse.json({ error: "Missing inventionId" }, { status: 400 });

  let allAnns = getAnnotations();
  let invAnns = allAnns.filter(a => a.invention_id === inventionId);

  return NextResponse.json({ success: true, annotations: invAnns });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.invention_id || !body.text) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let allAnns = getAnnotations();
    const newAnn = {
      id: 'ANN-' + Date.now(),
      invention_id: body.invention_id,
      target_passage: body.target_passage || "General Document",
      text: body.text,
      author: body.author || 'Alice Drafter',
      role: body.role || 'Drafter',
      status: 'OPEN',
      created_at: new Date().toISOString(),
      replies: []
    };
    
    allAnns.push(newAnn);
    saveAnnotations(allAnns);
    
    // Log activity if it's a new top-level annotation
    try {
      fetch('http://localhost:3000/api/patent-drafter/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor: newAnn.author,
          action: 'ANNOTATION_ADDED',
          invention_id: body.invention_id,
          details: `Added annotation to ${newAnn.target_passage}`
        })
      }).catch(()=>{});
    } catch(e) {}
    
    return NextResponse.json({ success: true, annotation: newAnn });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create annotation" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    let allAnns = getAnnotations();
    let idx = allAnns.findIndex(a => a.id === body.id);
    
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    
    // Handle resolution
    if (body.status === 'RESOLVED') {
      allAnns[idx].status = 'RESOLVED';
      allAnns[idx].resolved_by = body.resolved_by || 'Alice Drafter';
      allAnns[idx].resolved_at = new Date().toISOString();
    }
    
    // Handle replies
    if (body.reply) {
      allAnns[idx].replies.push({
        id: 'REP-' + Date.now(),
        text: body.reply.text,
        author: body.reply.author || 'Alice Drafter',
        role: body.reply.role || 'Drafter',
        created_at: new Date().toISOString()
      });
    }
    
    saveAnnotations(allAnns);
    return NextResponse.json({ success: true, annotation: allAnns[idx] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
