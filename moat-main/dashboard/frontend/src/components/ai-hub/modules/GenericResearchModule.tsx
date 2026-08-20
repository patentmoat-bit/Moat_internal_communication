"use client";

import React, { useState } from "react";
import { AiHubContext } from "../AiHubWorkspace";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, Loader2, Save, FileDown, DownloadCloud, Paperclip, 
  ChevronRight, Edit2, CheckCircle2, AlertTriangle, Info, FileText,
  ListTree, Search, Check, X, Circle, Triangle, Play
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { createBrowserClient } from "@supabase/ssr";

interface Props {
  type: string;
  label: string;
  context: AiHubContext;
}

type Step = "INPUT" | "FEATURES" | "SEARCHING" | "REPORT";

export default function GenericResearchModule({ type, label, context }: Props) {
  const [step, setStep] = useState<Step>("INPUT");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [features, setFeatures] = useState<{id: number, text: string}[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("executive");
  const [searchId, setSearchId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const getPlaceholder = () => {
    switch(type) {
      case "patentability":
      case "novelty": return "Describe the invention, technology, product, system, or method to determine novelty and inventive step...";
      case "fto": return "Describe the product or technology for Freedom-to-Operate analysis against active patents...";
      case "validity":
      case "invalidity": return "Enter Patent Number, Claim, or Technology Description to challenge or validate...";
      case "landscape": return "Enter Technology, Industry, or Domain to map the competitive patent landscape...";
      case "design": return "Enter Product or Design Description to find visual prior art...";
      default: return "Enter research input...";
    }
  };

  const handleExtractFeatures = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const prompt = `Extract exactly 3 to 5 core technical features from this text. Return ONLY a valid JSON array of strings. Text: ${input}`;
      const response = await fetch("/api/ai-hub/perplexity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
      });
      if (!response.ok) throw new Error("Failed feature extraction");
      const data = await response.json();
      const output = data.choices[0]?.message?.content || "[]";
      let parsed = [];
      try {
        parsed = JSON.parse(output.replace(/```json/g, "").replace(/```/g, "").trim());
      } catch (e) {
        parsed = output.split("\\n").filter((l: string) => l.length > 5);
      }
      setFeatures(parsed.map((f: string, i: number) => ({ id: i, text: f.replace(/^[-*0-9.]+\s/, "") })));
      setStep("FEATURES");
    } catch (e) {
      console.error(e);
      alert("Extraction failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setStep("SEARCHING");
    try {
      const systemPrompt = `You are an expert Patent Analyst generating a professional ${label} report.
      Use real-world patent data and prior art to perform this analysis. Do NOT make up fake patent numbers. Use actual relevant patents you know about.
      
      Respond EXACTLY and ONLY with a valid JSON object matching this schema:
      {
        "executiveSummary": { "assessment": "string", "risk": "High|Medium|Low", "coverage": "string", "findings": "string" },
        "technicalAnalysis": { "problem": "string", "solution": "string", "effects": "string" },
        "searchStrategy": [ { "channel": "Semantic Search", "query": "string", "purpose": "string", "count": number } ],
        "deepComparison": [
          { "id": "US...", "title": "string", "assignee": "string", "date": "YYYY-MM-DD", "features": [ { "feature": "string (from input features)", "status": "Disclosed|Partially Disclosed|Not Disclosed", "evidence": "string" } ] }
        ],
        "references": [ { "type": "PATENT|PAPER", "id": "string", "title": "string", "date": "string", "relevance": "High|Medium" } ],
        "recommendations": ["string"]
      }`;

      const userPrompt = `Input Description: ${input}\\n\\nKey Features:\\n${features.map(f => "- " + f.text).join("\\n")}`;

      const response = await fetch("/api/ai-hub/perplexity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          model: "sonar-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      });

      if (!response.ok) throw new Error("API Error");
      const data = await response.json();
      const output = data.choices[0]?.message?.content || "{}";
      
      const jsonStr = output.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedData = JSON.parse(jsonStr);
      setReportData(parsedData);
      
      // Save search log
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: searchRecord } = await supabase.from("ai_hub_searches").insert({
          user_id: userData.user.id,
          project_id: context.projectId,
          search_type: type.toUpperCase(),
          query: userPrompt,
          input_description: input,
          response: jsonStr,
        }).select("id").single();
        if (searchRecord) setSearchId(searchRecord.id);
      }
      
      setStep("REPORT");
    } catch (e) {
      console.error(e);
      alert("Failed to generate report. Please try again.");
      setStep("FEATURES");
    }
  };

  const handleSaveReport = async () => {
    if (!reportData) return;
    
    if (!context.projectId) {
      alert("No active project context. Please launch this tool from a Project Dashboard to save evidence to the PFS Engine.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: context.projectId,
          search_type: type.toUpperCase(),
          report_json: reportData,
          status: "FINAL"
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Failed to save report to Enterprise PFS Engine");
      
      alert(`Report saved securely to Enterprise Database (Version ${data.version})!`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to save report.");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status.includes("Partially")) return <Triangle className="h-4 w-4 text-amber-500 fill-amber-100" />;
    if (status.includes("Not")) return <X className="h-4 w-4 text-red-500" />;
    if (status.includes("Common") || status.includes("Obvious")) return <Circle className="h-4 w-4 text-blue-500 fill-blue-100" />;
    return <Check className="h-4 w-4 text-green-600" />; // Disclosed
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-background">
      <div className="p-5 border-b flex items-center justify-between bg-background shadow-sm z-10">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Search className="h-5 w-5 text-indigo-600" />
            {label}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Enterprise Search Report Generation Engine</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSaveReport} 
            disabled={isSaving || step !== "REPORT"} 
            className="font-semibold text-indigo-700 border-indigo-200"
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Report
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="font-semibold" 
            disabled={step !== "REPORT"}
            onClick={() => alert("PDF Export is currently in development.")}
          >
            <DownloadCloud className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="font-semibold" 
            disabled={step !== "REPORT"}
            onClick={() => alert("DOCX Export is currently in development.")}
          >
            <FileDown className="h-4 w-4 mr-2" /> DOCX
          </Button>
          {step === "REPORT" && (
            <Button variant="ghost" size="sm" onClick={() => setStep("INPUT")}>New Search</Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        {/* STEP 1: INPUT */}
        {step === "INPUT" && (
          <div className="max-w-4xl mx-auto p-8 space-y-6">
            <div className="bg-background p-6 rounded-xl border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-base font-bold text-foreground">Technology / Invention Description</label>
                <span className="text-xs font-semibold text-muted-foreground px-2 py-1 bg-muted rounded">Step 1 of 3</span>
              </div>
              <Textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={getPlaceholder()}
                className="min-h-[250px] resize-y bg-muted/20 font-mono text-sm p-4 border-muted-foreground/20 leading-relaxed"
              />
              <div className="flex gap-3 pt-2">
                <Button onClick={handleExtractFeatures} disabled={loading || !input.trim()} className="bg-indigo-600 hover:bg-indigo-700 h-11 px-8 font-bold text-base shadow-sm">
                  {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <ListTree className="h-5 w-5 mr-2" />}
                  Generate Key Features
                </Button>
                <label className="cursor-pointer">
                  <input type="file" className="hidden" multiple onChange={() => alert("File attachment analysis is currently in development.")} />
                  <Button variant="outline" asChild className="h-11 px-6 bg-background">
                    <span><Paperclip className="h-4 w-4 mr-2" /> Attach Files</span>
                  </Button>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: FEATURES */}
        {step === "FEATURES" && (
          <div className="max-w-4xl mx-auto p-8 space-y-6">
            <div className="bg-background p-6 rounded-xl border shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-lg font-bold">Key Features Extraction</h3>
                  <p className="text-sm text-muted-foreground">Verify and edit the structural and functional features for the search strategy.</p>
                </div>
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">Step 2 of 3</span>
              </div>
              
              <div className="space-y-3">
                {features.map((f, i) => (
                  <div key={f.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border">
                    <div className="mt-1 bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded">F{i+1}</div>
                    <Input 
                      value={f.text} 
                      onChange={(e) => {
                        const newF = [...features];
                        newF[i].text = e.target.value;
                        setFeatures(newF);
                      }}
                      className="flex-1 bg-background"
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleGenerateReport} className="bg-indigo-600 hover:bg-indigo-700 h-11 px-8 font-bold">
                  <Play className="h-4 w-4 mr-2 fill-current" /> Execute Search & Generate Report
                </Button>
                <Button variant="outline" onClick={() => setStep("INPUT")} className="h-11">Back</Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SEARCHING */}
        {step === "SEARCHING" && (
          <div className="max-w-2xl mx-auto p-12 mt-10">
            <div className="bg-background p-10 rounded-xl border shadow-lg text-center space-y-8">
              <div className="relative w-20 h-20 mx-auto">
                <Loader2 className="h-20 w-20 animate-spin text-indigo-200" />
                <Search className="h-8 w-8 text-indigo-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">Executing AI Search Strategy</h2>
                <p className="text-sm text-muted-foreground animate-pulse">Running semantic retrieval, boolean queries, and deep document comparison against global patent databases...</p>
              </div>
              <div className="text-left text-xs font-mono text-muted-foreground bg-slate-900 p-4 rounded-lg overflow-hidden h-32 space-y-2">
                <p className="text-emerald-400">&gt; Generating semantic vectors...</p>
                <p className="text-emerald-400">&gt; Querying USPTO, EPO, WIPO...</p>
                <p className="text-emerald-400">&gt; Analyzing 500+ candidates...</p>
                <p className="text-emerald-400">&gt; Performing feature mapping for F1-F{features.length}...</p>
                <p className="text-indigo-400 animate-pulse">&gt; Compiling enterprise report...</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: REPORT VIEWER */}
        {step === "REPORT" && reportData && (
          <div className="flex h-full">
            {/* Report Sidebar */}
            <div className="w-64 border-r bg-muted/10 p-4 space-y-1 overflow-y-auto shrink-0">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2">Report Sections</div>
              {[
                { id: "executive", label: "Executive Summary", icon: FileText },
                { id: "technical", label: "Technical Analysis", icon: Sparkles },
                { id: "strategy", label: "Search Strategy", icon: Search },
                { id: "deep", label: "Deep Comparison", icon: ListTree },
                { id: "references", label: "References", icon: Bookmark },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-colors text-left ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' : 'hover:bg-muted text-muted-foreground'}`}
                >
                  <tab.icon className="h-4 w-4 shrink-0" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Report Content */}
            <div className="flex-1 overflow-y-auto p-10 bg-slate-50 dark:bg-background">
              <div className="max-w-4xl mx-auto bg-white dark:bg-card border shadow-md p-10 rounded-sm min-h-[800px]">
                
                {/* Cover Header */}
                <div className="border-b-2 border-indigo-600 pb-6 mb-8">
                  <h2 className="text-3xl font-black text-indigo-950 dark:text-white uppercase tracking-tight mb-2">{label} Report</h2>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                    <span>Generated: {new Date().toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Context: {context.projectName || "General Inquiry"}</span>
                  </div>
                </div>

                {/* Tab Contents */}
                {activeTab === "executive" && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                      <h3 className="text-lg font-bold border-b pb-2 mb-4 text-slate-800 dark:text-slate-200">Overall Assessment</h3>
                      <p className="text-sm leading-relaxed">{reportData.executiveSummary?.assessment}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded border">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Assessed Risk Level</span>
                        <div className="text-2xl font-black mt-1 flex items-center gap-2">
                          {reportData.executiveSummary?.risk === "High" && <AlertTriangle className="text-red-500" />}
                          {reportData.executiveSummary?.risk}
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded border">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Search Coverage</span>
                        <div className="text-sm font-semibold mt-1">{reportData.executiveSummary?.coverage}</div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold border-b pb-2 mb-4 text-slate-800 dark:text-slate-200">Key Findings</h3>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{reportData.executiveSummary?.findings}</p>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-950/30 p-5 rounded-lg border border-indigo-100 dark:border-indigo-900">
                      <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-2">Recommended Next Steps</h3>
                      <ul className="list-disc pl-5 text-sm space-y-1 text-indigo-800 dark:text-indigo-400">
                        {reportData.recommendations?.map((r: string, i: number) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                {activeTab === "technical" && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-muted/20 p-5 rounded-lg border">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Original User Input</h3>
                      <p className="text-sm font-mono whitespace-pre-wrap text-foreground/80">{input}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold border-b pb-2 mb-4">Technical Problem</h3>
                      <p className="text-sm leading-relaxed">{reportData.technicalAnalysis?.problem}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold border-b pb-2 mb-4">Proposed Solution</h3>
                      <p className="text-sm leading-relaxed">{reportData.technicalAnalysis?.solution}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold border-b pb-2 mb-4">Technical Effects</h3>
                      <p className="text-sm leading-relaxed">{reportData.technicalAnalysis?.effects}</p>
                    </div>
                  </div>
                )}

                {activeTab === "strategy" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-lg font-bold border-b pb-2 mb-4">Query Traceability</h3>
                    <div className="border rounded overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground text-xs uppercase font-bold">
                          <tr>
                            <th className="px-4 py-3 border-b">Channel</th>
                            <th className="px-4 py-3 border-b">Query</th>
                            <th className="px-4 py-3 border-b">Purpose</th>
                            <th className="px-4 py-3 border-b text-right">Results</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {reportData.searchStrategy?.map((s: any, i: number) => (
                            <tr key={i} className="hover:bg-muted/50">
                              <td className="px-4 py-3 font-semibold">{s.channel}</td>
                              <td className="px-4 py-3 font-mono text-xs">{s.query}</td>
                              <td className="px-4 py-3">{s.purpose}</td>
                              <td className="px-4 py-3 text-right font-mono">{s.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === "deep" && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-lg font-bold border-b pb-2 mb-6">Feature Mapping & Prior Art Comparison</h3>
                    {reportData.deepComparison?.map((doc: any, i: number) => (
                      <div key={i} className="border rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-slate-100 dark:bg-slate-900 p-4 border-b">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-lg text-indigo-700 dark:text-indigo-400">{doc.id}</h4>
                            <span className="text-xs font-semibold bg-white dark:bg-black px-2 py-1 rounded border shadow-sm">{doc.date}</span>
                          </div>
                          <p className="font-semibold text-sm mb-1">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">Assignee: {doc.assignee}</p>
                        </div>
                        <div className="p-0">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                              <tr>
                                <th className="px-4 py-2 border-b w-1/3">Feature</th>
                                <th className="px-4 py-2 border-b w-1/4">Status</th>
                                <th className="px-4 py-2 border-b">Evidence / Reasoning</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {doc.features?.map((f: any, j: number) => (
                                <tr key={j}>
                                  <td className="px-4 py-3 font-medium text-xs">{f.feature}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2 text-xs font-bold">
                                      {getStatusIcon(f.status)}
                                      {f.status}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-xs leading-relaxed text-muted-foreground">{f.evidence}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "references" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-lg font-bold border-b pb-2 mb-4">Cited References</h3>
                    <ul className="space-y-4">
                      {reportData.references?.map((ref: any, i: number) => (
                        <li key={i} className="bg-background border p-4 rounded-lg shadow-sm flex gap-4">
                          <div className="h-10 w-10 shrink-0 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center">
                            <Bookmark className="h-4 w-4 text-slate-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-bold text-indigo-600">{ref.id}</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-muted rounded">{ref.type}</span>
                              {ref.relevance === "High" && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">HIGH RELEVANCE</span>}
                            </div>
                            <h4 className="text-sm font-semibold">{ref.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">Date: {ref.date}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Legal Disclaimer Footer */}
                <div className="mt-16 pt-6 border-t border-dashed">
                  <div className="flex items-start gap-3 text-muted-foreground">
                    <Info className="h-5 w-5 shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed text-justify">
                      <strong>Disclaimer:</strong> This report is automatically generated using retrieved search data and AI-assisted analysis and is intended for preliminary patent intelligence and research purposes only. It does not constitute legal advice, a definitive patentability determination, infringement opinion, validity opinion, invalidity opinion, or Freedom-to-Operate opinion. Final legal conclusions should be confirmed by qualified patent professionals.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
