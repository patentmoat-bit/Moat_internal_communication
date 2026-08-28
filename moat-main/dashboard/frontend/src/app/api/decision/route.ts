import { NextRequest, NextResponse } from "next/server";
import { completeJSON } from "@/lib/llm";
import { hasOpenAIKey } from "@/lib/openai";
import { requireAuth } from "@/lib/security/requireAdmin";
import {
  DECISION_SYSTEM,
  heuristicDecision,
  sanitizeDecision,
} from "@/lib/analysis/decision";

// Previously had NO auth check — unauthenticated resource/cost abuse of the
// OpenAI-backed endpoint.
export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  let query = "";
  try {
    const body = await request.json();
    query = typeof body?.query === "string" ? body.query : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!query.trim()) {
    return NextResponse.json({ error: "A query is required" }, { status: 400 });
  }

  if (!hasOpenAIKey) {
    return NextResponse.json(heuristicDecision(query));
  }

  const ai = await completeJSON<Record<string, unknown>>({
    system: DECISION_SYSTEM,
    user: query,
    maxTokens: 1200,
    temperature: 0.2,
  });

  if (!ai) {
    return NextResponse.json(heuristicDecision(query));
  }

  return NextResponse.json(sanitizeDecision(ai, query));
}
