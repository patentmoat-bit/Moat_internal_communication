import { DECISION_MODES, isDecisionMode, type DecisionModeId } from "@/lib/decisionModes";

export type Confidence = "high" | "medium" | "low";

export interface Technology {
  name: string;
  relevance: number; // 0-100
  what_it_is: string;
}

export interface AlternateMode {
  mode: DecisionModeId;
  confidence: Confidence;
  why: string;
}

export interface DecisionBrief {
  interpreted_invention: string;
  recommended_mode: DecisionModeId;
  confidence: Confidence;
  rationale: string;
  alternate_modes: AlternateMode[];
  technologies: Technology[];
  source: "ai" | "heuristic";
}

export const DECISION_SYSTEM = `You are the routing intelligence for PFS, a patent decision system.
A user gives you a natural-language query or invention disclosure. You do TWO things:

1. Decide which single analysis mode best fits their intent. Modes:
   - novelty: "is this new?" — checking an idea against existing art
   - prior_art: open-ended "what exists for this?" reference gathering
   - fto: "can we build/sell this without infringing?" — freedom to operate / risk
   - patentability: "is this worth filing?" — likelihood of grant
   - invalidity: "can THIS existing patent be challenged?" — attacking a known patent
   - landscape: "what's the IP terrain in this space?" — assignees, clusters, white space

2. Extract the technologies/concepts the invention covers.

Return ONLY a JSON object with this exact shape:
{
  "interpreted_invention": "one-sentence restatement of what the invention/query is about",
  "recommended_mode": "novelty|prior_art|fto|patentability|invalidity|landscape",
  "confidence": "high|medium|low",
  "rationale": "1-2 sentences on why this mode fits the query",
  "alternate_modes": [
    { "mode": "<other mode id>", "confidence": "high|medium|low", "why": "short reason" }
  ],
  "technologies": [
    { "name": "short technology/concept name", "relevance": 0-100, "what_it_is": "one clause explaining it" }
  ]
}
Give 2-3 alternate_modes (most plausible first) and 3-6 technologies (highest relevance first).
Be decisive about the recommended mode. Confidence reflects how clearly the query signals intent.`;

const KEYWORDS: Record<DecisionModeId, string[]> = {
  invalidity: ["invalidate", "invalidity", "challenge", "bust", "kill this patent", "void", "revoke", "us0", "us1", "ep", "patent number"],
  fto: ["freedom to operate", "fto", "infringe", "infringement", "clear to", "can we make", "can we sell", "launch", "commercial", "right to use"],
  patentability: ["worth filing", "should we file", "patentable", "patentability", "file a patent", "get a patent", "grant", "prosecution"],
  landscape: ["landscape", "white space", "whitespace", "competitors", "who owns", "trends", "market", "players", "terrain", "clusters", "assignees"],
  novelty: ["novel", "novelty", "is this new", "already invented", "new idea", "differentiate", "unique"],
  prior_art: ["prior art", "references", "find patents", "search for", "similar patents", "what exists"],
};

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "using", "based", "system", "method",
  "device", "apparatus", "a", "an", "of", "to", "in", "on", "is", "are", "be", "by", "or", "as", "it",
  "which", "can", "we", "our", "their", "they", "invention", "idea", "patent", "patents",
]);

/**
 * Deterministic classifier used when OpenAI is unavailable or fails. Pure so it
 * can be unit-tested without a network call.
 */
export function heuristicDecision(query: string): DecisionBrief {
  const q = query.toLowerCase();
  const scores = (Object.keys(KEYWORDS) as DecisionModeId[]).map((mode) => ({
    mode,
    score: KEYWORDS[mode].reduce((n, kw) => (q.includes(kw) ? n + 1 : n), 0),
  }));
  scores.sort((a, b) => b.score - a.score);

  const top = scores[0];
  const recommended: DecisionModeId = top.score > 0 ? top.mode : "novelty";
  const confidence: Confidence = top.score >= 2 ? "high" : top.score === 1 ? "medium" : "low";

  const alternates = scores
    .filter((s) => s.mode !== recommended && s.score > 0)
    .slice(0, 2)
    .map((s) => ({
      mode: s.mode,
      confidence: (s.score >= 2 ? "medium" : "low") as Confidence,
      why: `Query also signals ${DECISION_MODES[s.mode].label.toLowerCase()}.`,
    }));
  if (alternates.length === 0) {
    alternates.push({ mode: "prior_art", confidence: "low", why: "A broad prior-art sweep is a safe alternative." });
  }

  const freq = new Map<string, number>();
  for (const word of q.replace(/[^a-z0-9\s-]/g, " ").split(/\s+/)) {
    if (word.length < 4 || STOPWORDS.has(word)) continue;
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }
  const technologies: Technology[] = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name], i) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      relevance: Math.max(40, 90 - i * 12),
      what_it_is: "Key concept detected in the invention description.",
    }));
  if (technologies.length === 0) {
    technologies.push({ name: "General technical concept", relevance: 50, what_it_is: "No specific technologies detected — add more detail to the query." });
  }

  return {
    interpreted_invention: query.trim().slice(0, 240),
    recommended_mode: recommended,
    confidence,
    rationale:
      top.score > 0
        ? `The query language points to a ${DECISION_MODES[recommended].label.toLowerCase()}.`
        : "No strong intent signal detected, so PFS defaults to a novelty check — the most common starting point.",
    alternate_modes: alternates,
    technologies,
    source: "heuristic",
  };
}

/** Coerce a possibly-malformed AI payload into a valid DecisionBrief. */
export function sanitizeDecision(ai: Record<string, unknown>, query: string): DecisionBrief {
  const fallback = heuristicDecision(query);
  const mode =
    typeof ai.recommended_mode === "string" && isDecisionMode(ai.recommended_mode)
      ? ai.recommended_mode
      : fallback.recommended_mode;

  const conf = ["high", "medium", "low"].includes(ai.confidence as string)
    ? (ai.confidence as Confidence)
    : fallback.confidence;

  const alternates = Array.isArray(ai.alternate_modes)
    ? (ai.alternate_modes as Record<string, unknown>[])
        .filter((a) => typeof a?.mode === "string" && isDecisionMode(a.mode as string))
        .slice(0, 3)
        .map((a) => ({
          mode: a.mode as DecisionModeId,
          confidence: (["high", "medium", "low"].includes(a.confidence as string) ? a.confidence : "medium") as Confidence,
          why: String(a.why ?? "").slice(0, 200),
        }))
    : fallback.alternate_modes;

  const technologies = Array.isArray(ai.technologies)
    ? (ai.technologies as Record<string, unknown>[])
        .filter((t) => typeof t?.name === "string")
        .slice(0, 6)
        .map((t) => ({
          name: String(t.name).slice(0, 80),
          relevance: Math.max(0, Math.min(100, Number(t.relevance) || 50)),
          what_it_is: String(t.what_it_is ?? "").slice(0, 200),
        }))
    : fallback.technologies;

  return {
    interpreted_invention: String(ai.interpreted_invention ?? fallback.interpreted_invention).slice(0, 400),
    recommended_mode: mode,
    confidence: conf,
    rationale: String(ai.rationale ?? fallback.rationale).slice(0, 400),
    alternate_modes: alternates.length ? alternates : fallback.alternate_modes,
    technologies: technologies.length ? technologies : fallback.technologies,
    source: "ai",
  };
}
