import { NextRequest, NextResponse } from "next/server";
import { completeJSON } from "@/lib/llm";
import { hasOpenAIKey } from "@/lib/openai";
import { parseConcepts } from "@/lib/analysis/shared";
import { requireAuth } from "@/lib/security/requireAdmin";
import {
  PATENTABILITY_SYSTEM,
  buildPatentabilityUser,
  mockPatentability,
  type PatentabilityAssessment,
} from "@/lib/analysis/patentability";

// Previously had NO auth check — unauthenticated resource/cost abuse of the
// OpenAI-backed endpoint, and unauthenticated writes into any project_id's
// search record.
export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  let query = "";
  let concepts: string[] = [];
  let projectId = "";
  let mode = "standard";

  try {
    const body = await request.json();
    query = typeof body?.query === "string" ? body.query : "";
    concepts = Array.isArray(body?.concepts) ? body.concepts : parseConcepts(body?.concepts);
    projectId = body?.project_id || "";
    mode = body?.mode || "standard";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!query.trim()) {
    return NextResponse.json({ error: "A query is required" }, { status: 400 });
  }

  try {
    const baseAssessment = mockPatentability(query, concepts);
    
    // Attempt to call the FastAPI backend for real intelligence scores
    const backendUrl = process.env.API_URL || "http://127.0.0.1:8000/api/v1";
    const res = await fetch(`${backendUrl}/intelligence/patentability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invention_id: "inv_" + Date.now(),
        include_commercial_value: true
      })
    });
    
    if (res.ok) {
      const backendData = await res.json();
      baseAssessment.strength_score = backendData.patentability_score;
      baseAssessment.commercial_value_score = backendData.commercial_value_score;
      baseAssessment.risk_score = backendData.overall_risk === "High" ? 85 : backendData.overall_risk === "Medium" ? 50 : 15;
      baseAssessment.recommendation = backendData.filing_recommendation;
      baseAssessment.source = "ai";
    }

    if (projectId && (mode === "complete" || mode === "partial")) {
      try {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        
        // Verify Authentication & RBAC (RLS handles isolation)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          return NextResponse.json({ error: "Unauthorized access to project data" }, { status: 401 });
        }

        // Fetch using authenticated client, RLS ensures we only get searches we own/can access
        const { data: searches, error: searchError } = await supabase
          .from("project_searches")
          .select("*")
          .eq("project_id", projectId);

        if (searchError) throw searchError;
        if (!searches) throw new Error("No searches found");
        
        const novelty = searches.find((s: any) => s.search_type === "NOVELTY")?.result_data;
        const fto = searches.find((s: any) => s.search_type === "FTO")?.result_data;
        const invalidity = searches.find((s: any) => s.search_type === "INVALIDITY")?.result_data;
        const landscape = searches.find((s: any) => s.search_type === "LANDSCAPE")?.result_data;

        // Compose 14-section Unified Report
        baseAssessment.patentability_report = [
          { title: "1. Executive Summary", bullets: [
            baseAssessment.executive_summary,
            `Project Mode: ${mode.toUpperCase()} PFS Generation`,
            `Searches Aggregated: ${searches.length} AI Search Modules`
          ]},
          { title: "2. Invention Overview", bullets: [
            query,
            `Concepts: ${concepts.join(", ")}`
          ]},
          { title: "3. Novelty Analysis", bullets: novelty ? [
            `Verdict: ${novelty.verdict || 'N/A'}`,
            `Novelty Score: ${novelty.novelty_score || 'N/A'}%`,
            `Patent Gaps: ${novelty.patent_gaps?.map((g: any) => g.area).join("; ") || 'None detected'}`
          ] : ["No Novelty Search data found for this project."] },
          { title: "4. Freedom to Operate", bullets: fto ? [
            `Clearance: ${fto.verdict || 'N/A'}`,
            `Blocking Patents: ${fto.blocking_patents?.length || 0} identified`,
            ...((fto.blocking_patents || []).map((b: any) => `${b.patent_number} (${b.risk_level} risk): ${b.overlap}`))
          ] : ["No FTO Search data found for this project."] },
          { title: "5. Validity Assessment", bullets: ["Analysis based on AI validation algorithms (Pending direct integration)."] },
          { title: "6. Invalidity Assessment", bullets: invalidity ? [
            `Vulnerability: ${invalidity.verdict || 'N/A'}`,
            `Risk Score: ${invalidity.risk_score || 'N/A'}%`,
            `Prior Art Found: ${invalidity.invalidating_art?.length || 0}`
          ] : ["No Invalidity Search data found for this project."] },
          { title: "7. Technology Landscape", bullets: landscape ? [
            `Top Assignees: ${landscape.top_assignees?.map((a: any) => a.name).join(", ") || 'N/A'}`,
            `Market Maturity: ${landscape.market_maturity || 'N/A'}`,
            `Whitespace Opportunities: ${landscape.white_space_opportunities?.length || 0}`
          ] : ["No Landscape Search data found for this project."] },
          { title: "8. Design Similarity", bullets: ["No specific design search module executed for this project context."] },
          { title: "9. Prior Art Summary", bullets: novelty ? [
            `Analyzed ${novelty.source_coverage?.reduce((sum: number, s: any) => sum + s.records, 0) || 0} external documents`,
            ...novelty.closest_prior_art?.map((pa: any) => `${pa.patent_number}: ${pa.title}`) || []
          ] : ["Data missing - run Novelty engine to populate."] },
          { title: "10. Risk Assessment", bullets: baseAssessment.risk_factors.map(r => `[${r.severity.toUpperCase()}] ${r.issue} - ${r.mitigation}`) },
          { title: "11. Filing Recommendations", bullets: baseAssessment.recommendation.next_steps },
          { title: "12. Patent Filing Readiness", bullets: [
            `Strength Score: ${baseAssessment.strength_score}%`,
            `Commercial Value: ${baseAssessment.commercial_value_score}%`
          ]},
          { title: "13. References", bullets: [
            "Generated via MOAT AI HUB Orchestration Engine",
            `Search timestamp: ${new Date().toISOString()}`
          ]},
          { title: "14. Appendix", bullets: ["Additional charts and mappings are accessible via the visual dashboard."] }
        ];

        // Auto-save generated unified report as a new version
        const { ReportRepository } = await import("@/modules/workspace/reportRepository");
        const reportRepo = new ReportRepository();
        await reportRepo.createReportVersion(
          projectId, 
          `PFS Report - ${new Date().toLocaleDateString()}`, 
          baseAssessment as any, 
          "Draft"
        );

      } catch (err) {
        console.error("Failed to compose unified report:", err);
      }
    }
    
    return NextResponse.json(baseAssessment);
  } catch (error) {
    console.error("Backend intelligence failed, falling back to mock:", error);
    return NextResponse.json(mockPatentability(query, concepts));
  }
}
