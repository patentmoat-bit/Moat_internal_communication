// ─────────────────────────────────────────────────────────────────────────────
// MOAT — Workflow History API
// GET /api/workflow/history?projectId=xxx
// Returns the full workflow history timeline for a project.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId query parameter is required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch workflow history entries from activity_logs
    const { data: logs, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("entity_id", projectId)
      .eq("entity_type", "project")
      .order("created_at", { ascending: true });

    if (error) throw error;

    const history = logs
      ?.filter((log) => log.metadata?.new_status || log.action?.includes("STATUS"))
      .map((log) => ({
        id: log.id,
        resource_id: log.entity_id,
        old_status: log.metadata?.old_status || null,
        new_status: log.metadata?.new_status || log.message?.split("to ")?.[1] || "Unknown",
        changed_by: log.actor_id,
        created_at: log.created_at,
        metadata: log.metadata,
      }));

    // Enrich with user names
    const enrichedHistory = [];
    for (const entry of history || []) {
      let userName = entry.changed_by;

      // Try to resolve user name from ID
      if (entry.changed_by && entry.changed_by !== "System") {
        const { data: user } = await supabase
          .from("users")
          .select("name, role")
          .eq("id", entry.changed_by)
          .single();

        if (user) {
          userName = user.name;
          entry.changed_by_role = user.role;
        }
      }

      enrichedHistory.push({
        ...entry,
        changed_by_name: userName,
      });
    }

    return NextResponse.json({
      data: enrichedHistory,
      total: enrichedHistory.length,
    });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
