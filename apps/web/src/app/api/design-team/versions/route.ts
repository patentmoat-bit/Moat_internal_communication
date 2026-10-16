import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'design_assignments.json');
const ACT_FILE = path.join(process.cwd(), 'data', 'activity.json');

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.pdf', '.tiff', '.tif', '.docx', '.eps', '.ai'];
const DISALLOWED_HAZARDOUS_EXTENSIONS = ['.exe', '.sh', '.bat', '.cmd', '.js', '.py', '.php', '.bin', '.html', '.vbs', '.msi'];

function getAssignments(): any[] {
  if (!fs.existsSync(DB_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveAssignments(data: any[]) {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function logActivity(actor: string, action: string, invention_id: string, details: string) {
  try {
    let list: any[] = [];
    if (fs.existsSync(ACT_FILE)) {
      try { list = JSON.parse(fs.readFileSync(ACT_FILE, 'utf8')); } catch(e) {}
    }
    list.unshift({
      id: 'ACT-' + Date.now() + Math.random().toString(36).substring(7),
      actor,
      action,
      invention_id,
      details,
      timestamp: new Date().toISOString()
    });
    fs.writeFileSync(ACT_FILE, JSON.stringify(list, null, 2));
  } catch(e) {}
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('assignmentId') || searchParams.get('assignment_id');

    const assignments = getAssignments();

    if (!assignmentId) {
      // Return versions overview across all assignments
      const allVersions = assignments.flatMap((a: any) => 
        (a.versions || []).map((v: any) => ({
          ...v,
          assignment_id: a.id,
          assignment_title: a.title,
          invention_id: a.invention_id
        }))
      );
      return NextResponse.json({
        success: true,
        total_versions: allVersions.length,
        versions: allVersions
      });
    }

    const found = assignments.find((a: any) => a.id === assignmentId);

    if (!found) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      assignment_id: found.id,
      current_version: found.current_version || 1,
      versions: found.versions || []
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      assignment_id,
      file_name,
      file_url,
      file_size,
      file_type,
      notes,
      actor,
      title
    } = body;

    if (!assignment_id || !file_name) {
      return NextResponse.json({ error: "Missing assignment_id or file_name" }, { status: 400 });
    }

    // Security: Check file extension against hazardous scripts & allowed formats
    const ext = path.extname(file_name).toLowerCase();
    if (!ext || DISALLOWED_HAZARDOUS_EXTENSIONS.includes(ext) || !ALLOWED_EXTENSIONS.includes(ext)) {
      logActivity(
        actor || "Unknown",
        "SECURITY_REJECTED_FILE",
        "SYSTEM",
        `Rejected hazardous or unsupported file upload attempt: '${file_name}' (ext: ${ext})`
      );
      return NextResponse.json({
        error: `Security violation: File format '${ext || "unknown"}' is not permitted. Only patent drawing and specification formats (${ALLOWED_EXTENSIONS.join(", ")}) are allowed under 37 CFR § 1.84.`
      }, { status: 400 });
    }

    // Path traversal prevention: sanitize filename
    const sanitizedFileName = path.basename(file_name);

    let assignments = getAssignments();
    const idx = assignments.findIndex((a: any) => a.id === assignment_id);

    if (idx === -1) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const assignment = assignments[idx];
    const newVersionNum = (assignment.current_version || 1) + 1;

    const newVersion = {
      version: newVersionNum,
      title: title || `Revision v${newVersionNum}`,
      file_name: sanitizedFileName,
      file_url: file_url || `/drawings/previews/${sanitizedFileName}`,
      file_size: file_size || "1.5 MB",
      file_type: file_type || "image/png",
      notes: notes || `Created revision version ${newVersionNum}.`,
      uploaded_by: actor || "Design Team",
      created_at: new Date().toISOString()
    };

    if (!assignment.versions) assignment.versions = [];
    assignment.versions.unshift(newVersion);
    assignment.current_version = newVersionNum;
    assignment.last_modified = new Date().toISOString();

    // If task was in rework, saving a new revision moves it back to in progress
    if (assignment.status === "REWORK") {
      assignment.status = "IN_PROGRESS";
    }

    assignments[idx] = assignment;
    saveAssignments(assignments);

    logActivity(
      actor || "Design Team",
      "SAVED_DESIGN_VERSION",
      assignment.invention_id,
      `Saved version v${newVersionNum} for '${assignment.title}' (${sanitizedFileName})`
    );

    return NextResponse.json({
      success: true,
      version: newVersion,
      assignment
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save design version" }, { status: 500 });
  }
}
