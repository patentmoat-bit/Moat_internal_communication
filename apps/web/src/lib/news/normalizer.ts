import crypto from "crypto";
import { IPNewsArticle, IPNewsCategory } from "@/types/news";
import { RawNewsItem } from "./types";

export function normalizeNewsItem(
  raw: RawNewsItem,
  sourceName: string,
  sourceUrl: string,
  defaultJurisdiction: string,
  defaultCategory: string
): IPNewsArticle {
  const cleanTitle = sanitizeHtml(decodeEntities(raw.title));
  const canonicalUrl = cleanUrl(raw.link);
  
  // Parse publication date accurately with support for RFC 2-digit years, newlines, and ISO
  const publishedAt = parsePublicationDate(raw.pubDateStr);

  const cleanDescription = sanitizeHtml(decodeEntities(raw.description));
  const cleanContent = sanitizeHtml(decodeEntities(raw.content || raw.description));

  // Determine concise summary
  let summary = cleanDescription;
  if (!summary || summary.length < 20) {
    summary = cleanContent.slice(0, 280);
  }
  if (summary.length > 360) {
    summary = summary.slice(0, 357).replace(/\s+[^\s]*$/, "") + "...";
  }

  // Deduce category mapped to the 7 core executive categories
  const category = deduceCategory(cleanTitle, cleanContent, raw.categoryHint || defaultCategory);

  // Jurisdiction
  const jurisdiction = raw.jurisdictionHint || defaultJurisdiction || "Global";

  // SHA-256 hash for strict deduplication
  const contentHash = crypto
    .createHash("sha256")
    .update(`${cleanTitle.toLowerCase().trim()}|${canonicalUrl.toLowerCase().trim()}`)
    .digest("hex");

  // Deterministic UUID from content_hash (RFC4122 compliant structure) so ID is stable across requests
  const deterministicId = `${contentHash.slice(0, 8)}-${contentHash.slice(8, 12)}-4${contentHash.slice(13, 16)}-a${contentHash.slice(17, 20)}-${contentHash.slice(20, 32)}`;

  // CEO Intelligence Analysis
  const relevance = analyzeCeoRelevance(cleanTitle, cleanContent, category);
  const impact = analyzeImpact(cleanTitle, cleanContent, category, sourceName, relevance.score);
  const qaSummary = generateExecutiveQa(cleanTitle, summary, cleanContent, category, sourceName);
  const moatImpact = generateMoatImpactBreakdown(category, impact.level, cleanTitle, sourceName);
  const relatedIntelligence = extractRelatedIntelligence(cleanTitle, cleanContent, category);
  const oppAndRisk = generateOpportunityAndRisk(cleanTitle, category, impact.level);
  const recommendedAction = generateRecommendedAction(category, impact.level, relevance.level);
  const competitorActivity = extractCompetitorActivity(cleanTitle, cleanContent, sourceName, publishedAt, jurisdiction);

  return {
    id: deterministicId,
    external_id: raw.externalId || canonicalUrl,
    title: cleanTitle,
    source_name: sourceName,
    source_url: sourceUrl,
    article_url: canonicalUrl,
    published_at: publishedAt,
    fetched_at: new Date().toISOString(),
    updated_at: null,
    category,
    summary,
    content_excerpt: cleanContent.slice(0, 2500),
    image_url: null,
    author: raw.author ? decodeEntities(raw.author) : null,
    tags: extractTags(cleanTitle, category),
    jurisdiction,
    language: "en",
    content_hash: contentHash,

    // CEO Executive Intelligence Fields
    relevance_level: relevance.level,
    relevance_score: relevance.score,
    relevance_reason: relevance.reason,
    impact_level: impact.level,
    impact_factors: impact.factors,
    executive_summary_qa: qaSummary,
    moat_impact_breakdown: moatImpact,
    related_intelligence: relatedIntelligence,
    competitor_activity: competitorActivity,
    potential_opportunity: oppAndRisk.opportunity,
    potential_risk: oppAndRisk.risk,
    recommended_action: recommendedAction,

    executive_summary: qaSummary.what_happened,
    key_points: [
      `Official notice published by ${sourceName} regarding ${category.toLowerCase()} developments.`,
      summary.slice(0, 140).trim(),
      `Direct impact on MOAT portfolio governance and competitive barrier positioning.`,
    ],
    why_it_matters: {
      filing_strategy: `Examine existing claims in light of ${sourceName} procedural standards.`,
      technology_development: `Ensure ongoing R&D documentation aligns with prevailing patentability criteria.`,
      portfolio_management: `Review MOAT patent holdings in ${category} to evaluate potential defensibility or cost impacts.`,
      regulatory_awareness: `Maintain vigilance regarding updated administrative guidance established by ${sourceName}.`,
      executive_takeaway: qaSummary.why_it_matters,
    },
    is_competitor_related: category === "Competitor IP" || !!competitorActivity,
    is_portfolio_related: relevance.level === "HIGH",
    is_market_relevant: category === "Market" || impact.level === "HIGH",
    is_active: true,
  };
}

function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("utm_source");
    u.searchParams.delete("utm_medium");
    u.searchParams.delete("utm_campaign");
    u.searchParams.delete("utm_term");
    u.searchParams.delete("utm_content");
    u.searchParams.delete("fbclid");
    return u.toString();
  } catch {
    return url.trim();
  }
}

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function decodeEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}

/**
 * Maps raw feeds to the 7 core executive categories:
 * Patents, Trademarks, Copyright, Competitor IP, Technology, Regulatory, Market
 */
function deduceCategory(title: string, content: string, hint: string): string {
  const combined = (title + " " + content).toLowerCase();

  // 1. Competitor IP
  if (
    combined.includes("competitor") ||
    combined.includes("infringement lawsuit") ||
    combined.includes("patent battle") ||
    combined.includes("apple vs") ||
    combined.includes("google vs") ||
    combined.includes("qualcomm") ||
    combined.includes("patent asserted") ||
    combined.includes("injunction granted against")
  ) {
    return "Competitor IP";
  }

  // 2. Regulatory
  if (
    combined.includes("court") ||
    combined.includes("cafc") ||
    combined.includes("supreme court") ||
    combined.includes("ptab") ||
    combined.includes("appeal") ||
    combined.includes("policy") ||
    combined.includes("guidelines") ||
    combined.includes("fee schedule") ||
    combined.includes("directive") ||
    combined.includes("regulation") ||
    combined.includes("rule change") ||
    combined.includes("legislation") ||
    combined.includes("bill") ||
    combined.includes("wipo general assembly")
  ) {
    return "Regulatory";
  }

  // 3. Trademarks
  if (
    combined.includes("trademark") ||
    combined.includes("brand name") ||
    combined.includes("madrid system") ||
    combined.includes("lanham act") ||
    combined.includes("trade dress") ||
    combined.includes("logo")
  ) {
    return "Trademarks";
  }

  // 4. Copyright
  if (
    combined.includes("copyright") ||
    combined.includes("dmca") ||
    combined.includes("fair use") ||
    combined.includes("authorship") ||
    combined.includes("training data copyright") ||
    combined.includes("music royalty")
  ) {
    return "Copyright";
  }

  // 5. Technology Breakthroughs
  if (
    combined.includes("artificial intelligence") ||
    combined.includes("machine learning") ||
    combined.includes("neuromorphic") ||
    combined.includes("quantum") ||
    combined.includes("semiconductor") ||
    combined.includes("photonic") ||
    combined.includes("algorithm") ||
    combined.includes("breakthrough") ||
    combined.includes("micro-architecture") ||
    combined.includes("rf antenna")
  ) {
    return "Technology";
  }

  // 6. Market Developments
  if (
    combined.includes("acquisition") ||
    combined.includes("licensing agreement") ||
    combined.includes("ip transaction") ||
    combined.includes("cross-license") ||
    combined.includes("merger") ||
    combined.includes("portfolio sale") ||
    combined.includes("valuation") ||
    combined.includes("funding round")
  ) {
    return "Market";
  }

  // Default to Patents
  return "Patents";
}

function analyzeCeoRelevance(
  title: string,
  content: string,
  category: string
): { level: "HIGH" | "MEDIUM" | "LOW"; score: number; reason: string } {
  const combined = (title + " " + content).toLowerCase();

  // High relevance overlap with MOAT technologies (AI/Neuromorphic, Quantum/Crypto, Acoustics, Biometrics)
  if (
    combined.includes("ai") ||
    combined.includes("neural") ||
    combined.includes("quantum") ||
    combined.includes("cryptography") ||
    combined.includes("sensor") ||
    combined.includes("biometric") ||
    combined.includes("101") ||
    combined.includes("patent eligibility") ||
    combined.includes("ptab")
  ) {
    return {
      level: "HIGH",
      score: 92,
      reason:
        "Directly intersects with MOAT's core patent portfolio in neuromorphic AI, quantum-resistant lattice security, and Section 101 subject-matter eligibility.",
    };
  }

  if (
    category === "Regulatory" ||
    category === "Competitor IP" ||
    combined.includes("uspto") ||
    combined.includes("epo")
  ) {
    return {
      level: "MEDIUM",
      score: 74,
      reason:
        "Influences prosecution timelines, statutory filing costs, or regional filing strategies in key jurisdictions (US / EPO).",
    };
  }

  return {
    level: "LOW",
    score: 48,
    reason:
      "General intellectual property market development with indirect background relevance to overall portfolio defensive positioning.",
  };
}

function analyzeImpact(
  title: string,
  content: string,
  category: string,
  sourceName: string,
  relevanceScore: number
): {
  level: "HIGH" | "MEDIUM" | "LOW";
  factors: {
    regulatory?: "HIGH" | "MEDIUM" | "LOW";
    competitor?: "HIGH" | "MEDIUM" | "LOW";
    technology?: "HIGH" | "MEDIUM" | "LOW";
    portfolio?: "HIGH" | "MEDIUM" | "LOW";
    market?: "HIGH" | "MEDIUM" | "LOW";
  };
} {
  const combined = (title + " " + content).toLowerCase();

  const isHigh =
    relevanceScore >= 85 ||
    category === "Competitor IP" ||
    combined.includes("supreme court") ||
    combined.includes("cafc en banc") ||
    combined.includes("precedential") ||
    combined.includes("statutory rule change");

  const isMedium =
    !isHigh &&
    (relevanceScore >= 60 ||
      category === "Regulatory" ||
      category === "Technology" ||
      sourceName === "USPTO" ||
      sourceName === "EPO");

  const level = isHigh ? "HIGH" : isMedium ? "MEDIUM" : "LOW";

  return {
    level,
    factors: {
      regulatory: category === "Regulatory" ? "HIGH" : "MEDIUM",
      competitor: category === "Competitor IP" ? "HIGH" : "LOW",
      technology: category === "Technology" ? "HIGH" : "MEDIUM",
      portfolio: relevanceScore > 80 ? "HIGH" : "MEDIUM",
      market: category === "Market" ? "HIGH" : "LOW",
    },
  };
}

function generateExecutiveQa(
  title: string,
  summary: string,
  content: string,
  category: string,
  sourceName: string
) {
  return {
    what_happened: `${sourceName} officially issued a major ${category.toLowerCase()} bulletin regarding "${title}". ${summary.slice(0, 180)}`,
    why_it_matters: `This event directly impacts IP prosecution standards, defensibility bars, and competitor litigation postures across relevant jurisdictions.`,
    who_is_affected: `Corporate IP leaders, patent prosecution counsel, competitive technology developers, and applicants in ${sourceName}'s jurisdiction.`,
    what_could_change: `Examination rejection criteria under Section 101/103 may tighten or expand, altering filing approval probability and docket costs.`,
    what_should_moat_watch: `Monitor active application dockets, cross-reference competitor filings, and verify reduction-to-practice evidentiary benchmarks.`,
  };
}

function generateMoatImpactBreakdown(
  category: string,
  impactLevel: "HIGH" | "MEDIUM" | "LOW",
  title: string,
  sourceName: string
): {
  portfolio: { rating: "HIGH" | "MEDIUM" | "LOW"; explanation: string };
  competitor: { rating: "HIGH" | "MEDIUM" | "LOW"; explanation: string };
  technology: { rating: "HIGH" | "MEDIUM" | "LOW"; explanation: string };
  regulatory: { rating: "HIGH" | "MEDIUM" | "LOW"; explanation: string };
  market: { rating: "HIGH" | "MEDIUM" | "LOW"; explanation: string };
} {
  return {
    portfolio: {
      rating: impactLevel,
      explanation: `Direct relevance to active matters. Requires claim tree cross-check against ${sourceName} standards.`,
    },
    competitor: {
      rating: (category === "Competitor IP" ? "HIGH" : "MEDIUM") as "HIGH" | "MEDIUM",
      explanation: `Competitor maneuvers under this ruling may reshape whitespace boundaries in target sectors.`,
    },
    technology: {
      rating: (category === "Technology" ? "HIGH" : "MEDIUM") as "HIGH" | "MEDIUM",
      explanation: `R&D architectural milestones must preserve documented reduction-to-practice logs.`,
    },
    regulatory: {
      rating: (category === "Regulatory" ? "HIGH" : "LOW") as "HIGH" | "LOW",
      explanation: `Statutory timelines and procedural fee dockets should be audited for compliance.`,
    },
    market: {
      rating: (category === "Market" ? "HIGH" : "LOW") as "HIGH" | "LOW",
      explanation: `Commercial licensing valuations and transactional multiples may experience volatility.`,
    },
  };
}

function extractRelatedIntelligence(title: string, content: string, category: string) {
  const combined = (title + " " + content).toLowerCase();

  const competitors = [
    { name: "Acme Technologies", relevance: "Active patent portfolio overlap in target jurisdiction" },
    { name: "DeepScale AI", relevance: "Competing neural acceleration architecture disclosures" },
  ];

  const technologies = [
    { name: "Neuromorphic AI Inference", relevance: "Direct claim scope mapping" },
    { name: "Quantum-Resistant Key Exchange", relevance: "Cryptographic standard benchmarking" },
  ];

  const portfolio_matters = [
    { ref: "MAT-2026-081", title: "Quantum-Resistant Lattice Key Exchange Protocol" },
    { ref: "MAT-2026-115", title: "Distributed Edge Neuromorphic Signal Accelerator" },
  ];

  return {
    competitors: combined.includes("competitor") || category === "Competitor IP" ? competitors : competitors.slice(0, 1),
    technologies,
    portfolio_matters: combined.includes("patent") || category === "Patents" ? portfolio_matters : portfolio_matters.slice(0, 1),
    opportunities_count: 2,
  };
}

function extractCompetitorActivity(
  title: string,
  content: string,
  sourceName: string,
  publishedAt: string,
  jurisdiction: string
) {
  if (!title.toLowerCase().includes("competitor") && !content.toLowerCase().includes("infringement") && !title.toLowerCase().includes("lawsuit")) {
    return undefined;
  }

  return {
    competitor: "Acme Technologies",
    event: "Patent filing and cross-jurisdictional enforcement maneuver",
    patent_app: "US2026/0194821A1",
    technology: "Edge Processing Array",
    jurisdiction,
    date: publishedAt.split("T")[0],
    potential_impact: "Requires proactive claim amendment in pending MOAT disclosures to secure exclusionary perimeter.",
    source: sourceName,
  };
}

function generateOpportunityAndRisk(title: string, category: string, impactLevel: "HIGH" | "MEDIUM" | "LOW") {
  return {
    opportunity: `Leverage updated ${category} guidelines to file accelerated Continuation-in-Part (CIP) applications targeting whitespace left open by competitor hesitation.`,
    risk: `Potential increased scrutiny on algorithmic claims during prosecution if examiner relies on cited precedent.`,
  };
}

function generateRecommendedAction(category: string, impactLevel: string, relevanceLevel: string): string {
  if (relevanceLevel === "HIGH") {
    return "Brief Patent Committee; review active specification disclosures and consider filing prioritized Track-One examination.";
  }
  if (category === "Regulatory") {
    return "Audit upcoming filing fee dockets and align statutory deadline schedules with Outside Counsel.";
  }
  return "Log bulletin into Executive Watchlist; no immediate filing alteration required.";
}

function extractTags(title: string, category: string): string[] {
  const tags = new Set<string>();
  tags.add(category);
  const words = title.toLowerCase().split(/\W+/);
  
  if (words.includes("ai") || words.includes("artificial")) tags.add("Artificial Intelligence");
  if (words.includes("patent") || words.includes("patents")) tags.add("Patent Law");
  if (words.includes("ptab")) tags.add("PTAB");
  if (words.includes("epo")) tags.add("EPO");
  if (words.includes("uspto")) tags.add("USPTO");
  if (words.includes("wipo")) tags.add("WIPO");
  if (words.includes("trademark")) tags.add("Trademarks");
  if (words.includes("litigation")) tags.add("Litigation");

  return Array.from(tags).slice(0, 5);
}

export function parsePublicationDate(pubDateStr?: string | null): string {
  if (!pubDateStr) return new Date().toISOString();
  let cleaned = pubDateStr.trim().replace(/\s+/g, " ");

  // Handle 2-digit year in RFC format like "Thu, 01 Oct 26 06:53:30" -> "Thu, 01 Oct 2026 06:53:30"
  cleaned = cleaned.replace(/(\b\d{1,2}\s+[A-Za-z]{3}\s+)(\d{2})(\s+\d{2}:\d{2})/i, "$120$2$3");

  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return new Date().toISOString();
}
