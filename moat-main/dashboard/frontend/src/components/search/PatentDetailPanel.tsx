"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, FileText, Search, Combine, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { getGooglePatentDetails } from "@/lib/googlePatents";
import { getPatentDetailsFromBigQuery } from "@/lib/bigquery";

interface PatentDetailPanelProps {
  patent: any | null;
  onClose: () => void;
  highlightScheme?: any | null;
  highlightText?: (text: string) => string;
}

const DEFAULT_HIGHLIGHTS = [
  { id: "H1", color: "#fef08a", name: "H1" }, // Yellow
  { id: "H2", color: "#bfdbfe", name: "H2" }, // Blue
  { id: "H3", color: "#bef264", name: "H3" }, // Lime
  { id: "H4", color: "#e9d5ff", name: "H4" }, // Purple
  { id: "H5", color: "#fed7aa", name: "H5" }, // Orange
  { id: "H6", color: "#fca5a5", name: "H6" }, // Red/Rose
  { id: "H7", color: "#7dd3fc", name: "H7" }, // Sky
  { id: "H8", color: "#86efac", name: "H8" }, // Green
  { id: "H9", color: "#fbcfe8", name: "H9" }, // Pink
  { id: "H10", color: "#c7d2fe", name: "H10" }, // Indigo
  { id: "H11", color: "#d9f99d", name: "H11" }, // Lime-Green
  { id: "H12", color: "#cbd5e1", name: "H12" }, // Slate
];

export function PatentDetailPanel({ patent, onClose, highlightScheme, highlightText }: PatentDetailPanelProps) {
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("q") || "";

  const [details, setDetails] = useState<{ abstract: string | null; claims: string | null; description: string | null; images?: {url: string; caption: string}[]; assignee?: string; inventors?: string[] } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<"abstract" | "claims" | "description" | "images" | "intelligence">("abstract");
  
  const [highlights] = useState(DEFAULT_HIGHLIGHTS);
  const [highlightedTerms, setHighlightedTerms] = useState<{ word: string; color: string; active: boolean; id: string }[]>([]);

  const [aiIntelligence, setAiIntelligence] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const patentNumber = patent?.patent_number || patent?.patentNumber || "";

  useEffect(() => {
    if (!patentNumber) return;
    
    setLoadingDetails(true);
    setDetails(null);
    setActiveTab("abstract");

    getPatentDetailsFromBigQuery(patentNumber)
      .then((bqRes) => {
        if (bqRes) {
          setDetails({
            abstract: bqRes.abstract || null,
            claims: bqRes.claims || null,
            description: bqRes.description || null,
            assignee: bqRes.assignees && bqRes.assignees.length > 0 ? bqRes.assignees.join(", ") : null,
            inventors: bqRes.inventors && bqRes.inventors.length > 0 ? bqRes.inventors : null,
          } as any);
        } else {
          return getGooglePatentDetails(patentNumber).then((res) => {
            if (res) setDetails(res as any);
          });
        }
      })
      .catch((err) => {
        console.error("Error loading patent details from BigQuery, falling back to HTML:", err);
        return getGooglePatentDetails(patentNumber).then((res) => {
          if (res) setDetails(res as any);
        });
      })
      .finally(() => {
        setLoadingDetails(false);
      });
      
    // Reset AI state when patent changes
    setAiIntelligence(null);
    setAiError(null);
  }, [patentNumber]);

  const handleAnalyzeWithAI = async () => {
    if (!patentNumber) return;
    setLoadingAi(true);
    setAiError(null);
    try {
      const response = await fetch("/api/intelligence/patent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patent_number: patentNumber })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to analyze patent.");
      }
      setAiIntelligence(data.data);
    } catch (err: any) {
      setAiError(err.message || "An unexpected error occurred.");
    } finally {
      setLoadingAi(false);
    }
  };

  // Dynamically map words from query to highlighters when query or patent opens
  useEffect(() => {
    if (!rawQuery) {
      setHighlightedTerms([]);
      return;
    }

    const stopWords = new Set([
      "and", "or", "not", "the", "a", "an", "of", "to", "in", "for", "on", 
      "with", "by", "this", "that", "these", "those", "is", "are", "it", 
      "be", "as", "at", "from", "into", "using"
    ]);

    const cleanTerms = rawQuery
      .toLowerCase()
      .replace(/[()""']/g, " ")
      .split(/[\s,;.]+/)
      .filter(t => t.length >= 3 && !stopWords.has(t));

    const uniqueTerms = Array.from(new Set(cleanTerms)).slice(0, 12);

    const mapped = uniqueTerms.map((word, index) => ({
      word,
      id: `H${index + 1}`,
      color: DEFAULT_HIGHLIGHTS[index]?.color || "#cbd5e1",
      active: true
    }));

    setHighlightedTerms(mapped);
  }, [rawQuery, patentNumber]);

  if (!patent) return null;

  // Apply Highlight rules dynamically on text or HTML blocks
  const applyHighlights = (content: string) => {
    if (!content) return "";
    let highlighted = content;

    // Apply scheme-based highlights from Highlight Library
    if (highlightText) {
      highlighted = highlightText(highlighted);
    }

    // Apply query-based term highlights
    highlightedTerms.forEach(term => {
      if (!term.active) return;
      const escapedWord = term.word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b(${escapedWord})\\b(?![^<>]*>)`, 'gi');
      highlighted = highlighted.replace(regex, `<mark class="px-0.5 rounded font-semibold" style="background-color: ${term.color}; color: #0f172a;">$1</mark>`);
    });

    // Convert [[HIGHLIGHT:color]]text[[/HIGHLIGHT]] to styled HTML
    highlighted = highlighted.replace(/\[\[HIGHLIGHT:(#[a-fA-F0-9]+)\]\]/g, (_, color) => {
      return `<mark class="px-0.5 rounded font-semibold" style="background-color: ${color}; color: #0f172a;">`;
    });
    highlighted = highlighted.replace(/\[\/HIGHLIGHT\]/g, '</mark>');

    return highlighted;
  };

  // Safe fallbacks for data
  const title = patent.title || "No Title Available";
  const abstract = details?.abstract || patent.abstract || "No abstract available.";
  const assignees = details?.assignee || patent.assignee || "Unknown";
  const inventors = details?.inventors?.join(", ") || patent.inventors?.join(", ") || "Unknown";
  const filingDate = patent.date || patent.filing_date || "Unknown";
  const pubDate = patent.publication_date || "Unknown";
  const ipcCodes = patent.ipc_codes || patent.ipcCodes || [];

  return (
    <div className="flex flex-col bg-background text-foreground">
      {/* Top Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 md:px-6 py-4 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to results
            </button>
          </div>
        </div>

        {!highlightScheme && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            No highlight scheme selected.{" "}
            <a href="/dashboard/highlights" className="font-semibold text-primary hover:underline">
              Apply one from your Highlight Library?
            </a>
          </div>
        )}
        {highlightScheme && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">Active scheme:</span>
            <span className="font-bold text-foreground">{highlightScheme.name}</span>
            <span className="text-[10px] text-muted-foreground">
              ({highlightScheme.groups?.length || 0} groups)
            </span>
          </div>
        )}
        
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground leading-tight">
          {title}
        </h1>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border mt-2 overflow-x-auto">
          {(["abstract", "claims", "description", "images", "intelligence"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-2.5 px-4 text-sm font-bold border-b-2 capitalize transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "abstract" ? "Abstract" : tab === "claims" ? "Claims" : tab === "images" ? "Images & Figures" : tab === "intelligence" ? "AI Intelligence" : "Description"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
          
          {/* Left Column - Content */}
          <div className="lg:col-span-8 space-y-10 pb-20">
            
            {loadingDetails ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-semibold text-muted-foreground">Retrieving full patent text from Google Patents...</p>
              </div>
            ) : (
              <div>
                {/* Abstract Tab Content */}
                {activeTab === "abstract" && (
                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-foreground">Abstract</h2>
                    <p 
                      className="text-[15px] leading-relaxed text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: applyHighlights(abstract) }}
                    />

                    {ipcCodes.length > 0 && (
                      <>
                        <div className="border-t border-border my-6"></div>
                        <section>
                          <h2 className="text-lg font-bold text-foreground mb-3">Classifications</h2>
                          <div className="flex flex-wrap gap-2">
                            {ipcCodes.map((code: string) => (
                              <span key={code} className="bg-primary/10 text-primary border border-primary/20 text-xs px-2.5 py-1 rounded-md font-semibold">
                                {code}
                              </span>
                            ))}
                          </div>
                        </section>
                      </>
                    )}
                  </section>
                )}

                {/* Claims Tab Content */}
                {activeTab === "claims" && (
                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-foreground">Claims</h2>
                    {details?.claims ? (
                      <div 
                        className="text-[15px] leading-relaxed text-muted-foreground patent-claims-container space-y-4"
                        dangerouslySetInnerHTML={{ __html: applyHighlights(details.claims) }}
                      />
                    ) : (
                      <div>
                        <p className="text-sm text-muted-foreground italic mb-4">Full claims text is not available in this view.</p>
                        <a 
                          href={`https://patents.google.com/patent/${patentNumber}/en`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-primary hover:underline"
                        >
                          View full patent on Google Patents &rarr;
                        </a>
                      </div>
                    )}
                  </section>
                )}

                {/* Description Tab Content */}
                {activeTab === "description" && (
                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-foreground">Description</h2>
                    {details?.description ? (
                      <div 
                        className="text-[15px] leading-relaxed text-muted-foreground patent-desc-container space-y-4"
                        dangerouslySetInnerHTML={{ __html: applyHighlights(details.description) }}
                      />
                    ) : (
                      <div>
                        <p className="text-sm text-muted-foreground italic mb-4">Full description is not available in this view.</p>
                        <a 
                          href={`https://patents.google.com/patent/${patentNumber}/en`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-primary hover:underline"
                        >
                          View full patent on Google Patents &rarr;
                        </a>
                      </div>
                    )}
                  </section>
                )}

                {/* Images Tab Content */}
                {activeTab === "images" && (
                  <section className="space-y-6">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">Images & Figures</h2>
                    {details?.images && details.images.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {details.images.map((img, i) => (
                          <div key={i} className="border border-border/60 rounded-lg p-2 bg-card shadow-sm hover:shadow-md transition-shadow">
                            <div className="bg-white rounded-md overflow-hidden flex items-center justify-center p-4">
                              <img src={img.url} alt={img.caption || `Figure ${i + 1}`} className="max-h-64 object-contain mix-blend-multiply" />
                            </div>
                            {img.caption && <p className="text-xs text-center text-muted-foreground mt-3 font-semibold px-2 pb-1">{img.caption}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center">
                        <p className="text-sm text-muted-foreground italic mb-4">No images or figures found for this patent.</p>
                        <a 
                          href={`https://patents.google.com/patent/${patentNumber}/en`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-primary hover:underline"
                        >
                          View original on Google Patents &rarr;
                        </a>
                      </div>
                    )}
                  </section>
                )}

                {/* AI Intelligence Tab Content */}
                {activeTab === "intelligence" as any && (
                  <section className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                          <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md text-xs">AI</span> 
                          External Intelligence Layer
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">Generated by Perplexity Enterprise Pro. This AI analysis is for research purposes and does not constitute a legal opinion.</p>
                      </div>
                      {!aiIntelligence && !loadingAi && (
                        <button 
                          onClick={handleAnalyzeWithAI}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-md shadow-sm transition-colors"
                        >
                          Analyze with AI
                        </button>
                      )}
                    </div>

                    {loadingAi && (
                      <div className="flex flex-col items-center justify-center py-10 gap-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        <p className="text-sm font-semibold text-muted-foreground">Gathering external intelligence and market trends...</p>
                      </div>
                    )}

                    {aiError && (
                      <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-md text-sm font-semibold">
                        {aiError}
                      </div>
                    )}

                    {aiIntelligence && (
                      <div className="space-y-6 border rounded-lg p-6 bg-slate-50 dark:bg-slate-900/20 shadow-inner">
                        <div>
                          <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2">Technology Summary</h3>
                          <p className="text-[15px] leading-relaxed">{aiIntelligence.technology_summary}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2">Technology Trends</h3>
                            <ul className="list-disc pl-5 space-y-1 text-[14px]">
                              {aiIntelligence.technology_trends?.map((t: string, i: number) => <li key={i}>{t}</li>)}
                            </ul>
                          </div>
                          <div>
                            <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2">Relevant Companies</h3>
                            <ul className="list-disc pl-5 space-y-1 text-[14px]">
                              {aiIntelligence.relevant_companies?.map((c: string, i: number) => <li key={i}>{c}</li>)}
                            </ul>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2">Detailed Analysis</h3>
                          <p className="text-[14px] leading-relaxed">{aiIntelligence.analysis}</p>
                        </div>

                        {(aiIntelligence.external_prior_art?.length > 0 || aiIntelligence.research_sources?.length > 0) && (
                          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {aiIntelligence.external_prior_art?.length > 0 && (
                              <div>
                                <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2">Potential Prior Art</h3>
                                <ul className="list-disc pl-5 space-y-1 text-[13px] text-muted-foreground">
                                  {aiIntelligence.external_prior_art.map((p: string, i: number) => <li key={i}>{p}</li>)}
                                </ul>
                              </div>
                            )}
                            {aiIntelligence.research_sources?.length > 0 && (
                              <div>
                                <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2">Research Sources</h3>
                                <ul className="list-disc pl-5 space-y-1 text-[13px] text-muted-foreground">
                                  {aiIntelligence.research_sources.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-4 border-t pt-4 mt-2">
                          <span className="text-xs font-bold text-muted-foreground uppercase">Confidence Level:</span>
                          <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                            aiIntelligence.confidence === 'High' ? 'bg-green-100 text-green-700' :
                            aiIntelligence.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {aiIntelligence.confidence || 'Medium'}
                          </span>
                        </div>
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Metadata / Action Box */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* The Blue Box */}
            <div className="bg-blue-600 rounded-lg overflow-hidden text-white shadow-md">
              <div className="p-4 md:p-5">
                <h2 className="text-xl md:text-2xl font-normal tracking-wide break-all">{patentNumber}</h2>
                <p className="text-sm text-blue-200 mt-1">
                  {patentNumber.startsWith("US") ? "United States" : "International"}
                </p>
              </div>
              
              <div className="bg-blue-700/80 px-3 md:px-4 py-3 flex items-center justify-between text-xs font-semibold">
                <a 
                  href={`https://patents.google.com/patent/${patentNumber}/en`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-blue-200 transition-colors"
                >
                  <FileText className="h-4 w-4" /> View Original
                </a>
                <a 
                  href={`https://patents.google.com/patent/${patentNumber}/en?oq=${patentNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-blue-200 transition-colors"
                >
                  <Search className="h-4 w-4" /> Prior Art
                </a>
                <button 
                  onClick={() => {
                    setActiveTab("intelligence" as any);
                    if (!aiIntelligence && !loadingAi) handleAnalyzeWithAI();
                  }}
                  className="flex items-center gap-1.5 hover:text-blue-200 transition-colors"
                >
                  <Combine className="h-4 w-4" /> Analyze with AI
                </button>
              </div>
            </div>

            {/* Details Text List */}
            <div className="space-y-3 text-sm">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-foreground shrink-0">Inventor:</span>
                <span className="text-primary font-semibold break-words">{inventors}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-foreground shrink-0">Current Assignee:</span>
                <span className="text-muted-foreground font-semibold break-words">{assignees}</span>
              </div>
            </div>

            <div className="border-t border-border my-4"></div>

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-4">
                Timeline
              </h3>

              <div className="relative border-l-2 border-border ml-2 space-y-4 pb-2 text-[13px] font-semibold text-muted-foreground">
                {filingDate && filingDate !== "Unknown" && (
                  <div className="relative pl-5">
                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 bg-muted-foreground/50 rounded-full"></div>
                    <span className="text-foreground">{filingDate}</span> &middot; Application Filed
                  </div>
                )}
                {pubDate && pubDate !== "Unknown" && (
                  <div className="relative pl-5">
                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-primary">{pubDate}</span> &middot; Publication of {patentNumber}
                  </div>
                )}
                <div className="relative pl-5 pt-1">
                  <span className="text-foreground font-bold">Status</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full ml-1"></div>
                    <span className="text-muted-foreground font-normal">{patent.status || "Published"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border my-4"></div>

            {/* Info & Citations */}
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">Info & References</h3>
              <div className="space-y-2 text-[13px] text-muted-foreground">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Patent citations</span>
                  <span className="bg-muted text-foreground px-2 py-0.5 rounded-full text-[10px] font-bold">{patent.citations || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Non-patent citations</span>
                  <span className="bg-muted text-foreground px-2 py-0.5 rounded-full text-[10px] font-bold">0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Cited by</span>
                  <span className="bg-muted text-foreground px-2 py-0.5 rounded-full text-[10px] font-bold">0</span>
                </div>
                <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-bold">
                  <a href={`https://patents.google.com/patent/${patentNumber}/en#citedBy`} target="_blank" className="text-primary hover:underline">Legal events</a>
                  <span className="text-border">&middot;</span>
                  <a href={`https://patents.google.com/patent/${patentNumber}/en#similarDocuments`} target="_blank" className="text-primary hover:underline">Similar documents</a>
                </div>
              </div>
            </div>

            <div className="border-t border-border my-4"></div>

            {/* External Links */}
            <div>
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">External Links</h3>
              <div className="flex flex-wrap gap-2">
                <a href={`https://patents.google.com/patent/${patentNumber}/en`} target="_blank" className="bg-primary/10 text-primary border border-primary/20 text-[10px] px-2 py-1 rounded font-bold hover:bg-primary/20 transition-colors">Google Patents</a>
                <a href={`https://worldwide.espacenet.com/patent/search?q=${patentNumber}`} target="_blank" className="bg-muted text-muted-foreground border border-border text-[10px] px-2 py-1 rounded font-bold hover:bg-muted/80 transition-colors">Espacenet</a>
                <a href={`https://patentscope.wipo.int/search/en/result.jsf?query=${patentNumber}`} target="_blank" className="bg-muted text-muted-foreground border border-border text-[10px] px-2 py-1 rounded font-bold hover:bg-muted/80 transition-colors">Global Dossier</a>
              </div>
            </div>

            {/* Highlights Card */}
            <div className="border-t border-border my-4"></div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground">Highlights</h3>

              {/* Default colors section */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Default colors</span>
                <div className="flex flex-wrap gap-1.5">
                  {highlights.map((h) => {
                    const term = highlightedTerms.find(t => t.id === h.id);
                    const isActive = term?.active ?? false;
                    const hasTerm = !!term;

                    return (
                      <button
                        key={h.id}
                        onClick={() => {
                          if (hasTerm) {
                            setHighlightedTerms(prev => prev.map(t => t.id === h.id ? { ...t, active: !t.active } : t));
                          }
                        }}
                        style={{ backgroundColor: h.color }}
                        className={`w-9 h-7 rounded border text-[10px] font-bold flex items-center justify-center text-slate-800 transition-all ${
                          hasTerm
                            ? isActive 
                              ? "border-foreground/30 shadow-sm scale-100 opacity-100 hover:scale-105" 
                              : "border-border scale-95 opacity-30 hover:opacity-50"
                            : "border-border opacity-20 cursor-not-allowed"
                        }`}
                        title={term ? `Toggle highlight for "${term.word}"` : "No keyword assigned"}
                      >
                        {h.name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed">
                  Click a square to edit the color. Move a square to a different position to change the default order.
                </p>
                <div className="flex gap-2 pt-1">
                  <button 
                    onClick={() => {}}
                    className="px-2.5 py-1 text-[11px] font-bold border border-border rounded-sm text-muted-foreground bg-muted/50 hover:bg-muted flex items-center gap-1"
                  >
                    ✓ Save changes
                  </button>
                  <button 
                    onClick={() => {
                      setHighlightedTerms(prev => prev.map(t => ({ ...t, active: true })));
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold border border-destructive/30 rounded-sm text-destructive bg-destructive/5 hover:bg-destructive/10 flex items-center gap-1"
                  >
                    Reset colors
                  </button>
                </div>
              </div>

              {/* Highlights library section */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Highlights library</span>
                {highlightedTerms.length > 0 ? (
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                    {highlightedTerms.map((term) => (
                      <div key={term.id} className="flex items-center justify-between text-xs p-1.5 rounded-sm bg-muted/50 border border-border">
                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-foreground">
                          <input
                            type="checkbox"
                            checked={term.active}
                            onChange={() => {
                              setHighlightedTerms(prev => prev.map(t => t.id === term.id ? { ...t, active: !t.active } : t));
                            }}
                            className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <span>{term.word}</span>
                        </label>
                        <span 
                          style={{ backgroundColor: term.color }}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-800 border border-foreground/10"
                        >
                          {term.id}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">No highlights to display</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
  );
}
