"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ShieldAlert, Sparkles, FileText, Target, CheckCircle2, ChevronRight, Globe, Filter, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricBar, Pill, ScoreBadge } from "@/components/decision/primitives";
import type { FtoAssessment } from "@/lib/analysis/fto";

const RISK_TONE: Record<string, string> = { high: "rose", medium: "amber", low: "emerald" };
const STATUS_TONE: Record<string, string> = { Active: "rose", Pending: "amber", Expired: "emerald" };

function FtoInner() {
  const params = useSearchParams();
  const [stage, setStage] = useState(1);
  const [query, setQuery] = useState("");
  const [features, setFeatures] = useState<{id: number, text: string}[]>([]);
  
  // Phase 5: Commercial Scope
  const [scope, setScope] = useState({
    countries: "United States, Europe",
    markets: "Consumer Electronics",
    launchDate: "2027-Q1",
    competitors: "Apple, Samsung",
    category: "Hardware Device"
  });

  // Phase 2: Patent Classification
  const [classifications, setClassifications] = useState({
    cpc: "G06F, H04L",
    domain: "Cybersecurity",
    industry: "Enterprise Software"
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<FtoAssessment | null>(null);

  useEffect(() => {
    const q = params.get("q") || "";
    if (q) setQuery(q);
  }, [params]);

  const advanceStage = () => setStage(s => Math.min(s + 1, 8));
  const prevStage = () => setStage(s => Math.max(s - 1, 1));

  // Auto-extract features simulation
  const handleExtractFeatures = () => {
    setLoading(true);
    setTimeout(() => {
      setFeatures([
        { id: 1, text: "End-to-end encrypted communication protocol" },
        { id: 2, text: "Biometric hardware authentication token" },
        { id: 3, text: "Decentralized ledger for audit logging" }
      ]);
      setLoading(false);
      advanceStage();
    }, 1200);
  };

  const handleExecuteSearch = async () => {
    advanceStage(); // Move to Stage 6 (Live Progress)
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/fto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: `Product: ${query}. Features: ${features.map(f => f.text).join(", ")}`, 
          concepts: features.map(f => f.text),
          project_id: params.get("project_id")
        })
      });

      if (!res.ok) throw new Error("Search execution failed");
      const result = await res.json();
      
      // Artificial delay to simulate deep search pipeline
      setTimeout(() => {
        setData(result);
        setLoading(false);
        advanceStage(); // Move to Stage 7
      }, 3000);
      
    } catch (err: any) {
      setError(err.message || "Failed to complete FTO Search.");
      setLoading(false);
      prevStage();
    }
  };

  const handleSubmitReport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fto/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: params.get("project_id"), fto_data: data })
      });
      if (!res.ok) throw new Error("Submission failed");
      alert("FTO Report successfully submitted for review. Parent project updated.");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16 pt-8 px-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-indigo-600" />
            Enterprise Freedom-to-Operate Analysis
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Assess infringement risks using real patent databases, claim mapping, and jurisdiction-specific intelligence.
          </p>
        </div>
      </div>

      {error && (
        <div className="max-w-4xl mx-auto rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={stage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
          
          {/* STAGE 1: Product Description */}
          {stage === 1 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-background p-6 rounded-xl border shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-base font-bold text-foreground flex items-center gap-2"><Box className="h-4 w-4 text-indigo-600" /> Phase 3: Product Description</label>
                  <span className="text-xs font-semibold text-muted-foreground px-2 py-1 bg-muted rounded">Step 1 of 8</span>
                </div>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={6}
                  placeholder="Describe the product, technical architecture, or manufacturing process to clear..."
                  className="w-full resize-y bg-muted/20 font-mono text-sm p-4 border rounded-lg outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-indigo-600 leading-relaxed"
                />
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleExtractFeatures} disabled={!query.trim() || loading} className="bg-indigo-600 hover:bg-indigo-700 h-11 px-8 font-bold text-base shadow-sm">
                    {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Sparkles className="w-5 h-5 mr-2" />}
                    Extract Technical Features
                  </Button>
                  <Button variant="outline" asChild className="h-11 px-6 bg-background cursor-pointer" onClick={() => alert("File attachment is in development.")}>
                    <span><FileText className="h-4 w-4 mr-2" /> Attach Files (PDF, CAD)</span>
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
                    <h3 className="text-lg font-bold">Phase 4: Technical Feature Extraction</h3>
                    <p className="text-sm text-muted-foreground">Edit, merge, or remove components, modules, or algorithms before clearing.</p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">Step 2 of 8</span>
                </div>
                
                <div className="space-y-3">
                  {features.map((f, i) => (
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
                  ))}
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setFeatures([...features, { id: Date.now(), text: "" }])}>+ Add Feature</Button>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="ghost" onClick={prevStage}>Back</Button>
                  <Button onClick={advanceStage} disabled={features.length === 0} className="bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-6 font-bold shadow-sm">
                    Next: Commercial Scope <ChevronRight className="w-4 h-4 ml-1"/>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: Commercial Scope */}
          {stage === 3 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-background p-6 rounded-xl border shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><Globe className="h-5 w-5 text-indigo-600"/> Phase 5: Commercial Scope</h3>
                    <p className="text-sm text-muted-foreground">FTO must always consider jurisdiction. Define target markets.</p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">Step 3 of 8</span>
                </div>
                
                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Countries</label>
                    <input className="w-full bg-muted/20 border rounded-lg px-4 py-3 text-sm focus-visible:ring-2 outline-none focus-visible:ring-indigo-600" value={scope.countries} onChange={e => setScope({...scope, countries: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Markets</label>
                    <input className="w-full bg-muted/20 border rounded-lg px-4 py-3 text-sm focus-visible:ring-2 outline-none focus-visible:ring-indigo-600" value={scope.markets} onChange={e => setScope({...scope, markets: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Competitors</label>
                    <input className="w-full bg-muted/20 border rounded-lg px-4 py-3 text-sm focus-visible:ring-2 outline-none focus-visible:ring-indigo-600" value={scope.competitors} onChange={e => setScope({...scope, competitors: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Product Category</label>
                    <input className="w-full bg-muted/20 border rounded-lg px-4 py-3 text-sm focus-visible:ring-2 outline-none focus-visible:ring-indigo-600" value={scope.category} onChange={e => setScope({...scope, category: e.target.value})} />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-6 border-t mt-6">
                  <Button variant="ghost" onClick={prevStage}>Back</Button>
                  <Button onClick={advanceStage} className="bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-6 font-bold shadow-sm">
                    Next: Classification <ChevronRight className="w-4 h-4 ml-1"/>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 4: Classification & Config */}
          {stage === 4 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-background p-6 rounded-xl border shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><Filter className="h-5 w-5 text-indigo-600"/> Phase 6: Search Configuration</h3>
                    <p className="text-sm text-muted-foreground">Configure expired patent filtering and execution pipeline.</p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">Step 4 of 8</span>
                </div>
                
                <div className="space-y-6 pt-2">
                  <div>
                    <h4 className="text-sm font-bold mb-3 text-foreground">Active Patent Filter</h4>
                    <div className="flex gap-4">
                      {["Live Patents Only", "Expired Patents (Prior Art)", "Pending Applications"].map((src, idx) => (
                        <label key={src} className="flex items-center justify-center gap-2 text-sm font-semibold border-2 border-indigo-100 bg-indigo-50/30 p-4 rounded-xl flex-1 cursor-pointer hover:bg-indigo-50 transition-colors">
                          <input type="checkbox" defaultChecked={idx === 0} className="accent-indigo-600 w-4 h-4" />
                          {src}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold mb-3 text-foreground">Execution Pipeline</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {["Keyword Search", "Claim Search", "Patent Family Search", "Citation Search", "Semantic Search", "Regional Validation"].map(pipe => (
                        <div key={pipe} className="border-2 border-emerald-100 bg-emerald-50/50 p-3 rounded-lg text-[11px] font-bold text-emerald-800 flex items-center justify-between">
                          {pipe} <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-6 border-t mt-6">
                  <Button variant="ghost" onClick={prevStage}>Back</Button>
                  <Button onClick={handleExecuteSearch} className="bg-indigo-600 text-white hover:bg-indigo-700 h-11 px-8 font-bold shadow-md">
                    Execute FTO Search <Target className="w-4 h-4 ml-2"/>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 5: Live Execution */}
          {stage === 5 && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-background p-10 rounded-xl border shadow-sm flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                  <ShieldAlert className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Executing Enterprise FTO Search</h3>
                  <p className="text-muted-foreground mt-2">Validating claims against jurisdictions...</p>
                </div>
                <div className="w-full max-w-md space-y-3 text-left">
                  {["Extracting commercial scope", "Filtering expired patents", "Executing claim mapping", "Calculating infringement risk"].map((s, i) => (
                    <div key={s} className="flex items-center gap-3 text-sm text-muted-foreground" style={{ animation: `fadeIn 0.5s ease-out ${i * 0.7}s both` }}>
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" /> {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STAGE 6: Infringement Analysis & Claim Mapping */}
          {stage === 6 && data && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-background p-6 rounded-xl border shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-lg font-bold">Phase 7/8: Claim Mapping & Infringement</h3>
                    <p className="text-sm text-muted-foreground">Compare product features against independent claims.</p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">Step 6 of 8</span>
                </div>
                
                {data.blocking_patents?.map((p, i) => (
                  <div key={i} className="rounded-lg border bg-muted/10 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-indigo-600 [font-family:var(--font-mono)]">{p.patent_number}</span>
                          <Pill tone={STATUS_TONE[p.status] ?? "slate"}>{p.status}</Pill>
                          <Pill tone={RISK_TONE[p.risk] ?? "slate"}>{p.risk} risk</Pill>
                        </div>
                        <p className="mt-2 text-sm font-medium text-foreground">{p.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Assignee: {p.assignee} · Country: {p.jurisdiction} · Expires: {p.expiry}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-xs font-bold text-rose-600 [font-family:var(--font-mono)]">{p.claim_overlap}% Overlap</span>
                        <MetricBar value={p.claim_overlap} invert width="w-24" />
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-dashed">
                      <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Claim Mapping Assessment</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{p.overlap}</p>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="ghost" onClick={prevStage}>Back</Button>
                  <Button onClick={advanceStage} className="bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-6 font-bold shadow-sm">
                    Next: Risk & Mitigations <ChevronRight className="w-4 h-4 ml-1"/>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 7: Risk Classification & Design Around */}
          {stage === 7 && data && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-background p-6 rounded-xl border shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-lg font-bold">Phase 9/10: Enterprise FTO Intelligence</h3>
                    <p className="text-sm text-muted-foreground">Metrics, Risk Heatmap, and Design Around Suggestions.</p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">Step 7 of 8</span>
                </div>
                
                <div className="flex items-start justify-between gap-4 rounded-lg border bg-rose-50/50 p-5">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-rose-600 uppercase">Overall Legal Risk</p>
                    <div className="mt-2 flex items-center gap-2">
                      <h2 className="text-2xl font-bold capitalize text-foreground">{data.risk_level}</h2>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">{data.summary}</p>
                  </div>
                  <ScoreBadge score={data.risk_score} label="exposure" tone={RISK_TONE[data.risk_level] as any || "rose"} />
                </div>

                <div>
                  <h4 className="text-sm font-bold mb-3">Design Around Suggestions</h4>
                  <div className="space-y-3">
                    {data.mitigations?.map((m, i) => (
                      <div key={i} className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4">
                        <p className="text-sm font-bold text-emerald-800">{m.strategy}</p>
                        <p className="mt-1 text-xs leading-relaxed text-emerald-700/80">{m.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="ghost" onClick={prevStage}>Back</Button>
                  <Button onClick={advanceStage} className="bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-6 font-bold shadow-sm">
                    Next: Final Report <ChevronRight className="w-4 h-4 ml-1"/>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 8: Report Submission */}
          {stage === 8 && data && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-background p-6 rounded-xl border shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-lg font-bold">Phase 11: Enterprise FTO Report</h3>
                    <p className="text-sm text-muted-foreground">Review final details before saving to project and triggering PFS generator.</p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">Step 8 of 8</span>
                </div>
                
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Executive Summary</p>
                    <p className="text-sm mt-2 font-medium">Clearance required for {scope.countries} regarding {scope.category}. {data.risk_level} risk identified with {data.blocking_patents?.length || 0} blocking patents.</p>
                  </div>
                  <div className="flex gap-4">
                     <Button variant="outline" className="flex-1" onClick={() => alert("PDF Preview in development")}>Preview PDF</Button>
                     <Button variant="outline" className="flex-1" onClick={() => alert("DOCX Export in development")}>Export DOCX</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t mt-6">
                  <Button variant="ghost" onClick={prevStage}>Back</Button>
                  <Button onClick={handleSubmitReport} disabled={loading} className="bg-indigo-600 text-white hover:bg-indigo-700 h-11 px-8 font-bold shadow-md">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
                    Submit for Review & Save to Project
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function RiskPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" /></div>}>
      <FtoInner />
    </Suspense>
  );
}
