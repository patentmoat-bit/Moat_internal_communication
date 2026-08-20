"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Brain, FileText, Search, ShieldAlert, Scale, Target, Map, Image as ImageIcon, 
  ListTree, FileOutput, History, Bookmark, Sparkles, ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

import RithChat from "./modules/RithChat";
import GenericResearchModule from "./modules/GenericResearchModule";
import KeyFeaturesModule from "./modules/KeyFeaturesModule";
import PfsGeneratorModule from "./modules/PfsGeneratorModule";
import HistoryModule from "./modules/HistoryModule";
import SavedReportsModule from "./modules/SavedReportsModule";

export type AiHubContext = {
  projectId: string | null;
  projectType: "PATENT" | "TRADEMARK" | "COPYRIGHT" | null;
  projectName: string | null;
};

const SIDEBAR_ITEMS = [
  { id: "rith", label: "AI Rith", icon: Brain, type: "chat" },
];

export default function AiHubWorkspace() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("rith");
  const [context, setContext] = useState<AiHubContext>({
    projectId: null,
    projectType: null,
    projectName: null
  });

  useEffect(() => {
    const pId = searchParams.get("projectId");
    const pType = searchParams.get("projectType") as any;
    const pName = searchParams.get("projectName");
    
    if (pId && pType) {
      setContext({
        projectId: pId,
        projectType: pType,
        projectName: pName || "Project Context"
      });
    }
  }, [searchParams]);

  const activeItem = SIDEBAR_ITEMS.find(item => item.id === activeTab) || SIDEBAR_ITEMS[0];

  return (
    <div className="flex h-full w-full bg-[#fdfdfc] dark:bg-background">
      {/* Left Sidebar */}
      <div className="hidden md:flex w-64 border-r bg-white dark:bg-card flex-col h-full overflow-y-auto shadow-sm z-20">
        <div className="p-5 border-b bg-white dark:bg-card sticky top-0 z-10">
          <h2 className="text-sm font-black flex items-center gap-2 tracking-widest text-[#c9a84c]">
            MOAT AI HUB
          </h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-bold">
            Intelligence Workspace
          </p>
          {context.projectId && (
            <div className="mt-4 px-3 py-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-900/30">
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-500 block uppercase tracking-wider mb-0.5">Context: {context.projectType}</span>
              <span className="text-xs font-bold text-foreground truncate block">{context.projectName}</span>
            </div>
          )}
        </div>
        
        <div className="p-4 space-y-1 flex-1">
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left",
                activeTab === item.id 
                  ? "bg-[#c9a84c]/10 text-[#c9a84c]" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
          
          <div className="mt-8 p-4 bg-gray-50 dark:bg-muted/30 rounded-xl border border-border/50">
            <h3 className="text-xs font-bold text-foreground mb-1">Rith AI Assistant</h3>
            <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">Your intelligent research partner for patents, trademarks, copyrights, and innovation insights.</p>
            <button onClick={() => setActiveTab("rith")} className="text-[10px] font-bold text-[#c9a84c] hover:underline flex items-center gap-1 w-full">
              Start Conversation <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-full overflow-hidden flex flex-col bg-slate-50/50 dark:bg-background relative">
        {/* Mobile Navigation Header */}
        <div className="md:hidden p-4 border-b bg-white dark:bg-card flex items-center justify-between shrink-0 z-20 shadow-sm">
          {activeTab !== "rith" ? (
            <button 
              onClick={() => setActiveTab("rith")}
              className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-[#c9a84c] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" /> Back to Hub
            </button>
          ) : (
            <span className="text-sm font-black tracking-widest text-[#c9a84c]">MOAT AI HUB</span>
          )}
        </div>
        {activeTab === "rith" && <RithChat context={context} onSelectTool={setActiveTab} />}
        {activeTab === "patentability" && <GenericResearchModule type="patentability" label="Patentability Engine" context={context} />}
        {activeTab === "novelty" && <GenericResearchModule type="novelty" label="Novelty Search" context={context} />}
        {activeTab === "fto" && <GenericResearchModule type="fto" label="FTO Search" context={context} />}
        {activeTab === "validity" && <GenericResearchModule type="validity" label="Validity Search" context={context} />}
        {activeTab === "invalidity" && <GenericResearchModule type="invalidity" label="Invalidity Search" context={context} />}
        {activeTab === "landscape" && <GenericResearchModule type="landscape" label="Landscape Search" context={context} />}
        {activeTab === "design" && <GenericResearchModule type="design" label="Design Search" context={context} />}
        {activeTab === "features" && <KeyFeaturesModule context={context} />}
        {activeTab === "pfs" && <PfsGeneratorModule context={context} />}
        {activeTab === "history" && <HistoryModule context={context} onLoadSearch={(s) => setActiveTab(s)} />}
        {activeTab === "reports" && <SavedReportsModule context={context} />}
      </div>
    </div>
  );
}
