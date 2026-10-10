import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'inventions.json');

function getInventions() {
  if (!fs.existsSync(DB_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) { return {}; }
}

function saveInventions(data: any) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  
  const inventions = getInventions();
  if (id && inventions[id]) {
    return NextResponse.json({ invention: inventions[id] });
  }
  
  return NextResponse.json({ inventions });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = body.referenceNo || "NEW";
    
    // Attempt backend sync (will fail gracefully)
    try {
      await fetch("http://localhost:8000/api/v1/inventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }).catch(() => {});
    } catch(e) {}

    let inventions = getInventions();
    
    inventions[id] = {
      ...inventions[id],
      ...body,
      last_updated: new Date().toISOString()
    };

    saveInventions(inventions);
    return NextResponse.json({ success: true, invention: inventions[id] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save invention data" }, { status: 500 });
  }
}
