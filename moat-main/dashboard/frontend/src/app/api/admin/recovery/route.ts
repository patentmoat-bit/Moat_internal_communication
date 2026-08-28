import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DisasterRecoveryService } from "@/lib/security/recovery";
import { requireAdmin } from "@/lib/security/requireAdmin";

// No auth check previously — exposed disaster-recovery telemetry to any
// authenticated user. Admin-only now.
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const supabase = createAdminClient();
    const drService = new DisasterRecoveryService(supabase);

    const summary = await drService.getDashboardSummary();

    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Disaster Recovery API GET error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch Phase 9 Disaster Recovery telemetry." },
      { status: 500 }
    );
  }
}
