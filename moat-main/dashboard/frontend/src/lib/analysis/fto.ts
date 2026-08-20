import { hashString, mockAssignee, mockJurisdiction, mockPatentNumber, titleCase } from "./shared";

export type RiskLevel = "high" | "medium" | "low";
export type FtoAction =
  | "Clear to Operate"
  | "Design Around"
  | "Seek License"
  | "Further Analysis";

export interface BlockingPatent {
  patent_number: string;
  title: string;
  assignee: string;
  jurisdiction: string;
  status: "Active" | "Expired" | "Pending";
  expiry: string;
  risk: RiskLevel;
  claim_overlap: number; // 0-100
  overlap: string;
}

export interface FeatureExposure {
  feature: string;
  exposure: number; // 0-100
  note: string;
}

export interface FtoAssessment {
  product: string;
  risk_level: RiskLevel;
  risk_score: number; // 0-100, higher = more exposure
  summary: string;
  blocking_patents: BlockingPatent[];
  exposure_by_feature: FeatureExposure[];
  mitigations: { strategy: string; detail: string }[];
  recommendation: { action: FtoAction; rationale: string };
  source: "ai" | "mock";
}

export const FTO_SYSTEM = `You are PFS's freedom-to-operate (FTO) engine. Given a product/invention
and its key technologies, assess infringement exposure against live, enforceable patents.
Return ONLY a JSON object with this exact shape:
{
  "product": "one-sentence restatement",
  "risk_level": "high|medium|low",
  "risk_score": 0-100,
  "summary": "2-3 sentences on overall exposure",
  "blocking_patents": [
    { "patent_number": "US...B2", "title": "...", "assignee": "...", "jurisdiction": "US",
      "status": "Active|Expired|Pending", "expiry": "2031-04", "risk": "high|medium|low",
      "claim_overlap": 0-100, "overlap": "which features overlap which claims" }
  ],
  "exposure_by_feature": [ { "feature": "...", "exposure": 0-100, "note": "short" } ],
  "mitigations": [ { "strategy": "Design Around|License|Challenge Validity|Narrow Use", "detail": "..." } ],
  "recommendation": { "action": "Clear to Operate|Design Around|Seek License|Further Analysis", "rationale": "..." }
}
Give 3-5 blocking_patents (highest risk first), 3-5 exposure_by_feature, 2-4 mitigations.
Only Active/Pending patents create real exposure; flag Expired ones as cleared.`;

export function buildFtoUser(query: string, concepts: string[]): string {
  const tech = concepts.length ? `\nKey technologies: ${concepts.join(", ")}` : "";
  return `Product/invention: ${query}${tech}`;
}

/** Deterministic, query-aware mock used when OpenAI is unavailable. */
export function mockFto(query: string, concepts: string[]): FtoAssessment {
  const tech = concepts.length ? concepts : ["core mechanism", "control logic", "data pipeline"];

  const blocking_patents: BlockingPatent[] = tech.slice(0, 4).map((t, i) => {
    const seed = hashString(t + "block" + i);
    const expired = seed % 5 === 0;
    const overlap = 88 - i * 12 - (seed % 5);
    const risk: RiskLevel = expired ? "low" : overlap >= 70 ? "high" : overlap >= 45 ? "medium" : "low";
    const expiryYear = 2026 + (seed % 12);
    return {
      patent_number: mockPatentNumber(seed),
      title: `Method and apparatus for ${t.toLowerCase()} in connected systems`,
      assignee: mockAssignee(seed),
      jurisdiction: mockJurisdiction(seed),
      status: expired ? "Expired" : seed % 7 === 0 ? "Pending" : "Active",
      expiry: expired ? "2021-08" : `${expiryYear}-0${1 + (seed % 9)}`,
      risk,
      claim_overlap: overlap,
      overlap: `Independent claim reads on your ${t.toLowerCase()}${expired ? " — but the patent has lapsed, so it no longer blocks." : "."}`,
    };
  });

  // Overall exposure tracks the worst LIVE blocker — an expired patent does not block.
  const liveOverlaps = blocking_patents
    .filter((p) => p.status !== "Expired")
    .map((p) => p.claim_overlap);
  const score = liveOverlaps.length ? Math.max(...liveOverlaps) : 20;
  const risk_level: RiskLevel = score >= 66 ? "high" : score >= 40 ? "medium" : "low";

  const exposure_by_feature: FeatureExposure[] = tech.slice(0, 5).map((t, i) => {
    const seed = hashString(t + "exp" + i);
    const exposure = 20 + (seed % 75);
    return {
      feature: titleCase(t),
      exposure,
      note:
        exposure >= 65
          ? "Multiple live claims read closely on this feature."
          : exposure >= 35
            ? "Some overlap; a design-around is likely feasible."
            : "Low overlap with enforceable claims.",
    };
  });

  const mitigations =
    risk_level === "low"
      ? [{ strategy: "Narrow Use", detail: "Document the cleared scope and monitor for new filings." }]
      : [
          {
            strategy: "Design Around",
            detail: `Re-architect ${tech[0].toLowerCase()} to avoid the highest-overlap independent claim.`,
          },
          {
            strategy: "Seek License",
            detail: `Engage ${blocking_patents[0]?.assignee ?? "the assignee"} on the blocking family before launch.`,
          },
          {
            strategy: "Challenge Validity",
            detail: "Commission an invalidity search against the highest-risk patent's priority claims.",
          },
        ];

  const action: FtoAction =
    risk_level === "high" ? "Design Around" : risk_level === "medium" ? "Further Analysis" : "Clear to Operate";

  return {
    product: query.trim().slice(0, 240),
    risk_level,
    risk_score: score,
    summary:
      risk_level === "high"
        ? "Several live patents read closely on core features. Do not launch without a design-around or license."
        : risk_level === "medium"
          ? "Moderate exposure: overlaps exist but appear designable-around. A focused claim-chart review is warranted."
          : "Low exposure: the closest enforceable claims do not read cleanly on the product as described.",
    blocking_patents,
    exposure_by_feature,
    mitigations,
    recommendation: {
      action,
      rationale:
        action === "Design Around"
          ? "The highest-overlap claims are live and enforceable; engineering changes are the fastest path to clearance."
          : action === "Further Analysis"
            ? "Exposure is real but bounded — a claim-by-claim chart will confirm whether a design-around suffices."
            : "No live claim reads cleanly on the product; proceed while monitoring new filings.",
    },
    source: "mock",
  };
}
