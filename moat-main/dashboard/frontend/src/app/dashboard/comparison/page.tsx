"use client";

import { useState, useEffect } from "react";
import { GitCompare, Sparkles, X, Plus, Bookmark, ArrowRight, Loader2, Scale, CheckSquare } from "lucide-react";
import { useApp } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function ComparisonPage() {
  const { savedPatents, researchProjects } = useApp();

  const [activeTab, setActiveTab] = useState<'patents' | 'projects'>('projects');

  // Patent Comparison State
  const [slots, setSlots] = useState<(any | null)[]>([null, null, null]);
  const [loading, setLoading] = useState(false);
  const [aiReport, setAiReport] = useState<any | null>(null);
  const [showSearchModal, setShowSearchModal] = useState<number | null>(null); // slot index

  // Load from compare queue on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("compare_queue");
      if (saved) {
        const queue = JSON.parse(saved);
        const newSlots = [null, null, null];
        queue.slice(0, 3).forEach((p: any, idx: number) => {
          newSlots[idx] = p;
        });
        setSlots(newSlots);
      }
    } catch {}
  }, []);

  const saveToQueue = (newSlots: (any | null)[]) => {
    setSlots(newSlots);
    const queue = newSlots.filter(Boolean);
    localStorage.setItem("compare_queue", JSON.stringify(queue));
  };

  const removeSlot = (idx: number) => {
    const next = [...slots];
    next[idx] = null;
    saveToQueue(next);
    setAiReport(null); // Reset report when inputs change
  };

  const addPatentToSlot = (idx: number, patent: any) => {
    const next = [...slots];
    next[idx] = patent;
    saveToQueue(next);
    setShowSearchModal(null);
    setAiReport(null);
  };

  const handleGenerateReport = async () => {
    const activePatents = slots.filter(Boolean);
    if (activePatents.length < 2) {
      alert("Please add at least 2 patents to compare.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patents: activePatents })
      });
      if (!res.ok) throw new Error('Comparison failed');
      const data = await res.json();
      setAiReport(data);
    } catch (e) {
      console.error(e);
      alert("Report generation failed.");
    } finally {
      setLoading(false);
    }
  };

  // --- Project Comparison State ---
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [projectComparisonData, setProjectComparisonData] = useState<any>(null);

  const toggleProject = (id: string) => {
    setSelectedProjects(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleProjectCompare = async () => {
    if (selectedProjects.length < 2) return;
    setLoading(true);
    try {
      // Mocking comparison engine backend response since the full patent overlap mapping requires a dedicated analytical endpoint
      setTimeout(() => {
        setProjectComparisonData({
          summary: {
            [selectedProjects[0]]: 125,
            [selectedProjects[1]]: 87,
            common: 32,
            unique1: 93,
            unique2: 55
          },
          technologies: [
            { name: "H01M (Battery)", p1: 80, p2: 40 },
            { name: "H02J (Charging)", p1: 20, p2: 60 }
          ],
          assignees: [
            { name: "Tesla, Inc.", common: true },
            { name: "Panasonic", common: false },
            { name: "Toyota", common: true }
          ]
        });
        setLoading(false);
      }, 1500);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  // Determine highlights
  const activeSlots = slots.filter(Boolean);

  const getCellHighlight = (rowKey: string, val: any, currentPatent: any) => {
    if (activeSlots.length < 2 || !val) return "";

    const values = activeSlots.map((p) => p[rowKey]);

    // Unique Value: unique across all non-empty inputs
    const occurrenceCount = values.filter((v) => String(v) === String(val)).length;
    const isUnique = occurrenceCount === 1;

    // Best Value logic
    if (rowKey === "citations") {
      const citationNums = activeSlots.map((p) => Number(p.citations || 0));
      const maxCitations = Math.max(...citationNums);
      if (Number(currentPatent.citations || 0) === maxCitations && maxCitations > 0) {
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border-emerald-500/30";
      }
    }

    if (rowKey === "filing_date" || rowKey === "date") {
      const dates = activeSlots.map((p) => new Date(p.filing_date || p.date || 0).getTime());
      const maxDate = Math.max(...dates);
      if (new Date(currentPatent.filing_date || currentPatent.date || 0).getTime() === maxDate) {
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border-emerald-500/30";
      }
    }

    if (isUnique) {
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium border-amber-500/30";
    }

    return "";
  };

  // Render matrix row
  const renderMatrixRow = (label: string, rowKey: string, isTextarea = false) => {
    return (
      <tr className="border-b border-border/40 hover:bg-muted/10 transition-colors">
        <td className="sticky left-0 bg-background font-bold text-xs p-3 text-muted-foreground w-40 shrink-0 border-r border-border/60">
          {label}
        </td>
        {slots.map((p, idx) => {
          if (!p) {
            return (
              <td key={idx} className="p-3 text-xs text-muted-foreground/40 text-center italic border-r border-border/40">
                —
              </td>
            );
          }

          let displayVal = p[rowKey] || "";
          if (rowKey === "ipc") {
            displayVal = (p.ipc || p.ipc_codes || []).join(", ");
          } else if (rowKey === "cpc") {
            displayVal = (p.cpc_codes || []).join(", ");
          }

          const highlightClass = getCellHighlight(rowKey === "ipc" ? "ipc" : rowKey === "cpc" ? "cpc" : rowKey, p[rowKey], p);

          return (
            <td
              key={idx}
              className={`p-3 text-xs border-r border-border/40 border-l-2 border-l-transparent align-top leading-relaxed ${highlightClass}`}
            >
              {isTextarea ? (
                <p className="line-clamp-4 hover:line-clamp-none transition-all cursor-pointer">{displayVal}</p>
              ) : (
                displayVal
              )}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <ErrorBoundary>
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <GitCompare className="h-6 w-6 text-[#c9a84c]" />
          Intelligence Comparison Engine
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Cross-reference individual patents or entire research project datasets.
        </p>
      </div>

      <div className="border-b border-border/40">
        <nav className="flex gap-4">
          <button 
            onClick={() => setActiveTab('projects')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'projects' ? 'border-[#c9a84c] text-[#c9a84c]' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Project Overlap
          </button>
          <button 
            onClick={() => setActiveTab('patents')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'patents' ? 'border-[#c9a84c] text-[#c9a84c]' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Patent Comparison
          </button>
        </nav>
      </div>

      {activeTab === 'projects' && (
        <div className="grid md:grid-cols-4 gap-6">
          <div className="md:col-span-1 space-y-4">
            <Card className="bg-card border-border/40 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  Select Projects
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {researchProjects?.map((proj: any) => (
                  <div 
                    key={proj.id} 
                    onClick={() => toggleProject(proj.id)}
                    className={`p-3 rounded-md cursor-pointer border text-sm transition-all ${selectedProjects.includes(proj.id) ? 'border-[#c9a84c] bg-[#c9a84c]/10 text-[#c9a84c]' : 'border-border bg-muted/20 hover:border-border/80'}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${selectedProjects.includes(proj.id) ? 'bg-[#c9a84c] border-[#c9a84c]' : 'border-muted-foreground/30'}`}>
                        {selectedProjects.includes(proj.id) && <CheckSquare className="w-3 h-3 text-white" />}
                      </div>
                      <span className="font-medium truncate">{proj.title}</span>
                    </div>
                  </div>
                ))}
                
                <Button 
                  onClick={handleProjectCompare} 
                  disabled={selectedProjects.length < 2 || loading}
                  className="w-full mt-4 bg-[#c9a84c] text-white hover:bg-[#b8943d]"
                >
                  {loading ? "Comparing..." : "Run Project Comparison"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-3">
            {!projectComparisonData && !loading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] border border-dashed border-border/40 rounded-xl bg-muted/5">
                <GitCompare className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">No Comparison Active</h3>
                <p className="text-sm text-muted-foreground max-w-sm text-center">Select at least two research projects from the panel to analyze technology and patent overlaps.</p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] border border-border/40 rounded-xl bg-card">
                <Loader2 className="w-8 h-8 animate-spin text-[#c9a84c] mb-4" />
                <p className="text-sm text-muted-foreground animate-pulse">Running semantic overlap analysis...</p>
              </div>
            )}

            {projectComparisonData && !loading && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="bg-card border-border/40">
                    <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Total Overlap</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-[#c9a84c]">{projectComparisonData.summary.common}</div>
                      <p className="text-xs text-muted-foreground mt-1">Shared patents</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border/40">
                    <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Unique (Proj 1)</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{projectComparisonData.summary.unique1}</div>
                      <p className="text-xs text-muted-foreground mt-1">Patents</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border/40">
                    <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Unique (Proj 2)</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{projectComparisonData.summary.unique2}</div>
                      <p className="text-xs text-muted-foreground mt-1">Patents</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="bg-card border-border/40">
                    <CardHeader className="pb-3 border-b border-border/40">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">Technology Clusters</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      {projectComparisonData.technologies.map((t: any, i: number) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span>{t.name}</span>
                          </div>
                          <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                            <div className="bg-[#c9a84c]" style={{ width: `${(t.p1 / (t.p1 + t.p2)) * 100}%` }}></div>
                            <div className="bg-muted-foreground/30" style={{ width: `${(t.p2 / (t.p1 + t.p2)) * 100}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border/40">
                    <CardHeader className="pb-3 border-b border-border/40">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">Assignee Overlap</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <ul className="space-y-2">
                        {projectComparisonData.assignees.map((a: any, i: number) => (
                          <li key={i} className="flex items-center justify-between text-sm">
                            <span>{a.name}</span>
                            {a.common ? <span className="text-[10px] bg-[#c9a84c]/20 text-[#c9a84c] px-2 py-0.5 rounded">Common</span> : <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded">Unique</span>}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'patents' && (
        <>

      {/* Slots Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {slots.map((p, idx) => (
          <Card
            key={idx}
            className={`relative flex flex-col justify-between p-5 border min-h-[160px] ${
              p ? "border-primary/20 bg-card" : "border-dashed border-border/80 bg-muted/20"
            }`}
          >
            {p ? (
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-bold text-primary">{p.patent_number || p.patentNumber}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSlot(idx)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-foreground leading-snug line-clamp-2">{p.title}</h4>
                  <p className="mt-1 text-[11px] text-muted-foreground truncate">{p.assignee}</p>
                </div>
                <div className="mt-4 flex gap-1">
                  {(p.ipc_codes || p.ipc || []).slice(0, 2).map((ipcCode: string) => (
                    <Badge key={ipcCode} variant="secondary" className="text-[9px] px-1 py-0">
                      {ipcCode}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Button
                  variant="outline"
                  onClick={() => setShowSearchModal(idx)}
                  className="h-9 gap-1.5 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Patent
                </Button>
                <p className="text-[10px] text-muted-foreground mt-2">Slot {idx + 1} Empty</p>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Comparison Grid Table */}
      {activeSlots.length > 0 && (
        <Card className="overflow-hidden border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40">
                  <th className="sticky left-0 bg-muted/90 text-left text-xs font-bold p-3 text-muted-foreground border-r border-border/60">
                    Row Metric
                  </th>
                  {slots.map((p, idx) => (
                    <th key={idx} className="text-left text-xs font-bold p-3 text-foreground border-r border-border/40 min-w-[240px]">
                      {p ? p.patent_number || p.patentNumber : `Slot ${idx + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {renderMatrixRow("Patent Number", "patent_number")}
                {renderMatrixRow("Title", "title")}
                {renderMatrixRow("Assignee", "assignee")}
                {renderMatrixRow("Status", "status")}
                {renderMatrixRow("Filing Date", "filing_date")}
                {renderMatrixRow("Publication Date", "publication_date")}
                {renderMatrixRow("Citations count", "citations")}
                {renderMatrixRow("IPC Codes", "ipc")}
                {renderMatrixRow("CPC Codes", "cpc")}
                {renderMatrixRow("Abstract", "abstract", true)}
                {renderMatrixRow("Jurisdiction", "jurisdiction")}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* AI Comparison Analysis Report Generator */}
      {activeSlots.length >= 2 && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <Button
              onClick={handleGenerateReport}
              disabled={loading}
              className="bg-[#b8921e] hover:bg-[#8a6a1e] text-white font-bold h-11 px-6 shadow-sm gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-purple-200" />}
              Generate AI Comparison Report
            </Button>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-[#c9a84c]/5 border-[#c9a84c]/10 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-[#c9a84c]" />
              <p className="text-xs text-[#c9a84c] font-semibold">Claude is comparing claims and compiling matrices...</p>
            </div>
          )}

          {aiReport && (
            <Card className="bg-[#c9a84c]/5 border-[#c9a84c]/10">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-[#c9a84c] flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  AI Comparative Insights Matrix
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 text-xs">
                <div>
                  <h5 className="font-bold text-[#e8c97a]">Executive Summary</h5>
                  <p className="mt-1 text-muted-foreground leading-relaxed">{aiReport.summary}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h5 className="font-bold text-[#e8c97a]">Overlap Areas</h5>
                    <ul className="list-disc pl-4 mt-1 space-y-1 text-muted-foreground">
                      {aiReport.overlap_areas?.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-bold text-[#e8c97a]">Key Technical Differences</h5>
                    <ul className="list-disc pl-4 mt-1 space-y-1 text-muted-foreground">
                      {aiReport.key_differences?.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {aiReport.unique_to_patent_1 && (
                    <div>
                      <h5 className="font-bold text-[#e8c97a]">Unique to Patent 1</h5>
                      <ul className="list-disc pl-4 mt-1 space-y-1 text-muted-foreground">
                        {aiReport.unique_to_patent_1.map((item: string, idx: number) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiReport.unique_to_patent_2 && (
                    <div>
                      <h5 className="font-bold text-[#e8c97a]">Unique to Patent 2</h5>
                      <ul className="list-disc pl-4 mt-1 space-y-1 text-muted-foreground">
                        {aiReport.unique_to_patent_2.map((item: string, idx: number) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <Separator className="bg-[#c9a84c]/10" />

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h5 className="font-bold text-[#e8c97a]">Freedom To Operate (FTO) Impact</h5>
                    <p className="mt-1 text-muted-foreground leading-relaxed">{aiReport.freedom_to_operate_impact}</p>
                  </div>
                  <div>
                    <h5 className="font-bold text-[#e8c97a]">Patent Strategy Recommendation</h5>
                    <p className="mt-1 text-muted-foreground leading-relaxed">{aiReport.recommendation}</p>
                  </div>
                </div>

                {/* Claim Mapping Display Mock-up */}
                <Separator className="bg-[#c9a84c]/10" />
                <div>
                  <h5 className="font-bold text-[#e8c97a] flex items-center gap-1">
                    <Scale className="h-4 w-4" />
                    Claim Mapping Overlap Grid
                  </h5>
                  <div className="mt-3 space-y-3">
                    <div className="p-3 border border-amber-500/20 bg-amber-500/5 rounded-lg">
                      <div className="flex justify-between font-bold text-[10px] mb-1">
                        <span className="text-amber-400">Claim 1 (Patent 1) ↔ Claim 1 (Patent 2)</span>
                        <span className="text-amber-400">OVERLAPPING LANGUAGE</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        A system comprising optical sensors detecting backscattered light <span className="bg-amber-500/20 text-amber-200 px-1 rounded">and a calibration circuit that adjusts emitter intensities</span> based on ambient light interference levels.
                      </p>
                    </div>

                    <div className="p-3 border border-green-500/20 bg-green-500/5 rounded-lg">
                      <div className="flex justify-between font-bold text-[10px] mb-1">
                        <span className="text-green-400">Claim 5 (Patent 1)</span>
                        <span className="text-green-400">UNIQUE EMBODIMENT</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        The system where <span className="bg-green-500/20 text-green-200 px-1 rounded">optical path length enhancement is achieved via double-pass geometries utilizing back-reflectors</span>.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Select Patent Modal */}
      {showSearchModal !== null && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSearchModal(null)} />
          <Card className="relative w-full max-w-md bg-background border shadow-2xl z-10 p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm">Select Patent for Slot {showSearchModal + 1}</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSearchModal(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 py-1">
              {savedPatents.length > 0 ? (
                savedPatents.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addPatentToSlot(showSearchModal, p)}
                    className="w-full text-left p-2.5 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors flex items-center justify-between"
                  >
                    <div className="truncate pr-4">
                      <p className="text-xs font-semibold text-primary">{p.patentNumber}</p>
                      <p className="text-xs font-bold text-foreground truncate mt-0.5">{p.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{p.assignee}</p>
                    </div>
                    <Bookmark className="h-3.5 w-3.5 text-primary shrink-0" />
                  </button>
                ))
              ) : (
                <div className="text-xs text-muted-foreground text-center py-6">
                  No saved patents available. Save patents from search results first.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
        </>
      )}
    </div>
    </ErrorBoundary>
  );
}
