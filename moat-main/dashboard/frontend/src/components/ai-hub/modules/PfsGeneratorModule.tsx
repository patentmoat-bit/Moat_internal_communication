"use client";

import React, { useState } from "react";
import { AiHubContext } from "../AiHubWorkspace";
import { Button } from "@/components/ui/button";
import { FileOutput, Sparkles, Loader2, Save, FileDown, DownloadCloud } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { createBrowserClient } from "@supabase/ssr";

export default function PfsGeneratorModule({ context }: { context: AiHubContext }) {
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pfsContent, setPfsContent] = useState<string | null>(null);
  const [resolvedProjectId, setResolvedProjectId] = useState<string | null>(context.projectId);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleGenerate = async () => {
    setLoading(true);
    try {
      let activeProjectId = resolvedProjectId;

      // If launched directly from sidebar without a project context, auto-resolve the most recent project
      if (!activeProjectId) {
        const projRes = await fetch("/api/ceo/projects");
        const projData = await projRes.json();
        if (projData && projData.length > 0) {
          activeProjectId = projData[0].id;
          setResolvedProjectId(activeProjectId);
        } else {
          alert("No projects found in your database. Please create a project first.");
          setLoading(false);
          return;
        }
      }

      const res = await fetch(`/api/reports/pfs?project_id=${activeProjectId}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setPfsContent(data.markdown);
    } catch (e: any) {
      console.error(e);
      alert("Failed to compile Enterprise PFS. Ensure you have finalized at least one search report for this project.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePfs = async () => {
    if (!pfsContent) return;
    if (!resolvedProjectId) return;
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/reports/pfs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: resolvedProjectId, content: pfsContent })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      alert("Enterprise PFS Document securely locked into the Workflow Engine!");
    } catch (e: any) {
      console.error(e);
      alert("Failed to save PFS to the aggregation engine.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b flex items-center justify-between bg-background">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileOutput className="h-5 w-5 text-indigo-600" />
            PFS Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Generate a Patent Feature Summary from your collected AI Hub research and extracted features.</p>
        </div>
        <Button onClick={handleGenerate} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 font-bold">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generate PFS
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {!pfsContent && !loading && (
          <div className="text-center p-12 border border-dashed rounded-lg bg-muted/10">
            <FileOutput className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-bold">Ready to generate PFS</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
              The AI will compile all Key Features, Rith conversations, and Research Reports associated with this project context to build a unified summary.
            </p>
          </div>
        )}

        {loading && (
          <div className="p-12 flex flex-col items-center justify-center text-muted-foreground space-y-4 border rounded-lg bg-muted/20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm font-medium animate-pulse">Compiling research context into PFS...</p>
          </div>
        )}

        {pfsContent && !loading && (
          <div className="space-y-4 flex flex-col h-full">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Generated PFS</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold text-indigo-600 border-indigo-200" onClick={handleSavePfs} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Save className="h-3 w-3 mr-1.5" />} 
                  {isSaving ? "Saving..." : "Save to Database"}
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={() => alert("PDF Export is currently in development.")}>
                  <DownloadCloud className="h-3 w-3 mr-1.5" /> Export PDF
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={() => alert("DOCX Export is currently in development.")}>
                  <FileDown className="h-3 w-3 mr-1.5" /> Export DOCX
                </Button>
              </div>
            </div>
            
            <Textarea 
              value={pfsContent}
              onChange={(e) => setPfsContent(e.target.value)}
              className="flex-1 w-full min-h-[400px] font-mono text-sm resize-none bg-background p-6"
            />
          </div>
        )}
      </div>
    </div>
  );
}
