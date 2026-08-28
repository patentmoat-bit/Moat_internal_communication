import { NextRequest, NextResponse } from "next/server";
import { SearchRepository } from "@/modules/workspace/searchRepository";
import { GlobalExceptionHandler } from "@/lib/errors";
import { requireAuth } from "@/lib/security/requireAdmin";

// Previously had NO auth check — any unauthenticated caller could read a
// project's full search history (FTO/Novelty/Invalidity/Landscape results)
// by guessing/enumerating a project id.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (user instanceof NextResponse) return user;

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
