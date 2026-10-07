export type LifecycleStage =
  | "CAPTURE"
  | "PROVE"
  | "ARCHITECT"
  | "CLAIM"
  | "PROTECT"
  | "COMPOUND";

export const LIFECYCLE_STAGES: {
  key: LifecycleStage;
  label: string;
  order: number;
  shortDesc: string;
  deliverable: string;
  gatingRule: string;
}[] = [
  {
    key: "CAPTURE",
    label: "Capture",
    order: 1,
    shortDesc: "Log raw invention disclosure & problem definition",
    deliverable: "Invention Disclosure Record",
    gatingRule: "Novelty premise established & inventors assigned",
  },
  {
    key: "PROVE",
    label: "Prove",
    order: 2,
    shortDesc: "Benchmark reduction-to-practice & evidentiary proof",
    deliverable: "Reduction-to-Practice Benchmarks",
    gatingRule: "Empirical verification tests & prior-art clear",
  },
  {
    key: "ARCHITECT",
    label: "Architect",
    order: 3,
    shortDesc: "Draft system architecture & technical drawings FIG 1-8",
    deliverable: "Technical Specification & FIG Drawings",
    gatingRule: "Architecture review signed off by tech lead",
  },
  {
    key: "CLAIM",
    label: "Claim",
    order: 4,
    shortDesc: "Formulate independent & dependent claim hierarchy",
    deliverable: "Statutory Claim Tree",
    gatingRule: "Claim coverage meets 35 U.S.C. 101/102/103 standards",
  },
  {
    key: "PROTECT",
    label: "Protect",
    order: 5,
    shortDesc: "Executive filing authorization & statutory docketing",
    deliverable: "USPTO Official Filing Submission",
    gatingRule: "1-Click CEO filing approval & fee docket disbursement",
  },
  {
    key: "COMPOUND",
    label: "Compound",
    order: 6,
    shortDesc: "Commercialization, CIPs & white-space expansion",
    deliverable: "Portfolio Moat & Derivative Opportunities",
    gatingRule: "Spin-off IP opportunities mapped & defensive moat secured",
  },
];

export interface EvidenceItem {
  id: string;
  title: string;
  category: "TECHNICAL_BENCHMARK" | "PRIOR_ART" | "REDUCTION_TO_PRACTICE" | "STATUTORY_CLEARANCE";
  description: string;
  telemetryValue?: string;
  confidenceScore: number;
  sourceUrl?: string;
  verifiedAt: string;
}

export interface Counterargument {
  id: string;
  examinerQuery: string;
  riskSeverity: "LOW" | "MEDIUM" | "HIGH";
  rebuttalStrategy: string;
  status: "ADDRESSED" | "OPEN";
}

export interface MissingInfo {
  id: string;
  requiredData: string;
  impactedClaim: string;
  urgency: "LOW" | "MEDIUM" | "CRITICAL";
  assignedTo: string;
}

export interface DecisionRecord {
  id: string;
  matterId: string;
  stage: LifecycleStage;
  decision: "APPROVED" | "REWORK" | "REJECTED" | "ESCALATED";
  rationale: string;
  statutoryAuthority: string;
  decidedBy: string;
  decidedAt: string;
  nextAction: string;
}

export interface CeoMatter {
  id: string;
  matter_ref: string;
  title: string;
  stage: LifecycleStage;
  lead_inventor: string;
  novelty_score: number;
  est_filing_cost: number;
  risk_level: "LOW" | "MODERATE" | "HIGH";
  confidence_score: number;
  submitted_date: string;
  conclusion: string;
  recommendation: string;
  next_action: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REWORK_REQUESTED" | "REJECTED" | "FILED";
  evidence: EvidenceItem[];
  counterarguments: Counterargument[];
  missing_info: MissingInfo[];
  decision_history: DecisionRecord[];
}

export interface OpportunityItem {
  id: string;
  title: string;
  category: "WHITE_SPACE" | "DERIVATIVE_CIP" | "CROSS_LICENSING" | "DEFENSIVE_MOAT";
  originMatterRef: string;
  marketValueEst: string;
  defensibilityScore: number;
  whyRationale: string;
  spinoffIdea: string;
  priority: "HIGH" | "MEDIUM" | "STRATEGIC";
}
