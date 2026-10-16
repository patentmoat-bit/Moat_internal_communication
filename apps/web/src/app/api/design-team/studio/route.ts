import { NextRequest, NextResponse } from "next/server";
import { DesignStudioService } from "@/lib/design-team/studioService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") || "PRJ-10023";
    const data = DesignStudioService.getProjectStudioData(projectId);

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
