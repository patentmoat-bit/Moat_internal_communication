// ─────────────────────────────────────────────────────────────────────────────
// MOAT — Admin Audit Logs API
// GET /api/admin/audit-logs
// Filterable audit log viewer for the Admin role.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GlobalExceptionHandler } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const action = searchParams.get("action");       // Filter by event type
    const userId = searchParams.get("userId");       // Filter by user
    const projectId = searchParams.get("projectId"); // Filter by project
    const dateFrom = searchParams.get("dateFrom");   // Filter by date range
    const dateTo = searchParams.get("dateTo");

    const supabase = createAdminClient();

    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    // Apply filters
    if (action) query = query.eq("event_type", action);
    if (userId) query = query.eq("user_id", userId);
    if (projectId) query = query.eq("project_id", projectId);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo);

    const { data, error, count } = await query;
    if (error) throw error;

    // Enrich with user names
    const enriched = [];
    for (const log of data || []) {
      let logUserId = log.user_id || log.actor_id || log.metadata?.fallback_user_id;
      let userName = logUserId;
      let userRole = log.user_role || null;

      if (logUserId && logUserId !== "System") {
        const { data: userRow } = await supabase
          .from("users")
          .select("name, roles(role_name)")
          .eq("id", logUserId)
          .single();

        if (userRow) {
          userName = userRow.name;
          userRole = Array.isArray(userRow.roles) ? userRow.roles[0]?.role_name : (userRow.roles as any)?.role_name || null;
        }
      }

      if (!userName || userName === logUserId) {
        userName = log.metadata?.email || userName;
      }

      enriched.push({
        ...log,
        action: log.event_type || "UNKNOWN",
        user_name: userName,
        user_role: userRole,
      });
    }

    return NextResponse.json({
      data: enriched,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
