import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'documents.json');

function getDocuments() {
  if (!fs.existsSync(DB_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) { return []; }
}

function saveDocuments(docs: any[]) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(docs, null, 2));
}

// Ensure base structure for new inventions
function initInventionDocs(docs: any[], inventionId: string) {
  let invDocs = docs.find(d => d.invention_id === inventionId);
  if (!invDocs) {
    invDocs = {
      invention_id: inventionId,
      disclosures: [],
      prior_art: [],
      drawings: [],
      exports: []
    };
    docs.push(invDocs);
  }
  return invDocs;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const inventionId = searchParams.get("inventionId");
  
  if (!inventionId) return NextResponse.json({ error: "Missing inventionId" }, { status: 400 });

  let allDocs = getDocuments();
  let invDocs = allDocs.find(d => d.invention_id === inventionId);
  
  if (!invDocs) {
    // Return empty shell if none exist yet
    return NextResponse.json({ success: true, documents: { disclosures: [], prior_art: [], drawings: [], exports: [] } });
  }

  return NextResponse.json({ success: true, documents: invDocs });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { invention_id, type, payload } = body;
    // type can be 'drawings', 'exports', 'disclosures'
    
    if (!invention_id || !type || !payload) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let allDocs = getDocuments();
    let invDocs = initInventionDocs(allDocs, invention_id);
    
    const newDoc = {
      id: 'DOC-' + Date.now() + Math.random().toString(36).substring(7).toUpperCase(),
      ...payload,
      created_at: new Date().toISOString()
    };
    
    if (!invDocs[type]) invDocs[type] = [];
    invDocs[type].push(newDoc);
    
    saveDocuments(allDocs);
    
    // Log activity
    try {
      fetch('http://localhost:3000/api/patent-drafter/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor: payload.uploader || 'Alice Drafter',
          action: type === 'exports' ? 'EXPORT_GENERATED' : 'DOCUMENT_UPLOADED',
          invention_id: invention_id,
          details: `Added ${type.slice(0,-1)}: ${payload.filename || payload.title}`
        })
      }).catch(()=>{});
    } catch(e) {}
    
    return NextResponse.json({ success: true, document: newDoc });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process document" }, { status: 500 });
  }
}
