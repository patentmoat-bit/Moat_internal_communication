"use client";

import { exportSourceDocumentPDF } from "@/lib/design-team/studioExportHelper";

import React, { useState } from "react";
import { 
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Layers, 
  Settings2, Eye, EyeOff, Lock, Unlock, Trash2, FileText, 
  ExternalLink, Download, CheckCircle, ShieldAlert, Sparkles, BookOpen,
  Hash, Copy, Check, Edit3, Plus, ArrowUp, ArrowDown, AlignLeft, AlignCenter, AlignRight,
  Move, Type, Palette, CornerDownRight, Square, Bold, Italic, Underline, Strikethrough,
  Subscript, Superscript, AlignJustify, List, ListOrdered, Indent, Outdent, Highlighter,
  Printer, FileSpreadsheet, FileCode, FileDown, CheckCircle2
} from "lucide-react";
import { FigureSheet, DrawingElement, ProjectStudioData, TechnicalDocument } from "@/lib/design-team/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface RightContextPanelProps {
  projectData: ProjectStudioData;
  activeFigure: FigureSheet;
  onUpdateFigure: (updated: FigureSheet) => void;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeWorkspace?: "studio" | "document" | "repository";
  activeDoc?: TechnicalDocument;
  onUpdateDoc?: (updated: TechnicalDocument) => void;
}

export function RightContextPanel({
  projectData,
  activeFigure,
  onUpdateFigure,
  selectedElementId,
  onSelectElement,
  collapsed,
  onToggleCollapse,
  activeWorkspace = "studio",
  activeDoc,
  onUpdateDoc
}: RightContextPanelProps) {
  const { toast } = useToast();
  const isDocumentMode = activeWorkspace === "document";
  const [activeTab, setActiveTab] = useState<"properties" | "layers" | "numerals">("properties");
  const [docTab, setDocTab] = useState<"text" | "docProps" | "numerals">("text");
  const [copiedConcordance, setCopiedConcordance] = useState(false);

  // Automatically switch to text tab whenever document mode becomes active
  React.useEffect(() => {
    if (isDocumentMode) {
      setDocTab("text");
    }
  }, [isDocumentMode]);

  // Listen for direct focus requests from TechnicalDocEditor ribbon
  React.useEffect(() => {
    const handleFocusTextTab = () => {
      setDocTab("text");
    };
    window.addEventListener("patent-doc-focus-text-tab", handleFocusTextTab);
    return () => window.removeEventListener("patent-doc-focus-text-tab", handleFocusTextTab);
  }, []);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    problem: false,
    solution: false,
    technical: false,
    references: false,
    sourceDocs: true,
    instructions: false,
    claims: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDownloadSourceDoc = async (docName: string) => {
    try {
      const filename = await exportSourceDocumentPDF(docName, projectData);
      toast({
        title: "Document Downloaded",
        description: `Generated and downloaded ${filename}.`,
        variant: "success"
      });
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err.message || "Failed to download document",
        variant: "destructive"
      });
    }
  };

  const selectedElement = activeFigure.elements.find((el) => el.id === selectedElementId);

  const handleUpdateElement = (updatedEl: Partial<DrawingElement>) => {
    if (!selectedElementId) return;
    const updated = activeFigure.elements.map((el) => {
      if (el.id === selectedElementId) {
        return { ...el, ...updatedEl };
      }
      return el;
    });
    onUpdateFigure({ ...activeFigure, elements: updated });
  };

  const handleDeleteElement = (id: string) => {
    const updated = activeFigure.elements.filter((el) => el.id !== id);
    onUpdateFigure({ ...activeFigure, elements: updated });
    if (selectedElementId === id) {
      onSelectElement(null);
    }
  };

  const handleDuplicateElement = (element: DrawingElement) => {
    const newEl: DrawingElement = {
      ...element,
      id: `el-${Date.now()}`,
      x: element.x + 20,
      y: element.y + 20,
      refNumber: element.refNumber ? String(Number(element.refNumber) + 2) : undefined
    };
    onUpdateFigure({ ...activeFigure, elements: [...activeFigure.elements, newEl] });
    onSelectElement(newEl.id);
  };

  const handleMoveZIndex = (id: string, direction: "up" | "down") => {
    const idx = activeFigure.elements.findIndex((e) => e.id === id);
    if (idx < 0) return;
    const elements = [...activeFigure.elements];
    if (direction === "up" && idx < elements.length - 1) {
      const temp = elements[idx];
      elements[idx] = elements[idx + 1];
      elements[idx + 1] = temp;
    } else if (direction === "down" && idx > 0) {
      const temp = elements[idx];
      elements[idx] = elements[idx - 1];
      elements[idx - 1] = temp;
    }
    onUpdateFigure({ ...activeFigure, elements });
  };

  const handleAddElementFromProps = (type: "rounded-rect" | "rectangle" | "enclave" | "text" | "arrow" | "connector") => {
    const nextNum = activeFigure.figureNumber * 100 + (activeFigure.elements.length + 1) * 2;
    const newId = `el-${Date.now()}`;
    let newEl: DrawingElement;
    if (type === "enclave") {
      newEl = {
        id: newId,
        type: "rectangle",
        x: 180,
        y: 90,
        width: 580,
        height: 380,
        text: `Hardware Isolated Enclave (${nextNum})`,
        strokeColor: "#0f172a",
        fillColor: "transparent",
        strokeWidth: 2,
        strokeStyle: "dashed",
        textVAlign: "middle"
      };
    } else if (type === "text") {
      newEl = {
        id: newId,
        type: "text",
        x: 350,
        y: 50,
        width: 250,
        height: 30,
        text: "New Text Label",
        fontSize: 14,
        fontWeight: "bold",
        fillColor: "transparent",
        strokeColor: "#0f172a"
      };
    } else if (type === "arrow" || type === "connector") {
      newEl = {
        id: newId,
        type: type,
        x: 300,
        y: 200,
        width: 100,
        height: 30,
        from: { x: 300, y: 200 },
        to: { x: 400, y: 200 },
        strokeColor: "#0f172a",
        strokeWidth: 2,
        strokeStyle: "solid"
      };
    } else {
      newEl = {
        id: newId,
        type: type,
        x: 240,
        y: 160,
        width: 180,
        height: 80,
        text: "New Component",
        subText: "Component description",
        refNumber: String(nextNum),
        strokeColor: "#0f172a",
        fillColor: "#ffffff",
        strokeWidth: 2
      };
    }
    onUpdateFigure({ ...activeFigure, elements: [...activeFigure.elements, newEl] });
    onSelectElement(newEl.id);
  };

  if (collapsed) {
    return (
      <div className="w-10 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col items-center py-4 shrink-0 shadow-xs z-10">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800"
          title="Expand Project Context & Properties"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 my-4" />
        <button
          onClick={() => { onToggleCollapse(); setActiveTab("properties"); }}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 my-2"
          title="Properties"
        >
          <Settings2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => { onToggleCollapse(); setActiveTab("layers"); }}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800"
          title="Layers"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Document command helper: dispatches to TechnicalDocEditor and executes document.execCommand
  const executeDocCommand = (command: string, value: string | undefined = undefined) => {
    window.dispatchEvent(new CustomEvent("patent-doc-format", { detail: { command, value } }));
    try {
      document.execCommand(command, false, value);
    } catch (e) {}
  };

  const handleDocAddPage = () => {
    window.dispatchEvent(new CustomEvent("patent-doc-add-page"));
  };

  const handleDocExport = (format: "pdf" | "docx" | "md" | "txt" | "print") => {
    window.dispatchEvent(new CustomEvent("patent-doc-export", { detail: { format } }));
  };

  const allReferenceNumerals: Array<{ num: string; label: string; figNum: number }> = React.useMemo(() => {
    const list: Array<{ num: string; label: string; figNum: number }> = [];
    projectData.figures.forEach((fig) => {
      fig.elements.forEach((el) => {
        if (el.refNumber && !list.some((r) => r.num === el.refNumber)) {
          list.push({
            num: el.refNumber,
            label: el.text || "Component Node",
            figNum: fig.figureNumber
          });
        }
      });
    });
    return list.sort((a, b) => Number(a.num) - Number(b.num));
  }, [projectData.figures]);

  const handleInsertNumeralToDoc = (num: string, label: string) => {
    const htmlSnippet = ` <strong>${num}</strong> (<span style="color: #475569;">${label}</span>) `;
    executeDocCommand("insertHTML", htmlSnippet);
    toast({ title: "Numeral Inserted", description: `Added [${num}] (${label}) to active document.` });
  };

  const handleInsertConcordanceTableToDoc = () => {
    const tableHtml = `
<table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%; margin: 16px 0; border: 1px solid #cbd5e1; font-size: 12px;">
  <thead>
    <tr style="background-color: #f8fafc; text-align: left;">
      <th style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">Reference Numeral</th>
      <th style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">Component Element</th>
      <th style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">Primary Figure</th>
      <th style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">Specification Section</th>
    </tr>
  </thead>
  <tbody>
    ${allReferenceNumerals.slice(0, 10).map((r) => `
    <tr><td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>${r.num}</strong></td><td style="padding: 8px; border: 1px solid #cbd5e1;">${r.label}</td><td style="padding: 8px; border: 1px solid #cbd5e1;">FIG. ${r.figNum}</td><td style="padding: 8px; border: 1px solid #cbd5e1;">Detailed Description</td></tr>
    `).join("")}
  </tbody>
</table><p></p>`;
    executeDocCommand("insertHTML", tableHtml);
    toast({ title: "Table Inserted", description: "Reference numeral concordance schedule added." });
  };

  return (
    <div className="w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 shadow-xs z-10 overflow-hidden">
      {/* Top Header & Tab Switcher */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-bold w-full">
          {isDocumentMode ? (
            <>
              <button
                onClick={() => setDocTab("text")}
                className={`flex-1 py-1 px-2 rounded-md transition-all flex items-center justify-center gap-1 ${
                  docTab === "text"
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Text Formatting & Typography"
              >
                <Type className="w-3.5 h-3.5" />
                <span>Text</span>
              </button>
              <button
                onClick={() => setDocTab("docProps")}
                className={`flex-1 py-1 px-2 rounded-md transition-all flex items-center justify-center gap-1 ${
                  docTab === "docProps"
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Document Properties & Pages"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Doc</span>
              </button>
              <button
                onClick={() => setDocTab("numerals")}
                className={`flex-1 py-1 px-2 rounded-md transition-all flex items-center justify-center gap-1 ${
                  docTab === "numerals"
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Concordance Numerals"
              >
                <Hash className="w-3.5 h-3.5" />
                <span>Numerals</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab("properties")}
                className={`flex-1 py-1 px-2 rounded-md transition-all flex items-center justify-center gap-1 ${
                  activeTab === "properties"
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Props</span>
              </button>
              <button
                onClick={() => setActiveTab("layers")}
                className={`flex-1 py-1 px-2 rounded-md transition-all flex items-center justify-center gap-1 ${
                  activeTab === "layers"
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Layers</span>
              </button>
              <button
                onClick={() => setActiveTab("numerals")}
                className={`flex-1 py-1 px-2 rounded-md transition-all flex items-center justify-center gap-1 ${
                  activeTab === "numerals"
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                <span>Numerals</span>
              </button>
            </>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="ml-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 shrink-0"
          title="Collapse Panel"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {isDocumentMode ? (
          docTab === "text" ? (
            /* ─── DOCUMENT TEXT FORMATTING PANEL ─── */
            <div className="space-y-5">
              {/* Header */}
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Text Formatting Panel
                </span>
                <p className="text-[11px] text-slate-500">
                  Format selected text, apply patent headings, and adjust typography.
                </p>
              </div>

              {/* Headings & Block Formats */}
              <div className="space-y-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                  Paragraph Style
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => executeDocCommand("formatBlock", "p")}
                    className="h-8 text-xs font-semibold justify-start px-2.5 hover:bg-blue-50"
                  >
                    <span>Normal Text</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => executeDocCommand("formatBlock", "h1")}
                    className="h-8 text-xs font-bold justify-start px-2.5 hover:bg-blue-50"
                  >
                    <span>Title (H1)</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => executeDocCommand("formatBlock", "h2")}
                    className="h-8 text-xs font-bold justify-start px-2.5 hover:bg-blue-50 text-blue-700 dark:text-blue-400"
                  >
                    <span>Section (H2)</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => executeDocCommand("formatBlock", "h3")}
                    className="h-8 text-xs font-semibold justify-start px-2.5 hover:bg-blue-50"
                  >
                    <span>Subsection (H3)</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const claimHtml = `
<blockquote style="border-left: 4px solid #2563eb; background-color: #eff6ff; padding: 12px 18px; margin: 16px 0; border-radius: 4px; font-style: normal;">
  <strong style="color: #1d4ed8; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Independent Patent Claim</strong>
  <p style="margin: 0; color: #1e293b;">1. An automated security apparatus comprising: a hardware-isolated neural validation enclave, an encrypted telemetry ingestion bus, and a cryptographic verification circuit.</p>
</blockquote><p></p>`;
                      executeDocCommand("insertHTML", claimHtml);
                    }}
                    className="h-8 text-[11px] font-bold justify-start px-2 text-blue-700 bg-blue-50/50 hover:bg-blue-100"
                  >
                    <FileText className="w-3 h-3 mr-1 text-blue-600" />
                    <span>Claim Box</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => executeDocCommand("formatBlock", "pre")}
                    className="h-8 text-[11px] font-mono justify-start px-2 text-slate-700 hover:bg-slate-100"
                  >
                    <FileCode className="w-3 h-3 mr-1 text-slate-500" />
                    <span>Code Block</span>
                  </Button>
                </div>
              </div>

              {/* Typography: Font Family & Size */}
              <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                  Typography & Font
                </span>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Font Family</label>
                  <select
                    onChange={(e) => executeDocCommand("fontName", e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 focus:outline-none"
                  >
                    <option value="Inter, sans-serif">Inter (Modern Clean)</option>
                    <option value="'Times New Roman', serif">Times New Roman (USPTO Standard)</option>
                    <option value="Arial, sans-serif">Arial (High Legibility)</option>
                    <option value="Georgia, serif">Georgia (Editorial)</option>
                    <option value="'Courier New', monospace">Courier (Typewriter / Claims)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Font Size (Preset)</label>
                  <div className="grid grid-cols-4 gap-1">
                    {["10", "12", "14", "18"].map((sz) => (
                      <Button
                        key={sz}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => executeDocCommand("fontSize", sz === "10" ? "2" : sz === "12" ? "3" : sz === "14" ? "4" : "5")}
                        className="h-7 text-xs font-semibold"
                      >
                        {sz}pt
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Inline Character Styles */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Character Styles</label>
                  <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => executeDocCommand("bold")}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 flex-1 flex justify-center"
                      title="Bold (Ctrl+B)"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeDocCommand("italic")}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 flex-1 flex justify-center"
                      title="Italic (Ctrl+I)"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeDocCommand("underline")}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 flex-1 flex justify-center"
                      title="Underline (Ctrl+U)"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeDocCommand("strikeThrough")}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 flex-1 flex justify-center"
                      title="Strikethrough"
                    >
                      <Strikethrough className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeDocCommand("subscript")}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 flex-1 flex justify-center"
                      title="Subscript"
                    >
                      <Subscript className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeDocCommand("superscript")}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 flex-1 flex justify-center"
                      title="Superscript"
                    >
                      <Superscript className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Alignment & Line Spacing */}
              <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                  Alignment & Flow
                </span>

                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button type="button" onClick={() => executeDocCommand("justifyLeft")} className="p-1.5 hover:bg-slate-200 rounded flex-1 flex justify-center" title="Align Left">
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => executeDocCommand("justifyCenter")} className="p-1.5 hover:bg-slate-200 rounded flex-1 flex justify-center" title="Align Center">
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => executeDocCommand("justifyRight")} className="p-1.5 hover:bg-slate-200 rounded flex-1 flex justify-center" title="Align Right">
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => executeDocCommand("justifyFull")} className="p-1.5 hover:bg-slate-200 rounded flex-1 flex justify-center" title="Justify (USPTO Format)">
                    <AlignJustify className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => executeDocCommand("insertUnorderedList")} className="h-8 flex-1 text-xs">
                    <List className="w-3 h-3 mr-1" /> Bullet List
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => executeDocCommand("insertOrderedList")} className="h-8 flex-1 text-xs">
                    <ListOrdered className="w-3 h-3 mr-1" /> Numbered
                  </Button>
                </div>
              </div>

              {/* Highlight & Text Color */}
              <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                  Highlight Marker
                </span>
                <div className="flex items-center gap-1.5">
                  {[
                    { color: "#fef08a", label: "Yellow" },
                    { color: "#bbf7d0", label: "Green" },
                    { color: "#bae6fd", label: "Blue" },
                    { color: "#fbcfe8", label: "Pink" },
                    { color: "#fed7aa", label: "Orange" }
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => executeDocCommand("hiliteColor", c.color)}
                      className="w-6 h-6 rounded-full border border-slate-300 hover:scale-110 transition-transform shadow-xs"
                      style={{ backgroundColor: c.color }}
                      title={`Highlight ${c.label}`}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => executeDocCommand("hiliteColor", "transparent")}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 ml-auto px-2 py-0.5 border rounded"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Patent Quick Inserts */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                  Quick Inserts
                </span>
                <div className="space-y-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      executeDocCommand("insertHTML", `<p><strong>[0001]</strong> </p>`);
                    }}
                    className="w-full h-8 text-xs font-semibold justify-start text-blue-700 hover:bg-blue-50"
                  >
                    <span className="font-mono font-bold mr-1.5 text-blue-600">[¶]</span>
                    <span>Insert Paragraph Number [0001]</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleInsertConcordanceTableToDoc}
                    className="w-full h-8 text-xs font-semibold justify-start text-slate-700 hover:bg-slate-50"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    <span>Insert Concordance Table</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const box = `
<div style="background-color: #fffbeb; border: 1px solid #f59e0b; border-left-width: 4px; padding: 12px 16px; margin: 16px 0; border-radius: 6px;">
  <strong style="color: #92400e; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Important Operational Constraint</strong>
  <p style="margin: 0; font-size: 12px; color: #1e293b;">Describe the technical precondition or hardware boundary condition here.</p>
</div><p></p>`;
                      executeDocCommand("insertHTML", box);
                    }}
                    className="w-full h-8 text-xs font-semibold justify-start text-amber-700 hover:bg-amber-50"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                    <span>Insert Operational Constraint Box</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : docTab === "docProps" ? (
            /* ─── DOCUMENT DETAILS & PAGE MANAGEMENT PANEL ─── */
            <div className="space-y-5">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Document Details
                </span>
                <p className="text-[11px] text-slate-500">
                  Manage specification metadata, pages, and exports.
                </p>
              </div>

              {/* Title & Section Form */}
              <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Document Title
                  </label>
                  <input
                    type="text"
                    value={activeDoc?.title || ""}
                    onChange={(e) => {
                      if (activeDoc && onUpdateDoc) {
                        onUpdateDoc({ ...activeDoc, title: e.target.value });
                      }
                    }}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Section Type
                  </label>
                  <input
                    type="text"
                    value={activeDoc?.documentType || ""}
                    onChange={(e) => {
                      if (activeDoc && onUpdateDoc) {
                        onUpdateDoc({ ...activeDoc, documentType: e.target.value });
                      }
                    }}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Version</span>
                    <strong className="text-slate-800 dark:text-slate-200">v{activeDoc?.version || 1}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Author</span>
                    <strong className="text-slate-800 dark:text-slate-200 truncate block">{activeDoc?.author || "Design Lead"}</strong>
                  </div>
                </div>
              </div>

              {/* Page Controls */}
              <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                  Page Management
                </span>

                <Button
                  type="button"
                  onClick={handleDocAddPage}
                  className="w-full h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Page (Page Break)</span>
                </Button>

                <p className="text-[10px] text-slate-400 leading-normal">
                  Tip: Press <kbd className="px-1 py-0.5 bg-slate-100 border rounded font-mono text-[9px]">Ctrl+Enter</kbd> anytime inside the document to instantly insert a new page.
                </p>
              </div>

              {/* Direct Document Downloads */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                  Download & Export
                </span>

                <div className="space-y-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDocExport("pdf")}
                    className="w-full h-8 text-xs font-bold justify-start text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <FileText className="w-3.5 h-3.5 mr-2 text-red-600" />
                    <span>Download as Official PDF</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDocExport("docx")}
                    className="w-full h-8 text-xs font-bold justify-start text-blue-700 hover:bg-blue-50 border-blue-200"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 mr-2 text-blue-600" />
                    <span>Download as Word (.docx)</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDocExport("md")}
                    className="w-full h-8 text-xs font-semibold justify-start text-slate-700 hover:bg-slate-50"
                  >
                    <FileCode className="w-3.5 h-3.5 mr-2 text-slate-600" />
                    <span>Download Markdown (.md)</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDocExport("print")}
                    className="w-full h-8 text-xs font-semibold justify-start text-slate-700 hover:bg-slate-50"
                  >
                    <Printer className="w-3.5 h-3.5 mr-2 text-slate-600" />
                    <span>Print Specification</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* ─── DOCUMENT NUMERALS CONCORDANCE TAB ─── */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                    Drawing Numerals
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Click any numeral to insert into document.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {allReferenceNumerals.length} elements
                </span>
              </div>

              <div className="space-y-1.5 max-h-[480px] overflow-y-auto scrollbar-thin">
                {allReferenceNumerals.map((r) => (
                  <div
                    key={r.num}
                    onClick={() => handleInsertNumeralToDoc(r.num, r.label)}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer text-xs transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono font-black text-blue-600 bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded text-[11px]">
                        [{r.num}]
                      </span>
                      <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                        {r.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      FIG. {r.figNum}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleInsertConcordanceTableToDoc}
                className="w-full h-8 text-xs font-bold text-blue-700 bg-blue-50/40 hover:bg-blue-100"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Insert Concordance Table</span>
              </Button>
            </div>
          )
        ) : activeTab === "properties" ? (
          <>
            {/* Figure Details Section */}
            <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Figure Details
              </span>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Figure Number
                </label>
                <input
                  type="number"
                  value={activeFigure.figureNumber}
                  onChange={(e) => onUpdateFigure({ ...activeFigure, figureNumber: Number(e.target.value) })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Figure Title
                </label>
                <input
                  type="text"
                  value={activeFigure.figureTitle}
                  onChange={(e) => onUpdateFigure({ ...activeFigure, figureTitle: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={activeFigure.description}
                  onChange={(e) => onUpdateFigure({ ...activeFigure, description: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Element Style Section (When an element is selected) */}
            <div className="space-y-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  {selectedElement ? "Element Properties" : `Elements in Figure ${activeFigure.figureNumber}`}
                </span>
                {selectedElement && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-blue-600 font-bold bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded uppercase font-mono">
                      {selectedElement.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateElement({ locked: !selectedElement.locked })}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-700"
                      title={selectedElement.locked ? "Unlock element" : "Lock element"}
                    >
                      {selectedElement.locked ? <Lock className="w-3 h-3 text-amber-500" /> : <Unlock className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteElement(selectedElement.id)}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded text-slate-400 hover:text-red-600"
                      title="Delete element"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {selectedElement ? (
                <div className="space-y-3.5">
                  {/* Element Text & Ref Number */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Label Text (Title)
                    </label>
                    <textarea
                      rows={2}
                      value={selectedElement.text || ""}
                      onChange={(e) => handleUpdateElement({ text: e.target.value })}
                      placeholder="Element title..."
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Subtext / Description */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Subtitle / Description (subText)
                    </label>
                    <textarea
                      rows={2}
                      value={selectedElement.subText || ""}
                      onChange={(e) => handleUpdateElement({ subText: e.target.value })}
                      placeholder="e.g. Non-volatile crossbar array / Attestation accelerator"
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Reference Numeral
                      </label>
                      <input
                        type="text"
                        value={selectedElement.refNumber || ""}
                        onChange={(e) => handleUpdateElement({ refNumber: e.target.value })}
                        placeholder="e.g. 302"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Vertical Alignment
                      </label>
                      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
                        {(["top", "middle", "bottom"] as const).map((align) => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => handleUpdateElement({ textVAlign: align })}
                            className={`flex-1 text-[10px] py-1 rounded capitalize font-semibold transition-all ${
                              (selectedElement.textVAlign || "middle") === align
                                ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs font-bold"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Alignment & Typography */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Text Align
                      </label>
                      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
                        <button
                          type="button"
                          onClick={() => handleUpdateElement({ textAlign: "left" })}
                          className={`flex-1 p-1 flex items-center justify-center rounded ${
                            selectedElement.textAlign === "left" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs" : "text-slate-500"
                          }`}
                          title="Align Left"
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateElement({ textAlign: "center" })}
                          className={`flex-1 p-1 flex items-center justify-center rounded ${
                            (!selectedElement.textAlign || selectedElement.textAlign === "center") ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs" : "text-slate-500"
                          }`}
                          title="Align Center"
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateElement({ textAlign: "right" })}
                          className={`flex-1 p-1 flex items-center justify-center rounded ${
                            selectedElement.textAlign === "right" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs" : "text-slate-500"
                          }`}
                          title="Align Right"
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Font Size
                      </label>
                      <select
                        value={selectedElement.fontSize || 13}
                        onChange={(e) => handleUpdateElement({ fontSize: Number(e.target.value) })}
                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      >
                        <option value={10}>10px (Small)</option>
                        <option value={11}>11px</option>
                        <option value={12}>12px</option>
                        <option value={13}>13px (Default)</option>
                        <option value={14}>14px</option>
                        <option value={16}>16px (Title)</option>
                        <option value={18}>18px</option>
                        <option value={20}>20px</option>
                      </select>
                    </div>
                  </div>

                  {/* Position & Dimensions */}
                  {selectedElement.type === "arrow" || selectedElement.type === "connector" ? (
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Connector Points (X, Y)
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        <div>
                          <span className="text-[9px] text-slate-400 block">From X</span>
                          <input
                            type="number"
                            value={selectedElement.from?.x || 0}
                            onChange={(e) => handleUpdateElement({ from: { x: Number(e.target.value), y: selectedElement.from?.y || 0 } })}
                            className="w-full text-xs px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block">From Y</span>
                          <input
                            type="number"
                            value={selectedElement.from?.y || 0}
                            onChange={(e) => handleUpdateElement({ from: { x: selectedElement.from?.x || 0, y: Number(e.target.value) } })}
                            className="w-full text-xs px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block">To X</span>
                          <input
                            type="number"
                            value={selectedElement.to?.x || 0}
                            onChange={(e) => handleUpdateElement({ to: { x: Number(e.target.value), y: selectedElement.to?.y || 0 } })}
                            className="w-full text-xs px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block">To Y</span>
                          <input
                            type="number"
                            value={selectedElement.to?.y || 0}
                            onChange={(e) => handleUpdateElement({ to: { x: selectedElement.to?.x || 0, y: Number(e.target.value) } })}
                            className="w-full text-xs px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Position & Dimensions (px)
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        <div>
                          <span className="text-[9px] text-slate-400 block">X</span>
                          <input
                            type="number"
                            value={selectedElement.x}
                            onChange={(e) => handleUpdateElement({ x: Number(e.target.value) })}
                            className="w-full text-xs px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block">Y</span>
                          <input
                            type="number"
                            value={selectedElement.y}
                            onChange={(e) => handleUpdateElement({ y: Number(e.target.value) })}
                            className="w-full text-xs px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block">Width</span>
                          <input
                            type="number"
                            value={selectedElement.width}
                            onChange={(e) => handleUpdateElement({ width: Number(e.target.value) })}
                            className="w-full text-xs px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block">Height</span>
                          <input
                            type="number"
                            value={selectedElement.height}
                            onChange={(e) => handleUpdateElement({ height: Number(e.target.value) })}
                            className="w-full text-xs px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Colors & Fill Controls */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Stroke Color
                      </label>
                      <input
                        type="color"
                        value={selectedElement.strokeColor || "#0f172a"}
                        onChange={(e) => handleUpdateElement({ strokeColor: e.target.value })}
                        className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Fill Color
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={selectedElement.fillColor === "transparent" ? "#ffffff" : (selectedElement.fillColor || "#ffffff")}
                          onChange={(e) => handleUpdateElement({ fillColor: e.target.value })}
                          className="w-10 h-8 rounded border border-slate-200 cursor-pointer shrink-0"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateElement({ fillColor: selectedElement.fillColor === "transparent" ? "#ffffff" : "transparent" })}
                          className={`flex-1 text-[10px] font-bold h-8 px-1.5 rounded border transition-colors ${
                            selectedElement.fillColor === "transparent"
                              ? "bg-blue-50 border-blue-300 text-blue-700"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {selectedElement.fillColor === "transparent" ? "⚪ Clear" : "⬜ Solid"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Line Weight & Line Style */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Line Weight
                      </label>
                      <select
                        value={selectedElement.strokeWidth || 2}
                        onChange={(e) => handleUpdateElement({ strokeWidth: Number(e.target.value) })}
                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      >
                        <option value={1}>1px</option>
                        <option value={1.5}>1.5px (Standard)</option>
                        <option value={2}>2px (USPTO Standard)</option>
                        <option value={3}>3px (Bold)</option>
                        <option value={4}>4px</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Line Style
                      </label>
                      <select
                        value={selectedElement.strokeStyle || "solid"}
                        onChange={(e) => handleUpdateElement({ strokeStyle: e.target.value as any })}
                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      >
                        <option value="solid">Solid ───</option>
                        <option value="dashed">Dashed - - -</option>
                        <option value="dotted">Dotted •••</option>
                      </select>
                    </div>
                  </div>

                  {/* Corner Style (for box shapes) */}
                  {(selectedElement.type === "rectangle" || selectedElement.type === "rounded-rect") && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Box Corner Radius
                      </label>
                      <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
                        <button
                          type="button"
                          onClick={() => handleUpdateElement({ type: "rounded-rect" })}
                          className={`flex-1 text-[11px] py-1 rounded font-semibold transition-all ${
                            selectedElement.type === "rounded-rect"
                              ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs font-bold"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Rounded (8px)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateElement({ type: "rectangle" })}
                          className={`flex-1 text-[11px] py-1 rounded font-semibold transition-all ${
                            selectedElement.type === "rectangle"
                              ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs font-bold"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Sharp (0px)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Quick Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDuplicateElement(selectedElement)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                        title="Duplicate element"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Duplicate</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveZIndex(selectedElement.id, "up")}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-600"
                        title="Bring Forward"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveZIndex(selectedElement.id, "down")}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-600"
                        title="Send Backward"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteElement(selectedElement.id)}
                      className="text-xs px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold flex items-center gap-1 transition-colors"
                      title="Delete element"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* When no element is selected: Show interactive Elements list */
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 leading-normal">
                    Select an element on canvas or choose below to edit text, reference numerals, position, and styles:
                  </p>

                  {/* Quick Add Elements toolbar */}
                  <div className="space-y-1.5 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Quick Add Elements
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAddElementFromProps("rounded-rect")}
                        className="text-[11px] font-bold p-1.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 flex items-center gap-1 text-slate-700 dark:text-slate-300"
                      >
                        <Plus className="w-3 h-3 text-blue-600" />
                        <span>+ Rounded Box</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddElementFromProps("enclave")}
                        className="text-[11px] font-bold p-1.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 flex items-center gap-1 text-slate-700 dark:text-slate-300"
                      >
                        <Plus className="w-3 h-3 text-blue-600" />
                        <span>+ Enclave Box</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddElementFromProps("text")}
                        className="text-[11px] font-bold p-1.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 flex items-center gap-1 text-slate-700 dark:text-slate-300"
                      >
                        <Plus className="w-3 h-3 text-blue-600" />
                        <span>+ Text Label</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddElementFromProps("connector")}
                        className="text-[11px] font-bold p-1.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 flex items-center gap-1 text-slate-700 dark:text-slate-300"
                      >
                        <Plus className="w-3 h-3 text-blue-600" />
                        <span>+ Connector</span>
                      </button>
                    </div>
                  </div>

                  {/* Interactive Elements on Canvas List */}
                  <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                    {activeFigure.elements.map((el) => (
                      <div
                        key={el.id}
                        onClick={() => onSelectElement(el.id)}
                        className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 cursor-pointer transition-all flex items-start justify-between group"
                      >
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {el.refNumber && (
                              <span className="text-[10px] font-mono font-bold bg-slate-900 text-white px-1.5 py-0.2 rounded shrink-0">
                                #{el.refNumber}
                              </span>
                            )}
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                              {el.text || (el.type === "connector" || el.type === "arrow" ? "Connector Line" : "Shape Element")}
                            </span>
                          </div>
                          {el.subText && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {el.subText}
                            </p>
                          )}
                          <span className="text-[9px] font-mono uppercase text-slate-400 block">
                            {el.type} • {el.width}x{el.height} • ({el.x}, {el.y})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onSelectElement(el.id); }}
                            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded text-blue-600"
                            title="Edit this element"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteElement(el.id); }}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-500"
                            title="Delete this element"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Project Context Accordions (Real Backend Data) */}
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Project Context
              </span>

              {/* Problem Statement */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection("problem")}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span>Problem Statement</span>
                  {expandedSections.problem ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {expandedSections.problem && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {projectData.problemStatement}
                  </div>
                )}
              </div>

              {/* Proposed Solution */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection("solution")}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span>Proposed Solution</span>
                  {expandedSections.solution ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {expandedSections.solution && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {projectData.proposedSolution}
                  </div>
                )}
              </div>

              {/* Technical Information */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection("technical")}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span>Technical Information</span>
                  {expandedSections.technical ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {expandedSections.technical && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-xs space-y-2">
                    {projectData.technicalInformation.map((info, i) => (
                      <div key={i} className="flex justify-between border-b border-slate-200/50 pb-1">
                        <span className="text-slate-500 font-medium">{info.label}:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-right">{info.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Research References */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection("references")}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span>Research References</span>
                  {expandedSections.references ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {expandedSections.references && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-xs space-y-2">
                    {projectData.researchReferences.map((ref, i) => (
                      <div key={i} className="p-1.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                        <p className="font-bold text-slate-800 dark:text-slate-200">{ref.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{ref.citation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Source Documents */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection("sourceDocs")}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-red-500" /> Source Documents
                  </span>
                  {expandedSections.sourceDocs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {expandedSections.sourceDocs && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                    {projectData.sourceDocuments.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span className="truncate font-medium text-slate-700 dark:text-slate-300">{doc.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[10px] text-slate-400">{doc.size}</span>
                          <button
                            type="button"
                            onClick={() => handleDownloadSourceDoc(doc.name)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-blue-600 transition-colors"
                            title={`Download ${doc.name}`}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Drawing Instructions */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection("instructions")}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span>Drawing Instructions</span>
                  {expandedSections.instructions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {expandedSections.instructions && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {projectData.drawingInstructions}
                  </div>
                )}
              </div>

              {/* Related Claims */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection("claims")}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span>Related Claims</span>
                  {expandedSections.claims ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {expandedSections.claims && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 text-xs space-y-2">
                    {projectData.relatedClaims.map((claim) => (
                      <div key={claim.number} className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-blue-600 block mb-1">Claim {claim.number}</span>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">{claim.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : activeTab === "layers" ? (
          /* Layers Tab */
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Elements in Figure {activeFigure.figureNumber}
            </span>
            <div className="space-y-1">
              {activeFigure.elements.map((el) => {
                const isSelected = selectedElementId === el.id;
                return (
                  <div
                    key={el.id}
                    onClick={() => onSelectElement(el.id)}
                    className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-50 border-blue-300 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[10px] font-mono uppercase text-slate-400">{el.type}</span>
                      <span className="truncate">{el.text || el.refNumber || "Element"}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateElement({ locked: !el.locked });
                        }}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400"
                        title={el.locked ? "Unlock" : "Lock"}
                      >
                        {el.locked ? <Lock className="w-3 h-3 text-amber-500" /> : <Unlock className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Numerals Concordance Tab */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Reference Concordance
              </span>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                FIG. {activeFigure.figureNumber}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal">
              Reference numerals mapped directly to patent specification and claims.
            </p>

            <div className="space-y-1.5 max-h-[420px] overflow-y-auto scrollbar-thin">
              {activeFigure.elements
                .filter((el) => Boolean(el.refNumber) || el.type === "reference-numeral")
                .sort((a, b) => Number(a.refNumber || 0) - Number(b.refNumber || 0))
                .map((el) => {
                  const isSelected = selectedElementId === el.id;
                  return (
                    <div
                      key={el.id}
                      onClick={() => onSelectElement(el.id)}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? "bg-blue-50 border-blue-400 text-blue-900 font-bold dark:bg-blue-950/60"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono font-black text-blue-600 bg-blue-100/70 dark:bg-blue-900/50 px-1.5 py-0.5 rounded text-[11px]">
                          {el.refNumber || el.text}
                        </span>
                        <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                          {el.text || "Component Node"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 capitalize">{el.type}</span>
                    </div>
                  );
                })}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  const concordanceText = activeFigure.elements
                    .filter((el) => Boolean(el.refNumber))
                    .sort((a, b) => Number(a.refNumber || 0) - Number(b.refNumber || 0))
                    .map((el) => `${el.refNumber} — ${el.text || "Component"}`)
                    .join("\n");
                  navigator.clipboard?.writeText(concordanceText);
                  setCopiedConcordance(true);
                  setTimeout(() => setCopiedConcordance(false), 2000);
                }}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedConcordance ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-blue-600" />
                    <span>Copy Concordance List</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}