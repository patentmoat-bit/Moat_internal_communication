"use client";

import React, { useState } from "react";
import { 
  Download, X, FileText, Image as ImageIcon, CheckCircle2, 
  Layers, FileCode, Printer, Loader2, Sparkles, FolderArchive,
  Archive, FileCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { FigureSheet, TechnicalDocument, ProjectStudioData } from "@/lib/design-team/types";
import {
  exportFigureAsImage,
  exportFigureAsPDF,
  exportAllFiguresAsPDF,
  exportSpecificationAsDOCX,
  exportSpecificationAsPDF,
  exportCompleteBundleZIP
} from "@/lib/design-team/studioExportHelper";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectData: ProjectStudioData;
  activeFigure: FigureSheet;
  activeDoc?: TechnicalDocument;
  onExportCompleted?: () => void;
}

export function ExportModal({
  isOpen,
  onClose,
  projectData,
  activeFigure,
  activeDoc,
  onExportCompleted
}: ExportModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"drawings" | "documents">("drawings");
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [lastExported, setLastExported] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportAction = async (type: string, run: () => Promise<string>, title: string) => {
    setExportingType(type);
    try {
      const filename = await run();
      setLastExported(filename);
      toast({
        title: "Export Completed",
        description: `Successfully exported ${filename} and recorded in Project Documents.`,
        variant: "success"
      });
      if (onExportCompleted) onExportCompleted();
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err.message || "Failed to generate export file.",
        variant: "destructive"
      });
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Export Patent Deliverables
              </h3>
              <p className="text-xs text-slate-500">
                Official high-resolution patent prosecution packages with automatic repository indexing.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-5 pt-3 pb-0 border-b border-slate-100 dark:border-slate-800 flex gap-4">
          <button
            onClick={() => setActiveTab("drawings")}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "drawings"
                ? "border-purple-600 text-purple-600 dark:text-purple-400"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Drawing Exports (FIG. 1-{projectData.figures.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "documents"
                ? "border-purple-600 text-purple-600 dark:text-purple-400"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Specification & Docs</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-3 max-h-[460px] overflow-y-auto custom-scrollbar">
          {activeTab === "drawings" ? (
            <>
              {/* Option 1: Multi-Figure Combined PDF */}
              <button
                onClick={() => handleExportAction("pdf_bundle", () => exportAllFiguresAsPDF(projectData, activeFigure), "Drawing Package PDF")}
                disabled={!!exportingType}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border-2 border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-600 text-white shadow-xs">
                    <FolderArchive className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                        Combined Drawings Package (Multi-Sheet PDF)
                      </p>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-200 text-purple-800 uppercase">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Packages all {projectData.figures.length} figures into a single USPTO 37 CFR 1.84 filing document with cover sheet.
                    </p>
                  </div>
                </div>
                {exportingType === "pdf_bundle" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                ) : (
                  <Download className="w-4 h-4 text-purple-600 group-hover:translate-y-0.5 transition-transform" />
                )}
              </button>

              {/* Option 2: Single Figure PDF */}
              <button
                onClick={() => handleExportAction("single_pdf", () => exportFigureAsPDF(activeFigure, projectData), `FIG. ${activeFigure.figureNumber} PDF`)}
                disabled={!!exportingType}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <Printer className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Export FIG. {activeFigure.figureNumber} as USPTO Single Sheet (PDF)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Exact 1-inch printable margins, sheet {activeFigure.figureNumber} of {projectData.figures.length}, and callouts.
                    </p>
                  </div>
                </div>
                {exportingType === "single_pdf" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                )}
              </button>

              {/* Option 3: High-Res PNG */}
              <button
                onClick={() => handleExportAction("png", () => exportFigureAsImage(activeFigure, projectData, "png"), "PNG 300 DPI")}
                disabled={!!exportingType}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Export FIG. {activeFigure.figureNumber} as High-Res PNG (300 DPI)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Crisp raster linework on pure white background for client presentations.
                    </p>
                  </div>
                </div>
                {exportingType === "png" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                ) : (
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                )}
              </button>

              {/* Option 4: Scalable Vector SVG */}
              <button
                onClick={() => handleExportAction("svg", () => exportFigureAsImage(activeFigure, projectData, "svg"), "Vector SVG")}
                disabled={!!exportingType}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <FileCode className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Export FIG. {activeFigure.figureNumber} as Scalable Vector (SVG)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Lossless XML vector data for Illustrator, Visio, or CAD post-processing.
                    </p>
                  </div>
                </div>
                {exportingType === "svg" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                ) : (
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                )}
              </button>

              {/* Option 5: Complete Deliverables ZIP */}
              <button
                onClick={() => handleExportAction("zip", () => exportCompleteBundleZIP(projectData, activeFigure, activeDoc), "Patent Package ZIP")}
                disabled={!!exportingType}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <Archive className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Export Complete Deliverables Package (.zip)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      All drawing sheets (PDF/PNG/SVG) + Word Specification + USPTO manifest.
                    </p>
                  </div>
                </div>
                {exportingType === "zip" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                ) : (
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                )}
              </button>
            </>
          ) : (
            <>
              {/* DOCX Word */}
              <button
                onClick={() => handleExportAction("docx", () => exportSpecificationAsDOCX(projectData, activeDoc, activeFigure), "Specification DOCX")}
                disabled={!!exportingType}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border-2 border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 hover:border-blue-500 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-600 text-white shadow-xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                        Export Specification as Word Document (.docx)
                      </p>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-200 text-blue-800 uppercase">
                        Full Rich-Text
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Native DOCX with headings, USPTO paragraph blocks, and complete Numeral Concordance Schedule.
                    </p>
                  </div>
                </div>
                {exportingType === "docx" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <Download className="w-4 h-4 text-blue-600 group-hover:translate-y-0.5 transition-transform" />
                )}
              </button>

              {/* Specification PDF */}
              <button
                onClick={() => handleExportAction("doc_pdf", () => exportSpecificationAsPDF(projectData, activeDoc), "Specification PDF")}
                disabled={!!exportingType}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <FileCheck className="w-5 h-5 text-rose-600" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Export Specification as USPTO Formal PDF
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Formatted per 37 CFR 1.77 with standardized margins and metadata block.
                    </p>
                  </div>
                </div>
                {exportingType === "doc_pdf" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                ) : (
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
                )}
              </button>
            </>
          )}

          {/* Last Exported Banner */}
          {lastExported && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold truncate">Generated & Indexed: {lastExported}</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold">
                STORED
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Automatic Repository Registration Enabled</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
