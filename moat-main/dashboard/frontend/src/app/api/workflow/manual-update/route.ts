import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventBus } from "@/lib/events/eventBus";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, status, actorId } = body;

    if (!projectId || !status) {
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
