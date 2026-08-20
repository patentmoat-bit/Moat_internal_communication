import { NextResponse } from "next/server";
import { completeJSON } from "@/lib/llm";
import { hasOpenAIKey } from "@/lib/openai";

function getMockAnalysis(patent: any) {
  const title = patent?.title || "Patent Title";
  return {
    novelty_score: 88,
    novelty_explanation: `The patent introduces key innovations in the domain of ${title}. It describes a novel architecture for optimizing workflow efficiency with low latency.`,
    claim_summary: [
      "Claim 1: A system comprising a data sensor, processing unit, and feedback actuator.",
      "Claim 2: The system of Claim 1, wherein the sensor detects real-time variance.",
    ],
    key_innovations: [
      "Dynamic auto-calibration mechanism.",
      "Optimized signal processing pipeline to filter environmental noise.",
    ],
    potential_applications: [
      "Industrial automation monitoring.",
      "Consumer smart devices and health analytics.",
    ],
    prior_art_risk: "Medium",
    prior_art_explanation:
      "Some active assignees have similar filings in 2019-2020, but none combine the exact closed-loop feedback design specified in Claim 1.",
    freedom_to_operate:
      "High probability of FTO, provided that the calibration routine is kept distinct from known competitor patents.",
    market_relevance:
      "Highly relevant as the industry moves towards connected and intelligent sensors.",
    citation_analysis:
      "Cited by 12 subsequent applications, indicating foundational relevance in the segment.",
    similar_patents: [
      { number: "US9823412B1", title: "Sensor Calibration System", similarity: 82 },
      { number: "US11029432B2", title: "Closed-loop feedback control method", similarity: 75 },
    ],
  };
}

const SYSTEM = `You are a patent analysis expert. Return ONLY a JSON object:
{
  "novelty_score": 87,
  "novelty_explanation": "string",
  "claim_summary": ["claim 1", "claim 2"],
  "key_innovations": ["innovation 1"],
  "potential_applications": ["app 1", "app 2"],
  "prior_art_risk": "Low",
  "prior_art_explanation": "string",
  "freedom_to_operate": "string",
  "market_relevance": "string",
  "citation_analysis": "string",
  "similar_patents": [{"number": "US...", "title": "...", "similarity": 78}]
}`;

export async function POST(request: Request) {
  try {
    const { patent } = await request.json();

    if (hasOpenAIKey) {
      const ai = await completeJSON<Record<string, unknown>>({
        system: SYSTEM,
        user: `Analyze patent ${patent?.patent_number}: ${patent?.title}. Abstract: ${patent?.abstract}`,
        maxTokens: 2000,
      });
      if (ai) return NextResponse.json(ai);
    }

    return NextResponse.json(getMockAnalysis(patent));
  } catch (err) {
    console.error("[analyze]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
