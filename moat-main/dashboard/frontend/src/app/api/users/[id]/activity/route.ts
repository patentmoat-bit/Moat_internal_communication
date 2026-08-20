import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { appRoleToEnterpriseRole } from "@/lib/roleIntelligence";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("custom_access_token")?.value;
    if (!token) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

    const authUser = await verifyToken(token);
    if (!authUser || appRoleToEnterpriseRole(authUser.role as any) !== "admin") {
      return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
    }

    const { id: targetUserId } = await params;
    const supabase = createAdminClient();

    const { data: activityLogs, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ detail: "Failed to fetch activity" }, { status: 500 });
    }

    // Format logs
    const formatted = (activityLogs || []).map((log: any) => ({
      id: log.id,
      timestamp: new Date(log.created_at).toLocaleString(),
      action: log.action || log.event_type,
      module: log.module,
      ip: log.ip_address || log.ip,
      status: log.event_type?.includes("FAIL") ? "Failed" : "Success"
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error("Activity fetch error:", err);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
