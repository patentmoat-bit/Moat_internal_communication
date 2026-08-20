import { NextResponse } from "next/server";
import { completeJSON } from "@/lib/llm";
import { hasOpenAIKey } from "@/lib/openai";

function getMockComparison(patents: any[]) {
  const p1 = patents[0] || {};
  const p2 = patents[1] || {};
  const t1 = p1.title || "First Patent";
  const t2 = p2.title || "Second Patent";

  return {
    summary: `Comparison between "${t1}" and "${t2}" reveals that both address optimization within similar technical spaces but differ in implementation.`,
    key_differences: [
      `"${t1}" focuses on client-side calibration algorithms.`,
      `"${t2}" addresses server-side load balancing and multi-tenant data storage.`,
    ],
    similarity_score: 67,
    overlap_areas: [
      "Both utilize identical sensor telemetry formats.",
      "Shared communication protocols over WebSocket channels.",
    ],
    freedom_to_operate_impact:
      "Moderate overlap in telemetry processing; risk of licensing requirements if sensor telemetry design matches competitor patents exactly.",
    recommendation:
      "Perform detailed claims analysis focusing on the specific transmission parameters of Claim 3.",
  };
}

const SYSTEM = `You are a patent comparison expert. Return ONLY a JSON object:
{
  "summary": "2-3 sentence overview",
  "key_differences": ["diff 1", "diff 2"],
  "similarity_score": 67,
  "overlap_areas": ["area 1"],
  "freedom_to_operate_impact": "string",
  "recommendation": "string"
}`;

export async function POST(request: Request) {
  try {
    const { patents } = await request.json();

    if (hasOpenAIKey) {
      const ai = await completeJSON<Record<string, unknown>>({
        system: SYSTEM,
        user: `Compare: ${JSON.stringify((patents || []).map((p: any) => ({
          number: p.patent_number,
          title: p.title,
          abstract: p.abstract,
          ipc_codes: p.ipc_codes,
        })))}`,
        maxTokens: 2000,
      });
      if (ai) return NextResponse.json(ai);
    }

    return NextResponse.json(getMockComparison(patents || []));
  } catch (err) {
    console.error("[compare]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
