
"use client";

import React, { useState, useEffect, useRef } from "react";
import { CheckCircle2, ChevronRight, Activity, Database, Lock, Scale, FileText, BrainCircuit, ShieldCheck, Zap, AlertTriangle, Play, Check, LoaderCircle } from "lucide-react";

type Stage = 
  | "CAPTURE" 
  | "ANALYSIS" 
  | "CEO_EVIDENCE" 
  | "PROVE" 
  | "ARCHITECT" 
  | "CLAIM" 
  | "PROTECT" 
  | "COMPOUND";

const STAGES: { id: Stage; label: string; icon: React.ReactNode }[] = [
  { id: "CAPTURE", label: "Capture", icon: <FileText className="w-4 h-4" /> },
  { id: "ANALYSIS", label: "Analysis", icon: <Activity className="w-4 h-4" /> },
  { id: "CEO_EVIDENCE", label: "CEO View", icon: <BrainCircuit className="w-4 h-4" /> },
  { id: "PROVE", label: "Prove", icon: <Database className="w-4 h-4" /> },
  { id: "ARCHITECT", label: "Architect", icon: <Scale className="w-4 h-4" /> },
  { id: "CLAIM", label: "Claim", icon: <ShieldCheck className="w-4 h-4" /> },
  { id: "PROTECT", label: "Protect", icon: <Lock className="w-4 h-4" /> },
  { id: "COMPOUND", label: "Compound", icon: <Zap className="w-4 h-4" /> },
];

export function InventionWorkflow() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [currentStage, setCurrentStage] = useState<Stage>("CAPTURE");
  const [unlockedStages, setUnlockedStages] = useState<Stage[]>(["CAPTURE"]);
  
  // Analysis State
  const [analysisSteps, setAnalysisSteps] = useState<number>(0);
  const [needsClarification, setNeedsClarification] = useState(false);
  const [clarificationAnswered, setClarificationAnswered] = useState(false);
  
  const ANALYSIS_TEXTS = [
    "Capturing invention boundaries...",
    "Extracting technical concepts...",
    "Building conceptual model...",
    "Checking information sufficiency...",
    "Identifying technical roles...",
    "Searching patent corpus...",
    "Comparing invention elements...",
    "Building evidence matrix...",
    "Recording derivation paths...",
    "Generating executive insight...",
  ];

  const handleStartAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStage("ANALYSIS");
    setUnlockedStages(prev => [...prev, "ANALYSIS"]);
    setAnalysisSteps(0);
  };

  useEffect(() => {
    if (currentStage === "ANALYSIS") {
      if (analysisSteps < 4) {
        const timer = setTimeout(() => setAnalysisSteps(s => s + 1), 800);
        return () => clearTimeout(timer);
      } else if (analysisSteps === 4 && !clarificationAnswered) {
        setNeedsClarification(true);
      } else if (analysisSteps >= 4 && analysisSteps < ANALYSIS_TEXTS.length) {
        const timer = setTimeout(() => setAnalysisSteps(s => s + 1), 700);
        return () => clearTimeout(timer);
      } else if (analysisSteps === ANALYSIS_TEXTS.length) {
        // Complete! Unlock next stages
        const timer = setTimeout(() => {
          setUnlockedStages(["CAPTURE", "ANALYSIS", "CEO_EVIDENCE", "PROVE", "ARCHITECT", "CLAIM", "PROTECT", "COMPOUND"]);
          setCurrentStage("CEO_EVIDENCE");
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentStage, analysisSteps, clarificationAnswered]);

  const handleAnswerClarification = () => {
    setNeedsClarification(false);
    setClarificationAnswered(true);
    setAnalysisSteps(5); // Resume
  };

  if (!mounted) return <div className="flex flex-col lg:flex-row h-full min-h-[800px] bg-surface border border-line rounded-xl overflow-hidden shadow-sm animate-pulse" />;

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[800px] bg-surface border border-line rounded-xl overflow-hidden shadow-sm">
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-64 bg-[#f8f9fa] dark:bg-[#11110a] border-r border-line p-4 space-y-2 shrink-0">
        <h3 className="text-[10px] font-black tracking-widest text-muted uppercase mb-4 pl-2">Workflow Stages</h3>
        {STAGES.map((stage, idx) => {
          const isUnlocked = unlockedStages.includes(stage.id);
          const isActive = currentStage === stage.id;
          return (
            <button
              key={stage.id}
              disabled={!isUnlocked}
              onClick={() => setCurrentStage(stage.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all text-left
                ${isActive ? "bg-[#175a74] text-white shadow-md" : 
                  isUnlocked ? "text-ink hover:bg-line-strong" : "text-muted opacity-50 cursor-not-allowed"}
              `}
            >
              <div className={`p-1.5 rounded-md ${isActive ? 'bg-white/20' : 'bg-surface'}`}>
                {stage.icon}
              </div>
              {stage.label}
              {isUnlocked && !isActive && <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-500" />}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 lg:p-10 overflow-y-auto bg-white dark:bg-[#0a0a05] relative">
        
        {currentStage === "CAPTURE" && (
          <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-ink mb-6 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#175a74]/10 text-[#175a74]">1</span>
              Capture New Invention
            </h2>
            <form onSubmit={handleStartAnalysis} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-ink">Invention Title</label>
                <input required type="text" placeholder="e.g. Quantum Entropy Seed Generator" className="w-full px-4 py-3 rounded-lg border border-line bg-surface focus:ring-2 focus:ring-[#175a74] focus:outline-none font-medium" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-ink">Problem Statement</label>
                <textarea required rows={3} placeholder="What technical problem does this solve?" className="w-full px-4 py-3 rounded-lg border border-line bg-surface focus:ring-2 focus:ring-[#175a74] focus:outline-none resize-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-ink">Proposed Solution</label>
                <textarea required rows={5} placeholder="Describe the mechanism, components, and steps..." className="w-full px-4 py-3 rounded-lg border border-line bg-surface focus:ring-2 focus:ring-[#175a74] focus:outline-none resize-none" />
              </div>
              <div className="pt-4 border-t border-line flex justify-end">
                <button type="submit" className="px-6 py-3 bg-[#175a74] text-white rounded-lg font-black hover:bg-[#124256] transition-colors shadow-md flex items-center gap-2">
                  <Play className="w-4 h-4" /> Start Automated Analysis
                </button>
              </div>
            </form>
          </div>
        )}

        {currentStage === "ANALYSIS" && (
          <div className="max-w-3xl animate-in fade-in duration-500">
            <h2 className="text-2xl font-black text-ink mb-6">Analyzing Ideation & Concepts</h2>
            
            <div className="bg-[#111111] rounded-xl p-6 font-mono text-sm shadow-inner relative overflow-hidden min-h-[400px]">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#175a74] to-emerald-500 opacity-50"></div>
              
              <div className="space-y-3">
                {ANALYSIS_TEXTS.map((text, idx) => {
                  if (idx >= analysisSteps && !(idx === analysisSteps && !needsClarification)) return null;
                  
                  const isCurrent = idx === analysisSteps && !needsClarification;
                  const isDone = idx < analysisSteps;

                  return (
                    <div key={idx} className={`flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300 ${isCurrent ? 'text-[#c9a84c]' : 'text-emerald-400'}`}>
                      {isDone ? <Check className="w-4 h-4 shrink-0" /> : <LoaderCircle className="w-4 h-4 shrink-0 animate-spin" />}
                      <span className={isCurrent ? "animate-pulse" : ""}>{text}</span>
                    </div>
                  );
                })}
              </div>

              {needsClarification && (
                <div className="mt-8 p-5 bg-[#1a1a1a] border border-[#c9a84c]/30 rounded-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-[#c9a84c] shrink-0 mt-0.5" />
                    <div className="w-full">
                      <h4 className="text-[#c9a84c] font-bold mb-2">MOAT identified missing information!</h4>
                      <p className="text-zinc-400 text-xs mb-4">CEO Attention Required: Please specify the exact algorithmic derivation used in step 2 to ensure computational sufficiency mapping.</p>
                      <textarea rows={2} placeholder="CEO Answer..." className="w-full bg-[#111] border border-zinc-800 rounded p-2 text-zinc-300 text-xs focus:outline-none focus:border-[#175a74] resize-none mb-3" />
                      <button onClick={handleAnswerClarification} className="px-4 py-2 bg-[#175a74] hover:bg-[#124256] text-white text-xs font-bold rounded-md transition-colors">
                        Submit Answer & Resume
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStage === "CEO_EVIDENCE" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-ink mb-6 flex items-center gap-3">
              CEO Evidence View
              <span className="text-xs font-bold bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-full border border-emerald-500/20">Analysis Complete</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 border border-line bg-surface rounded-xl shadow-xs">
                <h4 className="text-xs font-black uppercase tracking-wider text-muted mb-2">What appears novel?</h4>
                <p className="text-sm font-medium text-ink">The specific mathematical pairing of entropy seeding with real-time lattice reconfiguration.</p>
              </div>
              <div className="p-5 border border-line bg-surface rounded-xl shadow-xs">
                <h4 className="text-xs font-black uppercase tracking-wider text-muted mb-2">What is missing?</h4>
                <p className="text-sm font-medium text-ink">Embodiments detailing hardware fallbacks if lattice fails to synthesize.</p>
              </div>
              <div className="p-5 border border-line bg-surface rounded-xl shadow-xs">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 mb-2">What are the risks?</h4>
                <p className="text-sm font-medium text-ink">Prior art from IBM covers lattice generation; claims must be narrow on the *seeding* mechanism.</p>
              </div>
              <div className="p-5 border border-line bg-surface rounded-xl shadow-xs bg-[#175a74]/5 border-[#175a74]/20">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#175a74] mb-2">Recommendation</h4>
                <p className="text-sm font-bold text-ink">Proceed to Architect phase. Novelty delta is high enough to warrant TMM building.</p>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder for other stages to demonstrate the UI structure */}
        {["PROVE", "ARCHITECT", "CLAIM", "PROTECT", "COMPOUND"].includes(currentStage) && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-2xl bg-line flex items-center justify-center mb-6 shadow-inner text-muted">
              {STAGES.find(s => s.id === currentStage)?.icon}
            </div>
            <h2 className="text-2xl font-black text-ink mb-2">Module: {STAGES.find(s => s.id === currentStage)?.label}</h2>
            <p className="text-muted max-w-md">
              This module leverages the structured output from the previous stages to dynamically generate insights for the {currentStage} lifecycle.
            </p>
            <div className="mt-8 flex gap-4">
               <div className="px-4 py-2 rounded-lg border border-line bg-surface text-sm font-bold shadow-xs flex items-center gap-2">
                 <CheckCircle2 className="w-4 h-4 text-[#175a74]" /> Data Synced
               </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
