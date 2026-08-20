import { hashString, mockAssignee, titleCase } from "./shared";

export type FilingTrend = "accelerating" | "steady" | "declining";
export type Maturity = "emerging" | "active" | "mature" | "saturated";

export interface AssigneeShare {
  name: string;
  share: number; // 0-100 % of families
  families: number;
  focus: string;
}

export interface Cluster {
  name: string;
  density: number; // 0-100 relative filing density
  maturity: Maturity;
  note: string;
}

export interface WhiteSpace {
  area: string;
  opportunity: number; // 0-100
  rationale: string;
}

export interface LandscapeReport {
  domain: string;
  summary: string;
  total_families: number;
  filing_trend: FilingTrend;
  timeline: { year: number; filings: number }[];
  top_assignees: AssigneeShare[];
  clusters: Cluster[];
  white_space: WhiteSpace[];
  recommendation: { action: string; rationale: string };
  source: "ai" | "mock";
}

export const LANDSCAPE_SYSTEM = `You are PFS's patent landscape engine. Given a technology domain and
its key sub-technologies, map the IP terrain. Return ONLY a JSON object:
{
  "domain": "the domain, restated",
  "summary": "2-3 sentences on the shape of the landscape",
  "total_families": 1234,
  "filing_trend": "accelerating|steady|declining",
  "timeline": [ { "year": 2018, "filings": 120 } ],
  "top_assignees": [ { "name": "...", "share": 0-100, "families": 0, "focus": "..." } ],
  "clusters": [ { "name": "...", "density": 0-100, "maturity": "emerging|active|mature|saturated", "note": "..." } ],
  "white_space": [ { "area": "...", "opportunity": 0-100, "rationale": "..." } ],
  "recommendation": { "action": "...", "rationale": "..." }
}
Give ~8 timeline years, 4-6 top_assignees (sorted by share, summing roughly under 100),
4-6 clusters, and 2-4 white_space opportunities (highest opportunity first).`;

export function buildLandscapeUser(query: string, concepts: string[]): string {
  const tech = concepts.length ? `\nKey sub-technologies: ${concepts.join(", ")}` : "";
  return `Domain: ${query}${tech}`;
}

const MATURITIES: Maturity[] = ["emerging", "active", "mature", "saturated"];

export function mockLandscape(query: string, concepts: string[]): LandscapeReport {
  const tech = concepts.length ? concepts : ["core mechanism", "control logic", "data pipeline", "integration layer"];
  const base = hashString(query + "land");
  const total_families = 400 + (base % 4200);

  const trends: FilingTrend[] = ["accelerating", "steady", "declining"];
  const filing_trend = trends[base % 3];

  // 8-year filing timeline, shaped by the trend.
  const startYear = 2017;
  const timeline = Array.from({ length: 8 }, (_, i) => {
    const seed = hashString(query + "yr" + i);
    const trendFactor =
      filing_trend === "accelerating" ? 1 + i * 0.18 : filing_trend === "declining" ? 1.6 - i * 0.13 : 1;
    const noise = 0.85 + (seed % 30) / 100;
    return { year: startYear + i, filings: Math.max(8, Math.round(40 * trendFactor * noise)) };
  });

  // Deterministic assignee shares that sum to ~100.
  const rawShares = tech.slice(0, 5).map((t, i) => 30 - i * 5 + (hashString(t + "sh" + i) % 6));
  const total = rawShares.reduce((s, v) => s + v, 0) + 18; // remainder = "others"
  const top_assignees: AssigneeShare[] = rawShares.map((raw, i) => {
    const seed = hashString(tech[i] + "as" + i);
    const share = Math.round((raw / total) * 100);
    return {
      name: mockAssignee(seed),
      share,
      families: Math.round((share / 100) * total_families),
      focus: `${titleCase(tech[i])} and adjacent methods`,
    };
  });

  const clusters: Cluster[] = tech.slice(0, 5).map((t, i) => {
    const seed = hashString(t + "cl" + i);
    return {
      name: titleCase(t),
      density: 30 + (seed % 65),
      maturity: MATURITIES[seed % MATURITIES.length],
      note:
        "Filing activity " +
        (seed % 2 === 0 ? "is concentrated among the top assignees." : "is fragmented across many smaller players."),
    };
  });

  const white_space: WhiteSpace[] = [
    {
      area: `${titleCase(tech[tech.length - 1])} for low-resource / edge deployment`,
      opportunity: 70 + (base % 25),
      rationale: "Few families address constrained-environment implementations of this sub-technology.",
    },
    {
      area: `Cross-domain integration of ${tech[0].toLowerCase()} with ${(tech[1] ?? "control").toLowerCase()}`,
      opportunity: 55 + (hashString(query + "ws2") % 30),
      rationale: "The combination is under-claimed relative to each part individually.",
    },
    {
      area: "Standards-aligned interoperability claims",
      opportunity: 48 + (hashString(query + "ws3") % 28),
      rationale: "Emerging standards create room for foundational, broadly-licensable filings.",
    },
  ].sort((a, b) => b.opportunity - a.opportunity);

  return {
    domain: query.trim().slice(0, 240),
    summary:
      filing_trend === "accelerating"
        ? "A fast-growing, increasingly competitive space. The leaders are consolidating core clusters while edge applications remain open."
        : filing_trend === "declining"
          ? "A maturing space with slowing filings. Most core territory is claimed, but white space persists at the margins."
          : "A steady, established landscape. A handful of assignees dominate the core; differentiated white space exists in cross-domain integration.",
    total_families,
    filing_trend,
    timeline,
    top_assignees,
    clusters,
    white_space,
    recommendation: {
      action: filing_trend === "declining" ? "Target White Space" : "File Early in Open Clusters",
      rationale:
        filing_trend === "declining"
          ? "Core clusters are saturated; concentrate filings on the highest-opportunity white space identified above."
          : "Activity is rising and several clusters are still emerging — file now to establish position before they consolidate.",
    },
    source: "mock",
  };
}
