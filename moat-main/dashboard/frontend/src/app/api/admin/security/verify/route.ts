import { NextResponse } from "next/server";
import { runSecurityVerification } from "@/lib/security/__tests__/verifySecurityStack";

export async function GET() {
  try {
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
