"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { 
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, 
  AlignRight, AlignJustify, List, ListOrdered, ListChecks, Table as TableIcon, 
  Image as ImageIcon, Plus, FileText, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Sparkles, Hash, Subscript, Superscript, Indent, Outdent, Copy, Check, 
  CheckCircle2, Printer, FileDown, BookOpen, Trash2, Eye, Download, Search, 
  Replace, Undo2, Redo2, Heading1, Heading2, Heading3, Highlighter, Type, 
  FilePlus, Scissors, Maximize2, Minimize2, Split, Layers, Settings2, 
  Bookmark, FileSpreadsheet, AlertCircle, Info, HelpCircle, PanelLeft, 
  PanelLeftClose, FileCode, Sliders, ArrowUp, ArrowDown, FileCheck, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { TechnicalDocument, FigureSheet, ProjectStudioData } from "@/lib/design-team/types";
import { triggerDownload, logExportInRepository } from "@/lib/design-team/studioExportHelper";
import { jsPDF } from "jspdf";
import { 
  Document as DocxDocument, Packer, Paragraph as DocxParagraph, 
  TextRun, HeadingLevel, Table as DocxTable, TableRow as DocxTableRow, 
  TableCell as DocxTableCell, WidthType, AlignmentType, PageBreak as DocxPageBreak 
} from "docx";

interface TechnicalDocEditorProps {
  documents: TechnicalDocument[];
  activeDocId: string;
  onSelectDoc: (id: string) => void;
  onUpdateDoc: (updated: TechnicalDocument) => void;
  figures: FigureSheet[];
  onAddDocument?: (title?: string, docType?: string) => void;
  onDeleteDocument?: (docId: string) => void;
  projectData?: ProjectStudioData;
  onToggleRightPanel?: () => void;
}

const PAGE_DELIMITER = '<div class="doc-page-break" data-page-break="true"></div>';

export function TechnicalDocEditor({
  documents,
  activeDocId,
  onSelectDoc,
  onUpdateDoc,
  figures,
  onAddDocument,
  onDeleteDocument,
  projectData,
  onToggleRightPanel
}: TechnicalDocEditorProps) {
  const { toast } = useToast();
  const activeDoc = documents.find((d) => d.id === activeDocId) || documents[0];

  // ─── MULTI-PAGE PARSER & STATE ──────────────────────────────────────────
  const parseInitialPages = (doc?: TechnicalDocument): string[] => {
    if (!doc) return ["<p><br></p>"];
    if (doc.pages && doc.pages.length > 0) return doc.pages;
    if (!doc.content) return ["<p><br></p>"];

    // Check for standard page break delimiter or HTML comment
    if (doc.content.includes("doc-page-break") || doc.content.includes("<!-- PAGE_BREAK -->")) {
      const parts = doc.content
        .split(/<div\s+class="doc-page-break"[^>]*>.*?<\/div>|<!--\s*PAGE_BREAK\s*-->/i)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      return parts.length > 0 ? parts : [doc.content];
    }
    return [doc.content];
  };

  const [pages, setPages] = useState<string[]>(() => parseInitialPages(activeDoc));
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"continuous" | "paginated">("continuous");
  const [paperSize, setPaperSize] = useState<"letter" | "a4">("letter");
  const [marginSize, setMarginSize] = useState<"standard" | "compact" | "wide">("standard");

  // Keep references to content without causing re-renders
  const pagesRef = useRef<string[]>(pages);
  const metricsDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const pageDomRefs = useRef<(HTMLDivElement | null)[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Editor Typography & Settings State
  const [fontSize, setFontSize] = useState("12");
  const [fontFamily, setFontFamily] = useState("Inter, sans-serif");
  const [lineSpacing, setLineSpacing] = useState<"1.0" | "1.15" | "1.5" | "2.0">("1.5");
  const [editorZoom, setEditorZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dropdowns & Sidebar States
  const [showFigureMenu, setShowFigureMenu] = useState(false);
  const [showNumeralMenu, setShowNumeralMenu] = useState(false);
  const [showSectionMenu, setShowSectionMenu] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showTextColorMenu, setShowTextColorMenu] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"pages" | "outline" | "numerals">("pages");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Search & Replace
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [findMatchCount, setFindMatchCount] = useState(0);

  // Status & Clipboard
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Extracted Outline / Table of Contents
  const [outlineItems, setOutlineItems] = useState<Array<{ id: string; text: string; level: number; pageIndex: number }>>([]);

  // Live Metrics
  const [metrics, setMetrics] = useState({
    words: 0,
    chars: 0,
    paragraphs: 0,
    readingTime: 1
  });

  // Calculate live metrics across all pages
  const recalculateMetrics = useCallback(() => {
    let totalText = "";
    let totalParas = 0;
    const newOutline: Array<{ id: string; text: string; level: number; pageIndex: number }> = [];

    pagesRef.current.forEach((pageHtml, pIdx) => {
      // Create temporary element to parse safely
      if (typeof document !== "undefined") {
        const temp = document.createElement("div");
        temp.innerHTML = pageHtml;
        const text = temp.innerText || "";
        totalText += " " + text;
        totalParas += temp.querySelectorAll("p, h1, h2, h3, h4, blockquote").length || 1;

        // Extract headings for outline
        const headings = temp.querySelectorAll("h1, h2, h3, h4");
        headings.forEach((h, hIdx) => {
          const level = parseInt(h.tagName.substring(1), 10) || 2;
          const headingText = (h.textContent || "").trim();
          if (headingText) {
            newOutline.push({
              id: `heading-${pIdx}-${hIdx}`,
              text: headingText,
              level,
              pageIndex: pIdx
            });
          }
        });
      }
    });

    const clean = totalText.trim();
    const words = clean ? clean.split(/\s+/).filter(Boolean).length : 0;
    const chars = clean.length;
    const readingTime = Math.max(1, Math.ceil(words / 200));

    setMetrics({ words, chars, paragraphs: Math.max(1, totalParas), readingTime });
    setOutlineItems(newOutline);
  }, []);

  // Sync content when activeDoc changes (switching documents)
  useEffect(() => {
    if (activeDoc) {
      const parsed = parseInitialPages(activeDoc);
      setPages(parsed);
      pagesRef.current = parsed;
      setActivePageIndex(0);

      // Populate DOM elements ONLY if not currently focused to avoid resetting caret
      parsed.forEach((html, idx) => {
        const el = pageDomRefs.current[idx];
        if (el && document.activeElement !== el && !el.contains(document.activeElement)) {
          el.innerHTML = html;
        }
      });
      recalculateMetrics();
    }
  }, [activeDoc?.id]);

  // When pages count changes (e.g. Add Page), populate newly added pages without touching existing ones
  useEffect(() => {
    pages.forEach((html, idx) => {
      const el = pageDomRefs.current[idx];
      if (el && (!el.hasChildNodes() || el.innerHTML.trim() === "")) {
        el.innerHTML = html;
      }
    });
    recalculateMetrics();
  }, [pages.length]);

  // Debounced parent persistence handler
  const persistChanges = useCallback(() => {
    if (!activeDoc) return;
    const allHtmlPages = pagesRef.current;
    const combinedContent = allHtmlPages.join(`\n${PAGE_DELIMITER}\n`);

    onUpdateDoc({
      ...activeDoc,
      content: combinedContent,
      pages: [...allHtmlPages],
      lastModified: new Date().toISOString()
    });
  }, [activeDoc, onUpdateDoc]);

  // Debounced metrics recalculation so typing and Enter do not re-render component tree
  const debouncedRecalculateMetrics = useCallback(() => {
    if (metricsDebounceRef.current) clearTimeout(metricsDebounceRef.current);
    metricsDebounceRef.current = setTimeout(() => {
      recalculateMetrics();
    }, 400);
  }, [recalculateMetrics]);

  // Handle typing within a specific page WITHOUT re-rendering that page's DOM
  const handlePageInput = (pageIndex: number, newHtml: string) => {
    pagesRef.current[pageIndex] = newHtml;

    // Recalculate metrics in background after typing pauses
    debouncedRecalculateMetrics();

    // Schedule debounced save to parent
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      persistChanges();
    }, 600);
  };

  // Keyboard navigation, Enter key, Tab key, shortcuts
  const handlePageKeyDown = (pageIndex: number, e: React.KeyboardEvent<HTMLDivElement>) => {
    setActivePageIndex(pageIndex);

    // Ctrl+Enter or Cmd+Enter: Insert Page Break / Add Page!
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleAddPage(pageIndex + 1);
      return;
    }

    // Ctrl+B: Bold
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      executeCommand("bold");
      return;
    }

    // Ctrl+I: Italic
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      executeCommand("italic");
      return;
    }

    // Ctrl+U: Underline
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
      e.preventDefault();
      executeCommand("underline");
      return;
    }

    // Ctrl+Z: Undo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
      e.preventDefault();
      executeCommand("undo");
      return;
    }

    // Ctrl+Y or Ctrl+Shift+Z: Redo
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
      e.preventDefault();
      executeCommand("redo");
      return;
    }

    // Ctrl+F: Open Find & Replace
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
      e.preventDefault();
      setShowFindReplace(true);
      return;
    }

    // Tab key: Insert 4 spaces / Indent without losing focus
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        document.execCommand("outdent", false);
      } else {
        document.execCommand("indent", false);
      }
      const el = pageDomRefs.current[pageIndex];
      if (el) handlePageInput(pageIndex, el.innerHTML);
      return;
    }

    // Shift + Enter: Insert clean line break
    if (e.shiftKey && e.key === "Enter") {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const br = document.createElement("br");
        range.insertNode(br);
        range.setStartAfter(br);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        br.scrollIntoView({ behavior: "smooth", block: "nearest" });

        const el = pageDomRefs.current[pageIndex];
        if (el) {
          pagesRef.current[pageIndex] = el.innerHTML;
          handlePageInput(pageIndex, el.innerHTML);
        }
      }
      return;
    }

    // Normal Enter: Insert a clean paragraph and maintain exact caret & scroll position (NEVER JUMP TO TOP!)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();

        const p = document.createElement("p");
        p.innerHTML = "<br>";

        // Find current top-level block inside contentEditable container
        let currentBlock: Node | null = range.startContainer;
        while (currentBlock && currentBlock.parentElement && currentBlock.parentElement !== e.currentTarget) {
          currentBlock = currentBlock.parentElement;
        }

        if (currentBlock && currentBlock.parentElement === e.currentTarget && currentBlock.nodeType === Node.ELEMENT_NODE) {
          (currentBlock as HTMLElement).insertAdjacentElement("afterend", p);
        } else {
          range.insertNode(p);
        }

        // Move caret inside the new paragraph
        const newRange = document.createRange();
        newRange.setStart(p, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);

        // Keep view scrolled right at new paragraph so it never jumps up
        p.scrollIntoView({ behavior: "smooth", block: "nearest" });

        const el = pageDomRefs.current[pageIndex];
        if (el) {
          pagesRef.current[pageIndex] = el.innerHTML;
          handlePageInput(pageIndex, el.innerHTML);
        }
      }
      return;
    }
  };

  // ─── EXECUTE FORMATTING COMMANDS ─────────────────────────────────────────
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    // Focus the active page if not focused
    const activeEl = pageDomRefs.current[activePageIndex] || pageDomRefs.current[0];
    if (activeEl && document.activeElement !== activeEl) {
      activeEl.focus();
    }

    document.execCommand(command, false, value);

    if (activeEl) {
      handlePageInput(activePageIndex, activeEl.innerHTML);
    }
  };

  const handleApplyHeading = (tag: string) => {
    executeCommand("formatBlock", tag);
    setShowStyleMenu(false);
  };

  const handleApplyHighlight = (color: string) => {
    executeCommand("hiliteColor", color);
    setShowHighlightMenu(false);
  };

  const handleApplyTextColor = (color: string) => {
    executeCommand("foreColor", color);
    setShowTextColorMenu(false);
  };

  // ─── PAGE MANAGEMENT: ADD, DELETE, DUPLICATE, REORDER ───────────────────
  const handleAddPage = (insertIndex?: number) => {
    // Collect latest contents from DOM
    pageDomRefs.current.forEach((el, i) => {
      if (el) pagesRef.current[i] = el.innerHTML;
    });

    const targetIdx = typeof insertIndex === "number" ? insertIndex : pagesRef.current.length;
    
    // Auto-calculate next patent paragraph number
    const totalParasSoFar = metrics.paragraphs + 1;
    const nextParaNum = String(totalParasSoFar).padStart(4, "0");
    const newPageContent = `<p><strong>[${nextParaNum}]</strong> Continued technical embodiment and detailed description...</p>`;

    const updated = [...pagesRef.current];
    updated.splice(targetIdx, 0, newPageContent);
    pagesRef.current = updated;
    setPages(updated);
    setActivePageIndex(targetIdx);

    toast({
      title: "Page Added",
      description: `New Page ${targetIdx + 1} added to ${activeDoc?.title || "document"}.`,
      variant: "success"
    });

    // Populate DOM and focus
    setTimeout(() => {
      const el = pageDomRefs.current[targetIdx];
      if (el) {
        el.innerHTML = newPageContent;
        el.focus();
        // Place caret at end
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      persistChanges();
      recalculateMetrics();
    }, 80);
  };

  const handleDeletePage = (indexToDelete: number) => {
    if (pagesRef.current.length <= 1) {
      toast({
        title: "Cannot Delete Page",
        description: "A document must contain at least one page.",
        variant: "destructive"
      });
      return;
    }

    pageDomRefs.current.forEach((el, i) => {
      if (el) pagesRef.current[i] = el.innerHTML;
    });

    const updated = pagesRef.current.filter((_, i) => i !== indexToDelete);
    pagesRef.current = updated;
    setPages(updated);

    const nextIdx = Math.max(0, indexToDelete - 1);
    setActivePageIndex(nextIdx);

    toast({
      title: "Page Removed",
      description: `Page ${indexToDelete + 1} was removed from the document.`,
      variant: "default"
    });

    setTimeout(() => {
      updated.forEach((html, i) => {
        const el = pageDomRefs.current[i];
        if (el) el.innerHTML = html;
      });
      persistChanges();
      recalculateMetrics();
    }, 80);
  };

  const handleDuplicatePage = (indexToDuplicate: number) => {
    pageDomRefs.current.forEach((el, i) => {
      if (el) pagesRef.current[i] = el.innerHTML;
    });

    const copyContent = pagesRef.current[indexToDuplicate];
    const updated = [...pagesRef.current];
    updated.splice(indexToDuplicate + 1, 0, copyContent);
    pagesRef.current = updated;
    setPages(updated);
    setActivePageIndex(indexToDuplicate + 1);

    toast({
      title: "Page Duplicated",
      description: `Created a copy of Page ${indexToDuplicate + 1}.`,
      variant: "success"
    });

    setTimeout(() => {
      updated.forEach((html, i) => {
        const el = pageDomRefs.current[i];
        if (el) el.innerHTML = html;
      });
      persistChanges();
      recalculateMetrics();
    }, 80);
  };

  const handleMovePage = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= pagesRef.current.length) return;

    pageDomRefs.current.forEach((el, i) => {
      if (el) pagesRef.current[i] = el.innerHTML;
    });

    const updated = [...pagesRef.current];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    pagesRef.current = updated;
    setPages(updated);
    setActivePageIndex(targetIdx);

    setTimeout(() => {
      updated.forEach((html, i) => {
        const el = pageDomRefs.current[i];
        if (el) el.innerHTML = html;
      });
      persistChanges();
      recalculateMetrics();
    }, 80);
  };

  // ─── PATENT & TECHNICAL SPECIALTY INSERTS ──────────────────────────────
  const handleInsertFigureRef = (figNum: number, figTitle: string) => {
    const htmlSnippet = ` <span style="background-color: #eff6ff; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-family: monospace;">FIG. ${figNum}</span> (${figTitle}) `;
    executeCommand("insertHTML", htmlSnippet);
    setShowFigureMenu(false);
  };

  const handleInsertNumeralRef = (refNum: string, componentName: string) => {
    const htmlSnippet = ` <strong>${refNum}</strong> (<span style="color: #475569;">${componentName}</span>) `;
    executeCommand("insertHTML", htmlSnippet);
    setShowNumeralMenu(false);
  };

  const handleInsertParagraphNumber = () => {
    const nextNum = String(metrics.paragraphs + 1).padStart(4, "0");
    const snippet = `<p><strong>[${nextNum}]</strong> </p>`;
    executeCommand("insertHTML", snippet);
  };

  const handleInsertTable = () => {
    // Populate from actual figure reference numerals if available
    const elementsWithRef: { ref: string; name: string; figNum: number }[] = [];
    figures.forEach((f) => {
      f.elements.forEach((el) => {
        if (el.refNumber) {
          elementsWithRef.push({
            ref: el.refNumber,
            name: el.text || el.subText || "Component",
            figNum: f.figureNumber
          });
        }
      });
    });

    let rowsHtml = "";
    if (elementsWithRef.length > 0) {
      rowsHtml = elementsWithRef
        .map(
          (e) =>
            `<tr><td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>${e.ref}</strong></td><td style="padding: 8px; border: 1px solid #cbd5e1;">${e.name}</td><td style="padding: 8px; border: 1px solid #cbd5e1;">FIG. ${e.figNum}</td><td style="padding: 8px; border: 1px solid #cbd5e1;">Detailed Description</td></tr>`
        )
        .join("");
    } else {
      rowsHtml = `
    <tr><td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>100</strong></td><td style="padding: 8px; border: 1px solid #cbd5e1;">First Component</td><td style="padding: 8px; border: 1px solid #cbd5e1;">FIG. 1</td><td style="padding: 8px; border: 1px solid #cbd5e1;">Detailed Description</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>102</strong></td><td style="padding: 8px; border: 1px solid #cbd5e1;">Second Component</td><td style="padding: 8px; border: 1px solid #cbd5e1;">FIG. 1</td><td style="padding: 8px; border: 1px solid #cbd5e1;">Detailed Description</td></tr>`;
    }

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
  <tbody>${rowsHtml}
  </tbody>
</table><p><br></p>`;
    executeCommand("insertHTML", tableHtml);
  };

  const handleInsertPatentClaimBox = () => {
    const claimHtml = `
<blockquote style="border-left: 4px solid #2563eb; background-color: #eff6ff; padding: 12px 18px; margin: 16px 0; border-radius: 4px; font-style: normal;">
  <strong style="color: #1d4ed8; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Independent Patent Claim</strong>
  <p style="margin: 0; color: #1e293b;">1. An apparatus comprising: a processor; and a memory coupled to the processor storing instructions that, when executed by the processor, cause the apparatus to perform operations comprising: [specify operations].</p>
</blockquote><p><br></p>`;
    executeCommand("insertHTML", claimHtml);
    setShowStyleMenu(false);
  };

  const handleInsertCalloutBox = (type: "note" | "warning" | "tip") => {
    let bg = "#f8fafc";
    let border = "#94a3b8";
    let title = "Technical Note";
    let color = "#334155";

    if (type === "warning") {
      bg = "#fffbeb";
      border = "#f59e0b";
      title = "Important Operational Constraint";
      color = "#92400e";
    } else if (type === "tip") {
      bg = "#f0fdf4";
      border = "#10b981";
      title = "Implementation Best Practice";
      color = "#065f46";
    }

    const boxHtml = `
<div style="background-color: ${bg}; border: 1px solid ${border}; border-left-width: 4px; padding: 12px 16px; margin: 16px 0; border-radius: 6px;">
  <strong style="color: ${color}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">${title}</strong>
  <p style="margin: 0; font-size: 12px; color: #1e293b;">Describe the technical embodiment requirement or security precondition here.</p>
</div><p></p>`;
    executeCommand("insertHTML", boxHtml);
    setShowSectionMenu(false);
  };

  const handleInsertSectionTemplate = (sectionTitle: string, defaultBody: string) => {
    const sectionHtml = `
<h2>${sectionTitle}</h2>
<p><strong>[${String(metrics.paragraphs + 1).padStart(4, "0")}]</strong> ${defaultBody}</p>
<p></p>`;
    executeCommand("insertHTML", sectionHtml);
    setShowSectionMenu(false);
  };

  // ─── SEARCH & REPLACE ENGINE ───────────────────────────────────────────
  const handleFind = () => {
    if (!findQuery.trim()) {
      setFindMatchCount(0);
      return;
    }
    let count = 0;
    const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    pagesRef.current.forEach((html) => {
      const matches = html.match(regex);
      if (matches) count += matches.length;
    });
    setFindMatchCount(count);

    if (count > 0 && typeof window !== "undefined") {
      (window as any).find?.(findQuery, false, false, true);
    }
  };

  const handleReplaceAll = () => {
    if (!findQuery.trim()) return;
    const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const updated = pagesRef.current.map((html) => html.replace(regex, replaceQuery));
    pagesRef.current = updated;
    setPages(updated);
    updated.forEach((html, i) => {
      const el = pageDomRefs.current[i];
      if (el) el.innerHTML = html;
    });
    persistChanges();
    recalculateMetrics();
    toast({
      title: "Replaced Occurrences",
      description: `Replaced matches for "${findQuery}" with "${replaceQuery}".`,
      variant: "success"
    });
    setFindMatchCount(0);
  };

  // ─── DOWNLOAD / EXPORT HANDLERS (PDF, DOCX, MD, TXT, PRINT) ─────────────
  const handleDownloadPDF = async () => {
    try {
      setIsExporting("pdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: paperSize === "a4" ? "a4" : "letter"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = marginSize === "compact" ? 40 : marginSize === "wide" ? 72 : 54;
      const usableWidth = pageWidth - margin * 2;

      pagesRef.current.forEach((pageHtml, pIdx) => {
        if (pIdx > 0) doc.addPage();

        // 1. Running Header
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(148, 163, 184);
        doc.text("PATENT APPLICATION SPECIFICATION — USPTO 37 CFR § 1.77", margin, 36);
        doc.text(`APPLICATION REF: ${activeDoc?.id || (projectData?.projectId ? projectData.projectId + "-SPEC" : "SPEC-001")}`, pageWidth - margin, 36, { align: "right" });

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.8);
        doc.line(margin, 44, pageWidth - margin, 44);

        let curY = 64;

        // 2. Title & Metadata on Page 1
        if (pIdx === 0) {
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(16);
          doc.setTextColor(15, 23, 42);
          doc.text((activeDoc?.title || "Technical Description").toUpperCase(), margin, curY);
          curY += 22;

          doc.setFont("Helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          const metaParts = [
            `Section: ${activeDoc?.documentType || "Specification"}`,
            `Version: v${activeDoc?.version || 1}`,
            activeDoc?.author ? `Author: ${activeDoc.author}` : null,
            projectData?.projectId ? `Project: ${projectData.projectId}` : null,
            "Status: Draft"
          ].filter(Boolean).join(" • ");
          doc.text(metaParts, margin, curY);
          curY += 14;

          doc.setDrawColor(203, 213, 225);
          doc.line(margin, curY, pageWidth - margin, curY);
          curY += 20;
        }

        // 3. Render Page HTML content as clean text with styling
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = pageHtml;
        const paragraphs = Array.from(tempDiv.querySelectorAll("p, h1, h2, h3, h4, table, blockquote, div"));

        if (paragraphs.length === 0) {
          const rawLines = doc.splitTextToSize(tempDiv.innerText || "", usableWidth);
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(30, 41, 59);
          doc.text(rawLines, margin, curY);
        } else {
          paragraphs.forEach((p) => {
            const tagName = p.tagName.toLowerCase();
            const text = (p.textContent || "").trim();
            if (!text) return;

            if (curY > pageHeight - 65) {
              doc.addPage();
              curY = 60;
            }

            if (tagName === "h1" || tagName === "h2") {
              curY += 8;
              doc.setFont("Helvetica", "bold");
              doc.setFontSize(13);
              doc.setTextColor(15, 23, 42);
              const lines = doc.splitTextToSize(text, usableWidth);
              doc.text(lines, margin, curY);
              curY += lines.length * 16 + 6;
            } else if (tagName === "h3" || tagName === "h4") {
              curY += 4;
              doc.setFont("Helvetica", "bold");
              doc.setFontSize(11);
              doc.setTextColor(30, 41, 59);
              const lines = doc.splitTextToSize(text, usableWidth);
              doc.text(lines, margin, curY);
              curY += lines.length * 14 + 4;
            } else if (tagName === "blockquote") {
              doc.setFillColor(239, 246, 255);
              doc.setDrawColor(37, 99, 235);
              doc.setLineWidth(2);
              const lines = doc.splitTextToSize(text, usableWidth - 24);
              const boxHeight = lines.length * 13 + 16;
              doc.rect(margin, curY, usableWidth, boxHeight, "F");
              doc.line(margin, curY, margin, curY + boxHeight);
              doc.setFont("Helvetica", "italic");
              doc.setFontSize(9.5);
              doc.setTextColor(30, 41, 59);
              doc.text(lines, margin + 12, curY + 14);
              curY += boxHeight + 12;
            } else {
              doc.setFont("Helvetica", "normal");
              doc.setFontSize(10);
              doc.setTextColor(51, 65, 85);
              const lines = doc.splitTextToSize(text, usableWidth);
              doc.text(lines, margin, curY);
              curY += lines.length * 13 + 8;
            }
          });
        }

        // 4. Running Footer
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageHeight - 44, pageWidth - margin, pageHeight - 44);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(148, 163, 184);
        doc.text("Confidential & Proprietary — For Examination Under 35 U.S.C. § 112", margin, pageHeight - 30);
        doc.text(`Page ${pIdx + 1} of ${pagesRef.current.length}`, pageWidth - margin, pageHeight - 30, { align: "right" });
      });

      const safeName = (activeDoc?.title || "Technical_Document").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${projectData?.projectId || "PRJ"}_${safeName}_v${activeDoc?.version || 1}.pdf`;
      doc.save(filename);

      if (projectData?.projectId) {
        await logExportInRepository(
          projectData.projectId,
          `${activeDoc?.title || "Technical Specification"} (Full PDF)`,
          "PDF",
          `${(pagesRef.current.length * 280).toFixed(0)} KB`,
          "document",
          activeDoc?.id
        );
      }

      toast({
        title: "PDF Export Complete",
        description: `Downloaded ${filename} (${pagesRef.current.length} pages).`,
        variant: "success"
      });
      setShowDownloadMenu(false);
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err.message || "Failed to generate PDF.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(null);
    }
  };

  const handleDownloadWord = async () => {
    try {
      setIsExporting("docx");
      const sectionsChildren: any[] = [];

      // Document Title & Heading
      sectionsChildren.push(
        new DocxParagraph({
          text: (activeDoc?.title || "Technical Description").toUpperCase(),
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER
        }),
        new DocxParagraph({
          text: `Section: ${activeDoc?.documentType || "Specification"} • Version v${activeDoc?.version || 1}${projectData?.projectId ? " • Project ID: " + projectData.projectId : ""}`,
          alignment: AlignmentType.CENTER
        }),
        new DocxParagraph({
          text: "USPTO Technical Application Specification (37 CFR § 1.77 Compliant)",
          alignment: AlignmentType.CENTER
        }),
        new DocxParagraph({ text: "" })
      );

      // Iterate through each page
      pagesRef.current.forEach((pageHtml, pIdx) => {
        if (pIdx > 0) {
          sectionsChildren.push(
            new DocxParagraph({
              children: [new DocxPageBreak()]
            })
          );
        }

        const temp = document.createElement("div");
        temp.innerHTML = pageHtml;
        const nodes = Array.from(temp.querySelectorAll("p, h1, h2, h3, h4, blockquote"));

        if (nodes.length === 0) {
          sectionsChildren.push(new DocxParagraph({ text: temp.innerText || "" }));
        } else {
          nodes.forEach((node) => {
            const tag = node.tagName.toLowerCase();
            const text = (node.textContent || "").trim();
            if (!text) return;

            if (tag === "h1") {
              sectionsChildren.push(new DocxParagraph({ text, heading: HeadingLevel.HEADING_1 }));
            } else if (tag === "h2") {
              sectionsChildren.push(new DocxParagraph({ text, heading: HeadingLevel.HEADING_2 }));
            } else if (tag === "h3") {
              sectionsChildren.push(new DocxParagraph({ text, heading: HeadingLevel.HEADING_3 }));
            } else if (tag === "blockquote") {
              sectionsChildren.push(
                new DocxParagraph({
                  children: [new TextRun({ text: `[CLAIM/NOTE]: ${text}`, italics: true, bold: true })]
                })
              );
            } else {
              sectionsChildren.push(new DocxParagraph({ text }));
            }
          });
        }
      });

      const docx = new DocxDocument({
        sections: [
          {
            properties: {},
            children: sectionsChildren
          }
        ]
      });

      const blob = await Packer.toBlob(docx);
      const safeName = (activeDoc?.title || "Technical_Document").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${projectData?.projectId || "PRJ"}_${safeName}.docx`;
      triggerDownload(blob, filename);

      toast({
        title: "Word Document Exported",
        description: `Downloaded ${filename} successfully.`,
        variant: "success"
      });
      setShowDownloadMenu(false);
    } catch (err: any) {
      toast({
        title: "Word Export Failed",
        description: err.message || "Failed to generate .docx.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(null);
    }
  };

  const handleDownloadMarkdown = () => {
    try {
      let md = `# ${(activeDoc?.title || "Technical Description").toUpperCase()}\n\n`;
      md += `* **Document Type:** ${activeDoc?.documentType || "Specification"}\n`;
      md += `* **Version:** v${activeDoc?.version || 1}\n`;
      if (activeDoc?.author) md += `* **Author:** ${activeDoc.author}\n`;
      if (projectData?.projectId) md += `* **Project ID:** ${projectData.projectId}\n`;
      md += `\n---\n\n`;

      pagesRef.current.forEach((pageHtml, pIdx) => {
        md += `\n<!-- PAGE ${pIdx + 1} OF ${pagesRef.current.length} -->\n\n`;
        const temp = document.createElement("div");
        temp.innerHTML = pageHtml;

        temp.querySelectorAll("h1").forEach((h) => (h.outerHTML = `\n# ${h.textContent}\n`));
        temp.querySelectorAll("h2").forEach((h) => (h.outerHTML = `\n## ${h.textContent}\n`));
        temp.querySelectorAll("h3").forEach((h) => (h.outerHTML = `\n### ${h.textContent}\n`));
        temp.querySelectorAll("blockquote").forEach((b) => (b.outerHTML = `\n> ${b.textContent}\n`));
        temp.querySelectorAll("p").forEach((p) => (p.outerHTML = `\n${p.textContent}\n`));

        md += temp.innerText.trim() + "\n\n";
        if (pIdx < pagesRef.current.length - 1) {
          md += `\n---\n\n`;
        }
      });

      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const safeName = (activeDoc?.title || "Technical_Document").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${projectData?.projectId ? projectData.projectId + "_" : ""}${safeName}.md`;
      triggerDownload(blob, filename);

      toast({
        title: "Markdown Downloaded",
        description: `Saved as ${filename}.`,
        variant: "success"
      });
      setShowDownloadMenu(false);
    } catch (err: any) {
      toast({ title: "Markdown Export Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDownloadPlainText = () => {
    try {
      let txt = `================================================================================\n`;
      txt += `${(activeDoc?.title || "Technical Description").toUpperCase()}\n`;
      txt += `${projectData?.projectId ? "Project ID: " + projectData.projectId + " | " : ""}Version: v${activeDoc?.version || 1}${activeDoc?.author ? " | Author: " + activeDoc.author : ""}\n`;
      txt += `USPTO Patent Application Specification (37 CFR § 1.77)\n`;
      txt += `================================================================================\n\n`;

      pagesRef.current.forEach((pageHtml, pIdx) => {
        txt += `--- PAGE ${pIdx + 1} OF ${pagesRef.current.length} ---\n\n`;
        const temp = document.createElement("div");
        temp.innerHTML = pageHtml;
        txt += (temp.innerText || "").trim() + "\n\n";
      });

      const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
      const safeName = (activeDoc?.title || "Technical_Document").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${projectData?.projectId || "PRJ"}_${safeName}.txt`;
      triggerDownload(blob, filename);

      toast({
        title: "Text File Downloaded",
        description: `Saved as ${filename}.`,
        variant: "success"
      });
      setShowDownloadMenu(false);
    } catch (err: any) {
      toast({ title: "Text Export Failed", description: err.message, variant: "destructive" });
    }
  };

  const handlePrintDocument = () => {
    window.print();
    setShowDownloadMenu(false);
  };

  // Collect all unique numerals from all figures for cross-reference dropdown
  const allReferenceNumerals: Array<{ num: string; label: string; figNum: number }> = useMemo(() => {
    const list: Array<{ num: string; label: string; figNum: number }> = [];
    figures.forEach((fig) => {
      fig.elements.forEach((el) => {
        if (el.refNumber && !list.some((r) => r.num === el.refNumber)) {
          list.push({
            num: el.refNumber,
            label: el.text || "Component Element",
            figNum: fig.figureNumber
          });
        }
      });
    });
    return list.sort((a, b) => Number(a.num) - Number(b.num));
  }, [figures]);

  // Synchronize commands triggered from the Right Context Panel
  useEffect(() => {
    const handleDocFormatEvent = (e: any) => {
      const { command, value } = e.detail || {};
      if (command) {
        executeCommand(command, value);
      }
    };
    const handleDocAddPageEvent = () => {
      handleAddPage();
    };
    const handleDocExportEvent = (e: any) => {
      const { format } = e.detail || {};
      if (format === "pdf") handleDownloadPDF();
      else if (format === "docx") handleDownloadWord();
      else if (format === "md") handleDownloadMarkdown();
      else if (format === "txt") handleDownloadPlainText();
      else if (format === "print") handlePrintDocument();
    };

    window.addEventListener("patent-doc-format", handleDocFormatEvent);
    window.addEventListener("patent-doc-add-page", handleDocAddPageEvent);
    window.addEventListener("patent-doc-export", handleDocExportEvent);

    return () => {
      window.removeEventListener("patent-doc-format", handleDocFormatEvent);
      window.removeEventListener("patent-doc-add-page", handleDocAddPageEvent);
      window.removeEventListener("patent-doc-export", handleDocExportEvent);
    };
  }, [activePageIndex, metrics.paragraphs]);

  return (
    <div className={`flex-1 flex flex-col h-full bg-slate-100/90 dark:bg-slate-950 overflow-hidden select-none ${isFullscreen ? "fixed inset-0 z-50 bg-white" : ""}`}>
      <style>{`
        @media print {
          body, html { background: #ffffff !important; }
          .print\\:hidden { display: none !important; }
          .print\\:page {
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
      {/* ─── 1. TOP DOCUMENT TABS BAR ────────────────────────────────────── */}
      <div className="print:hidden bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-2 pb-0 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {documents.map((doc) => {
            const isActive = doc.id === activeDoc?.id;
            return (
              <div
                key={doc.id}
                onClick={() => onSelectDoc(doc.id)}
                className={`group flex items-center gap-2 px-3 py-2 rounded-t-lg text-xs font-bold border-t border-x cursor-pointer transition-all ${
                  isActive
                    ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border-slate-200 dark:border-slate-700 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-900/60 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"
                }`}
              >
                <FileText className={`w-3.5 h-3.5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                <span className="truncate max-w-[170px]">{doc.title}</span>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-200/60 dark:bg-slate-700 text-slate-500">
                  v{doc.version}
                </span>

                {onDeleteDocument && documents.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDocument(doc.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 text-red-500 rounded transition-opacity"
                    title="Delete Document"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {onAddDocument && (
            <button
              onClick={() => onAddDocument("New Specification Annex", "Technical Annex")}
              className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors ml-1"
              title="Add New Document Sheet"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Document</span>
            </button>
          )}
        </div>

        {/* View Mode & Page Info */}
        <div className="flex items-center gap-3 pb-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-semibold">
            <button
              onClick={() => setViewMode("continuous")}
              className={`px-2 py-0.5 rounded ${viewMode === "continuous" ? "bg-white dark:bg-slate-700 text-blue-600 font-bold shadow-xs" : "hover:text-slate-900"}`}
              title="Continuous Multi-Page Flow"
            >
              Continuous
            </button>
            <button
              onClick={() => setViewMode("paginated")}
              className={`px-2 py-0.5 rounded ${viewMode === "paginated" ? "bg-white dark:bg-slate-700 text-blue-600 font-bold shadow-xs" : "hover:text-slate-900"}`}
              title="Single Page Focus View"
            >
              Paginated
            </button>
          </div>

          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
            {activeDoc?.documentType || "Specification"}
          </span>
        </div>
      </div>

      {/* ─── 2. ADVANCED RIBBON TOOLBAR (2-TIER CLEAN DESKTOP LAYOUT) ──────── */}
      {/* Tier 1: Document Navigation, Pages, Zoom & Action Controls */}
      <div className="print:hidden bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-1.5 flex items-center justify-between gap-2 shrink-0 z-30 text-xs">
        {/* Left: Outline Sidebar Toggle + Add Page + Page Stepper */}
        <div className="flex items-center gap-2">
          {/* Toggle Sidebar (Pages & Outline) */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isSidebarOpen
                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                : "hover:bg-slate-100 text-slate-600 border-slate-200 dark:border-slate-700"
            }`}
            title={isSidebarOpen ? "Collapse Navigation Sidebar" : "Open Navigation Sidebar (Pages & Outline)"}
          >
            <PanelLeft className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">{isSidebarOpen ? "Hide Outline" : "Outline"}</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Add Page Button */}
          <button
            onClick={() => handleAddPage()}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition-all"
            title="Add New Document Page (Ctrl+Enter)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Page</span>
          </button>

          {/* Page Stepper */}
          <div className="flex items-center gap-0.5 bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
              disabled={activePageIndex === 0}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-40 text-slate-600 dark:text-slate-300"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-bold text-[11px] text-slate-700 dark:text-slate-300">
              Page {activePageIndex + 1} / {pages.length}
            </span>
            <button
              onClick={() => setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
              disabled={activePageIndex >= pages.length - 1}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-40 text-slate-600 dark:text-slate-300"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Search, Undo/Redo, Zoom, Copy, Download, Text Panel */}
        <div className="flex items-center gap-1.5">
          {/* Find & Replace Toggle */}
          <button
            onClick={() => setShowFindReplace(!showFindReplace)}
            className={`p-1.5 rounded-lg border text-xs font-semibold ${
              showFindReplace ? "bg-blue-50 text-blue-600 border-blue-200" : "hover:bg-slate-100 text-slate-600 border-slate-200 dark:border-slate-700"
            }`}
            title="Find & Replace (Ctrl+F)"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button onClick={() => executeCommand("undo")} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600" title="Undo (Ctrl+Z)">
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => executeCommand("redo")} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600" title="Redo (Ctrl+Y)">
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 text-xs font-semibold">
            <button onClick={() => setEditorZoom((prev) => Math.max(70, prev - 10))} className="px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600">
              -
            </button>
            <span className="px-1 text-slate-600 dark:text-slate-300 text-[11px] font-mono">{editorZoom}%</span>
            <button onClick={() => setEditorZoom((prev) => Math.min(150, prev + 10))} className="px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600">
              +
            </button>
          </div>

          {/* Copy Plaintext */}
          <button
            onClick={() => {
              let allText = "";
              pagesRef.current.forEach((html) => {
                const temp = document.createElement("div");
                temp.innerHTML = html;
                allText += (temp.innerText || "") + "\n\n";
              });
              navigator.clipboard?.writeText(allText.trim());
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white text-slate-700 dark:text-slate-300"
            title="Copy All Text to Clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
          </button>

          {/* Download Document Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-all"
              title="Download Editable Technical Document"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 py-1.5 animate-in fade-in slide-in-from-top-1">
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Download Technical Document
                </div>

                <button
                  onClick={handleDownloadPDF}
                  disabled={isExporting !== null}
                  className="w-full text-left px-3 py-2 text-xs text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2.5 transition-colors"
                >
                  <FileText className="w-4 h-4 text-red-500 shrink-0" />
                  <div>
                    <span className="font-bold block">Download as PDF</span>
                    <span className="text-[10px] text-slate-400">Official USPTO 37 CFR § 1.77 format</span>
                  </div>
                </button>

                <button
                  onClick={handleDownloadWord}
                  disabled={isExporting !== null}
                  className="w-full text-left px-3 py-2 text-xs text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2.5 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="font-bold block">Download as Word (.docx)</span>
                    <span className="text-[10px] text-slate-400">Fully formatted Microsoft Word doc</span>
                  </div>
                </button>

                <button
                  onClick={handleDownloadMarkdown}
                  className="w-full text-left px-3 py-2 text-xs text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2.5 transition-colors"
                >
                  <FileCode className="w-4 h-4 text-slate-600 shrink-0" />
                  <div>
                    <span className="font-bold block">Download Markdown (.md)</span>
                    <span className="text-[10px] text-slate-400">Clean GitHub / Docs Markdown</span>
                  </div>
                </button>

                <button
                  onClick={handleDownloadPlainText}
                  className="w-full text-left px-3 py-2 text-xs text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2.5 transition-colors"
                >
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold block">Download Plain Text (.txt)</span>
                    <span className="text-[10px] text-slate-400">Structured ASCII Specification</span>
                  </div>
                </button>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                <button
                  onClick={handlePrintDocument}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                >
                  <Printer className="w-4 h-4 text-slate-500 shrink-0" />
                  <div>
                    <span className="font-bold block">Print / Save as PDF</span>
                    <span className="text-[10px] text-slate-400">Direct browser print dialog</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Direct Text Formatting Panel Toggle Button */}
          <button
            onClick={() => {
              if (onToggleRightPanel) onToggleRightPanel();
              window.dispatchEvent(new CustomEvent("patent-doc-focus-text-tab"));
            }}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg shadow-xs transition-all"
            title="Open Text Formatting & Typography Panel in Sidebar"
          >
            <Type className="w-3.5 h-3.5" />
            <span>Text Panel</span>
          </button>
        </div>
      </div>

      {/* Tier 2: Text Formatting Ribbon (Single-row Horizontal Scrollable Bar) */}
      <div className="print:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-thin shrink-0 shadow-xs z-20 text-xs">
        {/* Heading / Style Selector Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowStyleMenu(!showStyleMenu)}
            className="flex items-center gap-1 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 px-2.5 py-1 hover:bg-slate-100"
          >
            <span>Normal Text</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          {showStyleMenu && (
            <div className="absolute left-0 top-full mt-1 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1.5">
              <button
                onClick={() => handleApplyHeading("p")}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-blue-50 flex items-center justify-between"
              >
                <span>Normal Paragraph</span>
                <span className="text-[10px] text-slate-400">&lt;p&gt;</span>
              </button>
              <button
                onClick={() => handleApplyHeading("h1")}
                className="w-full text-left px-3 py-1.5 text-sm font-black text-slate-900 dark:text-slate-100 hover:bg-blue-50 flex items-center justify-between"
              >
                <span>Title (Heading 1)</span>
                <span className="text-[10px] text-slate-400 font-mono">H1</span>
              </button>
              <button
                onClick={() => handleApplyHeading("h2")}
                className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 hover:bg-blue-50 flex items-center justify-between"
              >
                <span>Section (Heading 2)</span>
                <span className="text-[10px] text-slate-400 font-mono">H2</span>
              </button>
              <button
                onClick={() => handleApplyHeading("h3")}
                className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-blue-50 flex items-center justify-between"
              >
                <span>Subsection (Heading 3)</span>
                <span className="text-[10px] text-slate-400 font-mono">H3</span>
              </button>
              <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
              <button
                onClick={handleInsertPatentClaimBox}
                className="w-full text-left px-3 py-1.5 text-xs text-blue-700 font-bold hover:bg-blue-50 flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Patent Claim Block</span>
              </button>
              <button
                onClick={() => {
                  executeCommand("formatBlock", "pre");
                  setShowStyleMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 flex items-center gap-1.5 font-mono"
              >
                <FileCode className="w-3.5 h-3.5 text-slate-500" />
                <span>Monospace Code Block</span>
              </button>
            </div>
          )}
        </div>

        {/* Font Family Selector */}
        <select
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none px-2 py-1 shrink-0"
        >
          <option value="Inter, sans-serif">Inter (Modern Clean)</option>
          <option value="'Times New Roman', serif">Times New Roman (USPTO Standard)</option>
          <option value="Arial, sans-serif">Arial (High Legibility)</option>
          <option value="Georgia, serif">Georgia (Editorial)</option>
          <option value="'Courier New', monospace">Courier (Typewriter / Claims)</option>
        </select>

        {/* Font Size */}
        <select
          value={fontSize}
          onChange={(e) => setFontSize(e.target.value)}
          className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none px-2 py-1 shrink-0"
        >
          <option value="10">10 pt</option>
          <option value="11">11 pt</option>
          <option value="12">12 pt (Standard)</option>
          <option value="14">14 pt</option>
          <option value="16">16 pt</option>
          <option value="18">18 pt</option>
          <option value="24">24 pt</option>
        </select>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />

        {/* Typography Styles: Bold, Italic, Underline, Strikethrough, Sub/Super */}
        <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
          <button
            onClick={() => executeCommand("bold")}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => executeCommand("italic")}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => executeCommand("underline")}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300"
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => executeCommand("strikeThrough")}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300"
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => executeCommand("subscript")}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300"
            title="Subscript (Chemical/Math)"
          >
            <Subscript className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => executeCommand("superscript")}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300"
            title="Superscript"
          >
            <Superscript className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Highlight Color Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowHighlightMenu(!showHighlightMenu)}
            className="p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
            title="Highlight Text"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-500" />
          </button>
          {showHighlightMenu && (
            <div className="absolute left-0 top-full mt-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 flex items-center gap-1">
              {["#fef08a", "#bbf7d0", "#bae6fd", "#fbcfe8", "#fed7aa"].map((c) => (
                <button
                  key={c}
                  onClick={() => handleApplyHighlight(c)}
                  className="w-5 h-5 rounded-full border border-slate-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
              <button
                onClick={() => handleApplyHighlight("transparent")}
                className="text-[10px] text-slate-500 hover:text-slate-800 ml-1 px-1 border rounded"
                title="Remove Highlight"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />

        {/* Alignment */}
        <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
          <button onClick={() => executeCommand("justifyLeft")} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300" title="Align Left">
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => executeCommand("justifyCenter")} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300" title="Align Center">
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => executeCommand("justifyRight")} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300" title="Align Right">
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => executeCommand("justifyFull")} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300" title="Justify (USPTO Examination)">
            <AlignJustify className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Line Spacing */}
        <select
          value={lineSpacing}
          onChange={(e) => setLineSpacing(e.target.value as any)}
          className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none px-2 py-1 shrink-0"
          title="Line Spacing (2.0 = USPTO Double Space Standard)"
        >
          <option value="1.0">1.0 Single</option>
          <option value="1.15">1.15 Normal</option>
          <option value="1.5">1.5 Line Space</option>
          <option value="2.0">2.0 Double Space (USPTO)</option>
        </select>

        {/* Lists & Indentation */}
        <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
          <button onClick={() => executeCommand("insertUnorderedList")} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300" title="Bullet List">
            <List className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => executeCommand("insertOrderedList")} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300" title="Numbered List">
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => executeCommand("outdent")} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300" title="Outdent">
            <Outdent className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => executeCommand("indent")} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300" title="Indent">
            <Indent className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />

        {/* Insert Concordance Table */}
        <button
          onClick={handleInsertTable}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shrink-0"
          title="Insert Concordance Table"
        >
          <TableIcon className="w-3.5 h-3.5 text-blue-600" />
          <span>Table</span>
        </button>

        {/* Insert Patent Paragraph Number [0001] */}
        <button
          onClick={handleInsertParagraphNumber}
          className="flex items-center gap-1 px-2 py-1 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shrink-0"
          title="Insert Patent Paragraph Identifier [0001]"
        >
          <span className="font-mono font-bold text-blue-600">[¶]</span>
          <span>Paragraph</span>
        </button>

        {/* Insert FIG. Reference Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowFigureMenu(!showFigureMenu)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
          >
            <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
            <span>Insert FIG.</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showFigureMenu && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                Select Figure Reference
              </div>
              {figures.map((fig) => (
                <button
                  key={fig.id}
                  onClick={() => handleInsertFigureRef(fig.figureNumber, fig.figureTitle)}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-medium truncate flex items-center justify-between"
                >
                  <span className="font-bold text-blue-600">FIG. {fig.figureNumber}</span>
                  <span className="text-[11px] text-slate-500 truncate max-w-[140px]">{fig.figureTitle}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Insert Numeral Reference Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowNumeralMenu(!showNumeralMenu)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            <Hash className="w-3.5 h-3.5 text-blue-600" />
            <span>Numeral</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showNumeralMenu && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1 max-h-60 overflow-y-auto">
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                Active Reference Numerals
              </div>
              {allReferenceNumerals.map((r) => (
                <button
                  key={r.num}
                  onClick={() => handleInsertNumeralRef(r.num, r.label)}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-medium truncate flex items-center justify-between"
                >
                  <span className="font-mono font-bold text-blue-600">[{r.num}]</span>
                  <span className="text-[11px] text-slate-500 truncate max-w-[150px]">{r.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Section Templates Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowSectionMenu(!showSectionMenu)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            title="Insert Standard Patent Specification Sections"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Sections</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showSectionMenu && (
            <div className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1.5">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">
                USPTO Specification Templates
              </div>
              {[
                { title: "1. Field of the Invention", body: "[0001] The present disclosure relates generally to [Technical Field], and more particularly to [Specific Technical Focus]." },
                { title: "2. Background of the Invention", body: projectData?.problemStatement || "[0002] In conventional systems, limitations exist regarding [Technical Problem]. There is a need for improved methods and systems to address these challenges." },
                { title: "3. Summary of the Invention", body: projectData?.proposedSolution || "[0003] Embodiments of the present disclosure provide [Brief Summary of Solution]." },
                { title: "4. Brief Description of the Drawings", body: "[0004] FIG. 1 is an architectural block diagram illustrating the system in accordance with an exemplary embodiment." },
                { title: "5. Detailed Description of Preferred Embodiments", body: "[0005] Referring now to the drawings, wherein like reference numerals designate identical or corresponding parts throughout the several views, exemplary embodiments of the present disclosure are described." },
                { title: "6. Patent Claims", body: "What is claimed is:\n1. An apparatus comprising:\n  a processor; and\n  a memory coupled to the processor storing instructions..." }
              ].map((s) => (
                <button
                  key={s.title}
                  onClick={() => handleInsertSectionTemplate(s.title, s.body)}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-medium truncate block"
                >
                  {s.title}
                </button>
              ))}
              <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
              <button
                onClick={() => handleInsertCalloutBox("warning")}
                className="w-full text-left px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-50 font-medium"
              >
                Insert Operational Constraint Box
              </button>
              <button
                onClick={() => handleInsertCalloutBox("tip")}
                className="w-full text-left px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 font-medium"
              >
                Insert Best Practice Callout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── FIND & REPLACE BAR (COLLAPSIBLE) ─────────────────────────────── */}
      {showFindReplace && (
        <div className="print:hidden bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-2 flex items-center gap-3 text-xs shrink-0 z-20">
          <div className="flex items-center gap-1.5 flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFind()}
              placeholder="Find in document..."
              className="w-full px-2 py-1 bg-white dark:bg-slate-800 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Button size="sm" variant="ghost" onClick={handleFind} className="h-7 px-2 text-xs">
              Find
            </Button>
          </div>

          <div className="flex items-center gap-1.5 flex-1 max-w-sm">
            <Replace className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              placeholder="Replace with..."
              className="w-full px-2 py-1 bg-white dark:bg-slate-800 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Button size="sm" variant="outline" onClick={handleReplaceAll} className="h-7 px-2 text-xs font-bold">
              Replace All
            </Button>
          </div>

          {findMatchCount > 0 && (
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {findMatchCount} {findMatchCount === 1 ? "match" : "matches"}
            </span>
          )}

          <button onClick={() => setShowFindReplace(false)} className="p-1 text-slate-400 hover:text-slate-600 ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── 3. MAIN WORKSPACE WITH COLLAPSIBLE SIDEBAR & DOCUMENT CANVAS ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─── LEFT COLLAPSIBLE NAVIGATION SIDEBAR (PAGES, OUTLINE, NUMERALS) ─ */}
        {isSidebarOpen && (
          <div className="print:hidden w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 overflow-hidden z-10 transition-all">
            {/* Sidebar Navigation Tabs */}
            <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1 text-xs font-bold text-slate-600">
              <button
                onClick={() => setSidebarTab("pages")}
                className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                  sidebarTab === "pages" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-xs" : "hover:text-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Pages ({pages.length})</span>
              </button>
              <button
                onClick={() => setSidebarTab("outline")}
                className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                  sidebarTab === "outline" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-xs" : "hover:text-slate-900"
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Outline</span>
              </button>
              <button
                onClick={() => setSidebarTab("numerals")}
                className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                  sidebarTab === "numerals" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-xs" : "hover:text-slate-900"
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                <span>Numerals</span>
              </button>
            </div>

            {/* Sidebar Content Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
              {/* TAB 1: PAGES THUMBNAIL LIST */}
              {sidebarTab === "pages" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Document Pages
                    </span>
                    <button
                      onClick={() => handleAddPage()}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Page</span>
                    </button>
                  </div>

                  {pages.map((pageHtml, idx) => {
                    const isSelected = activePageIndex === idx;
                    const previewText = pageHtml.replace(/<[^>]+>/g, " ").trim().substring(0, 70);
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setActivePageIndex(idx);
                          pageDomRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className={`group relative p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 shadow-xs ring-1 ring-blue-500/20"
                            : "bg-white dark:bg-slate-900 hover:bg-slate-50 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`font-bold ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-200"}`}>
                            Page {idx + 1}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {pageHtml.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length} words
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {previewText || "Empty page..."}
                        </p>

                        {/* Page Actions on Hover */}
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 justify-end opacity-80 group-hover:opacity-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMovePage(idx, "up");
                            }}
                            disabled={idx === 0}
                            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                            title="Move Page Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMovePage(idx, "down");
                            }}
                            disabled={idx === pages.length - 1}
                            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                            title="Move Page Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicatePage(idx);
                            }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-600"
                            title="Duplicate Page"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {pages.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePage(idx);
                              }}
                              className="p-1 hover:bg-red-50 text-red-500 rounded"
                              title="Delete Page"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: OUTLINE / TABLE OF CONTENTS */}
              {sidebarTab === "outline" && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Document Headings
                  </span>
                  {outlineItems.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">
                      No headings yet. Format sections as Heading 1 or Heading 2 to build the outline.
                    </p>
                  ) : (
                    outlineItems.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setActivePageIndex(item.pageIndex);
                          pageDomRefs.current[item.pageIndex]?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
                        className="w-full text-left py-1 text-xs text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50/50 rounded truncate block transition-colors"
                      >
                        <span className="font-bold text-slate-400 mr-1.5 text-[10px]">H{item.level}</span>
                        <span>{item.text}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: ACTIVE REFERENCE NUMERALS */}
              {sidebarTab === "numerals" && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Drawing Concordance
                  </span>
                  {allReferenceNumerals.map((r) => (
                    <div
                      key={r.num}
                      onClick={() => handleInsertNumeralRef(r.num, r.label)}
                      className="p-2 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer text-xs transition-colors flex items-center justify-between"
                      title="Click to insert into document"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono font-bold text-blue-600 bg-blue-100 px-1 rounded text-[11px]">
                          {r.num}
                        </span>
                        <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                          {r.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                        FIG. {r.figNum}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── CENTER DOCUMENT CANVAS (MULTI-PAGE PAGINATION VIEW) ─────────── */}
        <div className="flex-1 overflow-auto bg-slate-200/70 dark:bg-slate-950 p-4 sm:p-6 md:p-8 cursor-default">
          <div className="w-full min-w-fit flex flex-col items-center">
            <div className="w-[840px] max-w-full flex flex-col items-stretch gap-6">
              {/* Document Title Header Card (Above Pages) */}
              <div 
                className="print:hidden w-full bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 transition-all"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 uppercase">
                      {activeDoc?.documentType || "Specification"}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">ID: {activeDoc?.id}</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Drafted & Synced</span>
                  </span>
                </div>

                <input
                  type="text"
                  value={activeDoc?.title || ""}
                  onChange={(e) => {
                    if (activeDoc) onUpdateDoc({ ...activeDoc, title: e.target.value });
                  }}
                  placeholder="Enter Technical Document Title..."
                  className="text-2xl font-black text-slate-900 dark:text-slate-100 w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 tracking-tight"
                />

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2 px-1">
                  {activeDoc?.author && (
                    <span>Author: <strong>{activeDoc.author}</strong></span>
                  )}
                  {activeDoc?.author && <span>•</span>}
                  <span>Version: <strong>v{activeDoc?.version || 1}</strong></span>
                  {projectData?.projectId && (
                    <>
                      <span>•</span>
                      <span>Project: <strong>{projectData.projectId}</strong></span>
                    </>
                  )}
                  {projectData?.inventionTitle && (
                    <>
                      <span>•</span>
                      <span>Matter: <strong>{projectData.inventionTitle}</strong></span>
                    </>
                  )}
                </div>
              </div>

              {/* ─── PAGES CONTAINER: RENDERING ALL PAGES STACKED ─────────────── */}
              <div
                className="w-full flex flex-col items-center gap-8 transition-all duration-100"
                style={{
                  fontFamily: fontFamily,
                  transform: editorZoom !== 100 ? `scale(${editorZoom / 100})` : undefined,
                  transformOrigin: "top center"
                }}
              >
                {pages.map((initialPageHtml, pageIdx) => {
                  // In paginated view, hide other pages
                  if (viewMode === "paginated" && pageIdx !== activePageIndex) {
                    return null;
                  }

                  const isPageFocused = activePageIndex === pageIdx;

                  return (
                    <div key={pageIdx} className="w-full flex flex-col items-center">
                      {/* Single Paper Page Sheet */}
                      <div
                        onClick={() => setActivePageIndex(pageIdx)}
                        className={`print:page w-full min-h-[1088px] bg-white dark:bg-slate-900 shadow-2xl border p-8 sm:p-12 md:p-14 rounded-xs flex flex-col relative transition-all duration-150 ${
                          isPageFocused
                            ? "border-blue-400 dark:border-blue-600 ring-2 ring-blue-500/10"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                        }`}
                      >
                        {/* Running Header */}
                        <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-6 flex justify-between items-center text-xs text-slate-400 font-mono">
                          <span>PATENT APPLICATION SPECIFICATION — USPTO 37 CFR § 1.77</span>
                          <span>APPLICATION REF: {activeDoc?.id || (projectData?.projectId ? projectData.projectId + "-SPEC" : "SPEC-001")}</span>
                        </div>

                        {/* Page ContentEditable Area (UNCONTROLLED WITH REF - NO CURSOR JUMPING!) */}
                        <div
                          ref={(el) => {
                            pageDomRefs.current[pageIdx] = el;
                            if (el && (!el.hasChildNodes() || el.innerHTML.trim() === "")) {
                              el.innerHTML = pagesRef.current[pageIdx] || initialPageHtml || "<p><br></p>";
                            }
                          }}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(e) => handlePageInput(pageIdx, e.currentTarget.innerHTML)}
                          onKeyDown={(e) => handlePageKeyDown(pageIdx, e)}
                          onBlur={(e) => {
                            pagesRef.current[pageIdx] = e.currentTarget.innerHTML;
                            persistChanges();
                            recalculateMetrics();
                          }}
                          className="flex-1 text-slate-800 dark:text-slate-200 focus:outline-none prose dark:prose-invert max-w-none text-[13px] tracking-normal outline-none min-h-[820px]"
                          style={{
                            fontSize: `${fontSize}px`,
                            lineHeight: lineSpacing === "2.0" ? "2.2" : lineSpacing === "1.5" ? "1.75" : lineSpacing === "1.15" ? "1.4" : "1.2"
                          }}
                        />

                        {/* Running Footer */}
                        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-8 flex justify-between items-center text-xs text-slate-400 font-mono">
                          <span>Confidential & Proprietary — For Examination Under 35 U.S.C. § 112</span>
                          <span className="font-bold text-slate-600 dark:text-slate-300">
                            Page {pageIdx + 1} of {pages.length}
                          </span>
                        </div>
                      </div>

                      {/* Inter-Page Controls / Add Page Divider */}
                      <div className="print:hidden w-full my-4 flex items-center justify-between text-xs text-slate-400">
                        <div className="h-px bg-slate-300 dark:bg-slate-800 flex-1" />
                        <div className="flex items-center gap-2 px-4">
                          <span className="font-mono text-[11px] text-slate-400">
                            Page Break • Next: Page {pageIdx + 2}
                          </span>
                          <button
                            onClick={() => handleAddPage(pageIdx + 1)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-blue-200 bg-white dark:bg-slate-800 hover:bg-blue-50 text-blue-600 font-bold shadow-xs transition-all text-[11px]"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Page Here</span>
                          </button>
                        </div>
                        <div className="h-px bg-slate-300 dark:bg-slate-800 flex-1" />
                      </div>
                    </div>
                  );
                })}

                {/* Bottom Final Add Page Button */}
                <div className="print:hidden py-6 flex flex-col items-center gap-2">
                  <Button
                    onClick={() => handleAddPage()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-6 rounded-xl shadow-md flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Another Page (Page {pages.length + 1})</span>
                  </Button>
                  <span className="text-[11px] text-slate-400">Shortcut: Press Ctrl + Enter anywhere to insert a new page</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. BOTTOM EDITOR STATUS BAR ─────────────────────────────────── */}
      <div className="print:hidden h-8 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <span>Words: <strong>{metrics.words}</strong></span>
          <span>Characters: <strong>{metrics.chars}</strong></span>
          <span>Pages: <strong>{pages.length}</strong></span>
          <span>Est. Reading: <strong>{metrics.readingTime} min</strong></span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span>Spacing: <strong>{lineSpacing}x</strong></span>
          <span>Font: <strong>{fontFamily.split(",")[0]}</strong> ({fontSize}pt)</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          {viewMode === "paginated" && (
            <div className="flex items-center gap-1 font-semibold">
              <button
                onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                disabled={activePageIndex === 0}
                className="px-1 hover:bg-slate-100 rounded disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span>Page {activePageIndex + 1} of {pages.length}</span>
              <button
                onClick={() => setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                disabled={activePageIndex === pages.length - 1}
                className="px-1 hover:bg-slate-100 rounded disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <span className="flex items-center gap-1 text-emerald-600 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Synced with Drawing Sheets</span>
          </span>
          <span>•</span>
          <span>Last modified: {new Date(activeDoc?.lastModified || Date.now()).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
