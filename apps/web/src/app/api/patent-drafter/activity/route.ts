import { NextResponse } from 'next/server';
import { DATA_DIR } from '@/lib/jsonStore';
import { logActivity } from '@/lib/activityLog';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(DATA_DIR, 'activity.json');

function getActivity() {
  if (!fs.existsSync(DB_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) { return []; }
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
