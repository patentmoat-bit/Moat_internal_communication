import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EnterpriseAuthenticationService } from "@/lib/security";
import { requireAdmin } from "@/lib/security/requireAdmin";

// No auth check previously — exposed security audit logs/metrics to any
// authenticated user. Admin-only now.
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { searchParams } = new URL(request.url);
    const user = searchParams.get("user") || undefined;
    const ip = searchParams.get("ip") || undefined;
    const date = searchParams.get("date") || undefined;
    const event = searchParams.get("event") || undefined;

    const supabase = createAdminClient();
    const authService = new EnterpriseAuthenticationService(supabase);

    const metrics = await authService.auditLogService.getSecurityMetrics();
    const logs = await authService.auditLogService.getLogs({ user, ip, date, event });

    return NextResponse.json({ success: true, metrics, logs });
  } catch (err: any) {
    console.error("Security dashboard metrics error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch security telemetry." }, { status: 500 });
  }
}
