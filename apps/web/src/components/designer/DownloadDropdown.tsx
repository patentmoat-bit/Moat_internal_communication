"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Download, ChevronDown, FileText, Layers, FileCode, 
  Image as ImageIcon, FileCheck, FileEdit, Archive, 
  Sparkles, Loader2, Check 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { FigureSheet, ProjectStudioData, TechnicalDocument } from "@/lib/design-team/types";
import {
  exportFigureAsImage,
  exportFigureAsPDF,
  exportAllFiguresAsPDF,
  exportSpecificationAsDOCX,
  exportSpecificationAsPDF,
  exportCompleteBundleZIP
} from "@/lib/design-team/studioExportHelper";

interface DownloadDropdownProps {
  projectData: ProjectStudioData;
  activeFigure: FigureSheet;
  activeDoc?: TechnicalDocument;
  variant?: "header" | "canvas" | "compact";
  onOpenExportModal?: () => void;
}

export function DownloadDropdown({
  projectData,
  activeFigure,
  activeDoc,
  variant = "header",
  onOpenExportModal
}: DownloadDropdownProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Esc
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleAction = async (type: string, runExport: () => Promise<string>, successMsg: string) => {
    try {
      setLoadingType(type);
      const filename = await runExport();
      toast({
        title: "Download Started",
        description: `Successfully generated ${filename}. Saved to your downloads.`,
        variant: "success"
      });
      setIsOpen(false);
    } catch (err: any) {
      console.error("Export error:", err);
      toast({
        title: "Download Failed",
        description: err.message || "Failed to generate file for download.",
        variant: "destructive"
      });
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      {/* Trigger Button */}
      {variant === "canvas" ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`h-7 px-2.5 rounded border flex items-center gap-1.5 text-[11px] font-bold cursor-pointer transition-all shadow-xs ${
            isOpen
              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
              : "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/60"
          }`}
          title="Download drawing sheet as PDF, DOCX, PNG, SVG or ZIP"
        >
          {loadingType ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Download className="w-3 h-3" />
          )}
          <span>Download</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={`h-8 text-xs font-bold border-slate-300 dark:border-slate-700 transition-all ${
            isOpen ? "bg-slate-100 dark:bg-slate-800 border-blue-500 ring-2 ring-blue-500/20" : "hover:bg-slate-50"
          }`}
        >
          {loadingType ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-blue-600" />
          ) : (
            <Download className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
          )}
          <span>Download</span>
          <ChevronDown className={`w-3 h-3 ml-1.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </Button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className={`absolute z-50 mt-1.5 w-80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-1 text-slate-800 dark:text-slate-100 animate-in fade-in-80 zoom-in-95 duration-100 ${
            variant === "canvas" ? "left-0" : "right-0"
          }`}
          style={{ maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Deliverables Download
              </span>
              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                {activeFigure ? `FIG. ${activeFigure.figureNumber} • ${activeFigure.figureTitle}` : projectData.projectId}
              </p>
            </div>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              USPTO 37 CFR
            </span>
          </div>

          <div className="p-1 space-y-0.5">
            {/* ─── GROUP: PDF DOCUMENTS ─── */}
            <div className="px-2 pt-1.5 pb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                PDF Documents
              </span>
            </div>

            {/* Current Figure PDF */}
            <button
              type="button"
              disabled={!!loadingType}
              onClick={() =>
                handleAction(
                  "fig_pdf",
                  () => exportFigureAsPDF(activeFigure, projectData),
                  "Current Figure Sheet PDF generated"
                )
              }
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-7 h-7 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold group-hover:text-blue-600 truncate">
                    FIG. {activeFigure.figureNumber} Sheet (PDF)
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    Official 37 CFR 1.84 1-inch printable margins
                  </p>
                </div>
              </div>
              {loadingType === "fig_pdf" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600 shrink-0" />
              ) : (
                <span className="text-[10px] font-mono font-semibold text-slate-400 shrink-0 ml-1">.pdf</span>
              )}
            </button>

            {/* Complete Drawing Package PDF */}
            <button
              type="button"
              disabled={!!loadingType}
              onClick={() =>
                handleAction(
                  "bundle_pdf",
                  () => exportAllFiguresAsPDF(projectData, activeFigure),
                  "Complete Drawing Package PDF generated"
                )
              }
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-7 h-7 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold group-hover:text-blue-600 truncate">
                    Complete Drawing Package (PDF)
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    All {projectData.figures.length} figures + USPTO cover & concordance
                  </p>
                </div>
              </div>
              {loadingType === "bundle_pdf" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600 shrink-0" />
              ) : (
                <span className="text-[10px] font-mono font-semibold text-slate-400 shrink-0 ml-1">.pdf</span>
              )}
            </button>

            {/* Technical Specification PDF */}
            <button
              type="button"
              disabled={!!loadingType}
              onClick={() =>
                handleAction(
                  "spec_pdf",
                  () => exportSpecificationAsPDF(projectData, activeDoc),
                  "Technical Specification PDF generated"
                )
              }
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold group-hover:text-blue-600 truncate">
                    Technical Specification (PDF)
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    37 CFR 1.77 formatted specification & claims
                  </p>
                </div>
              </div>
              {loadingType === "spec_pdf" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
              ) : (
                <span className="text-[10px] font-mono font-semibold text-slate-400 shrink-0 ml-1">.pdf</span>
              )}
            </button>

            {/* ─── GROUP: WORD / DOCX ─── */}
            <div className="px-2 pt-2 pb-1 border-t border-slate-100 dark:border-slate-800 mt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Word Document
              </span>
            </div>

            {/* Word DOCX */}
            <button
              type="button"
              disabled={!!loadingType}
              onClick={() =>
                handleAction(
                  "docx",
                  () => exportSpecificationAsDOCX(projectData, activeDoc, activeFigure),
                  "Word Specification DOCX generated"
                )
              }
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-blue-50/70 dark:hover:bg-blue-950/30 transition-colors group"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                  <FileEdit className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black text-blue-900 dark:text-blue-200 truncate">
                      Specification & Concordance (.docx)
                    </p>
                    <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Word
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    Editable paragraphs, claims, & complete schedule table
                  </p>
                </div>
              </div>
              {loadingType === "docx" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
              ) : (
                <span className="text-[10px] font-mono font-bold text-blue-600 shrink-0 ml-1">.docx</span>
              )}
            </button>

            {/* ─── GROUP: IMAGES ─── */}
            <div className="px-2 pt-2 pb-1 border-t border-slate-100 dark:border-slate-800 mt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Drawing Images
              </span>
            </div>

            {/* PNG (300 DPI) */}
            <button
              type="button"
              disabled={!!loadingType}
              onClick={() =>
                handleAction(
                  "png",
                  () => exportFigureAsImage(activeFigure, projectData, "png"),
                  "High-Res PNG drawing generated"
                )
              }
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-6 h-6 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold group-hover:text-blue-600 truncate">
                    High-Res PNG (300 DPI)
                  </p>
                </div>
              </div>
              {loadingType === "png" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" />
              ) : (
                <span className="text-[10px] font-mono text-slate-400 shrink-0">.png</span>
              )}
            </button>

            {/* Scalable Vector SVG */}
            <button
              type="button"
              disabled={!!loadingType}
              onClick={() =>
                handleAction(
                  "svg",
                  () => exportFigureAsImage(activeFigure, projectData, "svg"),
                  "Vector SVG drawing generated"
                )
              }
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-6 h-6 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
                  <FileCode className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold group-hover:text-blue-600 truncate">
                    Scalable Vector Graphic (SVG)
                  </p>
                </div>
              </div>
              {loadingType === "svg" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" />
              ) : (
                <span className="text-[10px] font-mono text-slate-400 shrink-0">.svg</span>
              )}
            </button>

            {/* JPEG */}
            <button
              type="button"
              disabled={!!loadingType}
              onClick={() =>
                handleAction(
                  "jpeg",
                  () => exportFigureAsImage(activeFigure, projectData, "jpeg"),
                  "JPEG image generated"
                )
              }
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-6 h-6 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold group-hover:text-blue-600 truncate">
                    Standard Web Image (JPEG)
                  </p>
                </div>
              </div>
              {loadingType === "jpeg" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600 shrink-0" />
              ) : (
                <span className="text-[10px] font-mono text-slate-400 shrink-0">.jpg</span>
              )}
            </button>

            {/* ─── GROUP: COMPLETE PACKAGE ─── */}
            <div className="px-2 pt-2 pb-1 border-t border-slate-100 dark:border-slate-800 mt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Full Package
              </span>
            </div>

            {/* Complete ZIP Package */}
            <button
              type="button"
              disabled={!!loadingType}
              onClick={() =>
                handleAction(
                  "zip",
                  () => exportCompleteBundleZIP(projectData, activeFigure, activeDoc),
                  "Complete Patent Package ZIP generated"
                )
              }
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <Archive className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold group-hover:text-blue-600 truncate">
                    Complete Patent Deliverables (.zip)
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    Drawings (PDF/PNG/SVG) + Word DOCX + Manifest
                  </p>
                </div>
              </div>
              {loadingType === "zip" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" />
              ) : (
                <span className="text-[10px] font-mono font-bold text-emerald-600 shrink-0 ml-1">.zip</span>
              )}
            </button>
          </div>

          {/* Footer Action to open full modal if desired */}
          {onOpenExportModal && (
            <div className="p-1 border-t border-slate-100 dark:border-slate-800 mt-1 bg-slate-50/70 dark:bg-slate-800/40 rounded-b-xl">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenExportModal();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                <span>Open Export & Archive Manager</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
