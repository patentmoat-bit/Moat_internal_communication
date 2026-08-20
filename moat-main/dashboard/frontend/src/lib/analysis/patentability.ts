import { hashString, titleCase } from "./shared";

export type Outlook = "favorable" | "moderate" | "challenging";
export type CriterionVerdict = "pass" | "caution" | "risk";
export type PatentabilityAction =
  | "File Patent"
  | "Improve Invention"
  | "Conduct More Research"
  | "Do Not File";

export interface EvaluationCriterion {
  name: "Novelty" | "Utility" | "Non-obviousness" | "Enablement" | "Commercial Potential" | "Defensibility";
  verdict: CriterionVerdict;
  score: number;
  weight: number;
  finding: string;
  evidence_needed: string[];
  improvement_actions: string[];
}

export interface RiskFactor {
  issue: string;
  severity: "high" | "medium" | "low";
  probability: number;
  mitigation: string;
}

export interface StrengthFactor {
  factor: string;
  score: number;
  rationale: string;
}

export interface CommercialSignal {
  signal: string;
  score: number;
  rationale: string;
}

export interface ReportSection {
  title: string;
  bullets: string[];
}

export interface AttorneyReviewItem {
  item: string;
  purpose: string;
  materials: string[];
}

export interface PatentabilityAssessment {
  invention: string;
  patentability_score: number;
  risk_score: number;
  strength_score: number;
  commercial_value_score: number;
  outlook: Outlook;
  summary: string;
  executive_summary: string;
  criteria: EvaluationCriterion[];
  risk_factors: RiskFactor[];
  strength_factors: StrengthFactor[];
  commercial_signals: CommercialSignal[];
  recommendation: { action: PatentabilityAction; rationale: string; next_steps: string[] };
  patentability_report: ReportSection[];
  attorney_review_package: AttorneyReviewItem[];
  source: "ai" | "mock";
}

export const PATENTABILITY_SYSTEM = `You are PFS's Phase 4 patentability engine. Given an invention and key technologies,
evaluate whether the invention should be filed as a patent. Return ONLY a JSON object:
{
  "invention": "one-sentence restatement",
  "patentability_score": 0-100,
  "risk_score": 0-100,
  "strength_score": 0-100,
  "commercial_value_score": 0-100,
  "outlook": "favorable|moderate|challenging",
  "summary": "2-3 sentence overall assessment",
  "executive_summary": "short executive-ready paragraph",
  "criteria": [
    {
      "name": "Novelty|Utility|Non-obviousness|Enablement|Commercial Potential|Defensibility",
      "verdict": "pass|caution|risk",
      "score": 0-100,
      "weight": 0-100,
      "finding": "specific finding",
      "evidence_needed": ["evidence item"],
      "improvement_actions": ["action item"]
    }
  ],
  "risk_factors": [
    { "issue": "...", "severity": "high|medium|low", "probability": 0-100, "mitigation": "..." }
  ],
  "strength_factors": [
    { "factor": "...", "score": 0-100, "rationale": "..." }
  ],
  "commercial_signals": [
    { "signal": "...", "score": 0-100, "rationale": "..." }
  ],
  "recommendation": {
    "action": "File Patent|Improve Invention|Conduct More Research|Do Not File",
    "rationale": "...",
    "next_steps": ["..."]
  },
  "patentability_report": [
    { "title": "...", "bullets": ["..."] }
  ],
  "attorney_review_package": [
    { "item": "...", "purpose": "...", "materials": ["..."] }
  ]
}
Cover all six evaluation criteria. Make the report practical for founders, product teams, and patent counsel.`;

export function buildPatentabilityUser(query: string, concepts: string[]): string {
  const tech = concepts.length ? `\nKey technologies: ${concepts.join(", ")}` : "";
  return `Invention: ${query}${tech}`;
}

const CRITERIA: EvaluationCriterion["name"][] = [
  "Novelty",
  "Utility",
  "Non-obviousness",
  "Enablement",
  "Commercial Potential",
  "Defensibility",
];

const WEIGHTS: Record<EvaluationCriterion["name"], number> = {
  Novelty: 22,
  Utility: 10,
  "Non-obviousness": 22,
  Enablement: 16,
  "Commercial Potential": 14,
  Defensibility: 16,
};

export function mockPatentability(query: string, concepts: string[]): PatentabilityAssessment {
  const tech = concepts.length ? concepts : ["core mechanism", "technical workflow", "implementation detail"];
  const normalizedQuery = query.trim().slice(0, 240);

  const criteria: EvaluationCriterion[] = CRITERIA.map((name, i) => {
    const seed = hashString(query + name + i);
    const score = 46 + (seed % 51);
    const verdict: CriterionVerdict = score >= 74 ? "pass" : score >= 57 ? "caution" : "risk";
    return {
      name,
      verdict,
      score,
      weight: WEIGHTS[name],
      finding: findingFor(name, verdict, tech, seed),
      evidence_needed: evidenceFor(name, tech),
      improvement_actions: actionsFor(name, verdict, tech),
    };
  });

  const weightedTotal = criteria.reduce((sum, item) => sum + item.score * item.weight, 0);
  const totalWeight = criteria.reduce((sum, item) => sum + item.weight, 0);
  const patentability_score = Math.round(weightedTotal / totalWeight);
  const risk_score = Math.max(5, Math.min(95, Math.round(100 - patentability_score + riskModifier(criteria))));
  const strength_score = Math.round((scoreOf(criteria, "Novelty") + scoreOf(criteria, "Non-obviousness") + scoreOf(criteria, "Defensibility")) / 3);
  const commercial_value_score = Math.round((scoreOf(criteria, "Commercial Potential") * 0.7) + (scoreOf(criteria, "Utility") * 0.3));

  const outlook: Outlook = patentability_score >= 74 ? "favorable" : patentability_score >= 58 ? "moderate" : "challenging";
  const weakest = [...criteria].sort((a, b) => a.score - b.score)[0];
  const strongest = [...criteria].sort((a, b) => b.score - a.score)[0];

  const action: PatentabilityAction =
    patentability_score >= 76 && risk_score <= 45
      ? "File Patent"
      : patentability_score >= 60
        ? "Improve Invention"
        : risk_score < 72
          ? "Conduct More Research"
          : "Do Not File";

  const risk_factors: RiskFactor[] = [
    {
      issue: `${weakest.name} vulnerability`,
      severity: weakest.score < 55 ? "high" : weakest.score < 70 ? "medium" : "low",
      probability: Math.max(15, 100 - weakest.score),
      mitigation: weakest.improvement_actions[0],
    },
    {
      issue: "Prior-art overlap in adjacent implementations",
      severity: risk_score > 68 ? "high" : risk_score > 42 ? "medium" : "low",
      probability: Math.max(20, Math.min(88, risk_score + 8)),
      mitigation: `Run focused prior-art search around ${tech[0].toLowerCase()} and add fallback claim positions.`,
    },
    {
      issue: "Claim scope may be too broad for first filing",
      severity: patentability_score < 65 ? "medium" : "low",
      probability: Math.max(18, 72 - patentability_score),
      mitigation: "Draft one narrow independent claim and multiple dependent claims that preserve commercial coverage.",
    },
  ];

  const strength_factors: StrengthFactor[] = [
    {
      factor: "Technical differentiation",
      score: strength_score,
      rationale: `${titleCase(tech[0])} appears strongest when claimed with ${tech[1]?.toLowerCase() || "the implementation workflow"}.`,
    },
    {
      factor: "Fallback claim depth",
      score: Math.max(42, Math.min(95, scoreOf(criteria, "Enablement") - 4 + (hashString(query) % 12))),
      rationale: "Dependent claims can preserve scope if the examiner narrows the independent claim.",
    },
    {
      factor: "Enforcement clarity",
      score: scoreOf(criteria, "Defensibility"),
      rationale: "Claims are stronger when infringement can be detected from observable product behavior or documentation.",
    },
  ];

  const commercial_signals: CommercialSignal[] = [
    {
      signal: "Market pull",
      score: commercial_value_score,
      rationale: "The invention maps to an identifiable product capability rather than a purely internal optimization.",
    },
    {
      signal: "Licensing leverage",
      score: Math.max(35, Math.min(92, strength_score - 2 + (hashString(query + "license") % 15))),
      rationale: "Commercial value improves if claims cover a capability competitors need to ship or interoperate with.",
    },
    {
      signal: "Portfolio fit",
      score: Math.max(38, Math.min(94, patentability_score - 6 + (hashString(query + "portfolio") % 18))),
      rationale: "The asset can support a broader moat when paired with continuation and design-around coverage.",
    },
  ];

  const next_steps = nextStepsFor(action, weakest, tech);

  return {
    invention: normalizedQuery,
    patentability_score,
    risk_score,
    strength_score,
    commercial_value_score,
    outlook,
    summary:
      outlook === "favorable"
        ? `The invention has a strong filing profile, led by ${strongest.name.toLowerCase()} and defensible technical framing.`
        : outlook === "moderate"
          ? `The invention is potentially patentable, but ${weakest.name.toLowerCase()} should be strengthened before filing broad claims.`
          : `The current disclosure has meaningful filing risk, especially around ${weakest.name.toLowerCase()}. Improve the invention record before filing.`,
    executive_summary:
      action === "File Patent"
        ? `Rith recommends filing. The invention shows a credible technical contribution, manageable prosecution risk, and enough commercial relevance to justify a patent filing package.`
        : action === "Improve Invention"
          ? `Rith recommends improving the invention before filing broad claims. A provisional or narrow filing may be reasonable if disclosure is strengthened quickly.`
          : action === "Conduct More Research"
            ? `Rith recommends additional research before filing. The team should validate prior art, tighten technical evidence, and confirm market relevance.`
            : `Rith does not recommend filing at this stage. The invention needs clearer technical differentiation and a stronger commercial or defensive rationale.`,
    criteria,
    risk_factors,
    strength_factors,
    commercial_signals,
    recommendation: {
      action,
      rationale: recommendationRationale(action, weakest),
      next_steps,
    },
    patentability_report: buildReport(query, criteria, risk_factors, strength_factors, commercial_signals),
    attorney_review_package: buildAttorneyPackage(tech, weakest),
    source: "mock",
  };
}

function scoreOf(criteria: EvaluationCriterion[], name: EvaluationCriterion["name"]): number {
  return criteria.find((item) => item.name === name)?.score ?? 50;
}

function riskModifier(criteria: EvaluationCriterion[]): number {
  return criteria.filter((item) => item.verdict === "risk").length * 7 - criteria.filter((item) => item.verdict === "pass").length * 3;
}

function findingFor(name: EvaluationCriterion["name"], verdict: CriterionVerdict, tech: string[], seed: number): string {
  const core = tech[seed % tech.length]?.toLowerCase() || "the core mechanism";
  if (name === "Novelty") return verdict === "pass" ? `The combination around ${core} appears meaningfully distinct.` : `Known references may disclose parts of ${core}; combination language is important.`;
  if (name === "Utility") return `The invention has practical utility if the disclosure ties ${core} to a measurable technical result.`;
  if (name === "Non-obviousness") return verdict === "pass" ? "The claimed combination can be argued as more than predictable substitution." : "An examiner may combine adjacent references unless unexpected results are documented.";
  if (name === "Enablement") return verdict === "risk" ? "The specification needs implementation detail, examples, and operating ranges." : "The disclosure can support claims if examples and alternatives are included.";
  if (name === "Commercial Potential") return "Commercial value depends on whether the claims cover a product-critical capability.";
  return "Defensibility improves when infringement can be detected and design-arounds are covered.";
}

function evidenceFor(name: EvaluationCriterion["name"], tech: string[]): string[] {
  if (name === "Novelty") return ["Focused prior-art search", "Claim element comparison chart", "Known product comparison"];
  if (name === "Utility") return ["Use-case description", "Performance metric", "Prototype or workflow evidence"];
  if (name === "Non-obviousness") return ["Unexpected result evidence", "Technical problem statement", "Alternative approaches considered"];
  if (name === "Enablement") return ["Implementation examples", "System diagrams", `Operating details for ${tech[0].toLowerCase()}`];
  if (name === "Commercial Potential") return ["Target market", "Competitor product mapping", "Customer pain point"];
  return ["Detectability analysis", "Design-around map", "Claim scope ladder"];
}

function actionsFor(name: EvaluationCriterion["name"], verdict: CriterionVerdict, tech: string[]): string[] {
  const base = verdict === "pass" ? "Preserve this strength in the first claim set." : "Strengthen before relying on this in broad independent claims.";
  if (name === "Novelty") return [base, `Define the unique interaction between ${tech[0].toLowerCase()} and ${tech[1]?.toLowerCase() || "the system"}.`];
  if (name === "Utility") return [base, "Add concrete examples of use and measurable operational benefit."];
  if (name === "Non-obviousness") return [base, "Document unexpected results and why known references would not be combined."];
  if (name === "Enablement") return [base, "Add diagrams, parameter ranges, and alternative embodiments."];
  if (name === "Commercial Potential") return [base, "Map claims to product features and buyer value."];
  return [base, "Add claim variants that cover likely design-arounds and observable infringement."];
}

function nextStepsFor(action: PatentabilityAction, weakest: EvaluationCriterion, tech: string[]): string[] {
  if (action === "File Patent") return ["Prepare invention disclosure form", "Draft provisional or non-provisional claims", "Run final prior-art clearance search", "Send attorney review package"];
  if (action === "Improve Invention") return [weakest.improvement_actions[0], "Add experimental or prototype evidence", `Draft fallback claims around ${tech[0].toLowerCase()}`, "Schedule attorney review"];
  if (action === "Conduct More Research") return ["Run novelty and prior-art search", "Compare top references claim-by-claim", "Validate commercial use case", "Re-score after evidence is added"];
  return ["Do not spend on filing yet", "Develop stronger technical differentiation", "Revisit after prototype or market validation", "Document learnings for trade-secret strategy"];
}

function recommendationRationale(action: PatentabilityAction, weakest: EvaluationCriterion): string {
  if (action === "File Patent") return "The invention clears the main filing thresholds and has enough defensibility to justify attorney drafting.";
  if (action === "Improve Invention") return `${weakest.name} is the limiting factor. Improve the invention record before pursuing broad claim scope.`;
  if (action === "Conduct More Research") return "The record is not yet strong enough for a confident filing decision; targeted research can reduce uncertainty.";
  return "The expected filing value does not justify patent spend until the technical and commercial case improves.";
}

function buildReport(query: string, criteria: EvaluationCriterion[], risks: RiskFactor[], strengths: StrengthFactor[], signals: CommercialSignal[]): ReportSection[] {
  return [
    {
      title: "Evaluation Basis",
      bullets: [
        `Invention reviewed: ${query.trim().slice(0, 180)}`,
        "Assessment covers novelty, utility, non-obviousness, enablement, commercial potential, and defensibility.",
      ],
    },
    {
      title: "Patentability Findings",
      bullets: criteria.map((item) => `${item.name}: ${item.score}/100 - ${item.finding}`),
    },
    {
      title: "Risk Analysis",
      bullets: risks.map((risk) => `${titleCase(risk.severity)} risk: ${risk.issue}. Mitigation: ${risk.mitigation}`),
    },
    {
      title: "Strength and Commercial Value",
      bullets: [...strengths.map((item) => `${item.factor}: ${item.rationale}`), ...signals.map((item) => `${item.signal}: ${item.rationale}`)],
    },
  ];
}

function buildAttorneyPackage(tech: string[], weakest: EvaluationCriterion): AttorneyReviewItem[] {
  return [
    {
      item: "Invention Disclosure",
      purpose: "Give counsel the technical facts needed for drafting.",
      materials: ["Problem statement", "System architecture", "Inventor notes", `Details for ${tech[0].toLowerCase()}`],
    },
    {
      item: "Prior-Art Packet",
      purpose: "Help counsel evaluate novelty and obviousness risk.",
      materials: ["Top references", "Claim element map", "Known product comparisons"],
    },
    {
      item: "Claim Strategy Notes",
      purpose: "Identify broad, narrow, and fallback claim positions.",
      materials: ["Independent claim concept", "Dependent claim ladder", "Design-around scenarios"],
    },
    {
      item: `${weakest.name} Support Addendum`,
      purpose: "Address the weakest evaluation area before filing.",
      materials: weakest.evidence_needed,
    },
  ];
}
