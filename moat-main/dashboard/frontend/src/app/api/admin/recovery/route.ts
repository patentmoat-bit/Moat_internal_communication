import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DisasterRecoveryService } from "@/lib/security/recovery";

export async function GET(request: NextRequest) {
  try {
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
