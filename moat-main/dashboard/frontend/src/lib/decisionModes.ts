/**
 * The mission-specific search modes PFS can recommend. Shared between the
 * classifier API and the Intelligence Console UI so the two never drift.
 *
 * `route` is where "Run this analysis" hands the user off. Modes without a
 * dedicated page fall back to the main search experience with a mode hint.
 */
export type DecisionModeId =
  | "novelty"
  | "prior_art"
  | "fto"
  | "patentability"
  | "invalidity"
  | "landscape";

export interface DecisionMode {
  id: DecisionModeId;
  label: string;
  /** One-line description of what this analysis answers. */
  blurb: string;
  /** The user-facing question this mode is built to answer. */
  question: string;
  /** Where to send the user when they run this analysis. */
  route: string;
  /** Tailwind text/border accent token for the console. */
  accent: string;
}

export const DECISION_MODES: Record<DecisionModeId, DecisionMode> = {
  novelty: {
    id: "novelty",
    label: "Novelty Search",
    blurb: "Is this invention new? Find the closest existing art to the disclosure.",
    question: "Is this invention novel?",
    route: "/dashboard/novelty",
    accent: "text-emerald-300 border-emerald-400/40",
  },
  prior_art: {
    id: "prior_art",
    label: "Prior Art Search",
    blurb: "Surface the most relevant references across patents, papers, and products.",
    question: "What prior art exists for this idea?",
    route: "/dashboard/search",
    accent: "text-cyan-300 border-cyan-400/40",
  },
  fto: {
    id: "fto",
    label: "Freedom to Operate",
    blurb: "Could building this infringe live, enforceable patents? Assess exposure.",
    question: "Can we make, use, or sell this without infringing?",
    route: "/dashboard/risk",
    accent: "text-amber-300 border-amber-400/40",
  },
  patentability: {
    id: "patentability",
    label: "Patentability",
    blurb: "How likely is this to survive prosecution and grant as a defensible claim?",
    question: "Is this worth filing?",
    route: "/dashboard/patentability",
    accent: "text-[#e8c97a] border-[#c9a84c]/40",
  },
  invalidity: {
    id: "invalidity",
    label: "Invalidity Search",
    blurb: "Find art that could be used to challenge or invalidate a specific patent.",
    question: "Can this existing patent be invalidated?",
    route: "/dashboard/invalidity",
    accent: "text-rose-300 border-rose-400/40",
  },
  landscape: {
    id: "landscape",
    label: "Landscape Mapping",
    blurb: "Map assignees, clusters, white space, and filing velocity around a domain.",
    question: "What does the IP terrain in this space look like?",
    route: "/dashboard/landscape",
    accent: "text-sky-300 border-sky-400/40",
  },
};

export const MODE_LIST: DecisionMode[] = Object.values(DECISION_MODES);

export function isDecisionMode(value: string): value is DecisionModeId {
  return value in DECISION_MODES;
}
