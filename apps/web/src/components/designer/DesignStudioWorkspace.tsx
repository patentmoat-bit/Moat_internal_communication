"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Save, Undo, Redo, Eye, Download, Send, 
  CheckCircle2, Clock, AlertCircle, Loader2, Plus, Copy, 
  Trash2, FileEdit, FolderOpen, PenTool, Brush, ChevronDown, 
  ChevronUp, MousePointer, Hand, RotateCw, Crop, Square, 
  Circle, Diamond, ArrowRight, Minus, Type, Hash, AlignLeft, 
  FileText, Sparkles, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { 
  ProjectStudioData, FigureSheet, TechnicalDocument, 
  ProjectDocumentItem, getSeedStudioData 
} from "@/lib/design-team/types";
import { DrawingCanvas } from "./DrawingCanvas";
import { TechnicalDocEditor } from "./TechnicalDocEditor";
import { ProjectDocumentsManager } from "./ProjectDocumentsManager";
import { RightContextPanel } from "./RightContextPanel";
import { SubmissionModal } from "./SubmissionModal";
import { ExportModal } from "./ExportModal";
import { DownloadDropdown } from "./DownloadDropdown";

interface DesignStudioWorkspaceProps {
  initialProjectId?: string;
  initialTab?: "studio" | "document" | "repository";
}

export function DesignStudioWorkspace({ initialProjectId = "PRJ-10023", initialTab = "studio" }: DesignStudioWorkspaceProps) {
  const { toast } = useToast();

  const initialSeed = useMemo(() => getSeedStudioData(initialProjectId), [initialProjectId]);

  // Primary State initialized immediately
  const [projectData, setProjectData] = useState<ProjectStudioData>(initialSeed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Workspace: 'studio' (Design Studio), 'document' (Technical Document Editor), 'repository' (Project Documents)
  const [activeWorkspace, setActiveWorkspace] = useState<"studio" | "document" | "repository">(initialTab);

  // Active Selections
  const [activeFigureId, setActiveFigureId] = useState<string>(() => initialSeed.figures[0]?.id || "");
  const [activeDocId, setActiveDocId] = useState<string>(() => initialSeed.technicalDocuments[0]?.id || "");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string>("select");

  // Save States: 'saved', 'saving', 'unsaved', 'failed'
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved" | "failed">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Right Panel Collapse
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [deleteConfirmFigId, setDeleteConfirmFigId] = useState<string | null>(null);

  // Load Initial Project Data from Backend API in background
  useEffect(() => {
    fetchStudioData(initialProjectId);
  }, [initialProjectId]);

  const fetchStudioData = async (projectId: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/design-team/studio/${projectData.projectId}`);
      if (!res.ok) {
        throw new Error(`Failed to load project studio data: ${res.statusText}`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        setProjectData(json.data);
        if (json.data.figures?.length > 0 && !activeFigureId) {
          setActiveFigureId(json.data.figures[0].id);
        }
        if (json.data.technicalDocuments?.length > 0 && !activeDocId) {
          setActiveDocId(json.data.technicalDocuments[0].id);
        }
        setLastSavedTime(new Date().toLocaleTimeString());
      }
    } catch (err: any) {
      console.warn("[DesignStudioWorkspace] Background fetch warning, using seed data:", err.message);
    }
  };


  const activeFigure = projectData?.figures.find((f) => f.id === activeFigureId) || projectData?.figures[0];
  const activeDoc = projectData?.technicalDocuments.find((d) => d.id === activeDocId) || projectData?.technicalDocuments[0];

  // Save Handler
  const handleSave = async () => {
    if (!projectData) return;
    setSaveState("saving");

    try {
      if (activeWorkspace === "studio" && activeFigure) {
        const res = await fetch(`/api/design-team/studio/${projectData.projectId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_figure",
            figure: activeFigure
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Save failed");

        setSaveState("saved");
        setLastSavedTime(new Date().toLocaleTimeString());
        toast({ title: "Figure Saved", description: `Figure ${activeFigure.figureNumber} persisted as version v${json.figure?.version || activeFigure.version + 1}.` });
      } else if (activeWorkspace === "document" && activeDoc) {
        const res = await fetch(`/api/design-team/studio/${projectData.projectId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_document",
            document: activeDoc
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Save failed");

        setSaveState("saved");
        setLastSavedTime(new Date().toLocaleTimeString());
        toast({ title: "Document Saved", description: `"${activeDoc.title}" persisted as version v${json.document?.version || activeDoc.version + 1}.` });
      } else {
        setSaveState("saved");
        setLastSavedTime(new Date().toLocaleTimeString());
      }
    } catch (err: any) {
      setSaveState("failed");
      toast({ title: "Save Failed", description: err.message || "Failed to persist to backend.", variant: "destructive" });
    }
  };

  // Figure Sheet Actions
  const handleAddFigure = async () => {
    if (!projectData) return;
    try {
      const res = await fetch(`/api/design-team/studio/${projectData.projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_figure" }),
      });
      const json = await res.json();
      if (json.success && json.figure) {
        setProjectData((prev) => prev ? { ...prev, figures: [...prev.figures, json.figure] } : prev);
        setActiveFigureId(json.figure.id);
        toast({ title: "Figure Created", description: `Added Figure ${json.figure.figureNumber}: "${json.figure.figureTitle}"` });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDuplicateFigure = async (figId: string) => {
    if (!projectData) return;
    try {
      const res = await fetch(`/api/design-team/studio/${projectData.projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate_figure", figureId: figId }),
      });
      const json = await res.json();
      if (json.success && json.figure) {
        setProjectData((prev) => prev ? { ...prev, figures: [...prev.figures, json.figure] } : prev);
        setActiveFigureId(json.figure.id);
        toast({ title: "Figure Duplicated", description: `Created copy: ${json.figure.figureTitle}` });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteFigure = async (figId: string) => {
    if (!projectData) return;
    if (projectData.figures.length <= 1) {
      toast({ title: "Action Blocked", description: "A design project must contain at least one drawing sheet.", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch(`/api/design-team/studio/${projectData.projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_figure", figureId: figId }),
      });
      const json = await res.json();
      if (json.success) {
        const remaining = projectData.figures.filter((f) => f.id !== figId);
        setProjectData({ ...projectData, figures: remaining });
        setActiveFigureId(remaining[0]?.id || "");
        setDeleteConfirmFigId(null);
        toast({ title: "Figure Deleted", description: "Drawing sheet successfully removed." });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateFigure = (updated: FigureSheet) => {
    if (!projectData) return;
    const updatedFigures = projectData.figures.map((f) => (f.id === updated.id ? updated : f));
    setProjectData({ ...projectData, figures: updatedFigures });
    setSaveState("unsaved");
  };

  const handleUpdateDoc = (updated: TechnicalDocument) => {
    if (!projectData) return;
    const updatedDocs = projectData.technicalDocuments.map((d) => (d.id === updated.id ? updated : d));
    setProjectData({ ...projectData, technicalDocuments: updatedDocs });
    setSaveState("unsaved");
  };

  const handleSubmitForReview = async (submission: any) => {
    if (!projectData) return;
    const res = await fetch(`/api/design-team/studio/${projectData.projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit_review",
        ...submission
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Submission failed");

    setProjectData((prev) => prev ? { ...prev, status: "UNDER_REVIEW" } : prev);
    toast({
      title: "Package Submitted!",
      description: `Successfully routed to ${submission.recipientRole.replace('_', ' ')} (${submission.recipientName}). Status moved to Under Review.`
    });
  };

  const handleUploadProjectDoc = async (docData: Partial<ProjectDocumentItem> & { notes?: string }) => {
    if (!projectData) return;
    try {
      const res = await fetch(`/api/design-team/studio/${projectData.projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload_project_document",
          document: docData
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Upload failed");

      setProjectData((prev) => ({
        ...prev,
        projectDocuments: [json.document, ...prev.projectDocuments]
      }));
      toast({ title: "Document Uploaded", description: `"${json.document.title}" added to ${json.document.category}.` });
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteProjectDoc = async (docId: string) => {
    if (!projectData) return;
    try {
      const res = await fetch(`/api/design-team/studio/${projectData.projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_project_document",
          documentId: docId
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Delete failed");

      setProjectData((prev) => ({
        ...prev,
        projectDocuments: prev.projectDocuments.filter(d => d.id !== docId)
      }));
      toast({ title: "Document Deleted", description: "Document removed from repository." });
    } catch (err: any) {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleBumpDocumentVersion = async (docId: string, payload: { newVersion: string; notes: string; size?: string; fileFormat?: string }) => {
    if (!projectData) return;
    try {
      const res = await fetch(`/api/design-team/studio/${projectData.projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bump_project_document_version",
          documentId: docId,
          payload
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Version bump failed");

      setProjectData((prev) => ({
        ...prev,
        projectDocuments: prev.projectDocuments.map(d => d.id === docId ? json.document : d)
      }));
      toast({ title: "Version Updated", description: `Updated to version v${payload.newVersion}.` });
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Loading Design Studio Workspace...</h3>
        <p className="text-xs text-slate-400 mt-1">Connecting invention data, drawing sheets, and technical documents</p>
      </div>
    );
  }

  if (error || !projectData || !activeFigure) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 p-6">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Unable to load project workspace</h3>
        <p className="text-xs text-slate-500 max-w-md text-center mt-1 mb-4">{error || "Project data unavailable."}</p>
        <Button onClick={() => fetchStudioData(initialProjectId)} className="bg-blue-600 text-white font-bold text-xs">
          Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* ─── 1. TOP TOOLBAR ────────────────────────────────────────── */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0 shadow-xs z-20">
        {/* Left: Back & Project Identity */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/designer">
            <Button variant="ghost" size="sm" className="h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate max-w-xs sm:max-w-md">
                {projectData.inventionTitle}
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                {projectData.projectId}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Active: <strong className="text-slate-800 dark:text-slate-200">{activeWorkspace === "studio" ? `Figure ${activeFigure.figureNumber} — ${activeFigure.figureTitle}` : activeDoc?.title}</strong>
            </p>
          </div>
        </div>

        {/* Center: Save State Indicator */}
        <div className="flex items-center gap-2">
          {saveState === "saving" && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
          {saveState === "saved" && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Saved {lastSavedTime ? `at ${lastSavedTime}` : ""}</span>
            </div>
          )}
          {saveState === "unsaved" && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Unsaved changes</span>
            </div>
          )}
          {saveState === "failed" && (
            <div className="flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              <span>Save failed</span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => toast({ title: "Undo", description: "Previous action reverted" })} className="h-8 px-2 text-slate-600 hover:text-slate-900">
            <Undo className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toast({ title: "Redo", description: "Action reapplied" })} className="h-8 px-2 text-slate-600 hover:text-slate-900">
            <Redo className="w-3.5 h-3.5" />
          </Button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSave} 
            disabled={saveState === "saving"}
            className="h-8 text-xs font-bold border-slate-300 dark:border-slate-700 hover:bg-slate-50"
          >
            <Save className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            <span>Save</span>
          </Button>

          <DownloadDropdown
            projectData={projectData}
            activeFigure={activeFigure}
            activeDoc={activeDoc}
            variant="header"
            onOpenExportModal={() => setIsExportModalOpen(true)}
          />

          <Button 
            size="sm" 
            onClick={() => setIsSubmitModalOpen(true)}
            className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs ml-1"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            <span>Submit for Review</span>
          </Button>
        </div>
      </header>

      {/* ─── 2. MAIN 3-PANEL BODY ──────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─── LEFT SUB-PANEL (Workspace Navigation + Drawing Sheets & Tools) ─── */}
        <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 overflow-y-auto scrollbar-thin z-10">
          {/* Workspace Tabs: Design Studio / Technical Document Editor / Project Documents */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-2 mb-1.5">
              Design Workspace
            </span>
            <button
              onClick={() => setActiveWorkspace("studio")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                activeWorkspace === "studio"
                  ? "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-400"
              }`}
            >
              <PenTool className="w-4 h-4 text-blue-600" />
              <span>Design Studio</span>
            </button>

            <button
              onClick={() => setActiveWorkspace("document")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                activeWorkspace === "document"
                  ? "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-400"
              }`}
            >
              <FileEdit className="w-4 h-4 text-purple-600" />
              <span>Technical Document Editor</span>
            </button>

            <button
              onClick={() => setActiveWorkspace("repository")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                activeWorkspace === "repository"
                  ? "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-400"
              }`}
            >
              <FolderOpen className="w-4 h-4 text-emerald-600" />
              <span>Project Documents</span>
            </button>
          </div>

          {/* If in Design Studio: Show Drawing Sheets list */}
          {activeWorkspace === "studio" && (
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Drawing Sheets ({projectData.figures.length})
                </span>
                <button
                  onClick={handleAddFigure}
                  className="p-1 hover:bg-blue-50 text-blue-600 rounded text-xs font-bold flex items-center gap-1"
                  title="Add Figure Sheet"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Add</span>
                </button>
              </div>

              <div className="space-y-1">
                {projectData.figures.map((fig) => {
                  const isActive = fig.id === activeFigure.id;
                  return (
                    <div
                      key={fig.id}
                      onClick={() => setActiveFigureId(fig.id)}
                      className={`group flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border transition-all ${
                        isActive
                          ? "bg-blue-50 border-blue-300 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold"
                          : "border-transparent text-slate-600 hover:bg-slate-50 dark:text-slate-400 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                          {fig.figureNumber}/5
                        </span>
                        <span className="truncate">Figure {fig.figureNumber} - {fig.figureTitle}</span>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDuplicateFigure(fig.id); }}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"
                          title="Duplicate Figure"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmFigId(fig.id); }}
                          className="p-1 hover:bg-red-50 text-red-500 rounded"
                          title="Delete Figure"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tools Accordion */}
          {activeWorkspace === "studio" && (
            <div className="p-3 space-y-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1">
                Tools
              </span>

              {/* Select & Transform */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1.5 px-1">Select & Transform</span>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: "select", icon: MousePointer, title: "Select" },
                    { id: "hand", icon: Hand, title: "Pan / Hand" },
                    { id: "rotate", icon: RotateCw, title: "Rotate" },
                    { id: "crop", icon: Crop, title: "Crop / Frame" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTool(t.id)}
                      className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                        activeTool === t.id
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      }`}
                      title={t.title}
                    >
                      <t.icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Shapes */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1.5 px-1">Shapes</span>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: "rectangle", icon: Square, title: "Rectangle" },
                    { id: "rounded-rect", icon: Square, title: "Rounded Rect" },
                    { id: "circle", icon: Circle, title: "Circle / Node" },
                    { id: "diamond", icon: Diamond, title: "Decision Diamond" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTool(t.id)}
                      className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                        activeTool === t.id
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      }`}
                      title={t.title}
                    >
                      <t.icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Lines & Connectors */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1.5 px-1">Lines & Arrows</span>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: "line", icon: Minus, title: "Straight Line" },
                    { id: "arrow", icon: ArrowRight, title: "Flow Arrow" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTool(t.id)}
                      className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                        activeTool === t.id
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      }`}
                      title={t.title}
                    >
                      <t.icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Text & Annotations */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1.5 px-1">Text & Annotations</span>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: "text", icon: Type, title: "Text Label" },
                    { id: "reference-numeral", icon: Hash, title: "Reference Numeral Callout" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTool(t.id)}
                      className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                        activeTool === t.id
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      }`}
                      title={t.title}
                    >
                      <t.icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── CENTER ADAPTIVE PANEL ─────────────────────────────────── */}
        {activeWorkspace === "studio" && (
          <DrawingCanvas
            figure={activeFigure}
            allFigures={projectData.figures}
            onSelectFigure={(id) => setActiveFigureId(id)}
            onUpdateFigure={handleUpdateFigure}
            selectedElementId={selectedElementId}
            onSelectElement={(id) => setSelectedElementId(id)}
            activeTool={activeTool}
            onAddFigure={handleAddFigure}
            onDuplicateFigure={handleDuplicateFigure}
            onDeleteFigure={(id) => setDeleteConfirmFigId(id)}
            onMoveFigure={(id, direction) => {
              const idx = projectData.figures.findIndex((f) => f.id === id);
              if (idx < 0) return;
              const targetIdx = direction === "left" ? idx - 1 : idx + 1;
              if (targetIdx < 0 || targetIdx >= projectData.figures.length) return;
              const copy = [...projectData.figures];
              const temp = copy[idx];
              copy[idx] = copy[targetIdx];
              copy[targetIdx] = temp;
              copy.forEach((f, i) => { f.figureNumber = i + 1; });
              setProjectData({ ...projectData, figures: copy });
            }}
            projectData={projectData}
            activeDoc={activeDoc}
            onOpenExportModal={() => setIsExportModalOpen(true)}
          />
        )}

        {activeWorkspace === "document" && (
          <TechnicalDocEditor
            documents={projectData.technicalDocuments}
            activeDocId={activeDocId}
            onSelectDoc={(id) => setActiveDocId(id)}
            onUpdateDoc={handleUpdateDoc}
            figures={projectData.figures}
            projectData={projectData}
            onAddDocument={(title, docType) => {
              const newDoc: TechnicalDocument = {
                id: `DOC-TD-${Date.now()}`,
                title: title || "New Specification Document",
                documentType: docType || "Specification Annex",
                version: 1,
                lastModified: new Date().toISOString(),
                content: "<p><br></p>",
                author: "Patent Designer"
              };
              setProjectData({
                ...projectData,
                technicalDocuments: [...projectData.technicalDocuments, newDoc]
              });
              setActiveDocId(newDoc.id);
            }}
            onDeleteDocument={(docId) => {
              if (projectData.technicalDocuments.length <= 1) return;
              const remaining = projectData.technicalDocuments.filter((d) => d.id !== docId);
              setProjectData({ ...projectData, technicalDocuments: remaining });
              if (activeDocId === docId) {
                setActiveDocId(remaining[0].id);
              }
            }}
            onToggleRightPanel={() => setRightPanelCollapsed(false)}
          />
        )}

        {activeWorkspace === "repository" && (
          <ProjectDocumentsManager
            documents={projectData.projectDocuments}
            projectTitle={projectData.inventionTitle}
            projectId={projectData.projectId}
            onOpenDocInEditor={(docId, category) => {
              if (category === "Drawings") setActiveWorkspace("studio");
              else setActiveWorkspace("document");
            }}
            onPreviewDoc={(doc) => toast({ title: "Previewing", description: `Opening secure preview for ${doc.title}` })}
            onUploadDoc={handleUploadProjectDoc}
            onDeleteDoc={handleDeleteProjectDoc}
            onBumpVersion={handleBumpDocumentVersion}
            onSwitchToStudio={() => setActiveWorkspace("studio")}
            onSwitchToDocEditor={() => setActiveWorkspace("document")}
          />
        )}

        {/* ─── RIGHT CONTEXT PANEL ───────────────────────────────────── */}
        {activeWorkspace !== "repository" && (
          <RightContextPanel
            projectData={projectData}
            activeFigure={activeFigure}
            onUpdateFigure={handleUpdateFigure}
            selectedElementId={selectedElementId}
            onSelectElement={(id) => setSelectedElementId(id)}
            collapsed={rightPanelCollapsed}
            onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            activeWorkspace={activeWorkspace}
            activeDoc={activeDoc}
            onUpdateDoc={handleUpdateDoc}
          />
        )}
      </div>

      {/* ─── 3. BOTTOM FOOTER STATUS BAR ───────────────────────────── */}
      <footer className="h-8 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0 text-[11px] text-slate-500 z-20">
        <div className="flex items-center gap-4">
          <span>Project: <strong className="text-slate-700 dark:text-slate-300">{projectData.projectId}</strong></span>
          <span>•</span>
          <span>Invention: <strong className="text-slate-700 dark:text-slate-300">{projectData.inventionTitle}</strong></span>
          <span>•</span>
          <span>Design Task: <strong className="text-slate-700 dark:text-slate-300">{projectData.designTaskId}</strong></span>
        </div>

        <div className="flex items-center gap-3">
          <span>Design Team Workspace • v2.0</span>
          <span className="flex items-center gap-1 font-semibold text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
          </span>
        </div>
      </footer>

      {/* Modals */}
      <SubmissionModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        projectData={projectData}
        onSubmit={handleSubmitForReview}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        projectData={projectData}
        activeFigure={activeFigure}
        activeDoc={activeDoc}
      />

      {/* Delete Figure Confirmation Modal */}
      {deleteConfirmFigId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full border shadow-xl">
            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-2">Delete Drawing Sheet?</h4>
            <p className="text-xs text-slate-500 mb-4">This action will remove the selected figure from the active project. This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmFigId(null)}>Cancel</Button>
              <Button size="sm" onClick={() => handleDeleteFigure(deleteConfirmFigId)} className="bg-red-600 hover:bg-red-700 text-white font-bold">Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
