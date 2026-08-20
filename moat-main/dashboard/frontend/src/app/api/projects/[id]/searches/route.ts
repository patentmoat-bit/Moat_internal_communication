import { NextResponse } from "next/server";
import { SearchRepository } from "@/modules/workspace/searchRepository";
import { GlobalExceptionHandler } from "@/lib/errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const repository = new SearchRepository();
    const searches = await repository.getSearchesForProject(projectId);

    return NextResponse.json(searches);
  } catch (err: any) {
    return await GlobalExceptionHandler.handle(err);
  }
}
