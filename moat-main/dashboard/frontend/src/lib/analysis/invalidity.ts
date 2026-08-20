import { hashString, mockAssignee, mockPatentNumber, mockYear } from "./shared";

export type Strength = "vulnerable" | "contestable" | "robust";
export type InvalidityAction =
  | "Pursue Challenge"
  | "Gather Stronger Art"
  | "Low Prospects";

export interface ChallengedClaim {
  claim: string;
  vulnerability: number; // 0-100, higher = easier to invalidate
  basis: string;
  note: string;
}

export interface InvalidatingArt {
  patent_number: string;
  title: string;
  assignee: string;
  year: number;
  priority_date: string;
  basis: string; // §102 anticipation / §103 obviousness
  strength: number; // 0-100 as invalidating reference
  overlap: string;
}

export interface InvalidityAssessment {
  target: string;
  invalidity_score: number; // 0-100 likelihood it can be invalidated
  strength: Strength;
  summary: string;
  challenged_claims: ChallengedClaim[];
  invalidating_art: InvalidatingArt[];
  grounds: { ground: string; detail: string }[];
  recommendation: { action: InvalidityAction; rationale: string };
  source: "ai" | "mock";
}

export const INVALIDITY_SYSTEM = `You are PFS's invalidity engine. Given a target patent (and any
described technology), assess how vulnerable its claims are to a validity challenge, and find the
art that could invalidate them. Return ONLY a JSON object:
{
  "target": "what patent/claims are being challenged, restated",
  "invalidity_score": 0-100,
  "strength": "vulnerable|contestable|robust",
  "summary": "2-3 sentences",
  "challenged_claims": [
    { "claim": "Claim 1", "vulnerability": 0-100, "basis": "§102 anticipation|§103 obviousness|§112 indefiniteness", "note": "short" }
  ],
  "invalidating_art": [
    { "patent_number": "US...B2", "title": "...", "assignee": "...", "year": 2016, "priority_date": "2015-04",
      "basis": "§102|§103", "strength": 0-100, "overlap": "which claim element it reads on" }
  ],
  "grounds": [ { "ground": "...", "detail": "..." } ],
  "recommendation": { "action": "Pursue Challenge|Gather Stronger Art|Low Prospects", "rationale": "..." }
}
Higher invalidity_score / vulnerability means easier to invalidate. Pre-priority-date art is strongest.
Give 3-5 challenged_claims, 3-5 invalidating_art (strongest first), 2-3 grounds.`;

export function buildInvalidityUser(query: string, concepts: string[]): string {
  const tech = concepts.length ? `\nRelevant technologies: ${concepts.join(", ")}` : "";
  return `Target to invalidate: ${query}${tech}`;
}

export function mockInvalidity(query: string, concepts: string[]): InvalidityAssessment {
  const tech = concepts.length ? concepts : ["core mechanism", "control logic", "data pipeline"];
  const base = hashString(query + "inval");
  const score = 35 + (base % 58); // 35-92
  const strength: Strength = score >= 68 ? "vulnerable" : score >= 45 ? "contestable" : "robust";

  const bases = ["§102 anticipation", "§103 obviousness", "§103 obviousness", "§112 indefiniteness"];
  const challenged_claims: ChallengedClaim[] = tech.slice(0, 4).map((t, i) => {
    const seed = hashString(t + "claim" + i);
    const vulnerability = Math.max(20, score - i * 11 - (seed % 6));
    return {
      claim: i === 0 ? "Claim 1 (independent)" : `Claim ${i + 1}`,
      vulnerability,
      basis: bases[i % bases.length],
      note:
        vulnerability >= 65
          ? `Earlier art appears to disclose the ${t.toLowerCase()} limitation.`
          : "Partial overlap; would need to combine references.",
    };
  });

  const invalidating_art: InvalidatingArt[] = tech.slice(0, 4).map((t, i) => {
    const seed = hashString(t + "ref" + i);
    const year = mockYear(seed) - 4; // skew earlier so it predates the target
    return {
      patent_number: mockPatentNumber(seed),
      title: `Early ${t.toLowerCase()} apparatus and method`,
      assignee: mockAssignee(seed),
      year,
      priority_date: `${year - 1}-0${1 + (seed % 9)}`,
      basis: i % 2 === 0 ? "§102" : "§103",
      strength: 90 - i * 10 - (seed % 5),
      overlap: `Predates the target and discloses the ${t.toLowerCase()} element of the independent claim.`,
    };
  });

  const action: InvalidityAction =
    strength === "vulnerable" ? "Pursue Challenge" : strength === "contestable" ? "Gather Stronger Art" : "Low Prospects";

  return {
    target: query.trim().slice(0, 240),
    invalidity_score: score,
    strength,
    summary:
      strength === "vulnerable"
        ? "Pre-priority-date art appears to anticipate the independent claim. A validity challenge has strong prospects."
        : strength === "contestable"
          ? "An obviousness combination is plausible, but no single reference anticipates. Prospects are moderate."
          : "The closest art post-dates priority or fails to reach the key limitations. A challenge faces long odds.",
    challenged_claims,
    invalidating_art,
    grounds: [
      { ground: "Anticipation (§102)", detail: `The earliest reference discloses every element of ${challenged_claims[0]?.claim ?? "Claim 1"}.` },
      { ground: "Obviousness (§103)", detail: "Two references in the same field could be combined with predictable results." },
      { ground: "Indefiniteness (§112)", detail: "A key term may lack a clear construction, supporting a secondary attack." },
    ],
    recommendation: {
      action,
      rationale:
        action === "Pursue Challenge"
          ? "The strongest reference predates priority and maps cleanly — viable for IPR or litigation defense."
          : action === "Gather Stronger Art"
            ? "Commission a deeper search for a single anticipatory reference before committing to a challenge."
            : "Current art does not undermine the key claims; redirect effort to design-around or licensing.",
    },
    source: "mock",
  };
}
