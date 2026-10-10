import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'reports.json');

function getTimeLogs() {
  if (!fs.existsSync(DB_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) { return []; }
}

function saveTimeLogs(logs: any[]) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(logs, null, 2));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const inventionId = searchParams.get("inventionId");
  
  let allLogs = getTimeLogs();
  
  if (inventionId) {
    allLogs = allLogs.filter(l => l.invention_id === inventionId);
  }

  return NextResponse.json({ success: true, time_logs: allLogs });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.task_name || !body.hours_spent) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let allLogs = getTimeLogs();
    const newLog = {
      id: 'TIME-' + Date.now(),
      invention_id: body.invention_id || 'GENERAL_OVERHEAD',
      task_name: body.task_name,
      hours_spent: parseFloat(body.hours_spent),
      billable: body.billable !== undefined ? body.billable : true,
      notes: body.notes || "",
      author: body.author || 'Alice Drafter',
      created_at: new Date().toISOString()
    };
    
    allLogs.push(newLog);
    saveTimeLogs(allLogs);
    
    return NextResponse.json({ success: true, log: newLog });
  } catch (error) {
    return NextResponse.json({ error: "Failed to log time" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    let allLogs = getTimeLogs();
    allLogs = allLogs.filter(l => l.id !== id);
    
    saveTimeLogs(allLogs);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete log" }, { status: 500 });
  }
}
