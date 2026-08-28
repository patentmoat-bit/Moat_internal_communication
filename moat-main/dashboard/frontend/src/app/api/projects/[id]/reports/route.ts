import { NextRequest, NextResponse } from "next/server";
import { ReportRepository } from "@/modules/workspace/reportRepository";
import { GlobalExceptionHandler } from "@/lib/errors";
import { requireAuth } from "@/lib/security/requireAdmin";

// Previously had NO auth check — any unauthenticated caller could read any
// project's report list.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

    const resolvedParams = await params;
    const repo = new ReportRepository();
    const reports = await repo.getReportsForProject(resolvedParams.id);
    return NextResponse.json(reports);
  } catch (error: any) {
    console.error("Error fetching project reports:", error);
    return await GlobalExceptionHandler.handle(error);
  }
}
