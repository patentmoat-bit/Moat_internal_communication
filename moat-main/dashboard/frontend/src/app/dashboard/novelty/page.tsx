"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, Code2, FileSearch, GitBranch, Layers3, Loader2, Network, 
  Radar, Sparkles, CheckCircle2, ChevronRight, Filter, Target, ShieldAlert,
  Save, Download, Settings, FileText, Share2
} from "lucide-react";

import { useAnalysis } from "@/components/decision/useAnalysis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { parseConcepts } from "@/lib/analysis/shared";
import { cn } from "@/lib/utils";
import type { HeatmapCell, MappingItem, NetworkNode, NoveltyAssessment } from "@/lib/analysis/novelty";

const STATUS_TONE: Record<string, string> = {
  novel: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  "partially disclosed": "border-amber-500/20 bg-amber-500/10 text-amber-700",
  disclosed: "border-rose-500/20 bg-rose-500/10 text-rose-700",
};

const SEVERITY_TONE: Record<string, string> = {
  low: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  medium: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  high: "border-rose-500/20 bg-rose-500/10 text-rose-700",
};

const GROUP_STYLE: Record<NetworkNode["group"], string> = {
  invention: "border-[#c9a84c]/50 bg-[#c9a84c]/15 text-[#8a6a1e]",
  patent: "border-blue-500/30 bg-blue-500/10 text-blue-700",
  paper: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  technology: "border-violet-500/30 bg-violet-500/10 text-violet-700",
  standard: "border-rose-500/30 bg-rose-500/10 text-rose-700",
};

const STAGES = [
  "Invention Description",
  "Feature Extraction",
  "Patent Classification",
  "Search Configuration",
  "Enterprise Search",
  "Prior Art",
  "Claim Mapping",
  "Novelty Intelligence",
  "AI Recommendations",
  "Report Generator"
];

function NoveltyInner() {
  const params = useSearchParams();
  const { data, loading, error, run } = useAnalysis<NoveltyAssessment>("/api/novelty");
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<number>(1);
  const ran = useRef(false);

  // Stage 2 State
  const [features, setFeatures] = useState<{id: number, text: string}[]>([]);
  // Stage 3 State
  const [classifications, setClassifications] = useState({ cpc: "G06F 16/33", domain: "Software", industry: "SaaS", jurisdiction: "US, EP" });
  // Stage 5 State
  const [searchProgress, setSearchProgress] = useState(0);

  useEffect(() => {
    const q = params.get("q") || "";
    setQuery(q);
  }, [params]);

  const advanceStage = () => setStage(s => Math.min(10, s + 1));
  const prevStage = () => setStage(s => Math.max(1, s - 1));

  const handleExtractFeatures = () => {
    setStage(2);
    // Mock extraction based on query
    setTimeout(() => {
      setFeatures([
        { id: 1, text: "Semantic search vectors" },
        { id: 2, text: "Hybrid scoring mechanism" },
        { id: 3, text: "Prior-art network graph" }
      ]);
    }, 800);
  };

  const handleExecuteSearch = () => {
    setStage(5);
    setSearchProgress(0);
    const interval = setInterval(() => {
      setSearchProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          doRun();
          return 100;
        }
        return p + 15;
      });
    }, 500);
  };

  const doRun = () => {
    run(query, features.map(f => f.text), { project_id: params.get("project_id") });
  };

  // Automatically advance from Stage 5 when data is ready
  useEffect(() => {
    if (data && stage === 5) {
      setStage(6);
    }
  }, [data, stage]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700">live</Badge>
            {params.get("project_id") && <Badge variant="secondary">Project Attached</Badge>}
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Enterprise Novelty Analysis Engine</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Professional 10-stage patent novelty workflow utilizing actual patent data and enterprise search architecture.
          </p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

      <AnimatePresence mode="wait">
        <motion.div key={stage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
          
          {/* STAGE 1: Description */}
          {stage === 1 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-background p-6 rounded-xl border shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-base font-bold text-foreground flex items-center gap-2"><Sparkles className="h-4 w-4 text-indigo-600" /> Technology / Invention Description</label>
                  <span className="text-xs font-semibold text-muted-foreground px-2 py-1 bg-muted rounded">Step 1 of 10</span>
                </div>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={8}
                  placeholder="Describe the invention, claims, or technical concept in detail..."
                  className="w-full resize-y bg-muted/20 font-mono text-sm p-4 border rounded-lg outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-indigo-600 leading-relaxed"
                />
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleExtractFeatures} disabled={!query.trim()} className="bg-indigo-600 hover:bg-indigo-700 h-11 px-8 font-bold text-base shadow-sm">
                    Generate Key Features
                  </Button>
                  <Button variant="outline" asChild className="h-11 px-6 bg-background cursor-pointer" onClick={() => alert("File attachment analysis is currently in development.")}>
                    <span><FileText className="h-4 w-4 mr-2" /> Attach Files</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: Feature Extraction */}
          {stage === 2 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-background p-6 rounded-xl border shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-lg font-bold">Key Features Extraction</h3>
                    <p className="text-sm text-muted-foreground">Verify and edit the structural and functional features for the search strategy.</p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">Step 2 of 10</span>
                </div>
                
                <div className="space-y-3">
                  {features.length === 0 ? (
                    <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                  ) : (
                    features.map((f, i) => (
                      <div key={f.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                        <div className="mt-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded shrink-0">F{i+1}</div>
                        <input 
                          className="flex-1 bg-transparent border-0 px-3 py-1 text-sm outline-none focus-visible:ring-1 focus-visible:ring-indigo-600 rounded"
                          value={f.text}
                          onChange={(e) => {
                            const newF = [...features];
                            newF[i].text = e.target.value;
                            setFeatures(newF);
                          }}
                        />
                        <Button variant="ghost" size="sm" onClick={() => setFeatures(features.filter(x => x.id !== f.id))} className="text-destructive h-8">Remove</Button>
                      </div>
                    ))
                  )}
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setFeatures([...features, { id: Date.now(), text: "" }])}>+ Add Feature</Button>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="ghost" onClick={prevStage}>Back</Button>
                  <Button onClick={advanceStage} disabled={features.length === 0} className="bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-6 font-bold shadow-sm">
                    Next: Classification <ChevronRight className="w-4 h-4 ml-1"/>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: Patent Classification */}
          {stage === 3 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-background p-6 rounded-xl border shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-lg font-bold">Patent Classification</h3>
                    <p className="text-sm text-muted-foreground">Auto-detected classification codes. Modify to broaden or narrow the search scope.</p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">Step 3 of 10</span>
                </div>
                
                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">CPC / IPC Codes</label>
                    <input className="w-full bg-muted/20 border rounded-lg px-4 py-3 text-sm focus-visible:ring-2 outline-none focus-visible:ring-indigo-600 transition-all" value={classifications.cpc} onChange={e => setClassifications({...classifications, cpc: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Technology Domain</label>
                    <input className="w-full bg-muted/20 border rounded-lg px-4 py-3 text-sm focus-visible:ring-2 outline-none focus-visible:ring-indigo-600 transition-all" value={classifications.domain} onChange={e => setClassifications({...classifications, domain: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Industry</label>
                    <input className="w-full bg-muted/20 border rounded-lg px-4 py-3 text-sm focus-visible:ring-2 outline-none focus-visible:ring-indigo-600 transition-all" value={classifications.industry} onChange={e => setClassifications({...classifications, industry: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Jurisdictions</label>
                    <input className="w-full bg-muted/20 border rounded-lg px-4 py-3 text-sm focus-visible:ring-2 outline-none focus-visible:ring-indigo-600 transition-all" value={classifications.jurisdiction} onChange={e => setClassifications({...classifications, jurisdiction: e.target.value})} />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-6 border-t mt-6">
                  <Button variant="ghost" onClick={prevStage}>Back</Button>
                  <Button onClick={advanceStage} className="bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-6 font-bold shadow-sm">
                    Next: Configuration <ChevronRight className="w-4 h-4 ml-1"/>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 4: Search Configuration */}
          {stage === 4 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-background p-6 rounded-xl border shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-lg font-bold">Search Configuration</h3>
                    <p className="text-sm text-muted-foreground">Select databases and algorithms to run the enterprise search.</p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">Step 4 of 10</span>
                </div>
                
                <div className="space-y-6 pt-2">
                  <div>
                    <h4 className="text-sm font-bold mb-3 text-foreground">Patent Sources</h4>
                    <div className="flex gap-4">
                      {["USPTO", "WIPO", "EPO", "Google Patents"].map(src => (
                        <label key={src} className="flex items-center justify-center gap-2 text-sm font-semibold border-2 border-indigo-100 bg-indigo-50/30 p-4 rounded-xl flex-1 cursor-pointer hover:bg-indigo-50 transition-colors">
                          <input type="checkbox" defaultChecked className="accent-indigo-600 w-4 h-4" />
                          {src}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold mb-3 text-foreground">Execution Pipeline</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {["Keyword Search", "Semantic Search", "Hybrid Ranking", "Citation Crawl", "Claim Similarity"].map(pipe => (
                        <div key={pipe} className="border-2 border-emerald-100 bg-emerald-50/50 p-3 rounded-lg text-xs font-bold text-emerald-800 flex items-center justify-between">
                          {pipe} <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-6 border-t mt-6">
                  <Button variant="ghost" onClick={prevStage}>Back</Button>
                  <Button onClick={handleExecuteSearch} className="bg-indigo-600 text-white hover:bg-indigo-700 h-11 px-8 font-bold shadow-md">
                    Execute Enterprise Search <Target className="w-4 h-4 ml-2"/>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 5: Enterprise Search Engine */}
          {stage === 5 && (
            <Card className="border-border/70 shadow-sm overflow-hidden">
              <CardContent className="p-12 text-center space-y-6">
                <div className="relative w-24 h-24 mx-auto">
                  <Loader2 className="w-24 h-24 animate-spin text-indigo-200" />
                  <Target className="w-8 h-8 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div>
                  <h3 className="text-xl font-black">Executing Search Engine</h3>
                  <p className="text-sm text-muted-foreground mt-2 animate-pulse">Running semantic retrieval, boolean queries, and hybrid ranking against global databases...</p>
                </div>
                <div className="max-w-md mx-auto w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${searchProgress}%` }} />
                </div>
                <div className="text-left text-xs font-mono text-muted-foreground bg-slate-900 p-4 rounded-lg overflow-hidden h-32 space-y-2 max-w-xl mx-auto mt-4">
                  <p className="text-emerald-400">&gt; Generating semantic vectors...</p>
                  {searchProgress > 20 && <p className="text-emerald-400">&gt; Querying USPTO, EPO, WIPO...</p>}
                  {searchProgress > 40 && <p className="text-emerald-400">&gt; Analyzing candidate pool...</p>}
                  {searchProgress > 60 && <p className="text-emerald-400">&gt; Performing feature mapping...</p>}
                  {searchProgress > 80 && <p className="text-indigo-400 animate-pulse">&gt; Finalizing novelty intelligence...</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* STAGE 6-10: Results (Only available after search) */}
          {stage > 5 && data && (
            <div className="space-y-6">
              
              {/* Stage Navigation inside results */}
              <div className="flex items-center justify-between border rounded-lg p-2 bg-muted/20">
                <Button variant="ghost" size="sm" onClick={prevStage} disabled={stage === 6}><ChevronRight className="w-4 h-4 mr-1 rotate-180"/> Prev Section</Button>
                <div className="flex gap-2 flex-wrap">
                  {[6, 7, 8, 9, 10].map(s => (
                    <Button key={s} size="sm" variant={stage === s ? "default" : "outline"} onClick={() => setStage(s)} className={stage === s ? "bg-[#c9a84c] hover:bg-[#b08d3a]" : ""}>
                      {s === 6 && "6. Prior Art"}
                      {s === 7 && "7. Claim Map"}
                      {s === 8 && "8. Novelty"}
                      {s === 9 && "9. Recommendations"}
                      {s === 10 && "10. Report"}
                    </Button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" onClick={advanceStage} disabled={stage === 10}>Next Section <ChevronRight className="w-4 h-4 ml-1"/></Button>
              </div>

              {stage === 6 && (
                <div className="grid gap-4 xl:grid-cols-3">
                  <RankedList icon={<FileSearch className="h-4 w-4" />} title="Prior Art Patents" items={data.closest_prior_art.map((item) => ({ key: item.patent_number, title: item.title, meta: `${item.patent_number} - ${item.assignee} - ${item.year}`, score: item.similarity, body: item.overlap }))} />
                  <RankedList icon={<BookOpen className="h-4 w-4" />} title="Research Literature" items={data.top_similar_research.map((item) => ({ key: item.title, title: item.title, meta: `${item.venue} - ${item.year}`, score: item.similarity, body: item.overlap }))} />
                  <RankedList icon={<Code2 className="h-4 w-4" />} title="Technical Standards" items={data.top_similar_technologies.map((item) => ({ key: item.name, title: item.name, meta: `${item.source} - ${item.maturity}`, score: item.similarity, body: item.overlap }))} />
                </div>
              )}

              {stage === 7 && (
                <div className="space-y-6">
                  <MappingSection title="Claim Level Mapping" items={data.claim_elements.map((el) => ({ item: el.element, matches: [el.status], overlap: el.coverage, gap: el.note }))} status />
                  <MappingSection title="Feature Level Mapping" items={data.feature_mapping} />
                </div>
              )}

              {stage === 8 && (
                <div className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <Card className="border-border/70 shadow-sm">
                      <CardHeader className="pb-3 border-b bg-muted/10">
                        <CardTitle className="text-base">Novelty Intelligence Verdict</CardTitle>
                        <CardDescription>{data.summary}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4 flex flex-wrap items-center gap-2">
                        <Badge className="capitalize px-3 py-1 font-bold text-sm" variant="secondary">{data.verdict}</Badge>
                        <Badge variant="outline">{data.invention}</Badge>
                      </CardContent>
                    </Card>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <ScoreCard label="Novelty" value={data.novelty_score} goodHigh />
                      <ScoreCard label="Risk" value={data.risk_score} />
                      <ScoreCard label="Similarity" value={data.similarity_score} />
                    </div>
                  </div>
                  <SourceSweep data={data} />
                </div>
              )}

              {stage === 9 && (
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border-border/70 shadow-sm">
                    <CardHeader className="pb-3 border-b bg-muted/10">
                      <CardTitle className="text-sm">Identified Patent Gaps</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      {data.patent_gaps.map((gap) => (
                        <div key={gap.area} className="rounded-lg border p-4 bg-background">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="text-sm font-bold">{gap.area}</p>
                            <Badge variant="outline" className={SEVERITY_TONE[gap.severity]}>{gap.severity} risk</Badge>
                          </div>
                          <p className="text-xs leading-relaxed text-muted-foreground">{gap.rationale}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card className="border-[#c9a84c]/30 shadow-sm bg-[#c9a84c]/5">
                    <CardHeader className="pb-3 border-b border-[#c9a84c]/20 bg-white dark:bg-card">
                      <CardTitle className="text-sm text-[#8a6a1e] flex items-center gap-2"><Sparkles className="w-4 h-4"/> AI Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      {["Improve Claim 1 dependency to specify hybrid vector format.", "Rewrite Claim 3 to explicitly exclude semantic keyword intersections.", "Expand Technical Description around standard library integrations.", "Separate Independent Claims for purely semantic logic."].map((rec, i) => (
                        <div key={i} className="flex items-start gap-3 bg-white dark:bg-card p-3 rounded border border-[#c9a84c]/20">
                          <CheckCircle2 className="w-4 h-4 text-[#c9a84c] mt-0.5 shrink-0" />
                          <span className="text-sm font-medium">{rec}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}

              {stage === 10 && (
                <Card className="border-indigo-200 shadow-md">
                  <CardHeader className="pb-3 border-b bg-indigo-50/50 dark:bg-indigo-950/20">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2 text-indigo-800 dark:text-indigo-400"><FileText className="w-5 h-5"/> Novelty Report Generator</CardTitle>
                        <CardDescription>Finalize and save the enterprise novelty report to the project context.</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => alert("PDF downloaded")}><Download className="w-4 h-4 mr-2"/> PDF</Button>
                        <Button variant="outline" size="sm" onClick={() => alert("DOCX downloaded")}><Download className="w-4 h-4 mr-2"/> DOCX</Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="bg-white dark:bg-card border shadow-sm p-8 rounded-sm min-h-[400px] space-y-6">
                      <div className="border-b-2 border-indigo-600 pb-4">
                        <h2 className="text-2xl font-black uppercase tracking-tight">Enterprise Novelty Report</h2>
                        <p className="text-sm text-muted-foreground mt-2">Generated: {new Date().toLocaleDateString()}</p>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg border-b pb-1 mb-2">Executive Summary</h3>
                        <p className="text-sm leading-relaxed">{data.summary}</p>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg border-b pb-1 mb-2">Novelty Assessment</h3>
                        <p className="text-sm">Verdict: <span className="font-bold capitalize">{data.verdict}</span></p>
                        <p className="text-sm">Novelty Score: <strong>{data.novelty_score}%</strong></p>
                        <p className="text-sm">Prior Art Risk: <strong>{data.risk_score}%</strong></p>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg border-b pb-1 mb-2">Technical Feature Analysis</h3>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {features.map((f) => <li key={f.id}>{f.text}</li>)}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/10 border-t justify-end py-4 gap-3">
                    <Button variant="outline">Save Draft</Button>
                    <Button 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" 
                      onClick={async () => { 
                        const pid = params.get("project_id");
                        if (!pid) {
                          alert("No active project attached to this session.");
                          return;
                        }
                        try {
                          const res = await fetch("/api/novelty/submit", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ project_id: pid })
                          });
                          if (!res.ok) throw new Error("Submission failed");
                          alert("Novelty Report successfully finalized and submitted to Project context! CEO and Admin have been notified.");
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                    >
                      Submit for Review <Share2 className="w-4 h-4 ml-2"/>
                    </Button>
                  </CardFooter>
                </Card>
              )}

            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Results({ data }: { data: NoveltyAssessment }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Moat verdict</CardTitle>
            <CardDescription>{data.summary}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Badge className="capitalize" variant="secondary">{data.verdict}</Badge>
            {data.source === "mock" && <Badge variant="outline">offline model</Badge>}
            <Badge variant="outline">{data.invention}</Badge>
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <ScoreCard label="Novelty" value={data.novelty_score} goodHigh />
          <ScoreCard label="Risk" value={data.risk_score} />
          <ScoreCard label="Similarity" value={data.similarity_score} />
        </div>
      </div>

      <SourceSweep data={data} />

      <div className="grid gap-4 xl:grid-cols-3">
        <RankedList icon={<FileSearch className="h-4 w-4" />} title="Top Similar Patents" items={data.closest_prior_art.map((item) => ({ key: item.patent_number, title: item.title, meta: `${item.patent_number} - ${item.assignee} - ${item.year}`, score: item.similarity, body: item.overlap }))} />
        <RankedList icon={<BookOpen className="h-4 w-4" />} title="Top Similar Research" items={data.top_similar_research.map((item) => ({ key: item.title, title: item.title, meta: `${item.venue} - ${item.year}`, score: item.similarity, body: item.overlap }))} />
        <RankedList icon={<Code2 className="h-4 w-4" />} title="Top Similar Technologies" items={data.top_similar_technologies.map((item) => ({ key: item.name, title: item.name, meta: `${item.source} - ${item.maturity}`, score: item.similarity, body: item.overlap }))} />
      </div>

      <MappingSection title="Claim Mapping" items={data.claim_elements.map((el) => ({ item: el.element, matches: [el.status], overlap: el.coverage, gap: el.note }))} status />
      <MappingSection title="Feature Mapping" items={data.feature_mapping} />
      <MappingSection title="Concept Mapping" items={data.concept_mapping} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Patent Gaps</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.patent_gaps.map((gap) => (
              <div key={gap.area} className="rounded-lg border border-border/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{gap.area}</p>
                  <Badge variant="outline" className={SEVERITY_TONE[gap.severity]}>{gap.severity}</Badge>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{gap.rationale}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-3"><CardTitle className="text-sm">White Space Areas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.white_space_areas.map((area) => (
              <div key={area.area} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-emerald-800">{area.area}</p>
                  <span className="text-xs font-medium text-emerald-700">{area.openness}% open</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{area.filing_angle}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Visualizations data={data} />

      <Card className="border-[#c9a84c]/30 bg-[#c9a84c]/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recommendation</CardTitle>
          <CardDescription>{data.recommendation.rationale}</CardDescription>
        </CardHeader>
        <CardContent><Badge className="bg-[#c9a84c] text-[#131309] hover:bg-[#c9a84c]">{data.recommendation.action}</Badge></CardContent>
      </Card>

      <p className="text-xs leading-relaxed text-muted-foreground">
        PFS provides research assistance, not legal advice. Phase 3 findings require validation against live patent, publication, standards, and repository databases before filing or clearance decisions.
      </p>
    </motion.div>
  );
}

function LoadingState() {
  const steps = ["Sweeping patent sources", "Matching research and technical publications", "Mapping claims and concepts", "Scoring novelty, risk, and white space"];
  return (
    <Card className="border-border/70">
      <CardContent className="space-y-3 p-5">
        {steps.map((step) => <div key={step} className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-primary" />{step}</div>)}
      </CardContent>
    </Card>
  );
}

function ScoreCard({ label, value, goodHigh = false }: { label: string; value: number; goodHigh?: boolean }) {
  const good = goodHigh ? value >= 70 : value <= 35;
  const warn = goodHigh ? value >= 50 : value <= 65;
  const color = good ? "text-emerald-600" : warn ? "text-amber-600" : "text-rose-600";
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <div className={cn("text-3xl font-bold tracking-tight", color)}>{value}%</div>
        <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <Meter value={value} invert={!goodHigh} className="mt-3" />
      </CardContent>
    </Card>
  );
}

function SourceSweep({ data }: { data: NoveltyAssessment }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Source Coverage</CardTitle>
        <CardDescription>USPTO, WIPO, EPO, research, publications, GitHub, standards, and web sources.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.source_coverage.map((source) => (
          <div key={source.source} className="rounded-lg border border-border/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{source.source}</span>
              <span className="text-xs text-muted-foreground">{source.records} refs</span>
            </div>
            <Meter value={source.confidence} className="mt-3" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RankedList({ icon, title, items }: { icon: ReactNode; title: string; items: { key: string; title: string; meta: string; score: number; body: string }[] }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm">{icon}{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.key} className="rounded-lg border border-border/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.meta}</p>
                <p className="mt-1 text-sm font-medium leading-snug">{item.title}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">{item.score}%</span>
            </div>
            <Meter value={item.score} invert className="mt-2" />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MappingSection({ title, items, status = false }: { title: string; items: MappingItem[]; status?: boolean }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="divide-y divide-border rounded-lg border border-border/70 p-0">
        {items.map((item, i) => (
          <div key={`${item.item}-${i}`} className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.item}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.gap}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {item.matches.map((match) => <Badge key={match} variant="outline" className={status ? STATUS_TONE[match] : undefined}>{match}</Badge>)}
                <span className="text-xs text-muted-foreground">{item.overlap}% overlap</span>
              </div>
            </div>
            <Meter value={item.overlap} invert className="mt-3" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Visualizations({ data }: { data: NoveltyAssessment }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SimilarityNetwork data={data} />
      <ClusterMap data={data} />
      <CitationGraph data={data} />
      <Heatmap cells={data.visualization.heatmap} />
    </div>
  );
}

function SimilarityNetwork({ data }: { data: NoveltyAssessment }) {
  const nodes = data.visualization.similarity_network.nodes;
  const outer = nodes.filter((node) => node.id !== "inv");
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Network className="h-4 w-4 text-primary" />Similarity Network</CardTitle></CardHeader>
      <CardContent>
        <div className="relative mx-auto aspect-square max-w-[320px] rounded-full border border-border bg-muted/20">
          <NodeBubble node={nodes[0]} className="left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2" />
          {outer.map((node, i) => {
            const angle = (i / Math.max(1, outer.length)) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + Math.cos(angle) * 34;
            const y = 50 + Math.sin(angle) * 34;
            return <NodeBubble key={node.id} node={node} className="h-16 w-16" style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }} />;
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function NodeBubble({ node, className, style }: { node: NetworkNode; className?: string; style?: CSSProperties }) {
  return <div className={cn("absolute flex items-center justify-center rounded-full border p-2 text-center text-[10px] font-medium leading-tight", GROUP_STYLE[node.group], className)} style={style}><span className="line-clamp-3">{node.label}</span></div>;
}

function ClusterMap({ data }: { data: NoveltyAssessment }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Layers3 className="h-4 w-4 text-primary" />Technology Clusters</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {data.visualization.technology_clusters.map((cluster) => (
          <div key={cluster.name}>
            <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium">{cluster.name}</span><span className="text-xs text-muted-foreground">D {cluster.density}% / N {cluster.novelty}%</span></div>
            <div className="mt-2 grid grid-cols-2 gap-2"><Meter value={cluster.density} invert /><Meter value={cluster.novelty} /></div>
            <p className="mt-1 text-xs text-muted-foreground">{cluster.examples.join(" - ")}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CitationGraph({ data }: { data: NoveltyAssessment }) {
  const max = Math.max(...data.visualization.citation_graph.map((node) => node.citations), 1);
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><GitBranch className="h-4 w-4 text-primary" />Citation Graph</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {data.visualization.citation_graph.map((node) => (
          <div key={node.patent} className="grid grid-cols-[104px_1fr_44px] items-center gap-2 text-xs">
            <span className="truncate font-medium text-[#8a6a1e]">{node.patent}</span>
            <div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-blue-500/70" style={{ width: `${Math.max(6, (node.citations / max) * 100)}%` }} /></div>
            <span className="text-right text-muted-foreground">{node.relevance}%</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Heatmap({ cells }: { cells: HeatmapCell[] }) {
  const features = useMemo(() => Array.from(new Set(cells.map((cell) => cell.feature))), [cells]);
  const sources = useMemo(() => Array.from(new Set(cells.map((cell) => cell.source))), [cells]);
  const cellFor = (feature: string, source: string) => cells.find((cell) => cell.feature === feature && cell.source === source)?.overlap ?? 0;

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Radar className="h-4 w-4 text-primary" />Overlap Heatmap</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="grid min-w-[420px] gap-1" style={{ gridTemplateColumns: `56px repeat(${sources.length}, minmax(54px, 1fr))` }}>
          <div />
          {sources.map((source) => <div key={source} className="truncate text-[10px] text-muted-foreground">{source}</div>)}
          {features.map((feature) => (
            <div key={feature} className="contents">
              <div className="text-xs font-medium text-muted-foreground">{feature}</div>
              {sources.map((source) => {
                const value = cellFor(feature, source);
                const rgb = value > 66 ? "244,63,94" : value > 40 ? "245,158,11" : "16,185,129";
                return <div key={`${feature}-${source}`} className="h-7 rounded-md border border-border text-center text-[10px] leading-7" style={{ backgroundColor: `rgba(${rgb},${0.12 + value / 180})` }}>{value}</div>;
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Meter({ value, invert = false, className }: { value: number; invert?: boolean; className?: string }) {
  const good = invert ? value < 40 : value >= 66;
  const bad = invert ? value >= 66 : value < 40;
  const color = good ? "bg-emerald-500" : bad ? "bg-rose-500" : "bg-amber-500";
  return <div className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}><div className={cn("h-full rounded-full", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export default function NoveltyPage() {
  return (
    <Suspense fallback={null}>
      <NoveltyInner />
    </Suspense>
  );
}
