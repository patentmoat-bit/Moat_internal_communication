import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MAT_FILE = path.join(process.cwd(), 'data', 'design_materials.json');
const ASG_FILE = path.join(process.cwd(), 'data', 'design_assignments.json');
const SUB_FILE = path.join(process.cwd(), 'data', 'design_submissions.json');
const ACT_FILE = path.join(process.cwd(), 'data', 'activity.json');

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.pdf', '.tiff', '.tif', '.docx', '.eps', '.ai', '.zip', '.txt'];
const DISALLOWED_HAZARDOUS_EXTENSIONS = ['.exe', '.sh', '.bat', '.cmd', '.js', '.py', '.php', '.bin', '.html', '.vbs', '.msi'];

function getMaterials(): any {
  if (!fs.existsSync(MAT_FILE)) {
    return {
      drawings: [],
      technical_docs: [],
      reference_files: [],
      export_files: []
    };
  }
  try {
    return JSON.parse(fs.readFileSync(MAT_FILE, 'utf8'));
  } catch (e) {
    return {
      drawings: [],
      technical_docs: [],
      reference_files: [],
      export_files: []
    };
  }
}

function saveMaterials(data: any) {
  const dir = path.dirname(MAT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MAT_FILE, JSON.stringify(data, null, 2));
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
    const category = searchParams.get('category'); // "drawings" | "technical_docs" | "reference_files" | "export_files"
    const inventionId = searchParams.get('inventionId');
    const search = searchParams.get('search')?.toLowerCase();

    const data = getMaterials();

    // Dynamically augment drawings with any latest versions from design_assignments
    if (fs.existsSync(ASG_FILE)) {
      try {
        const assignments = JSON.parse(fs.readFileSync(ASG_FILE, 'utf8'));
        assignments.forEach((asg: any) => {
          asg.versions?.forEach((ver: any) => {
            const exists = data.drawings.some((d: any) => d.file_name === ver.file_name);
            if (!exists) {
              data.drawings.unshift({
                id: `MAT-DWG-${asg.id}-V${ver.version}`,
                invention_id: asg.invention_id,
                project_title: asg.project_title,
                figure_number: asg.figure_numbers?.[0] || 1,
                title: ver.title,
                file_name: ver.file_name,
                format: ver.file_name.endsWith('.svg') ? 'SVG' : ver.file_name.endsWith('.pdf') ? 'PDF' : 'PNG',
                size: ver.file_size || '1.5 MB',
                version: ver.version,
                status: asg.status,
                compliance: '37 CFR § 1.84 Compliant',
                uploaded_by: ver.uploaded_by,
                created_at: ver.created_at,
                preview_url: ver.file_url || '#',
                assignment_id: asg.id,
                notes: ver.notes
              });
            }
          });
        });
      } catch (e) {}
    }

    // Dynamically augment export_files with any submissions from design_submissions
    if (fs.existsSync(SUB_FILE)) {
      try {
        const submissions = JSON.parse(fs.readFileSync(SUB_FILE, 'utf8'));
        submissions.forEach((sub: any) => {
          const exists = data.export_files.some((exp: any) => exp.id === sub.id || exp.title === sub.title);
          if (!exists) {
            data.export_files.unshift({
              id: sub.id,
              invention_id: sub.invention_id,
              project_title: sub.project_title,
              title: `${sub.title} Review Deliverable (v${sub.submitted_version})`,
              format: 'EXPORT PACKAGE',
              file_name: `${sub.id}_Deliverable_Package.zip`,
              size: '3.2 MB',
              figures: sub.figure_numbers || [1],
              recipient: `${sub.recipient_user} (${sub.recipient_role})`,
              status: sub.status === 'PENDING_REVIEW' ? 'DISPATCHED' : sub.status,
              created_at: sub.submitted_at,
              description: sub.message || sub.notes,
              checksum: `sha256-${sub.id.toLowerCase()}...verified`
            });
          }
        });
      } catch (e) {}
    }

    // Filter results if requested
    let result: any = {};
    const categories = ['drawings', 'technical_docs', 'reference_files', 'export_files'];

    categories.forEach((cat) => {
      let items = data[cat] || [];
      if (inventionId && inventionId !== 'ALL') {
        items = items.filter((item: any) => !item.invention_id || item.invention_id === inventionId);
      }
      if (search) {
        items = items.filter((item: any) =>
          item.title?.toLowerCase().includes(search) ||
          item.file_name?.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search) ||
          item.summary?.toLowerCase().includes(search) ||
          item.invention_id?.toLowerCase().includes(search)
        );
      }
      result[cat] = items;
    });

    if (category && category !== 'ALL' && result[category]) {
      return NextResponse.json({
        success: true,
        category,
        items: result[category],
        total: result[category].length
      });
    }

    return NextResponse.json({
      success: true,
      materials: result,
      counts: {
        drawings: result.drawings.length,
        technical_docs: result.technical_docs.length,
        reference_files: result.reference_files.length,
        export_files: result.export_files.length,
        total: result.drawings.length + result.technical_docs.length + result.reference_files.length + result.export_files.length
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch design materials" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      category, // "drawings" | "technical_docs" | "reference_files" | "export_files"
      invention_id,
      project_title,
      title,
      file_name,
      format,
      size,
      figure_number,
      description,
      notes,
      actor
    } = body;

    if (!category || !title || !file_name) {
      return NextResponse.json({ error: "Missing required fields: category, title, file_name" }, { status: 400 });
    }

    // Security: Validate file extension
    const ext = path.extname(file_name).toLowerCase();
    if (!ext || DISALLOWED_HAZARDOUS_EXTENSIONS.includes(ext) || !ALLOWED_EXTENSIONS.includes(ext)) {
      logActivity(
        actor || "Unknown",
        "SECURITY_REJECTED_MATERIAL",
        invention_id || "INN-0012",
        `Rejected hazardous file: '${file_name}' (ext: ${ext})`
      );
      return NextResponse.json({
        error: `Security violation: File format '${ext || "none"}' is not permitted. Only patent assets (${ALLOWED_EXTENSIONS.join(", ")}) are allowed.`
      }, { status: 400 });
    }

    const sanitizedFileName = path.basename(file_name);

    const data = getMaterials();
    if (!data[category]) {
      data[category] = [];
    }

    const newItem: any = {
      id: `MAT-${category.substring(0, 3).toUpperCase()}-${Date.now()}`,
      invention_id: invention_id || "INN-0012",
      project_title: project_title || "IP Patent Project",
      title,
      file_name: sanitizedFileName,
      format: format || "PDF",
      size: size || "1.8 MB",
      created_at: new Date().toISOString(),
      uploaded_by: actor || "Design Team"
    };

    if (category === "drawings") {
      newItem.figure_number = figure_number || 1;
      newItem.version = 1;
      newItem.status = "IN_PROGRESS";
      newItem.compliance = "37 CFR § 1.84 Compliant";
      newItem.notes = notes || "";
    } else if (category === "technical_docs") {
      newItem.author = actor || "Design Team & Inventor";
      newItem.summary = description || notes || "";
      newItem.category = "TECHNICAL_SPECIFICATION";
    } else if (category === "reference_files") {
      newItem.publisher = "MOAT Intelligence";
      newItem.description = description || "";
      newItem.tags = ["Reference", "Patent", "Standard"];
    } else if (category === "export_files") {
      newItem.figures = [figure_number || 1];
      newItem.recipient = "Authorized Reviewers";
      newItem.status = "READY";
      newItem.description = description || notes || "Generated deliverable bundle.";
    }

    data[category].unshift(newItem);
    saveMaterials(data);

    logActivity(
      actor || "Design Team",
      `UPLOADED_${category.toUpperCase()}`,
      invention_id || "INN-0012",
      `Added ${sanitizedFileName} to Design Materials (${category}).`
    );

    return NextResponse.json({ success: true, item: newItem }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create design material item" }, { status: 500 });
  }
}
