import { NextResponse } from "next/server";
import { completeJSON } from "@/lib/llm";
import { hasOpenAIKey } from "@/lib/openai";
import { parseConcepts } from "@/lib/analysis/shared";
import {
  NOVELTY_SYSTEM,
  buildNoveltyUser,
  mockNovelty,
  type NoveltyAssessment,
} from "@/lib/analysis/novelty";

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

  // Phase 6/7: Security & Performance - Input Validation
  if (query.length > 10000) {
    return NextResponse.json({ error: "Query exceeds maximum length of 10,000 characters." }, { status: 400 });
  }

  // Optional auth — gate is handled by RLS at DB level
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    await supabase.auth.getUser(); // keep session warm; no 401 gate in dev
  } catch (err) {
    console.warn("Auth context unavailable, proceeding without session:", err);
  }

  // Note: For Phase 2, a project_id should ideally be required.
  // We'll proceed if it's not provided just to not break existing disconnected UI for now,
  // but if it is provided, we map and persist it.

  try {
    // Generate the base mock data for the complex UI visualizations
    const baseAssessment = mockNovelty(query, concepts);
    
    // Attempt to call the FastAPI backend for real intelligence scores
    // Note: Since we are running on the server side, we use the absolute URL or internal docker URL
    const backendUrl = process.env.API_URL || "http://127.0.0.1:8000/api/v1";
    const res = await fetch(`${backendUrl}/intelligence/novelty`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invention_id: "inv_" + Date.now(),
        description: query,
        target_claims: concepts
      })
    });
    
    let finalAssessment = baseAssessment;
    if (res.ok) {
      const backendData = await res.json();
      
      // Patch the frontend assessment with backend intelligence
      baseAssessment.novelty_score = backendData.novelty_score;
      baseAssessment.similarity_score = backendData.similarity_score;
      baseAssessment.source = "ai";
      
      if (backendData.white_space_opportunities && backendData.white_space_opportunities.length > 0) {
        baseAssessment.white_space_areas = backendData.white_space_opportunities.map((opp: string) => ({
          area: opp.substring(0, 30) + "...",
          openness: 80,
          filing_angle: opp
        }));
      }
    }
    
    // Phase 2: Save to project_searches if project_id is provided
    if (projectId) {
      try {
        const { SearchRepository } = await import("@/modules/workspace/searchRepository");
        const repo = new SearchRepository();
        await repo.upsertSearch(projectId, "NOVELTY", finalAssessment);
      } catch (dbErr) {
        console.error("Failed to persist search result:", dbErr);
      }
    }
    
    return NextResponse.json(finalAssessment);
  } catch (error) {
    console.error("Backend intelligence failed, falling back to mock:", error);
    const fallbackAssessment = mockNovelty(query, concepts);
    
    if (projectId) {
      try {
        const { SearchRepository } = await import("@/modules/workspace/searchRepository");
        const repo = new SearchRepository();
        await repo.upsertSearch(projectId, "NOVELTY", fallbackAssessment);
      } catch (dbErr) {
        console.error("Failed to persist search result:", dbErr);
      }
    }
    
    return NextResponse.json(fallbackAssessment);
  }
}
