import { hashString, mockAssignee, mockPatentNumber, mockYear, titleCase } from "./shared";

export type NoveltyVerdict = "strong" | "moderate" | "weak";
export type ElementStatus = "novel" | "partially disclosed" | "disclosed";
export type NoveltyAction =
  | "File"
  | "Narrow Claims"
  | "Broaden Claims"
  | "Continue Research"
  | "Abandon";

export interface ClaimElement {
  element: string;
  /** % of this element already disclosed in prior art (0 = fully novel). */
  coverage: number;
  status: ElementStatus;
  note: string;
}

export interface PriorArtRef {
  patent_number: string;
  title: string;
  assignee: string;
  year: number;
  similarity: number;
  overlap: string;
}

export interface SimilarResearchRef {
  title: string;
  venue: string;
  year: number;
  similarity: number;
  overlap: string;
}

export interface SimilarTechnologyRef {
  name: string;
  source: "GitHub" | "Standards" | "Technical Publication" | "Web Source" | "Research Paper";
  maturity: "emerging" | "active" | "mature";
  similarity: number;
  overlap: string;
}

export interface SourceCoverage {
  source: "USPTO" | "WIPO" | "EPO" | "Research Papers" | "Technical Publications" | "GitHub" | "Standards" | "Web Sources";
  records: number;
  confidence: number;
}

export interface MappingItem {
  item: string;
  matches: string[];
  overlap: number;
  gap: string;
}

export interface PatentGap {
  area: string;
  severity: "low" | "medium" | "high";
  rationale: string;
}

export interface WhiteSpaceArea {
  area: string;
  openness: number;
  filing_angle: string;
}

export interface NetworkNode {
  id: string;
  label: string;
  group: "invention" | "patent" | "paper" | "technology" | "standard";
  score: number;
}

export interface NetworkEdge {
  from: string;
  to: string;
  strength: number;
}

export interface TechnologyCluster {
  name: string;
  density: number;
  novelty: number;
  examples: string[];
}

export interface CitationNode {
  patent: string;
  citations: number;
  relevance: number;
}

export interface HeatmapCell {
  feature: string;
  source: string;
  overlap: number;
}

export interface NoveltyAssessment {
  invention: string;
  novelty_score: number;
  risk_score: number;
  similarity_score: number;
  verdict: NoveltyVerdict;
  summary: string;
  source_coverage: SourceCoverage[];
  claim_elements: ClaimElement[];
  closest_prior_art: PriorArtRef[];
  top_similar_research: SimilarResearchRef[];
  top_similar_technologies: SimilarTechnologyRef[];
  feature_mapping: MappingItem[];
  concept_mapping: MappingItem[];
  differentiators: { point: string; why: string }[];
  patent_gaps: PatentGap[];
  white_space_areas: WhiteSpaceArea[];
  visualization: {
    similarity_network: { nodes: NetworkNode[]; edges: NetworkEdge[] };
    technology_clusters: TechnologyCluster[];
    citation_graph: CitationNode[];
    heatmap: HeatmapCell[];
  };
  recommendation: { action: NoveltyAction; rationale: string };
  source: "ai" | "mock";
}

export const NOVELTY_SYSTEM = `You are PFS's Phase 3 novelty and prior-art engine. Given an invention
description and key technologies, produce moat intelligence across patents, papers, publications,
GitHub, standards, and web sources. Return ONLY a JSON object with this exact shape:
{
  "invention": "one-sentence restatement",
  "novelty_score": 0-100,
  "risk_score": 0-100,
  "similarity_score": 0-100,
  "verdict": "strong|moderate|weak",
  "summary": "2-3 sentences on where the defensible edge is",
  "source_coverage": [
    { "source": "USPTO|WIPO|EPO|Research Papers|Technical Publications|GitHub|Standards|Web Sources", "records": 0, "confidence": 0-100 }
  ],
  "claim_elements": [
    { "element": "claim element phrasing", "coverage": 0-100, "status": "novel|partially disclosed|disclosed", "note": "short" }
  ],
  "closest_prior_art": [
    { "patent_number": "US...B2", "title": "...", "assignee": "...", "year": 2019, "similarity": 0-100, "overlap": "what overlaps" }
  ],
  "top_similar_research": [
    { "title": "...", "venue": "...", "year": 2022, "similarity": 0-100, "overlap": "what overlaps" }
  ],
  "top_similar_technologies": [
    { "name": "...", "source": "GitHub|Standards|Technical Publication|Web Source|Research Paper", "maturity": "emerging|active|mature", "similarity": 0-100, "overlap": "what overlaps" }
  ],
  "feature_mapping": [
    { "item": "feature", "matches": ["reference or technology"], "overlap": 0-100, "gap": "uncovered distinction" }
  ],
  "concept_mapping": [
    { "item": "concept", "matches": ["reference or technology"], "overlap": 0-100, "gap": "uncovered distinction" }
  ],
  "differentiators": [ { "point": "...", "why": "why it is defensible" } ],
  "patent_gaps": [
    { "area": "...", "severity": "low|medium|high", "rationale": "..." }
  ],
  "white_space_areas": [
    { "area": "...", "openness": 0-100, "filing_angle": "..." }
  ],
  "visualization": {
    "similarity_network": {
      "nodes": [{ "id": "inv", "label": "Invention", "group": "invention|patent|paper|technology|standard", "score": 0-100 }],
      "edges": [{ "from": "inv", "to": "p1", "strength": 0-100 }]
    },
    "technology_clusters": [
      { "name": "...", "density": 0-100, "novelty": 0-100, "examples": ["..."] }
    ],
    "citation_graph": [
      { "patent": "US...", "citations": 0, "relevance": 0-100 }
    ],
    "heatmap": [
      { "feature": "F1", "source": "USPTO", "overlap": 0-100 }
    ]
  },
  "recommendation": { "action": "File|Narrow Claims|Broaden Claims|Continue Research|Abandon", "rationale": "..." }
}
Give 4-6 claim_elements, 3-5 closest_prior_art, 3-5 research refs, 3-5 technologies, 4-6 mapping rows, 2-4 patent gaps, 3-5 white space areas, and compact visualization data.
novelty_score reflects the defensible edge; risk_score reflects prior-art/prosecution risk; similarity_score reflects total technology overlap.`;

export function buildNoveltyUser(query: string, concepts: string[]): string {
  const tech = concepts.length ? `\nKey technologies: ${concepts.join(", ")}` : "";
  return `Invention: ${query}${tech}`;
}

/** Deterministic, query-aware mock used when OpenAI is unavailable. */
export function mockNovelty(query: string, concepts: string[]): NoveltyAssessment {
  const tech = concepts.length ? concepts : ["core mechanism", "control logic", "data pipeline", "sensor fusion", "adaptive feedback"];
  const base = hashString(query);
  const score = 48 + (base % 45);
  const similarity_score = Math.max(12, Math.min(94, 104 - score + (base % 13)));
  const risk_score = Math.max(8, Math.min(92, Math.round(similarity_score * 0.72 + (100 - score) * 0.28)));
  const verdict: NoveltyVerdict = score >= 75 ? "strong" : score >= 58 ? "moderate" : "weak";

  const claim_elements: ClaimElement[] = tech.slice(0, 6).map((t, i) => {
    const seed = hashString(t + i);
    const coverage = 15 + (seed % 80);
    const status: ElementStatus =
      coverage < 35 ? "novel" : coverage < 70 ? "partially disclosed" : "disclosed";
    return {
      element: `A ${t.toLowerCase()} configured to operate within the claimed system`,
      coverage,
      status,
      note:
        status === "novel"
          ? "No close art combines this element as claimed."
          : status === "partially disclosed"
            ? "Individual references touch this, but not in combination."
            : "Well-represented in existing art; consider narrowing.",
    };
  });

  const closest_prior_art: PriorArtRef[] = tech.slice(0, 4).map((t, i) => {
    const seed = hashString(t + "art" + i);
    return {
      patent_number: mockPatentNumber(seed),
      title: `${titleCase(t)} system with adaptive ${pickWord(seed)}`,
      assignee: mockAssignee(seed),
      year: mockYear(seed),
      similarity: 92 - i * 9 - (seed % 4),
      overlap: `Discloses ${t.toLowerCase()} but lacks the claimed ${tech[(i + 1) % tech.length].toLowerCase()} integration.`,
    };
  });

  const top_similar_research: SimilarResearchRef[] = tech.slice(0, 4).map((t, i) => {
    const seed = hashString(t + "paper" + i);
    const venues = ["IEEE Access", "ACM Computing Surveys", "Nature Machine Intelligence", "arXiv", "Sensors"];
    return {
      title: `${titleCase(t)} techniques for adaptive ${pickWord(seed)} systems`,
      venue: venues[seed % venues.length],
      year: 2018 + (seed % 7),
      similarity: 86 - i * 7 - (seed % 5),
      overlap: `Explores ${t.toLowerCase()} as a technical primitive, without the claimed end-to-end moat.`,
    };
  });

  const top_similar_technologies: SimilarTechnologyRef[] = tech.slice(0, 5).map((t, i) => {
    const seed = hashString(t + "technology" + i);
    const sources: SimilarTechnologyRef["source"][] = ["GitHub", "Standards", "Technical Publication", "Web Source", "Research Paper"];
    const maturity: SimilarTechnologyRef["maturity"][] = ["emerging", "active", "mature"];
    return {
      name: `${titleCase(t)} reference stack`,
      source: sources[seed % sources.length],
      maturity: maturity[(seed + i) % maturity.length],
      similarity: 82 - i * 6 - (seed % 6),
      overlap: `Comparable implementation path for ${t.toLowerCase()}, but not the protected claim sequence.`,
    };
  });

  const source_coverage: SourceCoverage[] = [
    "USPTO",
    "WIPO",
    "EPO",
    "Research Papers",
    "Technical Publications",
    "GitHub",
    "Standards",
    "Web Sources",
  ].map((source, i) => {
    const seed = hashString(source + query);
    return {
      source: source as SourceCoverage["source"],
      records: 18 + ((seed + i * 19) % 190),
      confidence: 62 + ((seed + i * 7) % 34),
    };
  });

  const feature_mapping: MappingItem[] = claim_elements.map((el, i) => ({
    item: el.element.replace(/^A /, ""),
    matches: [closest_prior_art[i % closest_prior_art.length].patent_number, top_similar_research[i % top_similar_research.length].venue],
    overlap: el.coverage,
    gap:
      el.status === "disclosed"
        ? "Narrow this feature to the operating context or measured performance threshold."
        : "Preserve the coupling language; the isolated feature is less defensible than the combination.",
  }));

  const concept_mapping: MappingItem[] = tech.slice(0, 6).map((t, i) => {
    const seed = hashString(t + "concept");
    return {
      item: titleCase(t),
      matches: [top_similar_technologies[i % top_similar_technologies.length].name, closest_prior_art[i % closest_prior_art.length].patent_number],
      overlap: 28 + (seed % 62),
      gap: `Claim the interaction between ${t.toLowerCase()} and ${tech[(i + 1) % tech.length].toLowerCase()}.`,
    };
  });

  const differentiators = tech.slice(0, 3).map((t, i) => ({
    point: `Closed-loop coupling of ${t.toLowerCase()} with ${tech[(i + 1) % tech.length].toLowerCase()}`,
    why: "The specific combination, not the parts, is where the defensible edge sits.",
  }));

  const patent_gaps: PatentGap[] = tech.slice(0, 4).map((t, i) => {
    const seed = hashString(t + "gap" + i);
    const severity: PatentGap["severity"][] = ["low", "medium", "high"];
    return {
      area: `${titleCase(t)} claim support`,
      severity: severity[seed % severity.length],
      rationale:
        seed % 3 === 0
          ? "The broad concept appears in prior art; examples should support narrower fallback positions."
          : "The source set shows limited disclosure for this combination, but terminology should be tightened.",
    };
  });

  const white_space_areas: WhiteSpaceArea[] = tech.slice(0, 5).map((t, i) => {
    const seed = hashString(t + "white" + i);
    return {
      area: `${titleCase(t)} plus ${titleCase(tech[(i + 2) % tech.length])}`,
      openness: 52 + (seed % 42),
      filing_angle: `Draft claims around measurable improvement when ${t.toLowerCase()} drives ${tech[(i + 2) % tech.length].toLowerCase()}.`,
    };
  });

  const nodes: NetworkNode[] = [
    { id: "inv", label: "Claimed invention", group: "invention", score },
    ...closest_prior_art.slice(0, 3).map((art, i) => ({
      id: `p${i + 1}`,
      label: art.patent_number,
      group: "patent" as const,
      score: art.similarity,
    })),
    ...top_similar_research.slice(0, 2).map((paper, i) => ({
      id: `r${i + 1}`,
      label: paper.venue,
      group: "paper" as const,
      score: paper.similarity,
    })),
    ...top_similar_technologies.slice(0, 2).map((technology, i) => ({
      id: `t${i + 1}`,
      label: technology.source,
      group: technology.source === "Standards" ? ("standard" as const) : ("technology" as const),
      score: technology.similarity,
    })),
  ];

  const visualization: NoveltyAssessment["visualization"] = {
    similarity_network: {
      nodes,
      edges: nodes.filter((node) => node.id !== "inv").map((node) => ({ from: "inv", to: node.id, strength: node.score })),
    },
    technology_clusters: tech.slice(0, 5).map((t, i) => {
      const seed = hashString(t + "cluster" + i);
      return {
        name: titleCase(t),
        density: 34 + (seed % 60),
        novelty: 38 + ((seed + score) % 58),
        examples: [
          closest_prior_art[i % closest_prior_art.length].patent_number,
          top_similar_technologies[i % top_similar_technologies.length].source,
        ],
      };
    }),
    citation_graph: closest_prior_art.map((art, i) => ({
      patent: art.patent_number,
      citations: 12 + ((hashString(art.patent_number) + i) % 125),
      relevance: art.similarity,
    })),
    heatmap: claim_elements.flatMap((el, i) =>
      source_coverage.slice(0, 5).map((source, j) => ({
        feature: `F${i + 1}`,
        source: source.source,
        overlap: Math.max(8, Math.min(96, el.coverage - 18 + j * 8 + (base % 9))),
      })),
    ),
  };

  const action: NoveltyAction =
    verdict === "strong" ? "File" : verdict === "moderate" ? "Narrow Claims" : "Continue Research";

  return {
    invention: query.trim().slice(0, 240),
    novelty_score: score,
    risk_score,
    similarity_score,
    verdict,
    summary:
      verdict === "strong"
        ? "The invention's combination of features is not anticipated by the closest art; the defensible edge is well-defined."
        : verdict === "moderate"
          ? "Several elements are partially disclosed individually. Novelty likely survives if claims center on the combination."
          : "Much of the invention is represented in existing art. Narrow the claims to the genuinely novel mechanism before filing.",
    source_coverage,
    claim_elements,
    closest_prior_art,
    top_similar_research,
    top_similar_technologies,
    feature_mapping,
    concept_mapping,
    differentiators,
    patent_gaps,
    white_space_areas,
    visualization,
    recommendation: {
      action,
      rationale:
        action === "File"
          ? "The closest art leaves the claimed combination open. Proceed to a filing-ready claim set."
          : action === "Narrow Claims"
            ? "Anchor independent claims on the novel combination and drop broadly-disclosed elements."
            : "Develop the distinguishing mechanism further before committing prosecution spend.",
    },
    source: "mock",
  };
}

function pickWord(seed: number): string {
  const words = ["calibration", "feedback", "filtering", "modeling", "routing", "fusion"];
  return words[seed % words.length];
}
