"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Search, Cpu, Bookmark, FileText, Plus, 
  Lightbulb, Sparkles, BookOpen, ExternalLink, Bot
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function ResearchReferenceFigma() {
  const searchParams = useSearchParams();
  const rawId = searchParams?.get('id');

  const [inventionId, setInventionId] = useState<string | null>(rawId);
  const [loading, setLoading] = useState(true);
  const [inventionTitle, setInventionTitle] = useState("");
  const [inventionDesc, setInventionDesc] = useState("");
  
  const [aiLoading, setAiLoading] = useState(false);
  const [references, setReferences] = useState<any[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  
  useEffect(() => {
    const init = async () => {
      try {
        let currentId = rawId;
        const asgRes = await fetch('/api/patent-drafter/assignments');
        const asgData = await asgRes.json();
        
        if (!currentId && asgData.assignments && asgData.assignments.length > 0) {
          currentId = asgData.assignments[0].invention_id;
        }
        
        if (currentId) {
          setInventionId(currentId);
          const project = asgData.assignments?.find((a: any) => a.invention_id === currentId);
          if (project) {
            setInventionTitle(project.title || "Unknown Project");
            setInventionDesc(project.instructions || "");
          } else {
            setInventionTitle("New Invention Concept");
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [rawId]);

  const handleAISearch = async () => {
    if (!inventionTitle) return;
    setAiLoading(true);
    
    // Simulate Moat AI API call
    await new Promise(r => setTimeout(r, 2000));
    
    setReferences([
      { id: 1, title: "Dynamic energy routing protocol for IoT", source: "US Patent 10,234,987", date: "2019" },
      { id: 2, title: "Machine learning for HVAC zone control", source: "IEEE IoT Journal", date: "2021" },
      { id: 3, title: "Adaptive thermal management in smart buildings", source: "US Patent App 2022/0129", date: "2022" }
    ]);
    
    setInsights([
      "The use of edge-computing for localized ML model execution appears novel compared to cloud-only prior art.",
      "Consider emphasizing the specific sensor-fusion algorithms used to detect occupancy, as general occupancy detection is heavily patented.",
      "The 'fail-safe thermal bridge' mechanism in your description is highly unique and should be a focus of independent claim 1."
    ]);
    
    setAiLoading(false);
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Workspace...</div>;

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-500" /> Research & Prior Art
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Leverage AI to discover relevant citations and patentability insights.
          </p>
        </div>
        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 uppercase tracking-widest text-[10px] px-3 py-1">
          {inventionId || 'Draft Mode'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Input & AI Trigger */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-border/50 pb-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" /> Invention Context
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Title</label>
                <Input 
                  value={inventionTitle} 
                  onChange={(e) => setInventionTitle(e.target.value)}
                  className="text-sm font-semibold border-slate-200"
                  placeholder="Enter invention title..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Description / Notes</label>
                <Textarea 
                  value={inventionDesc} 
                  onChange={(e) => setInventionDesc(e.target.value)}
                  className="min-h-[120px] text-xs resize-none border-slate-200"
                  placeholder="Describe the core mechanism or novelty..."
                />
              </div>
              <Button 
                onClick={handleAISearch} 
                disabled={aiLoading || !inventionTitle} 
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md transition-all hover:shadow-lg"
              >
                {aiLoading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Synthesizing...
                  </div>
                ) : (
                  <><Bot className="w-4 h-4 mr-2" /> Run Moat AI Analysis</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Results */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {references.length === 0 && !aiLoading ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50"
              >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                  <Sparkles className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="font-semibold text-slate-700 mb-2">No Research Generated</h3>
                <p className="text-sm text-slate-500 max-w-sm">Provide context on the left and use the Moat AI integration to instantly discover related patents, publications, and novelty insights.</p>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
                className="space-y-6"
              >
                {/* Insights Panel */}
                <Card className="border-emerald-200 shadow-sm bg-emerald-50/30 overflow-hidden">
                  <div className="bg-emerald-100/50 p-4 border-b border-emerald-200 flex items-center gap-2 text-emerald-800">
                    <Lightbulb className="w-4 h-4" />
                    <h3 className="font-bold text-xs uppercase tracking-wider">AI Novelty Suggestions</h3>
                  </div>
                  <CardContent className="p-5 space-y-3">
                    {aiLoading ? (
                      <div className="space-y-3">
                        <div className="h-4 bg-emerald-100 rounded animate-pulse w-3/4"></div>
                        <div className="h-4 bg-emerald-100 rounded animate-pulse w-full"></div>
                        <div className="h-4 bg-emerald-100 rounded animate-pulse w-5/6"></div>
                      </div>
                    ) : (
                      insights.map((insight, idx) => (
                        <div key={idx} className="flex gap-3 items-start bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                          <div className="shrink-0 mt-0.5">
                            <Sparkles className="w-4 h-4 text-emerald-500" />
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">{insight}</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* References List */}
                <Card className="border-border/50 shadow-sm">
                   <div className="bg-slate-50/50 p-4 border-b border-border/50 flex justify-between items-center">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-blue-500" /> Discovered Prior Art
                    </h3>
                  </div>
                  <CardContent className="p-0 divide-y divide-border/50">
                    {aiLoading ? (
                      <div className="p-6 space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex items-start gap-4">
                             <div className="w-10 h-10 rounded bg-slate-100 animate-pulse shrink-0"></div>
                             <div className="space-y-2 flex-1 mt-1">
                               <div className="h-3 bg-slate-100 rounded animate-pulse w-2/3"></div>
                               <div className="h-2 bg-slate-100 rounded animate-pulse w-1/3"></div>
                             </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      references.map((ref) => (
                        <div key={ref.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start justify-between group">
                          <div className="flex gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-md shrink-0 h-9">
                              <Search className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-800">{ref.title}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600">
                                  {ref.source}
                                </Badge>
                                <span className="text-[10px] font-medium text-muted-foreground">{ref.date}</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
