import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'activity.json');

function getActivity() {
  if (!fs.existsSync(DB_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) { return []; }
}

export function logActivity(actor: string, action: string, invention_id: string, details: string) {
  let activities = getActivity();
  activities.unshift({
    id: 'ACT-' + Date.now() + Math.random().toString(36).substring(7),
    actor,
    action,
    invention_id,
    details,
    timestamp: new Date().toISOString()
  });
  
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(activities, null, 2));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  
  let activities = getActivity();
  
  return NextResponse.json({ success: true, activities: activities.slice(0, limit) });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    logActivity(body.actor || 'System', body.action, body.invention_id, body.details);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to log activity" }, { status: 500 });
  }
}
