import { NextResponse } from "next/server";
import { ReportRepository } from "@/modules/workspace/reportRepository";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  try {
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
