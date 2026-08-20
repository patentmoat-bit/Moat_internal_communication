import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventBus } from "@/lib/events/eventBus";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { AuditLogService } from "@/lib/security/auditLogService";
import { GlobalExceptionHandler } from "@/lib/errors";

export const dynamic = "force-dynamic";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("custom_access_token")?.value;
  if (!token) return null;
  try {
    const payload = await verifyToken(token);
    return {
      id: payload.sub as string,
      name: (payload.name as string) || (payload.email as string)?.split("@")[0] || "User",
      role: (payload.role as string) || "Patent Analyst",
    };
  } catch (err) {
    return null;
  }
}

/**
 * Enterprise Reporting Engine API
 * Handles structured evidence from all 7 search modules.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { project_id, search_type, report_json, pdf_url, docx_url, status = "DRAFT" } = body;

    if (!project_id || !search_type) {
      return NextResponse.json({ error: "project_id and search_type are required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const auditLog = new AuditLogService(supabase);

    // 1. Check if report exists
    const { data: existingReport } = await supabase
      .from("reports")
      .select("id, current_version")
      .eq("project_id", project_id)
      .eq("search_type", search_type)
      .single();

    let reportId;
    let newVersion = 1;

    if (existingReport) {
      // 2a. Update existing report
      newVersion = (existingReport.current_version || 0) + 1;
      reportId = existingReport.id;

      await supabase
        .from("reports")
        .update({
          current_version: newVersion,
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq("id", reportId);
    } else {
      // 2b. Create new report
      const { data: newReport, error: insertError } = await supabase
        .from("reports")
        .insert({
          project_id,
          search_type,
          current_version: newVersion,
          status,
          generated_by: user.id
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      reportId = newReport.id;
    }

    // 3. Save the Report Version (Immutable structured evidence)
    const { error: versionError } = await supabase
      .from("report_versions")
      .insert({
        report_id: reportId,
        version_number: newVersion,
        report_json: report_json || {},
        pdf_url,
        docx_url,
        created_by: user.id
      });

    if (versionError) throw versionError;

    // 4. Update Project PFS Status
    // If the PFS aggregator mapping doesn't exist, create it
    const { data: pfsRecord } = await supabase
      .from("project_reports")
      .select("id")
      .eq("project_id", project_id)
      .single();

    if (!pfsRecord) {
      await supabase.from("project_reports").insert({
        project_id,
        pfs_status: "PENDING_EVIDENCE"
      });
    }

    // 5. Enterprise Audit Logging
    await auditLog.logEvent({
      userId: user.id,
      email: user.name,
      eventType: "REPORT_GENERATED",
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "Unknown",
      endpoint: req.nextUrl.pathname,
      status: "SUCCESS",
      actorRole: user.role,
      resourceId: project_id,
      resourceType: "project",
      metadata: { search_type, version: newVersion }
    });

    // 6. Trigger Realtime Notification via EventBus
    // We map to REPORT_SUBMITTED as it exists in the workflow, but we add search_type metadata
    try {
      // Fetch project details for accurate notification routing
      const { data: project } = await supabase.from("inventions").select("*").eq("id", project_id).single();
      
      await EventBus.publishEvent({
        type: 'REPORT_SUBMITTED', // The workflow engine routes this to CEO
        actorId: user.id,
        actorRole: user.role,
        resourceId: project_id,
        resourceType: 'invention',
        notificationTitle: `${search_type} Report Generated`,
        notificationMessage: `${user.name} generated a new ${search_type} Report (v${newVersion}) for the project.`,
        actionUrl: `/dashboard/ceo/approvals`,
        metadata: { title: project?.title || "Project", search_type, version: newVersion },
        projectData: project
      });
    } catch (e) {
      console.error("EventBus publish failed in reports API", e);
    }

    return NextResponse.json({ success: true, report_id: reportId, version: newVersion });
  } catch (err: any) {
    console.error("Reports API Error:", err);
    return await GlobalExceptionHandler.handle(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const searchType = searchParams.get("search_type");

    const supabase = createAdminClient();
    
    let query = supabase.from("reports").select(`
      id, search_type, current_version, status, created_at, updated_at,
      report_versions (
        version_number, report_json, pdf_url, docx_url, created_at
      )
    `);

    if (projectId) query = query.eq("project_id", projectId);
    if (searchType) query = query.eq("search_type", searchType);

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
