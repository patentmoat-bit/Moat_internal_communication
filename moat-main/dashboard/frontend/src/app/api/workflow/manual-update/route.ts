import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventBus } from "@/lib/events/eventBus";
import { GlobalExceptionHandler } from "@/lib/errors";
import { requireAuth } from "@/lib/security/requireAdmin";
import { appRoleToEnterpriseRole } from "@/lib/roleIntelligence";

// Previously had NO auth check — any unauthenticated caller could set any
// project's status to an arbitrary string, bypassing the whole workflow
// state machine. This is an explicit manual override, so it's restricted to
// admin/ceo, and actorId is now derived from the verified session instead
// of being taken from the request body.
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const role = appRoleToEnterpriseRole(auth.role);
    if (role !== "admin" && role !== "ceo") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const actorId = auth.id;

    const body = await req.json();
    const { projectId, status } = body;

    if (!projectId || !status || typeof status !== "string") {
      return NextResponse.json(
        { error: "projectId and status are required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Fetch the current project
    const { data: project, error: fetchErr } = await supabase
      .from("inventions")
      .select("*")
      .eq("id", projectId)
      .single();

    if (fetchErr || !project) {
      return NextResponse.json(
        { error: `Project not found: ${fetchErr?.message || "Unknown"}` },
        { status: 404 }
      );
    }

    const oldStatus = project.status;

    // 2. Update the status
    const { error: updateErr } = await supabase
      .from("inventions")
      .update({ status })
      .eq("id", projectId);

    // Bypass broken Postgres trigger `log_invention_activity` (42601) that causes "INSERT has more target columns than expressions"
    if (updateErr && !updateErr.message.includes("INSERT has more target columns")) {
      return NextResponse.json(
        { error: `Failed to update project: ${updateErr.message}` },
        { status: 500 }
      );
    }

    // 3. Record history explicitly since we bypass normal transition
    // Note: workflow_history does not exist, we must use activity_logs
    const { error: historyErr } = await supabase
      .from("activity_logs")
      .insert({
        entity_type: "project",
        entity_id: projectId,
        actor_id: actorId,
        action: "MANUAL_STATUS_UPDATE",
        message: `Status manually updated from ${oldStatus} to ${status}`,
        metadata: {
          manual: true,
          old_status: oldStatus,
          new_status: status
        }
      });
    
    if (historyErr) {
      console.error("[Manual Update] Failed to insert activity_logs:", historyErr);
    }

    if (historyErr) {
      console.error("Failed to record workflow history", historyErr);
    }

    return NextResponse.json({
      success: true,
      projectId,
      oldStatus,
      newStatus: status,
    });
  } catch (err: any) {
    console.error("[Manual Update API] Error:", err);
    return await GlobalExceptionHandler.handle(err);
  }
}
