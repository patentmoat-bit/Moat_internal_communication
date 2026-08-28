import { NextRequest, NextResponse } from "next/server";
import { completeJSON } from "@/lib/llm";
import { hasOpenAIKey } from "@/lib/openai";
import { parseConcepts } from "@/lib/analysis/shared";
import { requireAuth } from "@/lib/security/requireAdmin";
import { FTO_SYSTEM, buildFtoUser, mockFto, type FtoAssessment } from "@/lib/analysis/fto";

// Previously only "kept the session warm" without ever gating on it — any
// unauthenticated caller could inject/overwrite FTO search results on any
// project_id. Now actually requires a valid session.
export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  let query = "";
  let concepts: string[] = [];
  let projectId = "";
  try {
    const body = await request.json();
    query = typeof body?.query === "string" ? body.query : "";
    concepts = Array.isArray(body?.concepts) ? body.concepts : parseConcepts(body?.concepts);
    projectId = body?.project_id || "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!query.trim()) {
    return NextResponse.json({ error: "A query is required" }, { status: 400 });
  }

  // Phase 14 & 15: Security & Performance Input Validation
  if (query.length > 15000) {
    return NextResponse.json({ error: "Query exceeds maximum length of 15,000 characters." }, { status: 400 });
  }

  if (hasOpenAIKey) {
    const ai = await completeJSON<Partial<FtoAssessment>>({
      system: FTO_SYSTEM,
      user: buildFtoUser(query, concepts),
      maxTokens: 2200,
      temperature: 0.3,
    });
    if (ai && Array.isArray(ai.blocking_patents) && ai.blocking_patents.length) {
      const finalAssessment = { ...ai, source: "ai" };
      if (projectId) {
        try {
          const { SearchRepository } = await import("@/modules/workspace/searchRepository");
          const repo = new SearchRepository();
          await repo.upsertSearch(projectId, "FTO", finalAssessment);
        } catch (dbErr) { console.error("Failed to persist search result:", dbErr); }
      }
      return NextResponse.json(finalAssessment);
    }
  }

  const fallbackAssessment = mockFto(query, concepts);
  if (projectId) {
    try {
      const { SearchRepository } = await import("@/modules/workspace/searchRepository");
      const repo = new SearchRepository();
      await repo.upsertSearch(projectId, "FTO", fallbackAssessment);
    } catch (dbErr) { console.error("Failed to persist search result:", dbErr); }
  }
  return NextResponse.json(fallbackAssessment);
}
