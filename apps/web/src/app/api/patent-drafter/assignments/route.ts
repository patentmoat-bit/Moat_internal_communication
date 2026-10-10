import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'assignments.json');

// Initialize DB with default assignment if missing
const defaultAssignments = [
  {
    id: "ASG-0042",
    invention_id: "INN-0012",
    title: "Smart Energy Management System",
    assignee: "Alice Drafter",
    status: "IN_PROGRESS",
    due_date: "2025-06-30T00:00:00Z",
    instructions: "Please draft a patent focusing on the machine learning thermostat routing.",
    assigned_by: "John (Analyst)"
  }
];

function getAssignments() {
  if (!fs.existsSync(DB_FILE)) {
    saveAssignments(defaultAssignments);
    return defaultAssignments;
  }
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) { return defaultAssignments; }
}

function saveAssignments(assignments: any[]) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(assignments, null, 2));
}

export async function GET() {
  const assignments = getAssignments();
  return NextResponse.json({ assignments });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let assignments = getAssignments();
    
    // Check if assignment already exists
    if (!assignments.find(a => a.invention_id === body.invention_id)) {
      assignments.push(body);
      saveAssignments(assignments);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save assignment" }, { status: 500 });
  }
}
