import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardAnalyticsService, SecurityMonitoringService } from "@/lib/security/monitoring";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const severity = searchParams.get("severity") || undefined;

    const supabase = createAdminClient();
    const analytics = new DashboardAnalyticsService(supabase);

    const summary = await analytics.getDashboardMetrics();
    const eventStream = SecurityMonitoringService.getEventStream();

    // Filter event stream if parameters are provided
    let filteredEvents = [...eventStream];
    if (category) {
      filteredEvents = filteredEvents.filter((e) => e.category === category);
    }
    if (severity) {
      filteredEvents = filteredEvents.filter((e: any) => e.severity === severity);
    }

    return NextResponse.json({
      success: true,
      summary,
      eventStream: filteredEvents,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Security Operations Dashboard API error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch Phase 8 security operations telemetry." },
      { status: 500 }
    );
  }
}
