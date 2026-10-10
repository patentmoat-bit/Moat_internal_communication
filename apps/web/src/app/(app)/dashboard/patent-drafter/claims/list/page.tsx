"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  FileText, Save, Send, Image as ImageIcon, Sparkles, BookOpen, Search, Cpu, CheckCircle2, Copy 
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useActiveRole } from "@/components/auth/role-context";

export default function UnifiedDraftEditorPage() {
  const { currentUser } = useActiveRole();
  const searchParams = useSearchParams();
  const rawId = searchParams?.get('id');
  
  const [inventionId, setInventionId] = useState<string | null>(rawId);
  const [inventionData, setInventionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Editor State
  const [content, setContent] = useState("");
  const [recipient, setRecipient] = useState("Patent Analyst");
  const [actionStatus, setActionStatus] = useState<"idle" | "saving" | "sending" | "done">("idle");
  const [insertedImages, setInsertedImages] = useState<string[]>([]);

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
            setInventionData(asgData.assignments[0]);
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

  const handleImportBlock = (type: string) => {
    let text = "";
    if (type === "disclosures") text = "\n\n[INVENTION DISCLOSURE]\nBased on the core metadata, the system utilizes a machine learning model for thermostat routing.\n";
    if (type === "tech") text = "\n\n[TECHNICAL FIELD]\nThe present invention relates generally to energy management systems, and more specifically to dynamic thermal routing using edge AI.\n";
    if (type === "research") text = "\n\n[PRIOR ART / RESEARCH]\nIn contrast to US-10234987-B2 which uses cloud-based routing, the present invention executes locally on the edge node, eliminating latency.\n";
    if (type === "claims") text = "\n\n[CLAIMS]\n1. A smart energy management system comprising: a processor configured to execute a local routing model.\n";
    
    setContent(prev => prev + text);
  };

  const handleImportImage = () => {
    setInsertedImages([...insertedImages, "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=400&q=80"]);
    setContent(prev => prev + "\n\n[FIGURE INSERTED HERE]\n");
  };

  const handleSaveWorkspace = async () => {
    setActionStatus("saving");
    await new Promise(r => setTimeout(r, 1000));
    setActionStatus("done");
    setTimeout(() => setActionStatus("idle"), 2000);
  };

  const handleSendDocument = async () => {
    setActionStatus("sending");
    await new Promise(r => setTimeout(r, 1500));
    
    // Log to backend activity
    try {
      await fetch('/api/patent-drafter/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: `sent the Unified Draft Document to ${recipient}`,
          actor: currentUser.name,
          inventionId: inventionId || 'UNKNOWN'
        })
      });
    } catch(e) {}

    setActionStatus("done");
    setTimeout(() => setActionStatus("idle"), 2000);
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Editor Workspace...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-500" /> Unified Draft Editor
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Compile all disclosures, research, and technicals into a single master document.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Import Tools */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-bold text-sm text-slate-700 border-b pb-2">Import Blocks</h3>
              
              <Button variant="outline" className="w-full justify-start text-xs h-9 bg-white" onClick={() => handleImportBlock('disclosures')}>
                <BookOpen className="w-3.5 h-3.5 mr-2 text-blue-500" /> Disclosures
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs h-9 bg-white" onClick={() => handleImportBlock('tech')}>
                <Cpu className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Tech Field
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs h-9 bg-white" onClick={() => handleImportBlock('research')}>
                <Search className="w-3.5 h-3.5 mr-2 text-indigo-500" /> Prior Art Research
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs h-9 bg-white" onClick={() => handleImportBlock('claims')}>
                <Sparkles className="w-3.5 h-3.5 mr-2 text-amber-500" /> Drafted Claims
              </Button>

              <div className="pt-4 border-t">
                <Button variant="outline" className="w-full justify-start text-xs h-9 bg-white border-dashed border-slate-300 hover:border-indigo-400" onClick={handleImportImage}>
                  <ImageIcon className="w-3.5 h-3.5 mr-2 text-slate-500" /> Import Image / Figure
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm bg-indigo-50/50">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-bold text-sm text-indigo-900 border-b border-indigo-200 pb-2">Document Routing</h3>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-indigo-600 uppercase">Send To</label>
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                >
                  <option value="Patent Analyst">Patent Analyst (Review)</option>
                  <option value="CEO">CEO (Final Approval)</option>
                  <option value="Design Team">Design Team (Drawings)</option>
                </select>
              </div>

              <Button 
                onClick={handleSendDocument}
                disabled={actionStatus !== 'idle'}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {actionStatus === 'sending' ? 'Routing Document...' : actionStatus === 'done' ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Sent!</> : <><Send className="w-4 h-4 mr-2" /> Send Document</>}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: The Editor */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="border-border/50 shadow-sm h-full flex flex-col">
            <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                  {inventionData?.title || 'Drafting Document'}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 bg-white" onClick={handleSaveWorkspace}>
                  {actionStatus === 'saving' ? 'Saving...' : actionStatus === 'done' ? 'Saved' : <><Save className="w-3.5 h-3.5 mr-1" /> Save to Workspace</>}
                </Button>
                <Button variant="outline" size="sm" className="h-8 bg-white" onClick={() => { navigator.clipboard.writeText(content); alert('Copied to clipboard'); }}>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy All
                </Button>
              </div>
            </div>
            
            <CardContent className="p-0 flex-1 relative bg-slate-100/50 p-6">
              <div className="bg-white border border-slate-200 shadow-sm mx-auto max-w-4xl min-h-[600px] p-12 text-slate-800">
                <div className="border-b border-slate-200 pb-4 mb-6">
                  <h1 className="text-2xl font-black text-center">{inventionData?.title || 'Invention Draft'}</h1>
                  <p className="text-center text-slate-400 text-sm mt-2">Drafter: {currentUser.name}</p>
                </div>
                
                <Textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Start typing your draft, or import blocks from the left panel..."
                  className="min-h-[400px] border-none shadow-none focus-visible:ring-0 resize-none text-sm leading-relaxed p-0 bg-transparent placeholder:text-slate-300"
                />

                {/* Render Inserted Images at the bottom of the document */}
                {insertedImages.length > 0 && (
                  <div className="mt-8 space-y-6">
                    {insertedImages.map((src, idx) => (
                      <div key={idx} className="border border-slate-200 p-2 rounded-lg bg-slate-50">
                        <img src={src} alt="Imported Figure" className="w-full h-auto object-cover rounded shadow-sm" />
                        <p className="text-center text-xs text-slate-400 mt-2 font-mono">FIG. {idx + 1}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
