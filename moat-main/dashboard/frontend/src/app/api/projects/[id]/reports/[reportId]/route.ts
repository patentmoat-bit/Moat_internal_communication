import { NextRequest, NextResponse } from "next/server";
import { ReportRepository } from "@/modules/workspace/reportRepository";
import { GlobalExceptionHandler } from "@/lib/errors";
import { requireAuth } from "@/lib/security/requireAdmin";

// Previously had NO auth check — any unauthenticated caller could flip any
// report's status (e.g. to "Approved") for any project/report id.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    if (!body.status) {
      return NextResponse.json({ error: "Missing status field" }, { status: 400 });
    }

    const resolvedParams = await params;
    const repo = new ReportRepository();
    const updated = await repo.updateReportStatus(resolvedParams.reportId, body.status);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating report status:", error);
    return await GlobalExceptionHandler.handle(error);
  }
}
