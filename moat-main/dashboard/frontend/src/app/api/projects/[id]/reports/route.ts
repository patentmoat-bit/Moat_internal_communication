import { NextResponse } from "next/server";
import { ReportRepository } from "@/modules/workspace/reportRepository";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const repo = new ReportRepository();
    const reports = await repo.getReportsForProject(resolvedParams.id);
    return NextResponse.json(reports);
  } catch (error: any) {
    console.error("Error fetching project reports:", error);
    return await GlobalExceptionHandler.handle(error);
  }
}
