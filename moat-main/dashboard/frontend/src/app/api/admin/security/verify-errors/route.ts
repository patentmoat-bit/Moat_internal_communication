import { NextRequest, NextResponse } from "next/server";
import { runErrorHandlingVerification } from "@/lib/errors/__tests__/verifyErrorHandlingStack";
import { GlobalExceptionHandler } from "@/lib/errors";
import { requireAdmin } from "@/lib/security/requireAdmin";

// No auth check previously. Admin-only now.
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const report = await runErrorHandlingVerification();
    return NextResponse.json({
      success: report.success,
      timestamp: new Date().toISOString(),
      standards: "OWASP ASVS / OWASP Top 10 (A05: Security Misconfiguration) / Enterprise Error Handling",
      totalRequirements: 9,
      passedRequirements: report.results.filter((r) => r.status === "PASS").length,
      report: report.results,
    });
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err, request, "Verification suite failed to execute.");
  }
}
