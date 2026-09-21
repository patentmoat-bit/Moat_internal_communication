"use client";

import * as React from "react";
import {
  Search,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Scale,
  Layers,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  Globe2,
  Calendar,
  SlidersHorizontal,
  Info,
  Building,
  Check,
  X,
  Plus,
  BookOpen,
  Maximize2,
  Download,
  FileText,
  Share2,
  Award,
  GitBranch,
  FolderPlus,
  Clock,
  ChevronDown,
  History,
  Shield,
  UserCheck,
  Briefcase,
  Image as ImageIcon,
  FileCheck2,
} from "lucide-react";
import { WIPO_ST3_JURISDICTIONS, IP5_CODES, MAJOR_HUBS, type WipoJurisdiction } from "@/lib/wipo-st3";
import { PatentDrawingsViewer } from "@/components/patent/patent-drawings";
import {
  ProjectDossierModal,
  type SavedReference,
  type ProjectFolder,
} from "@/components/patent/project-dossier-modal";
import { ProjectDossierView } from "@/components/patent/project-dossier-view";
import {
  KeyFeaturesMapping,
  type FeatureMatrixData,
} from "@/components/patent/key-features-mapping";
import {
  ReportGeneratorModal,
  type ReportTemplateType,
} from "@/components/patent/report-generator-modal";



interface BigQueryScoreBreakdown {
  title_score: number;
  abstract_score: number;
  claims_score: number;
  cpc_boost: number;
  total_score: number;
}

interface CPCDetail {
  code: string;
  description: string;
}

interface LegalEventItem {
  event_date: string;
  event_code: string;
  description: string;
}

interface PatentFamilyItem {
  pub_id: string;
  jurisdiction: string;
  status: string;
}

interface CitationItem {
  pub_id: string;
  title: string;
  assignee: string;
}

interface FullPatentSpec {
  publication_id: string;
  application_number?: string;
  title: string;
  abstract: string;
  claims_text: string;
  background?: string;
  summary_of_invention?: string;
  detailed_description?: string;
  drawings_description?: string;
  applicant: string;
  inventors?: string[];
  jurisdiction: string;
  kind_code: string;
  published_on: string | null;
  filing_date?: string;
  priority_date?: string;
  grant_date?: string | null;
  legal_status?: string;
  art_unit?: string;
  examiner?: string;
  classifications: string[];
  cpc_details?: CPCDetail[];
  legal_events?: LegalEventItem[];
  patent_family?: PatentFamilyItem[];
  citations?: CitationItem[];
  score: number;
  score_breakdown?: BigQueryScoreBreakdown;
  source: string;
}

interface NoveltyAssessment {
  novelty_score: number;
  novelty_verdict: string;
  summary_findings: string;
  prior_art_citations: {
    publication_id: string;
    title: string;
    assignee_or_author: string;
    overlap_percentage: number;
    relevant_snippet: string;
    risk_type: string;
    url: string;
  }[];
  novel_differentiators: string[];
  suggested_claim_modifications: string[];
  patentability_assessment: {
    subject_matter_eligibility_101: string;
    novelty_102: string;
    non_obviousness_103: string;
  };
}

interface ClaimElement {
  element_number: string;
  invention_element: string;
  reference_element_support: string;
  status: "IDENTICAL" | "EQUIVALENT" | "DISTINGUISHED";
  analysis_notes: string;
}

interface ClaimComparison {
  reference_patent_id: string;
  overall_overlap_percentage: number;
  infringement_or_anticipation_risk: string;
  claim_elements_matrix: ClaimElement[];
  distinguishing_arguments: string[];
}

export default function PriorArtSearchPage() {
  const [query, setQuery] = React.useState("");
  const [searchMode, setSearchMode] = React.useState<"SEMANTIC" | "BOOLEAN" | "KEYWORD_MATRIX">("SEMANTIC");
  const [booleanQuery, setBooleanQuery] = React.useState<string>("");
  const [keywordExpansion, setKeywordExpansion] = React.useState<any>(null);
  const [isExpanding, setIsExpanding] = React.useState<boolean>(false);

  // Multi-reference selection & Project Dossier integration
  const [selectedPatentIds, setSelectedPatentIds] = React.useState<Set<string>>(new Set());
  const [showProjectDossierModal, setShowProjectDossierModal] = React.useState<boolean>(false);
  const [showReportGeneratorModal, setShowReportGeneratorModal] = React.useState<boolean>(false);
  const [reportTemplateToOpen, setReportTemplateToOpen] = React.useState<ReportTemplateType>("PRIOR_ART_SEARCH");
  const [featureMatrixData, setFeatureMatrixData] = React.useState<FeatureMatrixData | undefined>(undefined);

  const [cpcFilter, setCpcFilter] = React.useState("");
  const [applicantFilter, setApplicantFilter] = React.useState("");
  const [resultLimit, setResultLimit] = React.useState<number>(25);

  // Country-wise Inclusion & Exclusion Filters (USPTO WIPO ST.3 Standard)
  const [includedCountries, setIncludedCountries] = React.useState<string[]>(["US", "EP", "WO"]);
  const [excludedCountries, setExcludedCountries] = React.useState<string[]>([]);
  const [publicationKind, setPublicationKind] = React.useState<string>("ALL");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState<boolean>(false);

  // WIPO ST.3 Country Search Modal / Popover
  const [wipoSearchQuery, setWipoSearchQuery] = React.useState<string>("");
  const [showWipoPicker, setShowWipoPicker] = React.useState<"INCLUDE" | "EXCLUDE" | null>(null);

  // Active top-level mode & in-platform spec viewer sub-tabs
  const [activeTab, setActiveTab] = React.useState<
    "results" | "dossier" | "feature-map" | "novelty" | "claim-map"
  >("results");
  const [patentSpecTab, setPatentSpecTab] = React.useState<
    "abstract" | "claims" | "description" | "legal" | "family" | "classifications"
  >("abstract");
  const [showFullScreenReader, setShowFullScreenReader] = React.useState<boolean>(false);

  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<FullPatentSpec[]>([]);
  const [selectedPatent, setSelectedPatent] = React.useState<FullPatentSpec | null>(null);

  const [isAssessing, setIsAssessing] = React.useState(false);
  const [noveltyReport, setNoveltyReport] = React.useState<NoveltyAssessment | null>(null);

  const [isComparing, setIsComparing] = React.useState(false);
  const [claimChart, setClaimChart] = React.useState<ClaimComparison | null>(null);
  const [copyNotification, setCopyNotification] = React.useState<string | null>(null);

  const toggleIncludeCountry = (code: string) => {
    setIncludedCountries((prev) => {
      const exists = prev.includes(code);
      const next = exists ? prev.filter((c) => c !== code) : [...prev, code];
      return next;
    });
    setExcludedCountries((prev) => prev.filter((c) => c !== code));
  };

  const toggleExcludeCountry = (code: string) => {
    setExcludedCountries((prev) => {
      const exists = prev.includes(code);
      const next = exists ? prev.filter((c) => c !== code) : [...prev, code];
      return next;
    });
    setIncludedCountries((prev) => prev.filter((c) => c !== code));
  };

  const applyPreset = (type: "IP5" | "MAJOR" | "CLEAR") => {
    if (type === "IP5") {
      setIncludedCountries(IP5_CODES);
      setExcludedCountries([]);
    } else if (type === "MAJOR") {
      setIncludedCountries(MAJOR_HUBS);
      setExcludedCountries([]);
    } else if (type === "CLEAR") {
      setIncludedCountries([]);
      setExcludedCountries([]);
    }
  };

  const filteredWipoList = WIPO_ST3_JURISDICTIONS.filter((j) => {
    const q = wipoSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return j.code.toLowerCase().includes(q) || j.name.toLowerCase().includes(q);
  });

  const handleExpandKeywords = async () => {
    const targetQuery = query.trim() || booleanQuery.trim();
    if (!targetQuery) return;
    setIsExpanding(true);
    try {
      const res = await fetch(`/api/v1/search/expand-keywords?q=${encodeURIComponent(targetQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setKeywordExpansion(data);
        if (data.recommended_boolean_query) {
          setBooleanQuery(data.recommended_boolean_query);
        }
      }
    } catch (err) {
      console.error("Keyword expansion error:", err);
    } finally {
      setIsExpanding(false);
    }
  };

  const toggleSelectPatent = (pubId: string, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    setSelectedPatentIds((prev) => {
      const next = new Set(prev);
      if (next.has(pubId)) next.delete(pubId);
      else next.add(pubId);
      return next;
    });
  };

  const selectAllPatents = () => {
    setSelectedPatentIds(new Set(searchResults.map((r) => r.publication_id)));
  };

  const deselectAllPatents = () => {
    setSelectedPatentIds(new Set());
  };

  const selectTopPatents = (count: number) => {
    setSelectedPatentIds(new Set(searchResults.slice(0, count).map((r) => r.publication_id)));
  };

  // Execute BigQuery-Weighted Multi-Country Patent Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const effectiveQuery = searchMode === "BOOLEAN" ? booleanQuery.trim() : query.trim();
    if (!effectiveQuery) return;

    setIsSearching(true);
    try {
      const res = await fetch("/api/v1/search/patents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: effectiveQuery,
          cpc_prefix: cpcFilter.trim() || undefined,
          applicant: applicantFilter.trim() || undefined,
          jurisdictions_include: includedCountries.length > 0 ? includedCountries : undefined,
          jurisdictions_exclude: excludedCountries.length > 0 ? excludedCountries : undefined,
          published_from: dateFrom.trim() || undefined,
          published_to: dateTo.trim() || undefined,
          publication_kind: publicationKind,
          limit: resultLimit,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        setSearchResults(results);
        if (results.length > 0) {
          if (!selectedPatent || !results.some((r: FullPatentSpec) => r.publication_id === selectedPatent.publication_id)) {
            setSelectedPatent(results[0]);
          }
        }
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Run Perplexity Pro Novelty Engine with BigQuery Candidates & Country Filters
  const runNoveltyAssessment = async () => {
    const effectiveQuery = searchMode === "BOOLEAN" ? booleanQuery.trim() : query.trim();
    if (!effectiveQuery) {
      alert("Please enter a patent search query or technical concept first.");
      return;
    }
    setIsAssessing(true);
    setActiveTab("novelty");
    try {
      const res = await fetch("/api/v1/ai/novelty-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: effectiveQuery,
          abstract: effectiveQuery,
          technical_field: "Patent Technical Domain",
          novel_features: effectiveQuery,
          jurisdiction: includedCountries[0] || "US",
          jurisdictions_include: includedCountries,
          jurisdictions_exclude: excludedCountries,
          bigquery_candidates: searchResults.slice(0, 5),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNoveltyReport(data);
      }
    } catch (err) {
      console.error("Novelty analysis error:", err);
    } finally {
      setIsAssessing(false);
    }
  };

  // Run Side-by-Side Claim Mapping
  const runClaimMapping = async (patent: FullPatentSpec) => {
    setIsComparing(true);
    setActiveTab("claim-map");
    setSelectedPatent(patent);
    const effectiveQuery = searchMode === "BOOLEAN" ? booleanQuery.trim() : query.trim();
    try {
      const res = await fetch("/api/v1/ai/claim-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invention_claims: [
            effectiveQuery ? `1. A system or method for: ${effectiveQuery}` : "1. A computer-implemented system comprising one or more processors.",
          ],
          reference_claim_text:
            patent.claims_text ||
            "1. A patent specification claim limitation.",
          reference_patent_id: patent.publication_id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setClaimChart(data);
      }
    } catch (err) {
      console.error("Claim mapping error:", err);
    } finally {
      setIsComparing(false);
    }
  };

  const handleExportSpecification = (format: "txt" | "md" | "json") => {
    if (!selectedPatent) return;
    let content = "";
    const filename = `${selectedPatent.publication_id}_specification.${format}`;

    if (format === "json") {
      content = JSON.stringify(selectedPatent, null, 2);
    } else if (format === "md") {
      content = `# ${selectedPatent.publication_id} — ${selectedPatent.title}\n\n` +
        `**Application Number:** ${selectedPatent.application_number || "N/A"}\n` +
        `**Assignee / Applicant:** ${selectedPatent.applicant}\n` +
        `**Inventors:** ${selectedPatent.inventors?.join(", ") || "N/A"}\n` +
        `**Jurisdiction:** ${selectedPatent.jurisdiction} (Kind ${selectedPatent.kind_code})\n` +
        `**Filing Date:** ${selectedPatent.filing_date || "N/A"}\n` +
        `**Publication Date:** ${selectedPatent.published_on || "N/A"}\n` +
        `**Grant Date:** ${selectedPatent.grant_date || "Pending"}\n` +
        `**Legal Status:** ${selectedPatent.legal_status || "N/A"}\n` +
        `**Art Unit:** ${selectedPatent.art_unit || "N/A"} · **Examiner:** ${selectedPatent.examiner || "N/A"}\n\n` +
        `## Abstract\n${selectedPatent.abstract}\n\n` +
        `## Exemplary Claims\n${selectedPatent.claims_text}\n\n` +
        `## Background of the Invention\n${selectedPatent.background || "N/A"}\n\n` +
        `## Summary of the Invention\n${selectedPatent.summary_of_invention || "N/A"}\n\n` +
        `## Detailed Description of Preferred Embodiments\n${selectedPatent.detailed_description || "N/A"}\n`;
    } else {
      content = `${selectedPatent.publication_id} — ${selectedPatent.title}\n` +
        `APPLICATION NO: ${selectedPatent.application_number || "N/A"}\n` +
        `APPLICANT: ${selectedPatent.applicant}\n` +
        `INVENTORS: ${selectedPatent.inventors?.join(", ") || "N/A"}\n` +
        `JURISDICTION: ${selectedPatent.jurisdiction}\n` +
        `STATUS: ${selectedPatent.legal_status || "N/A"}\n\n` +
        `ABSTRACT:\n${selectedPatent.abstract}\n\n` +
        `CLAIMS:\n${selectedPatent.claims_text}\n\n` +
        `DETAILED DESCRIPTION:\n${selectedPatent.detailed_description || "N/A"}`;
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCopyNotification(`Exported ${filename}`);
    setTimeout(() => setCopyNotification(null), 3000);
  };

  React.useEffect(() => {
    const effectiveQuery = searchMode === "BOOLEAN" ? booleanQuery.trim() : query.trim();
    if (effectiveQuery) {
      handleSearch();
    }
  }, [includedCountries, excludedCountries, publicationKind, resultLimit]);

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h))] flex-col overflow-hidden bg-canvas">
      {/* Toast Notification */}
      {copyNotification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-semibold text-canvas shadow-2xl animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="size-4 text-emerald-400" />
          <span>{copyNotification}</span>
        </div>
      )}

      {/* Search Header Bar */}
      <header className="border-b border-line bg-surface/60 px-6 py-3.5 backdrop-blur-md">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-accent">
                Patent Analyst Studio
              </span>
              <span className="text-xs text-muted">
                Official WIPO ST.3 Global Patent Retrieval & Complete Specification Engine
              </span>
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">
              Multi-Jurisdictional Prior Art & Patent Document Engine
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runNoveltyAssessment}
              disabled={isAssessing}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:brightness-110 disabled:opacity-50"
            >
              <Sparkles className="size-4" />
              {isAssessing ? "Evaluating Live Novelty..." : "Run Perplexity Novelty Engine"}
            </button>
          </div>
        </div>

        {/* Search Engine Mode Switcher */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-b border-line pb-2.5 text-xs font-semibold">
          <span className="text-muted mr-1 font-bold uppercase tracking-wider text-[10.5px]">
            Search Engine Mode:
          </span>
          <button
            type="button"
            onClick={() => setSearchMode("SEMANTIC")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
              searchMode === "SEMANTIC"
                ? "bg-accent text-white shadow-xs"
                : "text-muted hover:text-ink hover:bg-hover"
            }`}
          >
            <Sparkles className="size-3.5" />
            AI Semantic & BigQuery Vector Search
          </button>

          <button
            type="button"
            onClick={() => setSearchMode("BOOLEAN")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
              searchMode === "BOOLEAN"
                ? "bg-accent text-white shadow-xs"
                : "text-muted hover:text-ink hover:bg-hover"
            }`}
          >
            <Layers className="size-3.5" />
            Traditional Boolean & Field Search
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchMode("KEYWORD_MATRIX");
              handleExpandKeywords();
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
              searchMode === "KEYWORD_MATRIX"
                ? "bg-accent text-white shadow-xs"
                : "text-muted hover:text-ink hover:bg-hover"
            }`}
          >
            <Award className="size-3.5" />
            Keyword Integration Matrix
          </button>
        </div>

        {/* Search Input Bar based on Mode */}
        {searchMode === "BOOLEAN" ? (
          <div className="mt-3 space-y-2">
            <form onSubmit={handleSearch} className="flex flex-col gap-2 md:flex-row">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={booleanQuery}
                  onChange={(e) => setBooleanQuery(e.target.value)}
                  placeholder='Boolean query (e.g. (cryptographic OR encryption) AND (outbox OR "event stream") AND CPC:G06F21/62)...'
                  className="w-full rounded-lg border border-line bg-canvas pl-4 pr-4 py-2 font-mono text-xs text-ink outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    showAdvancedFilters
                      ? "border-accent bg-accent-soft text-accent-text"
                      : "border-line bg-surface text-muted hover:text-ink"
                  }`}
                >
                  <SlidersHorizontal className="size-3.5" />
                  <span>
                    WIPO ST.3 Filters ({includedCountries.length} Inc / {excludedCountries.length} Exc)
                  </span>
                </button>

                <div className="flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-muted">
                  <span>Show:</span>
                  <select
                    value={resultLimit}
                    onChange={(e) => setResultLimit(Number(e.target.value))}
                    className="bg-transparent font-bold text-ink outline-none"
                  >
                    <option value={10}>10 Hits</option>
                    <option value={25}>25 Hits</option>
                    <option value={50}>50 Hits</option>
                    <option value={100}>100 Hits</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSearching}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-accent/90 disabled:opacity-50"
                >
                  <Search className="size-3.5" />
                  {isSearching ? "Evaluating..." : "Run Boolean Query"}
                </button>
              </div>
            </form>

            {/* Quick Boolean Operators Helper Toolbar */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-muted mr-1">
                Insert Operator:
              </span>
              {["AND", "OR", "NOT", "( )", '"..."', "*", "TTL:", "ABST:", "CLM:", "AN:", "CPC:", "IPC:"].map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => {
                    if (op === "( )") setBooleanQuery((prev) => prev + " ()");
                    else if (op === '"..."') setBooleanQuery((prev) => prev + ' ""');
                    else setBooleanQuery((prev) => `${prev} ${op} `);
                  }}
                  className="rounded border border-line bg-canvas px-2 py-0.5 font-bold text-ink hover:border-accent hover:text-accent transition"
                >
                  {op}
                </button>
              ))}
            </div>
          </div>
        ) : searchMode === "KEYWORD_MATRIX" ? (
          <div className="mt-3 rounded-xl border border-line bg-canvas p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 size-4 text-faint" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter core concepts to expand (e.g. cryptographic outbox state isolation)..."
                  className="w-full rounded-lg border border-line bg-surface pl-9 pr-4 py-2 text-xs text-ink outline-none focus:border-accent"
                />
              </div>
              <button
                type="button"
                onClick={handleExpandKeywords}
                disabled={isExpanding}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-accent/90 disabled:opacity-50 shrink-0"
              >
                <Sparkles className="size-3.5" />
                {isExpanding ? "Expanding Matrix..." : "Expand Keywords & CPC"}
              </button>
            </div>

            {keywordExpansion && (
              <div className="space-y-3 pt-2 border-t border-line/60 text-xs">
                {/* Synonyms */}
                <div>
                  <span className="font-bold uppercase tracking-wider text-muted text-[10.5px] block mb-1.5">
                    Technical Patent Synonyms & Variations:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(keywordExpansion.synonyms || {}).map(([term, syns]: any) => (
                      <div key={term} className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-surface p-1.5">
                        <span className="font-mono font-bold text-accent px-1">{term}:</span>
                        {syns.map((s: string) => (
                          <span
                            key={s}
                            onClick={() => setBooleanQuery((prev) => `${prev} OR "${s}"`)}
                            className="cursor-pointer rounded bg-line hover:bg-accent/15 hover:text-accent px-1.5 py-0.5 font-medium text-ink transition text-[11px]"
                            title="Click to add to Boolean query"
                          >
                            +{s}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested CPC */}
                {keywordExpansion.suggested_cpc && keywordExpansion.suggested_cpc.length > 0 && (
                  <div>
                    <span className="font-bold uppercase tracking-wider text-muted text-[10.5px] block mb-1">
                      Related CPC Classifications:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {keywordExpansion.suggested_cpc.map((c: any) => (
                        <span
                          key={c.code}
                          onClick={() => setCpcFilter(c.code.slice(0, 4))}
                          className="cursor-pointer inline-flex items-center gap-1 rounded border border-line bg-surface px-2 py-0.5 text-[11px] text-ink hover:border-accent hover:text-accent transition"
                        >
                          <strong className="font-mono text-accent">{c.code}</strong>
                          <span className="text-muted text-[10.5px] max-w-[180px] truncate">({c.description})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Boolean Query Action */}
                {keywordExpansion.recommended_boolean_query && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-accent/30 bg-accent/5 p-3">
                    <div className="min-w-0">
                      <span className="font-bold text-accent text-[11px] block">
                        Recommended Multi-Field Boolean Query:
                      </span>
                      <p className="font-mono text-[11px] text-ink truncate mt-0.5">
                        {keywordExpansion.recommended_boolean_query}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setBooleanQuery(keywordExpansion.recommended_boolean_query);
                        setSearchMode("BOOLEAN");
                        handleSearch();
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white shrink-0 hover:bg-accent/90 transition shadow-xs"
                    >
                      <Search className="size-3.5" />
                      Apply & Execute Search
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Standard Semantic Search Form */
          <form onSubmit={handleSearch} className="mt-3 flex flex-col gap-2 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-faint" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search patent keywords, claims, concepts, or invention title..."
                className="w-full rounded-lg border border-line bg-canvas pl-9 pr-4 py-2 text-sm text-ink outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-muted">
                <Filter className="size-3.5 text-faint" />
                <span>CPC:</span>
                <select
                  value={cpcFilter}
                  onChange={(e) => setCpcFilter(e.target.value)}
                  className="bg-transparent font-medium text-ink outline-none"
                >
                  <option value="">All CPC Classes</option>
                  <option value="G06F">G06F - Electric Digital Data Processing</option>
                  <option value="G06N">G06N - Artificial Intelligence & ML</option>
                  <option value="H04L">H04L - Network & Digital Information Security</option>
                  <option value="G06Q">G06Q - Enterprise & IP Docket Processing</option>
                  <option value="H01L">H01L - Semiconductor Devices</option>
                  <option value="C12N">C12N - Biotechnology & Genetic Engineering</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  showAdvancedFilters
                    ? "border-accent bg-accent-soft text-accent-text"
                    : "border-line bg-surface text-muted hover:text-ink"
                }`}
              >
                <SlidersHorizontal className="size-3.5" />
                <span>
                  WIPO ST.3 Filters ({includedCountries.length} Inc / {excludedCountries.length} Exc)
                </span>
              </button>

              <div className="flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-muted">
                <span>Show:</span>
                <select
                  value={resultLimit}
                  onChange={(e) => setResultLimit(Number(e.target.value))}
                  className="bg-transparent font-bold text-ink outline-none"
                >
                  <option value={10}>10 Hits</option>
                  <option value={25}>25 Hits</option>
                  <option value={50}>50 Hits</option>
                  <option value={100}>100 Hits</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-xs font-medium text-canvas transition hover:bg-ink/90 disabled:opacity-50"
              >
                <Search className="size-3.5" />
                {isSearching ? "Searching..." : "Search"}
              </button>
            </div>
          </form>
        )}

        {/* Collapsible WIPO ST.3 Country Inclusion / Exclusion Bar */}
        {showAdvancedFilters && (
          <div className="mt-3 rounded-xl border border-line bg-canvas p-4 space-y-3.5 shadow-inner">
            {/* Quick Presets */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                WIPO ST.3 Quick Presets:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset("IP5")}
                  className="rounded-md bg-purple-500/10 border border-purple-500/30 px-2.5 py-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-500/20"
                >
                  🏛️ IP5 Offices (US, EP, CN, JP, KR)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("MAJOR")}
                  className="rounded-md bg-accent/10 border border-accent/30 px-2.5 py-1 text-[11px] font-bold text-accent hover:bg-accent/20"
                >
                  🌐 Top 15 Global Hubs
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("CLEAR")}
                  className="rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted hover:text-ink"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* 1. Country Inclusion */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                <Globe2 className="size-3.5 text-accent" />
                <span>Target Included Jurisdictions:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {includedCountries.map((code) => {
                  const item = WIPO_ST3_JURISDICTIONS.find((j) => j.code === code);
                  return (
                    <span
                      key={`inc-${code}`}
                      className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-white shadow-2xs"
                    >
                      <span>{item?.flag || "🏳️"}</span>
                      <span>{code}</span>
                      <button
                        type="button"
                        onClick={() => toggleIncludeCountry(code)}
                        className="ml-0.5 hover:text-rose-200"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setShowWipoPicker("INCLUDE")}
                  className="flex items-center gap-1 rounded-md border border-dashed border-accent/60 bg-accent/5 px-2 py-0.5 text-xs font-bold text-accent hover:bg-accent/10"
                >
                  <Plus className="size-3" /> Add Country (ST.3)
                </button>
              </div>
            </div>

            {/* 2. Country Exclusion */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-t border-line/60 pt-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600">
                <XCircle className="size-3.5" />
                <span>Excluded Jurisdictions:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {excludedCountries.length === 0 ? (
                  <span className="text-xs text-faint italic">No countries excluded</span>
                ) : (
                  excludedCountries.map((code) => {
                    const item = WIPO_ST3_JURISDICTIONS.find((j) => j.code === code);
                    return (
                      <span
                        key={`exc-${code}`}
                        className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white shadow-2xs"
                      >
                        <span>{item?.flag || "🏳️"}</span>
                        <span>{code}</span>
                        <button
                          type="button"
                          onClick={() => toggleExcludeCountry(code)}
                          className="ml-0.5 hover:text-rose-200"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    );
                  })
                )}
                <button
                  type="button"
                  onClick={() => setShowWipoPicker("EXCLUDE")}
                  className="flex items-center gap-1 rounded-md border border-dashed border-rose-500/60 bg-rose-500/5 px-2 py-0.5 text-xs font-bold text-rose-600 hover:bg-rose-500/10"
                >
                  <Plus className="size-3" /> Exclude Country (ST.3)
                </button>
              </div>
            </div>

            {/* 3. Publication Kind & Date Range */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-muted">Publication Kind:</span>
                <select
                  value={publicationKind}
                  onChange={(e) => setPublicationKind(e.target.value)}
                  className="rounded border border-line bg-surface px-2 py-1 font-semibold text-ink outline-none"
                >
                  <option value="ALL">All Documents (Granted & Applications)</option>
                  <option value="GRANTED">Granted Patents Only (B1, B2)</option>
                  <option value="APPLICATIONS">Published Applications Only (A1, A)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="size-3.5 text-faint" />
                <span className="text-muted">Published:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded border border-line bg-surface px-2 py-1 text-ink outline-none"
                />
                <span>to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded border border-line bg-surface px-2 py-1 text-ink outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* WIPO ST.3 Global Country Search Modal */}
        {showWipoPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-ink flex items-center gap-2">
                    <Globe2 className="size-5 text-accent" />
                    USPTO WIPO ST.3 Country & Organization Directory
                  </h3>
                  <p className="text-xs text-muted">
                    {showWipoPicker === "INCLUDE"
                      ? "Select countries to Include in search"
                      : "Select countries to Exclude from search"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWipoPicker(null)}
                  className="rounded-lg p-1 text-muted hover:bg-hover hover:text-ink"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Search box */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-faint" />
                <input
                  type="text"
                  value={wipoSearchQuery}
                  onChange={(e) => setWipoSearchQuery(e.target.value)}
                  placeholder="Type country name or 2-letter ST.3 code (e.g. Japan, JP, Germany, DE, EP, WO)..."
                  className="w-full rounded-lg border border-line bg-canvas pl-9 pr-4 py-2 text-xs text-ink outline-none focus:border-accent"
                  autoFocus
                />
              </div>

              {/* Scrollable list of 263 WIPO ST.3 countries */}
              <div className="max-h-72 overflow-y-auto rounded-xl border border-line bg-canvas p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                {filteredWipoList.map((c) => {
                  const isInc = includedCountries.includes(c.code);
                  const isExc = excludedCountries.includes(c.code);
                  const isTarget = showWipoPicker === "INCLUDE" ? isInc : isExc;

                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        if (showWipoPicker === "INCLUDE") {
                          toggleIncludeCountry(c.code);
                        } else {
                          toggleExcludeCountry(c.code);
                        }
                      }}
                      className={`flex items-center justify-between rounded-lg p-2 text-left transition ${
                        isTarget
                          ? showWipoPicker === "INCLUDE"
                            ? "bg-accent/15 text-accent font-bold border border-accent/30"
                            : "bg-rose-500/15 text-rose-600 font-bold border border-rose-500/30"
                          : "text-ink hover:bg-hover"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span>{c.flag}</span>
                        <span className="font-mono font-bold">{c.code}</span>
                        <span className="truncate text-[11px] text-muted">{c.name}</span>
                      </div>
                      {isTarget && <Check className="size-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-line">
                <span>Showing {filteredWipoList.length} of 263 WIPO ST.3 Authorities</span>
                <button
                  type="button"
                  onClick={() => setShowWipoPicker(null)}
                  className="rounded-lg bg-ink px-4 py-1.5 font-bold text-canvas"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2.5 text-xs font-medium">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setActiveTab("results")}
              className={`flex items-center gap-1.5 pb-1 transition ${
                activeTab === "results"
                  ? "border-b-2 border-accent text-accent font-semibold"
                  : "text-muted hover:text-ink"
              }`}
            >
              <Layers className="size-3.5" />
              Search Hits ({searchResults.length})
            </button>

            <button
              onClick={() => setActiveTab("dossier")}
              className={`flex items-center gap-1.5 pb-1 transition ${
                activeTab === "dossier"
                  ? "border-b-2 border-accent text-accent font-semibold"
                  : "text-muted hover:text-ink"
              }`}
            >
              <FolderPlus className="size-3.5" />
              Project Dossier & Saved Refs
            </button>

            <button
              onClick={() => setActiveTab("feature-map")}
              className={`flex items-center gap-1.5 pb-1 transition ${
                activeTab === "feature-map"
                  ? "border-b-2 border-accent text-accent font-semibold"
                  : "text-muted hover:text-ink"
              }`}
            >
              <Award className="size-3.5" />
              Key Features & Claim Matrix
            </button>

            <button
              onClick={() => setActiveTab("novelty")}
              className={`flex items-center gap-1.5 pb-1 transition ${
                activeTab === "novelty"
                  ? "border-b-2 border-purple-500 text-purple-600 font-semibold"
                  : "text-muted hover:text-ink"
              }`}
            >
              <Sparkles className="size-3.5" />
              Perplexity Novelty Engine
              {noveltyReport && (
                <span className="rounded-full bg-purple-100 px-1.5 py-0.2 text-[10px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  {noveltyReport.novelty_score}% Novelty
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("claim-map")}
              className={`flex items-center gap-1.5 pb-1 transition ${
                activeTab === "claim-map"
                  ? "border-b-2 border-indigo-500 text-indigo-600 font-semibold"
                  : "text-muted hover:text-ink"
              }`}
            >
              <Scale className="size-3.5" />
              Claim Comparison Tree
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowReportGeneratorModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1 font-bold text-white shadow-2xs hover:bg-accent/90 transition text-xs"
            >
              <FileCheck2 className="size-3.5" /> Generate Formal Report
            </button>
            <div className="text-[11px] text-muted">
              Displaying <strong className="text-ink font-mono">{searchResults.length}</strong> of{" "}
              <strong className="text-ink font-mono">{resultLimit}</strong> hits
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Tab 1: Live Results Inspector */}
        {activeTab === "results" && (
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Complete Results List with BigQuery Breakdown and Multi-Selection */}
            <div className="w-[38%] overflow-y-auto border-r border-line p-4 space-y-3">
              {/* Batch Selection Toolbar */}
              <div className="flex flex-wrap items-center justify-between text-xs text-muted border-b border-line pb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={searchResults.length > 0 && selectedPatentIds.size === searchResults.length}
                    onChange={(e) => {
                      if (e.target.checked) selectAllPatents();
                      else deselectAllPatents();
                    }}
                    className="size-3.5 rounded text-accent cursor-pointer"
                  />
                  <span className="font-semibold text-ink">
                    {selectedPatentIds.size > 0 ? `${selectedPatentIds.size} Selected` : "Select All"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => selectTopPatents(5)}
                    className="rounded bg-line px-1.5 py-0.5 font-medium hover:bg-hover hover:text-ink transition"
                  >
                    Top 5
                  </button>
                  <button
                    type="button"
                    onClick={() => selectTopPatents(10)}
                    className="rounded bg-line px-1.5 py-0.5 font-medium hover:bg-hover hover:text-ink transition"
                  >
                    Top 10
                  </button>
                  {selectedPatentIds.size > 0 && (
                    <button
                      type="button"
                      onClick={deselectAllPatents}
                      className="rounded bg-line px-1.5 py-0.5 font-medium text-rose-500 hover:bg-rose-500/10 transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {searchResults.length === 0 ? (
                <div className="flex h-72 flex-col items-center justify-center p-6 text-center text-muted">
                  <Search className="size-8 text-faint mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-ink">No Search Executed</p>
                  <p className="text-xs text-muted mt-1 max-w-xs">
                    Enter technical keywords, invention concepts, or boolean expressions above to search global patent databases.
                  </p>
                </div>
              ) : (
                searchResults.map((hit, index) => {
                  const isSelected = selectedPatent?.publication_id === hit.publication_id;
                  const isChecked = selectedPatentIds.has(hit.publication_id);
                  return (
                    <div
                      key={`${hit.publication_id}-${index}`}
                      onClick={() => setSelectedPatent(hit)}
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                        isSelected
                          ? "border-accent bg-accent/5 shadow-md ring-1 ring-accent"
                          : isChecked
                          ? "border-accent/60 bg-accent/5"
                          : "border-line bg-surface hover:border-line-strong hover:bg-surface/80"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => toggleSelectPatent(hit.publication_id, e)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 size-3.5 rounded text-accent cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 truncate">
                              <span className="rounded bg-accent/10 px-2 py-0.5 font-mono text-[11px] font-bold text-accent">
                                {hit.publication_id}
                              </span>
                              <span className="rounded bg-line px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted">
                                {hit.jurisdiction}
                              </span>
                              <span className="text-xs font-semibold text-muted truncate max-w-[120px]">
                                {hit.applicant}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                                Score: {hit.score}
                              </span>
                            </div>
                          </div>

                          <h3 className="mt-1.5 text-xs font-semibold leading-snug text-ink line-clamp-2">
                            {hit.title}
                          </h3>
                        </div>
                      </div>

                      <p className="mt-2 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                        {hit.abstract}
                      </p>

                      {/* BigQuery Mathematical Score Breakdown Badge */}
                      {hit.score_breakdown && (
                        <div className="mt-2 flex items-center gap-2 rounded-lg border border-line/60 bg-canvas px-2 py-0.5 text-[10px] font-mono text-muted">
                          <span>Title: {hit.score_breakdown.title_score} (3x)</span>
                          <span>·</span>
                          <span>Abs: {hit.score_breakdown.abstract_score} (2x)</span>
                          <span>·</span>
                          <span>Claims: {hit.score_breakdown.claims_score} (1x)</span>
                          {hit.score_breakdown.cpc_boost > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-accent font-bold">
                                CPC: +{hit.score_breakdown.cpc_boost}
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-faint">
                        <div className="flex flex-wrap gap-1">
                          {hit.classifications?.slice(0, 3).map((c) => (
                            <span
                              key={c}
                              className="rounded border border-line bg-canvas px-1.5 py-0.2 font-mono"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                        <span>Pub: {hit.published_on || "Recent"}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>


            {/* Right: In-Platform Full Patent Document Specification & Inspector */}
            <div className="w-[62%] overflow-y-auto p-5 space-y-4 bg-surface/30">
              {selectedPatent ? (
                <>
                  {/* Top Document Header Card */}
                  <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-accent px-2.5 py-0.5 font-mono text-xs font-bold text-white shadow-2xs">
                            {selectedPatent.publication_id}
                          </span>
                          <span className="rounded bg-line px-2 py-0.5 text-xs font-semibold text-muted">
                            {selectedPatent.jurisdiction} Patent Office
                          </span>
                          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">
                            {selectedPatent.legal_status || "ACTIVE / IN FORCE"}
                          </span>
                          <span className="rounded bg-line px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted">
                            Kind {selectedPatent.kind_code}
                          </span>
                        </div>
                        <h2 className="mt-2 text-base font-bold text-ink leading-snug">
                          {selectedPatent.title}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                          <span>
                            <strong>Assignee:</strong> {selectedPatent.applicant}
                          </span>
                          {selectedPatent.inventors && selectedPatent.inventors.length > 0 && (
                            <span>
                              <strong>Inventors:</strong> {selectedPatent.inventors.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          onClick={() => setShowFullScreenReader(true)}
                          className="flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-ink shadow-2xs hover:bg-hover"
                        >
                          <Maximize2 className="size-3.5 text-accent" />
                          Full-Screen Spec Reader
                        </button>
                        <button
                          onClick={() => runClaimMapping(selectedPatent)}
                          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                        >
                          <Scale className="size-3.5" />
                          Map Claims Side-by-Side
                        </button>
                      </div>
                    </div>

                    {/* Timeline & Metadata bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-line/60 text-[11px] text-muted">
                      <div>
                        <span className="text-faint">Application No:</span>
                        <p className="font-semibold text-ink font-mono">
                          {selectedPatent.application_number || "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-faint">Filing / Priority:</span>
                        <p className="font-semibold text-ink">
                          {selectedPatent.filing_date || "—"} (Pri: {selectedPatent.priority_date || "—"})
                        </p>
                      </div>
                      <div>
                        <span className="text-faint">Publication Date:</span>
                        <p className="font-semibold text-ink">{selectedPatent.published_on || "—"}</p>
                      </div>
                      <div>
                        <span className="text-faint">Art Unit / Examiner:</span>
                        <p className="font-semibold text-accent font-mono truncate">
                          {selectedPatent.art_unit || "—"} ({selectedPatent.examiner || "—"})
                        </p>
                      </div>
                    </div>

                    {/* Export & Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted font-medium">Export Spec:</span>
                        <button
                          onClick={() => handleExportSpecification("md")}
                          className="rounded border border-line bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink hover:bg-hover"
                        >
                          Markdown (.md)
                        </button>
                        <button
                          onClick={() => handleExportSpecification("txt")}
                          className="rounded border border-line bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink hover:bg-hover"
                        >
                          Plain Text (.txt)
                        </button>
                        <button
                          onClick={() => handleExportSpecification("json")}
                          className="rounded border border-line bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink hover:bg-hover"
                        >
                          JSON Schema
                        </button>
                      </div>

                      <a
                        href={`https://patents.google.com/patent/${selectedPatent.publication_id}/en`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-accent hover:underline"
                      >
                        External Official Mirror <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </div>

                  {/* In-Platform Specification Sub-Tabs */}
                  <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center gap-2 border-b border-line pb-2.5 text-xs font-semibold">
                      <button
                        onClick={() => setPatentSpecTab("abstract")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                          patentSpecTab === "abstract"
                            ? "bg-accent text-white shadow-sm"
                            : "text-muted hover:text-ink hover:bg-hover"
                        }`}
                      >
                        <ImageIcon className="size-3.5" />
                        Abstract & Drawings
                      </button>

                      <button
                        onClick={() => setPatentSpecTab("claims")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                          patentSpecTab === "claims"
                            ? "bg-accent text-white shadow-sm"
                            : "text-muted hover:text-ink hover:bg-hover"
                        }`}
                      >
                        <FileText className="size-3.5" />
                        Full Claims Specification
                      </button>

                      <button
                        onClick={() => setPatentSpecTab("description")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                          patentSpecTab === "description"
                            ? "bg-accent text-white shadow-sm"
                            : "text-muted hover:text-ink hover:bg-hover"
                        }`}
                      >
                        <BookOpen className="size-3.5" />
                        Detailed Description & Embodiments
                      </button>

                      <button
                        onClick={() => setPatentSpecTab("legal")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                          patentSpecTab === "legal"
                            ? "bg-accent text-white shadow-sm"
                            : "text-muted hover:text-ink hover:bg-hover"
                        }`}
                      >
                        <History className="size-3.5" />
                        Legal & Prosecution History
                      </button>

                      <button
                        onClick={() => setPatentSpecTab("classifications")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                          patentSpecTab === "classifications"
                            ? "bg-accent text-white shadow-sm"
                            : "text-muted hover:text-ink hover:bg-hover"
                        }`}
                      >
                        <Award className="size-3.5" />
                        CPC / IPC Taxonomy
                      </button>

                      <button
                        onClick={() => setPatentSpecTab("family")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                          patentSpecTab === "family"
                            ? "bg-accent text-white shadow-sm"
                            : "text-muted hover:text-ink hover:bg-hover"
                        }`}
                      >
                        <GitBranch className="size-3.5" />
                        Patent Family & Citations
                      </button>
                    </div>

                    {/* Sub-Tab 1: Claims */}
                    {patentSpecTab === "claims" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted">
                            Complete Patent Claims Tree
                          </span>
                          <span className="text-[11px] font-mono text-faint">
                            Authored under {selectedPatent.jurisdiction} Patent Prosecution Standards
                          </span>
                        </div>
                        <div className="rounded-xl border border-line bg-canvas p-4 font-mono text-xs leading-relaxed text-ink space-y-3 whitespace-pre-wrap select-text">
                          {selectedPatent.claims_text}
                        </div>
                      </div>
                    )}

                    {/* Sub-Tab 2: Description */}
                    {patentSpecTab === "description" && (
                      <div className="space-y-4 text-xs leading-relaxed text-ink">
                        <div className="rounded-xl border border-line bg-canvas p-4 space-y-2">
                          <h4 className="font-bold uppercase tracking-wider text-accent text-[11px]">
                            Background of the Invention
                          </h4>
                          <p className="text-muted leading-relaxed whitespace-pre-wrap">
                            {selectedPatent.background || "No background section provided in this publication."}
                          </p>
                        </div>

                        <div className="rounded-xl border border-line bg-canvas p-4 space-y-2">
                          <h4 className="font-bold uppercase tracking-wider text-accent text-[11px]">
                            Summary of the Invention
                          </h4>
                          <p className="text-muted leading-relaxed whitespace-pre-wrap">
                            {selectedPatent.summary_of_invention ||
                              selectedPatent.abstract}
                          </p>
                        </div>

                        <div className="rounded-xl border border-line bg-canvas p-4 space-y-2">
                          <h4 className="font-bold uppercase tracking-wider text-accent text-[11px]">
                            Detailed Description of Preferred Embodiments
                          </h4>
                          <p className="text-muted leading-relaxed whitespace-pre-wrap">
                            {selectedPatent.detailed_description || "Detailed description available in published specification."}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Sub-Tab 3: Abstract & Drawings */}
                    {patentSpecTab === "abstract" && (
                      <div className="space-y-4 text-xs">
                        <div className="rounded-xl border border-line bg-canvas p-4 space-y-2">
                          <h4 className="font-bold uppercase tracking-wider text-muted text-[11px]">
                            Official Abstract
                          </h4>
                          <p className="text-ink leading-relaxed">{selectedPatent.abstract}</p>
                        </div>

                        <div className="rounded-xl border border-line bg-canvas p-4 space-y-2">
                          <h4 className="font-bold uppercase tracking-wider text-muted text-[11px]">
                            Brief Description of the Drawings
                          </h4>
                          <pre className="font-sans text-xs text-muted whitespace-pre-wrap leading-relaxed">
                            {selectedPatent.drawings_description || "Drawing figures published with official specification."}
                          </pre>
                        </div>

                        <PatentDrawingsViewer
                          publicationId={selectedPatent.publication_id}
                          title={selectedPatent.title}
                        />
                      </div>
                    )}


                    {/* Sub-Tab 4: Legal & Prosecution History */}
                    {patentSpecTab === "legal" && (
                      <div className="space-y-4 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold uppercase tracking-wider text-muted text-[11px]">
                            Prosecution History & Statutory Events Timeline
                          </span>
                          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-bold text-emerald-600">
                            {selectedPatent.legal_status || "ACTIVE / IN FORCE"}
                          </span>
                        </div>

                        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
                          {selectedPatent.legal_events && selectedPatent.legal_events.length > 0 ? (
                            selectedPatent.legal_events.map((ev, i) => (
                              <div key={i} className="relative">
                                <div className="absolute -left-6 top-1 size-3 rounded-full bg-accent ring-4 ring-canvas" />
                                <div className="rounded-xl border border-line bg-canvas p-3">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-accent">{ev.event_code}</span>
                                    <span className="text-[10.5px] text-faint">{ev.event_date}</span>
                                  </div>
                                  <p className="mt-1 text-ink font-medium">{ev.description}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-muted text-xs">No statutory prosecution history events recorded for this publication.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sub-Tab 5: Classifications */}
                    {patentSpecTab === "classifications" && (
                      <div className="space-y-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted">
                          Cooperative Patent Classification (CPC) Hierarchy
                        </span>
                        <div className="space-y-2">
                          {selectedPatent.cpc_details && selectedPatent.cpc_details.length > 0 ? (
                            selectedPatent.cpc_details.map((cpc) => (
                              <div
                                key={cpc.code}
                                className="flex items-start gap-3 rounded-xl border border-line bg-canvas p-3"
                              >
                                <span className="rounded bg-accent/10 px-2 py-1 font-mono text-xs font-bold text-accent shrink-0">
                                  {cpc.code}
                                </span>
                                <div className="text-xs">
                                  <p className="font-semibold text-ink">{cpc.description}</p>
                                  <span className="text-[11px] text-faint">WIPO / USPTO Standard Category</span>
                                </div>
                              </div>
                            ))
                          ) : selectedPatent.classifications && selectedPatent.classifications.length > 0 ? (
                            selectedPatent.classifications.map((code) => (
                              <div
                                key={code}
                                className="flex items-start gap-3 rounded-xl border border-line bg-canvas p-3"
                              >
                                <span className="rounded bg-accent/10 px-2 py-1 font-mono text-xs font-bold text-accent shrink-0">
                                  {code}
                                </span>
                                <div className="text-xs">
                                  <p className="font-semibold text-ink">CPC Classification</p>
                                  <span className="text-[11px] text-faint">WIPO / USPTO Standard Category</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-muted text-xs">No specific CPC classifications recorded.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sub-Tab 6: Family & Citations */}
                    {patentSpecTab === "family" && (
                      <div className="space-y-4">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-muted">
                            Global Patent Family Equivalents
                          </span>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {selectedPatent.patent_family && selectedPatent.patent_family.length > 0 ? (
                              selectedPatent.patent_family.map((fam) => (
                                <div
                                  key={fam.pub_id}
                                  className="flex items-center justify-between rounded-xl border border-line bg-canvas p-3 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <Globe2 className="size-3.5 text-accent" />
                                    <span className="font-mono font-bold text-ink">{fam.pub_id}</span>
                                  </div>
                                  <span className="rounded bg-line px-1.5 py-0.5 text-[10.5px] font-bold text-muted">
                                    {fam.status}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-muted text-xs col-span-2">No foreign patent family members published.</p>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-line">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted">
                            Cited Prior Art & References
                          </span>
                          <div className="mt-2 space-y-2">
                            {selectedPatent.citations && selectedPatent.citations.length > 0 ? (
                              selectedPatent.citations.map((cite) => (
                                <div
                                  key={cite.pub_id}
                                  className="flex items-center justify-between rounded-xl border border-line bg-canvas p-3 text-xs"
                                >
                                  <div>
                                    <span className="font-mono font-bold text-accent">{cite.pub_id}</span>
                                    <p className="text-ink font-medium">{cite.title}</p>
                                  </div>
                                  <span className="text-[11px] text-muted">{cite.assignee}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-muted text-xs">No backward/forward prior art citations recorded.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center p-8 text-muted">
                  <div className="rounded-2xl border border-line bg-surface/60 p-6 max-w-sm flex flex-col items-center">
                    <FileText className="size-10 mb-2 opacity-30" />
                    <p className="font-semibold text-ink text-xs">No Publication Selected</p>
                    <p className="text-[11px] text-muted mt-1 leading-relaxed">
                      Select a patent from the search results to inspect full claims, complete specifications, drawings, legal status, and patent families.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Project Dossier & Saved References */}
        {activeTab === "dossier" && (
          <div className="flex-1 overflow-hidden p-6">
            <ProjectDossierView
              onOpenReportGenerator={() => {
                setShowReportGeneratorModal(true);
              }}
              onOpenKeyFeaturesMapping={() => {
                setActiveTab("feature-map");
              }}
              onSelectPatentForInspection={(pubId) => {
                const target = searchResults.find((r) => r.publication_id === pubId);
                if (target) {
                  setSelectedPatent(target);
                  setActiveTab("results");
                }
              }}
            />
          </div>
        )}

        {/* Tab 3: Key Features & Claim Element Mapping Matrix */}
        {activeTab === "feature-map" && (
          <div className="flex-1 overflow-y-auto p-6">
            <KeyFeaturesMapping
              initialReferences={
                selectedPatentIds.size > 0
                  ? searchResults
                      .filter((r) => selectedPatentIds.has(r.publication_id))
                      .map((r) => ({
                        publication_id: r.publication_id,
                        title: r.title,
                        applicant: r.applicant,
                        jurisdiction: r.jurisdiction,
                      }))
                  : searchResults.slice(0, 4).map((r) => ({
                      publication_id: r.publication_id,
                      title: r.title,
                      applicant: r.applicant,
                      jurisdiction: r.jurisdiction,
                    }))
              }
              matterRef=""
              matterTitle={query}
              onSendToReport={(matrix) => {
                setFeatureMatrixData(matrix);
                setShowReportGeneratorModal(true);
              }}
            />
          </div>
        )}

        {/* Tab 4: Perplexity Pro AI Novelty & Prior-Art Report */}
        {activeTab === "novelty" && (
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {noveltyReport ? (
              <div className="mx-auto max-w-4xl space-y-6">
                {/* Score & Verdict Card */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-transparent p-6 shadow-sm">
                  <div>
                    <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-700 dark:text-purple-300">
                      Perplexity Pro AI + BigQuery Hybrid Reasoning
                    </span>
                    <h2 className="mt-2 text-2xl font-black text-ink">
                      Verdict: {noveltyReport.novelty_verdict.replace("_", " ")}
                    </h2>
                    <p className="mt-1 text-xs text-muted max-w-xl">
                      {noveltyReport.summary_findings}
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-2xl border border-purple-500/30 bg-surface px-8 py-4 shadow-inner">
                    <span className="text-4xl font-black text-purple-600">
                      {noveltyReport.novelty_score}%
                    </span>
                    <span className="text-[11px] font-semibold text-muted">Novelty Confidence</span>
                  </div>
                </div>

                {/* 35 U.S.C. 101/102/103 Triad */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-line bg-surface p-4">
                    <span className="text-[11px] font-bold text-muted">35 U.S.C. 101 Eligibility</span>
                    <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                      <ShieldCheck className="size-4" />
                      {noveltyReport.patentability_assessment.subject_matter_eligibility_101}
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-surface p-4">
                    <span className="text-[11px] font-bold text-muted">35 U.S.C. 102 Novelty</span>
                    <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                      <ShieldCheck className="size-4" />
                      {noveltyReport.patentability_assessment.novelty_102}
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-surface p-4">
                    <span className="text-[11px] font-bold text-muted">35 U.S.C. 103 Non-Obviousness</span>
                    <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                      <ShieldCheck className="size-4" />
                      {noveltyReport.patentability_assessment.non_obviousness_103}
                    </div>
                  </div>
                </div>

                {/* Prior Art Citations List */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-ink">Identified Prior-Art Citations & References</h3>
                  <div className="space-y-3">
                    {noveltyReport.prior_art_citations.map((cite) => (
                      <div
                        key={cite.publication_id}
                        className="rounded-xl border border-line bg-surface p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-accent">
                              {cite.publication_id}
                            </span>
                            <span className="text-xs font-medium text-ink">{cite.title}</span>
                          </div>
                          <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                            {cite.overlap_percentage}% Overlap ({cite.risk_type})
                          </span>
                        </div>
                        <p className="text-xs text-muted leading-relaxed italic">
                          &quot;{cite.relevant_snippet}&quot;
                        </p>
                        {cite.url && (
                          <a
                            href={cite.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                          >
                            Read Full Publication <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Novel Differentiators & Prosecution Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                      Novel Differentiators (Strengths)
                    </h4>
                    <ul className="space-y-1.5 text-xs text-ink">
                      {noveltyReport.novel_differentiators.map((diff, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{diff}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                      Prosecution & Claim Modification Recommendations
                    </h4>
                    <ul className="space-y-1.5 text-xs text-ink">
                      {noveltyReport.suggested_claim_modifications.map((mod, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <AlertTriangle className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span>{mod}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-96 flex-col items-center justify-center text-center">
                <Sparkles className="size-10 text-purple-400 mb-3" />
                <h3 className="text-base font-bold text-ink">Novelty Report Not Yet Generated</h3>
                <p className="text-xs text-muted max-w-sm mt-1 mb-4">
                  Click the button below to execute live Perplexity Pro AI evaluation of your invention against global prior art.
                </p>
                <button
                  onClick={runNoveltyAssessment}
                  disabled={isAssessing}
                  className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-110"
                >
                  {isAssessing ? "Evaluating..." : "Generate AI Novelty Assessment"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Side-by-Side Claim Mapping Chart */}
        {activeTab === "claim-map" && (
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {claimChart ? (
              <div className="mx-auto max-w-5xl space-y-6">
                <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-6 shadow-sm">
                  <div>
                    <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-600">
                      Element-Wise Claim Chart Comparison
                    </span>
                    <h2 className="mt-2 text-xl font-bold text-ink">
                      Reference: {claimChart.reference_patent_id}
                    </h2>
                    <p className="text-xs text-muted mt-1">
                      Infringement / Anticipation Risk:{" "}
                      <span className="font-bold text-rose-600">
                        {claimChart.infringement_or_anticipation_risk}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-canvas px-5 py-3">
                      <span className="text-2xl font-black text-ink">
                        {claimChart.overall_overlap_percentage}%
                      </span>
                      <span className="text-[10.5px] font-semibold text-muted">Claim Overlap</span>
                    </div>
                  </div>
                </div>

                {/* Element Comparison Table */}
                <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-line bg-canvas text-muted">
                      <tr>
                        <th className="p-3.5 font-bold uppercase tracking-wider w-16">Elem</th>
                        <th className="p-3.5 font-bold uppercase tracking-wider w-[35%]">
                          Invention Claim Element
                        </th>
                        <th className="p-3.5 font-bold uppercase tracking-wider w-[35%]">
                          Reference Support ({claimChart.reference_patent_id})
                        </th>
                        <th className="p-3.5 font-bold uppercase tracking-wider">Alignment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {claimChart.claim_elements_matrix.map((el, i) => (
                        <tr key={i} className="hover:bg-hover/50 transition">
                          <td className="p-3.5 font-mono font-bold text-muted">{el.element_number}</td>
                          <td className="p-3.5 text-ink leading-relaxed font-medium">
                            {el.invention_element}
                          </td>
                          <td className="p-3.5 text-muted leading-relaxed italic">
                            &quot;{el.reference_element_support}&quot;
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-bold ${
                                el.status === "IDENTICAL"
                                  ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                  : el.status === "EQUIVALENT"
                                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              }`}
                            >
                              {el.status}
                            </span>
                            <p className="mt-1 text-[10px] text-faint">{el.analysis_notes}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Distinguishing Arguments */}
                <div className="rounded-2xl border border-line bg-surface p-6 space-y-3 shadow-sm">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-500" />
                    Recommended Distinguishing Arguments for Prosecution
                  </h3>
                  <ul className="space-y-2 text-xs text-ink">
                    {claimChart.distinguishing_arguments.map((arg, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="font-bold text-accent">[{i + 1}]</span>
                        <span>{arg}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex h-96 flex-col items-center justify-center text-center text-muted">
                <Scale className="size-10 text-indigo-400 mb-3" />
                <h3 className="text-base font-bold text-ink">No Claim Chart Generated Yet</h3>
                <p className="text-xs text-muted max-w-sm mt-1">
                  Select a patent from the search results and click &quot;Map Claims Side-by-Side&quot; to inspect element-wise overlap.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-Screen In-Platform Patent Document Specification Reader Modal */}
      {showFullScreenReader && selectedPatent && (
        <div className="fixed inset-0 z-50 flex flex-col bg-canvas text-ink animate-in fade-in zoom-in-95">
          {/* Reader Header */}
          <div className="flex items-center justify-between border-b border-line bg-surface px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-accent px-2.5 py-1 font-mono text-xs font-bold text-white">
                {selectedPatent.publication_id}
              </span>
              <div>
                <h3 className="text-sm font-bold text-ink truncate max-w-xl">
                  {selectedPatent.title}
                </h3>
                <span className="text-xs text-muted">
                  {selectedPatent.applicant} · {selectedPatent.jurisdiction} ({selectedPatent.published_on}) · {selectedPatent.art_unit || "Art Unit 2173"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportSpecification("md")}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-semibold hover:bg-hover"
              >
                <Download className="size-3.5" />
                Download Spec
              </button>
              <button
                onClick={() => setShowFullScreenReader(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Reader Content Area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Outline sidebar */}
            <div className="w-64 border-r border-line bg-surface/40 p-4 space-y-2 overflow-y-auto text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Document Sections
              </span>
              <div className="space-y-1 pt-1">
                <a
                  href="#sec-biblio"
                  className="block rounded-lg px-2.5 py-1.5 font-medium text-ink hover:bg-hover"
                >
                  Bibliographic Information
                </a>
                <a
                  href="#sec-abstract"
                  className="block rounded-lg px-2.5 py-1.5 font-medium text-ink hover:bg-hover"
                >
                  Abstract
                </a>
                <a
                  href="#sec-claims"
                  className="block rounded-lg px-2.5 py-1.5 font-medium text-accent font-bold hover:bg-hover"
                >
                  Claims Specification
                </a>
                <a
                  href="#sec-background"
                  className="block rounded-lg px-2.5 py-1.5 font-medium text-ink hover:bg-hover"
                >
                  Background of the Invention
                </a>
                <a
                  href="#sec-drawings"
                  className="block rounded-lg px-2.5 py-1.5 font-medium text-ink hover:bg-hover"
                >
                  Brief Description of Drawings
                </a>
                <a
                  href="#sec-detailed"
                  className="block rounded-lg px-2.5 py-1.5 font-medium text-ink hover:bg-hover"
                >
                  Detailed Description
                </a>
              </div>
            </div>

            {/* Main Reading Canvas */}
            <div className="flex-1 overflow-y-auto p-10 space-y-8 max-w-4xl mx-auto">
              <section id="sec-biblio" className="space-y-3 border-b border-line pb-6">
                <span className="font-mono text-xs font-bold text-accent uppercase">
                  {selectedPatent.jurisdiction} Patent Document
                </span>
                <h1 className="text-2xl font-black text-ink">{selectedPatent.title}</h1>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-muted pt-3">
                  <div>
                    <span className="text-faint">Publication Number:</span>
                    <p className="font-bold text-ink font-mono">{selectedPatent.publication_id}</p>
                  </div>
                  <div>
                    <span className="text-faint">Application Number:</span>
                    <p className="font-bold text-ink font-mono">
                      {selectedPatent.application_number || `${selectedPatent.jurisdiction}17892341`}
                    </p>
                  </div>
                  <div>
                    <span className="text-faint">Assignee / Owner:</span>
                    <p className="font-bold text-ink">{selectedPatent.applicant}</p>
                  </div>
                  <div>
                    <span className="text-faint">Legal Status:</span>
                    <p className="font-bold text-emerald-600">
                      {selectedPatent.legal_status || "ACTIVE / IN FORCE"}
                    </p>
                  </div>
                </div>
              </section>

              <section id="sec-abstract" className="space-y-3 border-b border-line pb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted">Abstract</h3>
                <p className="text-sm leading-relaxed text-ink">{selectedPatent.abstract}</p>
              </section>

              <section id="sec-claims" className="space-y-3 border-b border-line pb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-accent">
                  Claims Specification
                </h3>
                <div className="rounded-xl border border-line bg-surface p-5 font-mono text-xs leading-relaxed text-ink whitespace-pre-wrap select-text">
                  {selectedPatent.claims_text}
                </div>
              </section>

              <section id="sec-background" className="space-y-3 border-b border-line pb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted">
                  Background of the Invention
                </h3>
                <p className="text-sm leading-relaxed text-ink whitespace-pre-wrap">
                  {selectedPatent.background ||
                    "Conventional cloud platforms lack cryptographic tenant isolation and real-time state synchronizations. The present invention solves these key bottlenecks."}
                </p>
              </section>

              <section id="sec-drawings" className="space-y-3 border-b border-line pb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted">
                  Brief Description of the Drawings & Technical Figures
                </h3>
                <pre className="font-sans text-sm text-ink whitespace-pre-wrap leading-relaxed">
                  {selectedPatent.drawings_description ||
                    "FIG. 1 is a block diagram of the system.\nFIG. 2 is a flowchart showing processing steps."}
                </pre>
                <div className="pt-2">
                  <PatentDrawingsViewer
                    publicationId={selectedPatent.publication_id}
                    title={selectedPatent.title}
                  />
                </div>
              </section>


              <section id="sec-detailed" className="space-y-3 pb-12">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted">
                  Detailed Description of Preferred Embodiments
                </h3>
                <p className="text-sm leading-relaxed text-ink whitespace-pre-wrap">
                  {selectedPatent.detailed_description ||
                    "Reference will now be made in detail to exemplary embodiments of the present invention. The architecture decouples transactional storage from distributed event propagation."}
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
      {/* Floating Batch Action Toolbar */}
      {selectedPatentIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-line bg-surface/95 backdrop-blur-md px-5 py-3 shadow-2xl animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-white">
              {selectedPatentIds.size}
            </span>
            <span className="text-xs font-bold text-ink">References Selected</span>
          </div>

          <div className="h-4 w-px bg-line" />

          <button
            type="button"
            onClick={() => setShowProjectDossierModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-1.5 text-xs font-bold text-white hover:bg-accent/90 transition shadow-xs"
          >
            <FolderPlus className="size-3.5" /> Add to Project Folder
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("feature-map")}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-canvas px-3.5 py-1.5 text-xs font-bold text-ink hover:border-accent hover:text-accent transition shadow-2xs"
          >
            <Award className="size-3.5" /> Map Key Features
          </button>

          <button
            type="button"
            onClick={() => {
              setReportTemplateToOpen("PRIOR_ART_SEARCH");
              setShowReportGeneratorModal(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-canvas px-3.5 py-1.5 text-xs font-bold text-ink hover:border-accent hover:text-accent transition shadow-2xs"
          >
            <FileCheck2 className="size-3.5" /> Generate Report
          </button>

          <button
            type="button"
            onClick={deselectAllPatents}
            className="rounded-lg p-1 text-muted hover:text-ink transition"
            title="Deselect all"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Project Dossier Modal */}
      <ProjectDossierModal
        isOpen={showProjectDossierModal}
        onClose={() => setShowProjectDossierModal(false)}
        selectedPatents={searchResults
          .filter((r) => selectedPatentIds.has(r.publication_id))
          .map((r) => ({
            publication_id: r.publication_id,
            title: r.title,
            applicant: r.applicant,
            jurisdiction: r.jurisdiction,
            abstract: r.abstract,
            score: r.score,
          }))}
        onSavedToProject={() => {
          setCopyNotification(`Saved ${selectedPatentIds.size} references to Project Folder`);
          setTimeout(() => setCopyNotification(null), 3000);
        }}
      />

      {/* Report Generator Modal */}
      <ReportGeneratorModal
        isOpen={showReportGeneratorModal}
        onClose={() => setShowReportGeneratorModal(false)}
        initialTemplate={reportTemplateToOpen}
        matterRef=""
        matterTitle={query}
        references={
          selectedPatentIds.size > 0
            ? searchResults.filter((r) => selectedPatentIds.has(r.publication_id))
            : searchResults.slice(0, 5)
        }
        featureMatrix={featureMatrixData}
        onReportSaved={(rep) => {
          setCopyNotification(`Report ${rep.id} saved to Repository!`);
          setTimeout(() => setCopyNotification(null), 3000);
        }}
      />
    </div>
  );
}
