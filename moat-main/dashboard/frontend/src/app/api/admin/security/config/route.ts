import { NextRequest, NextResponse } from "next/server";
import { getSecurityConfig, updateSecurityConfigOverrides } from "@/lib/security";
import { requireAdmin } from "@/lib/security/requireAdmin";

// Neither method had an auth check — any authenticated user of any role could
// globally weaken security thresholds (lockout limits, rate limits, etc.) for
// every account via POST. Admin-only now.
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const config = getSecurityConfig();
    return NextResponse.json({ success: true, config });
  } catch (err: any) {
    console.error("Get security config error:", err);
    return NextResponse.json({ success: false, error: "Failed to retrieve security config." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const updated = updateSecurityConfigOverrides(body);
    return NextResponse.json({ success: true, config: updated, message: "Security thresholds updated successfully." });
  } catch (err: any) {
    console.error("Update security config error:", err);
    return NextResponse.json({ success: false, error: "Failed to update security config." }, { status: 500 });
  }
}
