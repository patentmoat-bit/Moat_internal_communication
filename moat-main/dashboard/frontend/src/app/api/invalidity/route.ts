import { NextResponse } from "next/server";
import { completeJSON } from "@/lib/llm";
import { hasOpenAIKey } from "@/lib/openai";
import { parseConcepts } from "@/lib/analysis/shared";
import {
  INVALIDITY_SYSTEM,
  buildInvalidityUser,
  mockInvalidity,
  type InvalidityAssessment,
} from "@/lib/analysis/invalidity";

export async function POST(request: Request) {
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

  if (hasOpenAIKey) {
    const ai = await completeJSON<Partial<InvalidityAssessment>>({
      system: INVALIDITY_SYSTEM,
      user: buildInvalidityUser(query, concepts),
      maxTokens: 2200,
      temperature: 0.3,
    });
    if (ai && Array.isArray(ai.invalidating_art) && ai.invalidating_art.length) {
      const finalAssessment = { ...ai, source: "ai" };
      if (projectId) {
        try {
          const { SearchRepository } = await import("@/modules/workspace/searchRepository");
          const repo = new SearchRepository();
          await repo.upsertSearch(projectId, "INVALIDITY", finalAssessment);
        } catch (dbErr) { console.error("Failed to persist search result:", dbErr); }
      }
      return NextResponse.json(finalAssessment);
    }
  }

  const fallbackAssessment = mockInvalidity(query, concepts);
  if (projectId) {
    try {
      const { SearchRepository } = await import("@/modules/workspace/searchRepository");
      const repo = new SearchRepository();
      await repo.upsertSearch(projectId, "INVALIDITY", fallbackAssessment);
    } catch (dbErr) { console.error("Failed to persist search result:", dbErr); }
  }
  return NextResponse.json(fallbackAssessment);
}
