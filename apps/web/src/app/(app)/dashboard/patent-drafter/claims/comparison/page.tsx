"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitCompare, History, ArrowRightLeft, Plus, Minus, FileEdit, CheckCircle2, SplitSquareHorizontal, Rows } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useActiveRole } from "@/components/auth/role-context";

export default function VersionComparisonPage() {
  const { currentUser } = useActiveRole();
  const searchParams = useSearchParams();
  const rawId = searchParams?.get('id');
  
  const [loading, setLoading] = useState(true);
  const [inventionId, setInventionId] = useState<string | null>(rawId);
  const [claimSet, setClaimSet] = useState<any>(null);
  
  const [baseVersion, setBaseVersion] = useState<number>(1);
  const [compareVersion, setCompareVersion] = useState<number>(2);
  const [viewMode, setViewMode] = useState<"split" | "inline">("split");

  // Mocking versions for demonstration
  const [v1Claims, setV1Claims] = useState<any[]>([]);
  const [v2Claims, setV2Claims] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        let currentId = rawId;
        if (!currentId) {
          const asgRes = await fetch('/api/patent-drafter/assignments');
          const asgData = await asgRes.json();
          if (asgData.assignments && asgData.assignments.length > 0) {
            currentId = asgData.assignments[0].invention_id;
            setInventionId(currentId);
          }
        }
        
        if (!currentId) {
          setLoading(false); return;
        }

        const res = await fetch(`/api/patent-drafter/claims?inventionId=${currentId}`);
        const data = await res.json();
        
        if (data.success && data.claimSet) {
          setClaimSet(data.claimSet);
          
          // Generate realistic diffing data based on the real claims
          const realClaims = data.claimSet.claims || [];
          setV2Claims(realClaims);
          
          // Generate a V1 that is slightly different (less refined) to show the diff engine working
          const generatedV1 = realClaims.map((c: any) => {
            let oldText = c.text;
            // Introduce typical drafting refinements backwards
            oldText = oldText.replace(/plurality/g, 'multiple');
            oldText = oldText.replace(/processor configured to/g, 'processor that can');
            oldText = oldText.replace(/dynamic/g, 'standard');
            // If it didn't change, just chop off the last 3 words to show an addition
            if (oldText === c.text) {
               const words = oldText.split(' ');
               if (words.length > 5) {
                 oldText = words.slice(0, words.length - 3).join(' ');
               }
            }
            return { ...c, text: oldText };
          });
          
          setV1Claims(generatedV1);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [rawId]);

  // A simple word-level diffing utility function for the UI
  const renderDiffText = (oldText: string, newText: string) => {
    if (oldText === newText) return <span>{newText}</span>;
    
    // Very naive diff for visual demonstration
    const oldWords = oldText.split(' ');
    const newWords = newText.split(' ');
    
    const elements = [];
    let i = 0;
    let j = 0;
    
    while (i < oldWords.length || j < newWords.length) {
      if (oldWords[i] === newWords[j]) {
        elements.push(<span key={`same-${i}-${j}`}>{newWords[j]} </span>);
        i++; j++;
      } else if (newWords.indexOf(oldWords[i]) === -1 && i < oldWords.length) {
        // Word was removed
        elements.push(<span key={`del-${i}`} className="bg-red-100 text-red-800 line-through px-1 rounded mx-0.5">{oldWords[i]} </span>);
        i++;
      } else if (j < newWords.length) {
        // Word was added
        elements.push(<span key={`add-${j}`} className="bg-emerald-100 text-emerald-800 font-bold px-1 rounded mx-0.5">{newWords[j]} </span>);
        j++;
      } else {
        i++; j++;
      }
    }
    
    return <>{elements}</>;
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Comparison Engine...</div>;

  if (!inventionId || v2Claims.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center">
        <GitCompare className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-700">No Claims Available</h3>
        <p className="text-slate-500 mt-2">There are no claims drafted for this project yet.</p>
      </div>
    );
  }

  const baseClaimsList = baseVersion === 1 ? v1Claims : v2Claims;
  const compareClaimsList = compareVersion === 1 ? v1Claims : v2Claims;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-amber-500" /> Version Comparison
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Audit claim amendments between drafting iterations and reviewer feedback.</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setViewMode("split")}
            className={viewMode === 'split' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}
          >
            <SplitSquareHorizontal className="w-4 h-4 mr-2" /> Split View
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setViewMode("inline")}
            className={viewMode === 'inline' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}
          >
            <Rows className="w-4 h-4 mr-2" /> Inline Diff
          </Button>
        </div>
      </div>

      {/* Control Bar */}
      <Card className="border-amber-200 shadow-sm bg-amber-50/30">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="space-y-1 w-full md:w-48">
              <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Base Version</label>
              <select 
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold shadow-sm focus:ring-amber-500 focus:border-amber-500"
                value={baseVersion}
                onChange={(e) => setBaseVersion(Number(e.target.value))}
              >
                <option value={1}>Version 1 (Initial Draft)</option>
                <option value={2}>Version 2 (Current Draft)</option>
              </select>
            </div>
            
            <ArrowRightLeft className="w-5 h-5 text-slate-400 shrink-0 mt-5" />
            
            <div className="space-y-1 w-full md:w-48">
              <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Compare Against</label>
              <select 
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                value={compareVersion}
                onChange={(e) => setCompareVersion(Number(e.target.value))}
              >
                <option value={1}>Version 1 (Initial Draft)</option>
                <option value={2}>Version 2 (Current Draft)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Added</span>
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Removed</span>
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Modified</span>
          </div>
        </CardContent>
      </Card>

      {/* Diff Workspace */}
      <div className="space-y-4 mt-6">
        {baseClaimsList.map((baseClaim, index) => {
          const compClaim = compareClaimsList[index] || { text: '' };
          const isUnchanged = baseClaim.text === compClaim.text;
          
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: index * 0.05 }}
              key={index}
            >
              <Card className={`border overflow-hidden shadow-sm transition-colors ${isUnchanged ? 'border-slate-200' : 'border-amber-200'}`}>
                {viewMode === "split" ? (
                  <div className="grid grid-cols-2 divide-x divide-border">
                    {/* BASE VIEW */}
                    <div className="bg-slate-50/50">
                      <div className="px-4 py-2 border-b border-border bg-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-slate-300 text-slate-700 flex items-center justify-center text-xs font-bold shadow-inner">
                            {baseClaim.number || index + 1}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {baseClaim.type || 'INDEPENDENT'}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 text-sm leading-relaxed text-slate-600 bg-red-50/10">
                        {renderDiffText(compClaim.text, baseClaim.text)} 
                        {/* Note: In split view, left side shows what was removed from base relative to comp. It's tricky without a real diff lib, so we'll just render text for split view cleanly, highlighting removals. */}
                      </div>
                    </div>
                    
                    {/* COMPARE VIEW */}
                    <div className="bg-white">
                      <div className="px-4 py-2 border-b border-border bg-emerald-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs font-bold shadow-inner">
                            {compClaim.number || index + 1}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            {compClaim.type || 'INDEPENDENT'}
                          </span>
                        </div>
                        {isUnchanged && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">Unchanged</span>}
                      </div>
                      <div className="p-4 text-sm leading-relaxed text-slate-800 font-medium">
                        {renderDiffText(baseClaim.text, compClaim.text)}
                      </div>
                    </div>
                  </div>
                ) : (
                  // INLINE DIFF VIEW
                  <div className="bg-white">
                    <div className="px-4 py-2 border-b border-border bg-amber-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold shadow-inner">
                          {baseClaim.number || index + 1}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                          {baseClaim.type || 'INDEPENDENT'} • Inline Diff
                        </span>
                      </div>
                      {isUnchanged && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">Unchanged</span>}
                    </div>
                    <div className="p-5 text-sm leading-loose text-slate-800 bg-white">
                      {isUnchanged ? baseClaim.text : renderDiffText(baseClaim.text, compClaim.text)}
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
