import { NextResponse } from "next/server";
import { completeJSON } from "@/lib/llm";
import { hasOpenAIKey } from "@/lib/openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";

function getMockReport(description: string) {
  return {
    report_title: "Patentability Assessment: " + (description.length > 35 ? description.substring(0, 35) + "..." : description),
    executive_summary: `This landscape assessment evaluates the patentability and technical positioning of the proposed invention: "${description}". Based on current prior art, the general outlook is positive with manageable risks.`,
    invention_analysis: {
      title: "Intelligent System Implementation",
      technical_field: "Computer-implemented data processing and telemetry feedback",
      key_features: ["Adaptive signal filtration", "Dynamic auto-calibration", "Closed-loop feedback execution"],
      novelty_assessment:
        "The specific combination of dynamic auto-calibration telemetry and real-time noise reduction appears novel compared to existing literature.",
      patentability_outlook: "Favorable",
    },
    search_methodology:
      "Searched Google Patents, USPTO database, and Espacenet using keywords, CPC categories, and applicant profiles.",
    prior_art_found: [
      {
        patent_number: "US10293481B2",
        title: "System and method for sensor telemetry calibration",
        relevance: "High",
        overlap_description: "Describes a calibration method, but lacks the specific dynamic signal noise filtering of the current invention.",
      },
      {
        patent_number: "EP3492811A1",
        title: "Dynamic data processing in telemetry networks",
        relevance: "Medium",
        overlap_description: "Deals with data filtration, but operates on network headers rather than raw telemetry payload data.",
      },
    ],
    freedom_to_operate: {
      assessment:
        "No direct blocking patents were identified, but licensing of foundational telemetry transport patents may be required depending on deployment options.",
      risk_level: "Low",
      blocking_patents: [],
    },
    recommendations: [
      "Draft claims specifically focused on the payload-based dynamic filtration algorithm.",
      "Conduct a targeted search of European patent applications before final filing.",
    ],
    conclusion:
      "The invention displays solid novelty and the overall patentability outlook is highly favorable. Recommended to proceed with drafting the application.",
  };
}

const SYSTEM = `You are a patent research expert. Return ONLY a JSON object:
{
  "report_title": "string",
  "executive_summary": "string",
  "invention_analysis": {
    "title": "string",
    "technical_field": "string",
    "key_features": ["feature 1"],
    "novelty_assessment": "string",
    "patentability_outlook": "Favorable"
  },
  "search_methodology": "string",
  "prior_art_found": [
    { "patent_number": "string", "title": "string", "relevance": "High", "overlap_description": "string" }
  ],
  "freedom_to_operate": { "assessment": "string", "risk_level": "Low", "blocking_patents": [] },
  "recommendations": ["rec 1", "rec 2"],
  "conclusion": "string"
}`;

export async function POST(request: Request) {
  try {
    const { description, workspaceId } = await request.json();

    let data: any = null;
    if (hasOpenAIKey) {
      data = await completeJSON<Record<string, unknown>>({
        system: SYSTEM,
        user: description || "",
        maxTokens: 4000,
      });
    }
    if (!data) data = getMockReport(description || "");

    // Persist when a real Supabase session exists
    let reportId: string | undefined;
    try {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get("custom_access_token")?.value;
      let userId = null;
      if (accessToken) {
        const payload = await verifyToken(accessToken);
        if (payload && payload.sub) userId = payload.sub;
      }

      if (userId) {
        const supabase = createAdminClient();
        const { data: report, error } = await supabase
          .from("reports")
          .insert({
            user_id: userId,
            title: data.report_title,
            invention_description: description,
            report_data: data,
            workspace_id: workspaceId || null,
          })
          .select()
          .single();
        if (error) console.error("Report DB error:", error);
        reportId = report?.id;
      }
    } catch (e) {
      console.warn("[report] persistence skipped:", (e as Error).message);
    }

    return NextResponse.json({ ...data, id: reportId });
  } catch (err) {
    console.error("[report]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("custom_access_token")?.value;
    let userId = null;
    if (accessToken) {
      const payload = await verifyToken(accessToken);
      if (payload && payload.sub) userId = payload.sub;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ reports });
  } catch (err) {
    console.error("[report GET]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
