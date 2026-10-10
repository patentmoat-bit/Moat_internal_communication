import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'notifications.json');

function getNotifications() {
  if (!fs.existsSync(DB_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) { return []; }
}

function saveNotifications(notifs: any[]) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(notifs, null, 2));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const targetRole = searchParams.get("role"); // e.g. PATENT_ANALYST or PATENT_DRAFTER
  
  let allNotifs = getNotifications();
  
  if (targetRole) {
    allNotifs = allNotifs.filter(n => n.target_role === targetRole || !n.target_role);
  }

  return NextResponse.json(allNotifs); // The frontend notifications.tsx expects an array directly, based on the code.
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    let allNotifs = getNotifications();
    const newNotif = {
      id: 'NOTIF-' + Date.now(),
      title: body.title || "New Notification",
      message: body.message || "",
      target_role: body.target_role || "ALL",
      sender: body.sender || "System",
      actionUrl: body.actionUrl || "",
      readAt: null,
      createdAt: new Date().toISOString()
    };
    
    allNotifs.push(newNotif);
    saveNotifications(allNotifs);
    
    return NextResponse.json({ success: true, notification: newNotif });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}
