import { NextRequest, NextResponse } from "next/server";
import { runSecurityVerification } from "@/lib/security/__tests__/verifySecurityStack";
import { requireAdmin } from "@/lib/security/requireAdmin";

// No auth check previously. Admin-only now.
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;


    const report = await runSecurityVerification();
    return NextResponse.json({
      success: report.success,
      timestamp: new Date().toISOString(),
      standards: "OWASP ASVS / Enterprise Authentication Standards",
      totalRequirements: 11,
      passedRequirements: report.results?.filter((r) => r.status === "PASS").length || 0,
      report: report.results,
    });
  } catch (err: any) {
    console.error("Verification endpoint error:", err);
    return NextResponse.json({ success: false, error: "Verification suite failed to execute." }, { status: 500 });
  }
}
