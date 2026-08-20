// External API wrappers for real patent/research data

const SEMANTIC_SCHOLAR_BASE = "https://api.semanticscholar.org/graph/v1";
const CROSSREF_BASE = "https://api.crossref.org/works";

interface SemanticScholarPaper {
  paperId: string;
  title: string;
  abstract: string | null;
  year: number | null;
  authors: { authorId: string; name: string }[];
  citationCount: number;
  referenceCount: number;
  fieldsOfStudy: string[] | null;
  publicationDate: string | null;
  journal: { name: string } | null;
  externalIds: Record<string, string> | null;
}

interface CrossRefWork {
  DOI: string;
  title: string[];
  abstract?: string;
  author?: { given: string; family: string }[];
  publisher?: string;
  created?: { "date-parts": number[][] };
  type?: string;
  subject?: string[];
}

export async function searchSemanticScholar(query: string, limit = 10): Promise<SemanticScholarPaper[]> {
  try {
    const params = new URLSearchParams({
      query,
      limit: String(limit),
      fields: "paperId,title,abstract,year,authors,citationCount,referenceCount,fieldsOfStudy,publicationDate,journal,externalIds",
    });
    const res = await fetch(`${SEMANTIC_SCHOLAR_BASE}/paper/search?${params}`, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "PatentAI/1.0" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}

export async function searchCrossRef(query: string, limit = 10): Promise<CrossRefWork[]> {
  try {
    const params = new URLSearchParams({
      query,
      rows: String(limit),
      select: "DOI,title,abstract,author,publisher,created,type,subject",
    });
    const res = await fetch(`${CROSSREF_BASE}?${params}`, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "PatentAI/1.0 (mailto:support@patentai.dev)" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.message?.items ?? [];
  } catch {
    return [];
  }
}

// Convert Semantic Scholar paper to Patent-like format
export function semanticScholarToPatent(paper: SemanticScholarPaper, index: number): {
  id: string; patent_number: string; title: string; abstract: string; inventors: string[];
  assignee: string; filing_date: string; publication_date: string; status: string;
  cpc_classifications: string[]; ipc_classifications: string[]; claims: string[];
  citations: string[]; similarity_score: number; metadata: Record<string, unknown>;
} {
  return {
    id: `ss-${paper.paperId}`,
    patent_number: paper.externalIds?.DOI ?? `SS-${paper.paperId.slice(0, 10)}`,
    title: paper.title || "Untitled",
    abstract: paper.abstract || "No abstract available.",
    inventors: paper.authors?.map((a) => a.name) ?? [],
    assignee: paper.journal?.name ?? "Academic Publication",
    filing_date: paper.publicationDate ?? (paper.year ? `${paper.year}-01-01` : "Unknown"),
    publication_date: paper.publicationDate ?? (paper.year ? `${paper.year}-01-01` : "Unknown"),
    status: "Published",
    cpc_classifications: paper.fieldsOfStudy ?? [],
    ipc_classifications: [],
    claims: [],
    citations: [],
    similarity_score: Math.max(0.5, 1 - index * 0.05),
    metadata: { source: "Semantic Scholar", citationCount: paper.citationCount, referenceCount: paper.referenceCount },
  };
}

export function crossRefToPatent(work: CrossRefWork, index: number): {
  id: string; patent_number: string; title: string; abstract: string; inventors: string[];
  assignee: string; filing_date: string; publication_date: string; status: string;
  cpc_classifications: string[]; ipc_classifications: string[]; claims: string[];
  citations: string[]; similarity_score: number; metadata: Record<string, unknown>;
} {
  const dateParts = work.created?.["date-parts"]?.[0];
  const dateStr = dateParts ? `${dateParts[0]}-${String(dateParts[1] ?? 1).padStart(2, "0")}-${String(dateParts[2] ?? 1).padStart(2, "0")}` : "Unknown";
  return {
    id: `cr-${work.DOI.replace(/[^a-zA-Z0-9]/g, "-")}`,
    patent_number: work.DOI,
    title: work.title?.[0] ?? "Untitled",
    abstract: work.abstract?.replace(/<[^>]*>/g, "") ?? "No abstract available.",
    inventors: work.author?.map((a) => `${a.given ?? ""} ${a.family}`.trim()) ?? [],
    assignee: work.publisher ?? "Unknown Publisher",
    filing_date: dateStr,
    publication_date: dateStr,
    status: "Published",
    cpc_classifications: work.subject ?? [],
    ipc_classifications: [],
    claims: [],
    citations: [],
    similarity_score: Math.max(0.4, 0.9 - index * 0.05),
    metadata: { source: "CrossRef", type: work.type },
  };
}
