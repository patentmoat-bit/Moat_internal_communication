import { NextResponse } from "next/server";
import { runErrorHandlingVerification } from "@/lib/errors/__tests__/verifyErrorHandlingStack";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function GET(request: Request) {
  try {
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
