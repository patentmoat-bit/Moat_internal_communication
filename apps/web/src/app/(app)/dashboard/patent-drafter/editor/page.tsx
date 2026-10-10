"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Save, 
  Download,
  Layers,
  FileText,
  Clock,
  Sparkles,
  Bookmark,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ThreePanelEditor() {
  const searchParams = useSearchParams();
  const isReviewMode = searchParams?.get("mode") === "review";
  const isViewMode = searchParams?.get("mode") === "view";
  const [feedback, setFeedback] = useState("");
  const [drafterFeedback, setDrafterFeedback] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const id = searchParams?.get("id") || "NEW_DRAFT";
  
  // Left Panel State: Draft Library
  const [drafts, setDrafts] = useState<any[]>([]);
  const [draftId, setDraftId] = useState<string | null>(id !== 'NEW_DRAFT' ? id : null);

  // Editor State
  const sections = ["Title", "Abstract", "Background", "Summary", "Description", "Claims"];
  const [activeSection, setActiveSection] = useState("Background");
  const [content, setContent] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Right Panel: Reference Data
  const [referenceData, setReferenceData] = useState<any>({
    title: "Loading...",
    overview: "",
    problem: "",
    solution: "",
    keywords: []
  });

  useEffect(() => {
    const fetchContext = async () => {
      if (id && id !== 'NEW_DRAFT') {
        // We are editing an existing draft
        const draftsRes = await fetch('/api/patent-drafter/drafts');
        const draftsData = await draftsRes.json();
        if (draftsData.drafts) {
          setDrafts(draftsData.drafts);
          const current = draftsData.drafts.find((d: any) => d.id === id);
          if (current) {
            setContent(current.content || {});
            setDrafterFeedback(current.feedback || "");
            setDraftStatus(current.status);
            
            // fetch assignment context using project_id
            const assignRes = await fetch('/api/patent-drafter/assignments');
            const assignData = await assignRes.json();
            const proj = assignData.assignments?.find((a: any) => a.invention_id === current.project_id);
            if (proj) {
              setReferenceData({
                title: proj.title,
                overview: proj.instructions || "No instructions provided.",
                problem: "Data processing inefficiency in distributed environments.",
                solution: "A novel routing layer that partitions data across hybrid memory stores.",
                keywords: ["Routing", "Distributed", "Hybrid Memory"]
              });
            }
          }
        }
      } else {
        // New Draft
        const draftsRes = await fetch('/api/patent-drafter/drafts');
        const draftsData = await draftsRes.json();
        if (draftsData.drafts) setDrafts(draftsData.drafts);
        
        setReferenceData({
          title: "Smart Energy Management System",
          overview: "A system for managing energy using IoT.",
          problem: "High energy waste in commercial buildings.",
          solution: "Machine learning predictive thermostat.",
          keywords: ["IoT", "Machine Learning", "Energy"]
        });
      }
    };
    fetchContext();
  }, [id]);

  const handleGenerateDraft = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setContent({
        ...content,
        [activeSection]: `This is an AI-generated draft for ${activeSection} based on ${referenceData.title}. \n\nThe problem described is: ${referenceData.problem}\n\nThe proposed solution involves: ${referenceData.solution}\n\nKey aspects include: ${referenceData.keywords.join(', ')}.`
      });
      setIsGenerating(false);
    }, 1500);
  };

  const handleSubmitForReview = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!draftId) {
      alert("Please save the draft first before submitting for review!");
      return;
    }
    if (!confirm("Are you sure you want to submit this draft to the Patent Analyst for review?")) return;
    
    const btn = e.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Submitting...';
    btn.disabled = true;
    
    try {
      const res = await fetch('/api/patent-drafter/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draftId,
          status: 'SUBMITTED_FOR_REVIEW'
        })
      });
      const data = await res.json();
      if (data.success) {
        btn.innerHTML = 'Submitted ✓';
        btn.classList.replace('bg-blue-50', 'bg-emerald-50');
        btn.classList.replace('text-blue-700', 'text-emerald-700');
        return; // Leave as submitted
      }
    } catch(e) {}

    btn.innerHTML = originalText;
    btn.disabled = false;
  };

  const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Saving...';
    btn.disabled = true;
    
    try {
      const res = await fetch('/api/patent-drafter/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draftId,
          project_id: id === 'NEW_DRAFT' ? 'INN-0012' : id,
          title: referenceData.title || "Untitled Draft",
          content: content
        })
      });
      const data = await res.json();
      if (data.success) {
        setDraftId(data.draft.id);
        // Refresh library
        const refRes = await fetch('/api/patent-drafter/drafts');
        const refData = await refRes.json();
        if (refData.drafts) setDrafts(refData.drafts);
        const current = refData.drafts.find((d: any) => d.id === data.draft.id);
        if (current) { setDrafterFeedback(current.feedback || ""); setDraftStatus(current.status); }
      }
    } catch(e) {}

    setTimeout(() => {
      btn.innerHTML = 'Saved ✓';
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 2000);
    }, 500);
  };

  const handleDownload = () => {
    const blob = new Blob([content[activeSection] || ''], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Draft_${activeSection}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col bg-background overflow-hidden">
      
      {/* Header */}
      <div className="h-14 border-b border-border/50 bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/patent-drafter">
            <Button variant="ghost" size="icon" className="hover:bg-muted"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="font-black text-lg text-foreground tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" /> Draft Editor
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isViewMode ? (
            <>
              <Button variant="outline" size="sm" className="font-bold shadow-sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" /> Download Final
              </Button>
            </>
          ) : isReviewMode ? (
            <>
              <Button size="sm" className="font-bold shadow-sm bg-rose-50 text-rose-700 border-rose-200" onClick={async (e) => {
                if (!feedback) { alert("Please provide feedback in the right panel before requesting revisions."); return; }
                const btn = e.currentTarget; btn.innerHTML = 'Sending...'; btn.disabled = true;
                await fetch('/api/patent-drafter/drafts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draftId, status: 'REVISION_REQUIRED', feedback }) });
                window.location.href = '/dashboard/patent-drafter/drafts/under-review';
              }}>Request Revisions</Button>
              <Button size="sm" className="font-bold shadow-sm bg-emerald-600 text-white" onClick={async (e) => {
                const btn = e.currentTarget; btn.innerHTML = 'Approving...'; btn.disabled = true;
                await fetch('/api/patent-drafter/drafts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draftId, status: 'APPROVED', feedback: "Approved." }) });
                window.location.href = '/dashboard/patent-drafter/drafts/completed';
              }}>Approve Draft</Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" className="font-bold shadow-sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
              <Button variant="outline" size="sm" className="font-bold shadow-sm bg-blue-50 text-blue-700 border-blue-200" onClick={handleSubmitForReview}>
                Submit for Review
              </Button>
              <Button size="sm" className="font-bold shadow-sm bg-blue-600 text-white" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" /> Save Draft
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 3-Panel Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Panel: Draft Library & Sections */}
        <div className="w-64 border-r border-border/50 bg-muted/10 flex flex-col">
          <div className="p-4 border-b border-border/50 font-black text-sm text-muted-foreground uppercase tracking-wider">
            Document Sections
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sections.map(sec => (
              <button 
                key={sec}
                onClick={() => setActiveSection(sec)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeSection === sec ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'hover:bg-muted text-foreground'}`}
              >
                {sec}
              </button>
            ))}
          </div>
          <div className="p-4 border-t border-border/50 font-black text-sm text-muted-foreground uppercase tracking-wider">
            My Drafts History
          </div>
          <div className="h-48 overflow-y-auto p-2 space-y-1 bg-muted/20">
            {drafts.map(d => (
              <div key={d.id} className="p-2 rounded hover:bg-muted cursor-pointer" onClick={() => { if (!isReviewMode && !isViewMode) { setContent(d.content || {}); setDraftId(d.id); setDrafterFeedback(d.feedback || ""); setDraftStatus(d.status); } }}>
                <div className="text-xs font-bold text-foreground">{d.title}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(d.last_modified).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Panel: Editor */}
        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 relative">
          <div className="h-12 border-b border-border/50 flex items-center justify-between px-4 bg-muted/5">
            <h2 className="font-bold text-lg">{activeSection}</h2>
            {(!isReviewMode && !isViewMode) && <Button variant="outline" size="sm" className="bg-purple-50 text-purple-700 border-purple-200 font-bold text-xs" onClick={handleGenerateDraft} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "✨ Generate Draft from Invention"}
            </Button>}
          </div>
          
          {drafterFeedback && draftStatus === 'REVISION_REQUIRED' && !isReviewMode && (
            <div className="mx-4 mt-4 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm">
              <span className="font-bold flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4" /> Analyst Feedback - Revision Required:</span>
              <p>{drafterFeedback}</p>
            </div>
          )}
          
          <div className="flex-1 p-8 overflow-y-auto">
            <Textarea 
              value={content[activeSection] || ''}
              onChange={(e) => setContent({...content, [activeSection]: e.target.value})}
              className="w-full h-full min-h-[500px] resize-none border-0 shadow-none focus-visible:ring-0 text-base leading-relaxed p-0 bg-transparent"
              placeholder={`Start typing your ${activeSection} here, or click Generate Draft to draft from source material...`}
              readOnly={isReviewMode || isViewMode}
            />
          </div>
        </div>

        {/* Right Panel: Reference or Review */}
        <div className="w-80 border-l border-border/50 bg-muted/10 flex flex-col overflow-y-auto">
          {isViewMode ? (
            <>
              <div className="p-4 border-b border-border/50 font-black text-sm text-emerald-600 uppercase tracking-wider flex items-center gap-2">
                <Bookmark className="w-4 h-4" /> Final Approval Status
              </div>
              <div className="p-4 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground mb-1">Approval Outcome</h4>
                  <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded">Approved and finalized for filing.</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground mb-1">Final Analyst Feedback</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{drafterFeedback || "Approved."}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground mb-1">Version Locked</h4>
                  <p className="text-sm text-muted-foreground">Any further changes require a new assignment workflow.</p>
                </div>
              </div>
            </>
          ) : isReviewMode ? (
            <>
              <div className="p-4 border-b border-border/50 font-black text-sm text-rose-600 uppercase tracking-wider flex items-center gap-2">
                <Bookmark className="w-4 h-4" /> Analyst Feedback
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <p className="text-sm font-semibold mb-2">Provide Revision Notes:</p>
                <Textarea 
                  className="flex-1 resize-none bg-white border-rose-200 focus-visible:ring-rose-500" 
                  placeholder="Enter detailed feedback here for the drafter to revise..."
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div className="p-4 border-b border-border/50 font-black text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4" /> Invention Reference
              </div>
              <div className="p-4 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground mb-1">Invention Title</h4>
                  <p className="text-sm font-semibold">{referenceData.title}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground mb-1">Technical Overview</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{referenceData.overview}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground mb-1">Problem</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{referenceData.problem}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground mb-1">Solution</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{referenceData.solution}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground mb-2">Extracted Keywords</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {referenceData.keywords?.map((k: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-bold border border-blue-200">{k}</span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
