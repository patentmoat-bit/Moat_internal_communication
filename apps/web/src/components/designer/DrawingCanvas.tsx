"use client";

import { DownloadDropdown } from "./DownloadDropdown";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  ZoomIn, ZoomOut, Maximize2, Grid, Magnet, Check,
  ChevronLeft, ChevronRight, Layers, Eye, Plus, Copy, Trash2,
  AlertTriangle, ShieldCheck, AlignLeft, AlignCenter, AlignRight,
  ArrowUp, ArrowDown, Move, Hash, Wrench, Sparkles, X, CheckCircle2,
  Edit3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FigureSheet, DrawingElement, ProjectStudioData, TechnicalDocument } from "@/lib/design-team/types";

interface DrawingCanvasProps {
  figure: FigureSheet;
  allFigures: FigureSheet[];
  onSelectFigure: (figureId: string) => void;
  onUpdateFigure: (updatedFigure: FigureSheet) => void;
  selectedElementId: string | null;
  onSelectElement: (elementId: string | null) => void;
  activeTool: string;
  onAddFigure?: () => void;
  onDuplicateFigure?: (figId: string) => void;
  onDeleteFigure?: (figId: string) => void;
  onMoveFigure?: (figId: string, direction: "left" | "right") => void;
  projectData?: ProjectStudioData;
  activeDoc?: TechnicalDocument;
  onOpenExportModal?: () => void;
}

const USPTO_MARGINS = {
  left: 30,
  top: 25,
  right: 910,
  bottom: 615,
};

export function DrawingCanvas({
  figure,
  allFigures,
  onSelectFigure,
  onUpdateFigure,
  selectedElementId,
  onSelectElement,
  activeTool,
  onAddFigure,
  onDuplicateFigure,
  onDeleteFigure,
  onMoveFigure,
  projectData,
  activeDoc,
  onOpenExportModal
}: DrawingCanvasProps) {
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [bottomTab, setBottomTab] = useState<"figures" | "history">("figures");
  const [isUsptoAuditOpen, setIsUsptoAuditOpen] = useState(false);

  // Dragging & Resizing state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resizingCorner, setResizingCorner] = useState<"nw" | "ne" | "sw" | "se" | null>(null);
  const [initialResizeBox, setInitialResizeBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Inline Canvas Editing & Connector handle state
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [draggingConnector, setDraggingConnector] = useState<{ id: string; handle: "from" | "to" } | null>(null);

  const selectedElement = figure.elements.find((el) => el.id === selectedElementId);
  const editingElement = figure.elements.find((el) => el.id === editingElementId);

  const handleStartConnectorDrag = (e: React.MouseEvent, id: string, handle: "from" | "to") => {
    e.stopPropagation();
    setDraggingConnector({ id, handle });
  };

  const toggleFill = (targetEl: DrawingElement) => {
    const isTransparent = targetEl.fillColor === "transparent";
    onUpdateFigure({
      ...figure,
      elements: figure.elements.map((el) => el.id === targetEl.id ? { ...el, fillColor: isTransparent ? "#ffffff" : "transparent" } : el)
    });
  };

  const toggleStrokeStyle = (targetEl: DrawingElement) => {
    const isDashed = targetEl.strokeStyle === "dashed";
    onUpdateFigure({
      ...figure,
      elements: figure.elements.map((el) => el.id === targetEl.id ? { ...el, strokeStyle: isDashed ? "solid" : "dashed" } : el)
    });
  };

  const handleDeleteElement = (id: string) => {
    onUpdateFigure({
      ...figure,
      elements: figure.elements.filter((el) => el.id !== id)
    });
    if (selectedElementId === id) onSelectElement(null);
    if (editingElementId === id) setEditingElementId(null);
  };

  const svgRef = useRef<SVGSVGElement>(null);

  // Zoom control
  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(200, Math.max(50, prev + delta)));
  };

  // ─── USPTO COMPLIANCE AUDIT METRICS ─────────────────────────────────────────
  const marginViolations = figure.elements.filter((el) => {
    if (el.type === "arrow" || el.type === "connector") {
      if (el.from && (el.from.x < USPTO_MARGINS.left || el.from.y < USPTO_MARGINS.top || el.from.x > USPTO_MARGINS.right || el.from.y > USPTO_MARGINS.bottom)) return true;
      if (el.to && (el.to.x < USPTO_MARGINS.left || el.to.y < USPTO_MARGINS.top || el.to.x > USPTO_MARGINS.right || el.to.y > USPTO_MARGINS.bottom)) return true;
      return false;
    }
    return (
      el.x < USPTO_MARGINS.left ||
      el.y < USPTO_MARGINS.top ||
      el.x + el.width > USPTO_MARGINS.right ||
      el.y + el.height > USPTO_MARGINS.bottom
    );
  });

  const lineWeightViolations = figure.elements.filter(
    (el) => el.strokeWidth !== undefined && el.strokeWidth < 1.33
  );

  const fontSizeViolations = figure.elements.filter(
    (el) => el.fontSize !== undefined && el.fontSize < 10
  );

  const isUsptoCompliant = marginViolations.length === 0 && lineWeightViolations.length === 0;

  // Auto-fit violating elements into USPTO margins
  const handleAutoFitMargins = () => {
    const updated = figure.elements.map((el) => {
      let newX = el.x;
      let newY = el.y;
      if (newX < USPTO_MARGINS.left) newX = USPTO_MARGINS.left + 8;
      if (newY < USPTO_MARGINS.top) newY = USPTO_MARGINS.top + 8;
      if (newX + el.width > USPTO_MARGINS.right) newX = USPTO_MARGINS.right - el.width - 8;
      if (newY + el.height > USPTO_MARGINS.bottom) newY = USPTO_MARGINS.bottom - el.height - 8;
      return { ...el, x: newX, y: newY };
    });
    onUpdateFigure({ ...figure, elements: updated });
  };

  // Normalize line weights to USPTO Standard (≥ 2px)
  const handleNormalizeLineWeights = () => {
    const updated = figure.elements.map((el) => ({
      ...el,
      strokeWidth: Math.max(el.strokeWidth || 2, 2)
    }));
    onUpdateFigure({ ...figure, elements: updated });
  };

  // Auto-sequence patent reference numerals (100, 102, 104...)
  const handleAutoSequenceNumerals = () => {
    let counter = 0;
    const base = figure.figureNumber * 100;
    const updated = figure.elements.map((el) => {
      if (el.type === "text" && !el.refNumber) return el;
      const num = base + counter * 2;
      counter++;
      return {
        ...el,
        refNumber: String(num),
        text: el.type === "reference-numeral" ? String(num) : el.text
      };
    });
    onUpdateFigure({ ...figure, elements: updated });
  };

  // ─── ELEMENT ALIGNMENT HELPERS ─────────────────────────────────────────────
  const handleAlign = (alignment: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    if (!selectedElementId) return;
    const target = figure.elements.find((el) => el.id === selectedElementId);
    if (!target) return;

    let updatedElements = [...figure.elements];
    if (alignment === "center") {
      const newX = Math.round((940 - target.width) / 2);
      updatedElements = updatedElements.map((el) => el.id === selectedElementId ? { ...el, x: newX } : el);
    } else if (alignment === "middle") {
      const newY = Math.round((640 - target.height) / 2);
      updatedElements = updatedElements.map((el) => el.id === selectedElementId ? { ...el, y: newY } : el);
    } else if (alignment === "left") {
      updatedElements = updatedElements.map((el) => el.id === selectedElementId ? { ...el, x: USPTO_MARGINS.left + 15 } : el);
    } else if (alignment === "right") {
      updatedElements = updatedElements.map((el) => el.id === selectedElementId ? { ...el, x: USPTO_MARGINS.right - target.width - 15 } : el);
    } else if (alignment === "top") {
      updatedElements = updatedElements.map((el) => el.id === selectedElementId ? { ...el, y: USPTO_MARGINS.top + 15 } : el);
    } else if (alignment === "bottom") {
      updatedElements = updatedElements.map((el) => el.id === selectedElementId ? { ...el, y: USPTO_MARGINS.bottom - target.height - 15 } : el);
    }
    onUpdateFigure({ ...figure, elements: updatedElements });
  };

  // ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedElementId) {
          e.preventDefault();
          const remaining = figure.elements.filter((el) => el.id !== selectedElementId);
          onUpdateFigure({ ...figure, elements: remaining });
          onSelectElement(null);
        }
      } else if (e.key === "Escape") {
        onSelectElement(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        if (selectedElementId) {
          e.preventDefault();
          const src = figure.elements.find((el) => el.id === selectedElementId);
          if (src) {
            const dup: DrawingElement = {
              ...JSON.parse(JSON.stringify(src)),
              id: `el-${Date.now()}`,
              x: src.x + 20,
              y: src.y + 20,
            };
            onUpdateFigure({ ...figure, elements: [...figure.elements, dup] });
            onSelectElement(dup.id);
          }
        }
      } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        if (selectedElementId) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 2;
          const updated = figure.elements.map((el) => {
            if (el.id !== selectedElementId) return el;
            let nx = el.x;
            let ny = el.y;
            if (e.key === "ArrowLeft") nx -= step;
            if (e.key === "ArrowRight") nx += step;
            if (e.key === "ArrowUp") ny -= step;
            if (e.key === "ArrowDown") ny += step;
            return { ...el, x: nx, y: ny };
          });
          onUpdateFigure({ ...figure, elements: updated });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId, figure, onUpdateFigure, onSelectElement]);

  // ─── MOUSE DRAG & RESIZE HANDLERS ─────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent, elId: string) => {
    e.stopPropagation();
    onSelectElement(elId);

    const el = figure.elements.find((item) => item.id === elId);
    if (!el || el.locked) return;

    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    const scale = zoom / 100;
    const clickX = (e.clientX - svgRect.left) / scale;
    const clickY = (e.clientY - svgRect.top) / scale;

    setDraggingId(elId);
    setDragOffset({
      x: clickX - el.x,
      y: clickY - el.y
    });
  };

  const handleStartResize = (e: React.MouseEvent, corner: "nw" | "ne" | "sw" | "se") => {
    e.stopPropagation();
    if (!selectedElementId) return;
    const target = figure.elements.find((el) => el.id === selectedElementId);
    if (!target) return;

    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    const scale = zoom / 100;

    setResizingCorner(corner);
    setInitialResizeBox({ x: target.x, y: target.y, width: target.width, height: target.height });
    setResizeStartPos({
      x: (e.clientX - svgRect.left) / scale,
      y: (e.clientY - svgRect.top) / scale
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    const scale = zoom / 100;

    // Connector endpoint dragging
    if (draggingConnector) {
      const currentX = (e.clientX - svgRect.left) / scale;
      const currentY = (e.clientY - svgRect.top) / scale;
      const snappedX = snapToGrid ? Math.round(currentX / 10) * 10 : Math.round(currentX);
      const snappedY = snapToGrid ? Math.round(currentY / 10) * 10 : Math.round(currentY);

      const updated = figure.elements.map((el) => {
        if (el.id === draggingConnector.id) {
          if (draggingConnector.handle === "from") {
            return { ...el, from: { x: snappedX, y: snappedY } };
          } else {
            return { ...el, to: { x: snappedX, y: snappedY } };
          }
        }
        return el;
      });
      onUpdateFigure({ ...figure, elements: updated });
      return;
    }

    // Resizing in progress
    if (resizingCorner && initialResizeBox && selectedElementId) {
      const currentX = (e.clientX - svgRect.left) / scale;
      const currentY = (e.clientY - svgRect.top) / scale;
      const dx = currentX - resizeStartPos.x;
      const dy = currentY - resizeStartPos.y;

      let { x, y, width, height } = initialResizeBox;

      if (resizingCorner === "se") {
        width = Math.max(40, initialResizeBox.width + dx);
        height = Math.max(30, initialResizeBox.height + dy);
      } else if (resizingCorner === "sw") {
        const newW = Math.max(40, initialResizeBox.width - dx);
        x = initialResizeBox.x + (initialResizeBox.width - newW);
        width = newW;
        height = Math.max(30, initialResizeBox.height + dy);
      } else if (resizingCorner === "ne") {
        width = Math.max(40, initialResizeBox.width + dx);
        const newH = Math.max(30, initialResizeBox.height - dy);
        y = initialResizeBox.y + (initialResizeBox.height - newH);
        height = newH;
      } else if (resizingCorner === "nw") {
        const newW = Math.max(40, initialResizeBox.width - dx);
        const newH = Math.max(30, initialResizeBox.height - dy);
        x = initialResizeBox.x + (initialResizeBox.width - newW);
        y = initialResizeBox.y + (initialResizeBox.height - newH);
        width = newW;
        height = newH;
      }

      if (snapToGrid) {
        x = Math.round(x / 10) * 10;
        y = Math.round(y / 10) * 10;
        width = Math.round(width / 10) * 10;
        height = Math.round(height / 10) * 10;
      }

      const updated = figure.elements.map((el) =>
        el.id === selectedElementId ? { ...el, x, y, width, height } : el
      );
      onUpdateFigure({ ...figure, elements: updated });
      return;
    }

    // Element Dragging in progress
    if (draggingId) {
      let currentX = (e.clientX - svgRect.left) / scale - dragOffset.x;
      let currentY = (e.clientY - svgRect.top) / scale - dragOffset.y;

      if (snapToGrid) {
        currentX = Math.round(currentX / 10) * 10;
        currentY = Math.round(currentY / 10) * 10;
      }

      const updatedElements = figure.elements.map((el) => {
        if (el.id === draggingId) {
          return { ...el, x: currentX, y: currentY };
        }
        return el;
      });

      onUpdateFigure({
        ...figure,
        elements: updatedElements
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingId(null);
    setResizingCorner(null);
    setInitialResizeBox(null);
    setDraggingConnector(null);
  };

  // Canvas Click: Element Creation & Deselection
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (draggingId || resizingCorner || draggingConnector) return;

    if (!["rectangle", "rounded-rect", "circle", "diamond", "text", "callout", "reference-numeral", "arrow", "connector"].includes(activeTool)) {
      onSelectElement(null);
      setEditingElementId(null);
      return;
    }

    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    const scale = zoom / 100;
    let clickX = (e.clientX - svgRect.left) / scale;
    let clickY = (e.clientY - svgRect.top) / scale;

      if (snapToGrid) {
        clickX = Math.round(clickX / 10) * 10;
        clickY = Math.round(clickY / 10) * 10;
      }

      const newId = `el-${Date.now()}`;
      let newElement: DrawingElement;

      if (activeTool === "reference-numeral") {
        const nextNum = figure.figureNumber * 100 + (figure.elements.length + 1) * 2;
        newElement = {
          id: newId,
          type: "reference-numeral",
          x: clickX,
          y: clickY,
          width: 40,
          height: 24,
          refNumber: String(nextNum),
          text: String(nextNum),
          strokeColor: "#0f172a",
          fillColor: "#ffffff",
          strokeWidth: 2,
          fontSize: 12,
          fontWeight: "bold"
        };
      } else if (activeTool === "arrow" || activeTool === "connector") {
        newElement = {
          id: newId,
          type: activeTool,
          x: clickX,
          y: clickY,
          width: 140,
          height: 30,
          from: { x: clickX, y: clickY },
          to: { x: clickX + 140, y: clickY },
          strokeColor: "#0f172a",
          strokeWidth: 2,
          strokeStyle: "solid"
        };
      } else if (activeTool === "circle") {
        newElement = {
          id: newId,
          type: "circle",
          x: clickX,
          y: clickY,
          width: 90,
          height: 90,
          text: "Node",
          refNumber: `${figure.figureNumber}0${figure.elements.length + 1}`,
          strokeColor: "#0f172a",
          fillColor: "#ffffff",
          strokeWidth: 2
        };
      } else if (activeTool === "diamond") {
        newElement = {
          id: newId,
          type: "diamond",
          x: clickX,
          y: clickY,
          width: 140,
          height: 80,
          text: "Decision Node",
          refNumber: `${figure.figureNumber}0${figure.elements.length + 1}`,
          strokeColor: "#0f172a",
          fillColor: "#ffffff",
          strokeWidth: 2
        };
      } else if (activeTool === "text") {
        newElement = {
          id: newId,
          type: "text",
          x: clickX,
          y: clickY,
          width: 180,
          height: 30,
          text: "Editable Label",
          fontSize: 13,
          fontFamily: "Inter, sans-serif",
          strokeColor: "#0f172a",
          fillColor: "transparent"
        };
      } else {
        newElement = {
          id: newId,
          type: activeTool === "rounded-rect" ? "rounded-rect" : "rectangle",
          x: clickX,
          y: clickY,
          width: 160,
          height: 75,
          text: "New Component",
          refNumber: `${figure.figureNumber}0${figure.elements.length + 1}`,
          subText: "Description block",
          strokeColor: "#0f172a",
          fillColor: "#ffffff",
          strokeWidth: 2
        };
      }

      onUpdateFigure({
        ...figure,
        elements: [...figure.elements, newElement]
      });
      onSelectElement(newId);
  };

  // Helper for orthogonal connectors
  const getOrthogonalPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      const midX = from.x + dx / 2;
      return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
    } else {
      const midY = from.y + dy / 2;
      return `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100/70 dark:bg-slate-950 overflow-hidden select-none">
      {/* ─── TOP CANVAS CONTROLS BAR ─────────────────────────────────────── */}
      <div className="h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-3">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <select
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="text-xs font-semibold bg-transparent border-none text-slate-700 dark:text-slate-300 focus:outline-none px-2 py-0.5"
            >
              <option value={50}>50%</option>
              <option value={75}>75%</option>
              <option value={100}>100%</option>
              <option value={125}>125%</option>
              <option value={150}>150%</option>
              <option value={200}>200%</option>
            </select>
            <button
              onClick={() => handleZoom(-15)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom(15)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400"
              title="Reset Zoom (100%)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Grid & Snapping Toggles */}
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
              <Grid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
              <Magnet className="w-3.5 h-3.5" />
              <span>Snap</span>
            </label>
          </div>

          {/* Alignment Tools (Enabled when element is selected) */}
          {selectedElementId && (
            <>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 p-0.5 rounded border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => handleAlign("left")}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600"
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleAlign("center")}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600"
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleAlign("right")}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600"
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleAlign("middle")}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600"
                  title="Align Middle"
                >
                  <Move className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* USPTO Compliance & Metrics Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleAutoSequenceNumerals}
            className="text-xs font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            title="Auto-sequence reference numerals (100, 102, 104...)"
          >
            <Hash className="w-3.5 h-3.5 text-blue-600" />
            <span>Auto-Sequence</span>
          </button>

          <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
            Sheet {figure.figureNumber} of {allFigures.length} • {figure.elements.length} elements
          </span>

          <button
            onClick={() => setIsUsptoAuditOpen(true)}
            className={`text-[11px] font-bold px-2.5 py-1 rounded border flex items-center gap-1.5 cursor-pointer transition-all ${
              isUsptoCompliant
                ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
                : "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 hover:bg-amber-100"
            }`}
          >
            {isUsptoCompliant ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>USPTO Margin Check: PASS</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>USPTO Margin: {marginViolations.length} Violations</span>
              </>
            )}
          </button>

          {projectData && (
            <DownloadDropdown
              projectData={projectData}
              activeFigure={figure}
              activeDoc={activeDoc}
              variant="canvas"
              onOpenExportModal={onOpenExportModal}
            />
          )}
        </div>
      </div>

      {/* ─── MAIN DRAWING SHEET AREA ─────────────────────────────────────── */}
      <div 
        className="flex-1 overflow-auto p-8 flex items-center justify-center relative cursor-default"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Printable Sheet (USPTO 8.5 x 11in standard ratio / 940 x 640px) */}
        <div 
          className="bg-white dark:bg-slate-900 shadow-xl border border-slate-300 dark:border-slate-800 rounded-sm relative transition-all duration-100"
          style={{
            width: `${940 * (zoom / 100)}px`,
            height: `${640 * (zoom / 100)}px`,
            transformOrigin: "center center"
          }}
        >
          {/* SVG Canvas */}
          <svg
            ref={svgRef}
            id="patent-drawing-canvas-svg"
            viewBox="0 0 940 640"
            className="w-full h-full absolute inset-0 cursor-crosshair"
            onClick={handleCanvasClick}
          >
            {/* Background Grid Pattern */}
            <defs>
              <pattern id="canvas-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke={showGrid ? "#f1f5f9" : "transparent"} strokeWidth="1" />
              </pattern>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#0f172a" />
              </marker>
              <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#2563eb" />
              </marker>
            </defs>

            {/* Grid Rectangle */}
            <rect width="940" height="640" fill="url(#canvas-grid)" />

            {/* USPTO 1-Inch Margin Guide Line */}
            <rect
              x={USPTO_MARGINS.left}
              y={USPTO_MARGINS.top}
              width={USPTO_MARGINS.right - USPTO_MARGINS.left}
              height={USPTO_MARGINS.bottom - USPTO_MARGINS.top}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
            <text x="35" y="20" fill="#94a3b8" fontSize="9" fontFamily="Inter, sans-serif" fontWeight="bold">
              USPTO 1-INCH PRINTABLE BOUNDARY (37 CFR 1.84)
            </text>

            {/* Render Drawing Elements */}
            {figure.elements.map((el) => {
              const isSelected = selectedElementId === el.id;
              const isViolating = marginViolations.some((v) => v.id === el.id);

              if (el.type === "arrow" && el.from && el.to) {
                const pathD = getOrthogonalPath(el.from, el.to);
                return (
                  <g
                    key={el.id}
                    onClick={(e) => { e.stopPropagation(); onSelectElement(el.id); }}
                    onDoubleClick={(e) => { e.stopPropagation(); onSelectElement(el.id); setEditingElementId(el.id); }}
                    className="cursor-pointer"
                  >
                    {/* Invisible wider hit area for easy selection */}
                    <path d={pathD} fill="none" stroke="transparent" strokeWidth="16" />
                    <path
                      d={pathD}
                      fill="none"
                      stroke={isSelected ? "#2563eb" : el.strokeColor || "#0f172a"}
                      strokeWidth={isSelected ? 3 : el.strokeWidth || 2}
                      strokeDasharray={el.strokeStyle === "dashed" ? "5 5" : undefined}
                      markerEnd={isSelected ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                    />
                    {el.text && (
                      <text
                        x={(el.from.x + el.to.x) / 2}
                        y={(el.from.y + el.to.y) / 2 - 8}
                        textAnchor="middle"
                        fill="#0f172a"
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="Inter, sans-serif"
                      >
                        {el.text}
                      </text>
                    )}
                    {isSelected && (
                      <>
                        <circle
                          cx={el.from.x}
                          cy={el.from.y}
                          r="5"
                          fill="#2563eb"
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="cursor-crosshair"
                          onMouseDown={(e) => handleStartConnectorDrag(e, el.id, "from")}
                        />
                        <circle
                          cx={el.to.x}
                          cy={el.to.y}
                          r="5"
                          fill="#2563eb"
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="cursor-crosshair"
                          onMouseDown={(e) => handleStartConnectorDrag(e, el.id, "to")}
                        />
                      </>
                    )}
                  </g>
                );
              }

              if (el.type === "connector" && el.from && el.to) {
                const pathD = getOrthogonalPath(el.from, el.to);
                return (
                  <g
                    key={el.id}
                    onClick={(e) => { e.stopPropagation(); onSelectElement(el.id); }}
                    onDoubleClick={(e) => { e.stopPropagation(); onSelectElement(el.id); setEditingElementId(el.id); }}
                    className="cursor-pointer"
                  >
                    {/* Invisible wider hit area for easy selection */}
                    <path d={pathD} fill="none" stroke="transparent" strokeWidth="16" />
                    <path
                      d={pathD}
                      fill="none"
                      stroke={isSelected ? "#2563eb" : el.strokeColor || "#0f172a"}
                      strokeWidth={isSelected ? 3 : el.strokeWidth || 2}
                      strokeDasharray={el.strokeStyle === "dashed" ? "5 5" : undefined}
                    />
                    {el.text && (
                      <text
                        x={(el.from.x + el.to.x) / 2}
                        y={(el.from.y + el.to.y) / 2 - 8}
                        textAnchor="middle"
                        fill="#0f172a"
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="Inter, sans-serif"
                      >
                        {el.text}
                      </text>
                    )}
                    {isSelected && (
                      <>
                        <circle
                          cx={el.from.x}
                          cy={el.from.y}
                          r="5"
                          fill="#2563eb"
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="cursor-crosshair"
                          onMouseDown={(e) => handleStartConnectorDrag(e, el.id, "from")}
                        />
                        <circle
                          cx={el.to.x}
                          cy={el.to.y}
                          r="5"
                          fill="#2563eb"
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="cursor-crosshair"
                          onMouseDown={(e) => handleStartConnectorDrag(e, el.id, "to")}
                        />
                      </>
                    )}
                  </g>
                );
              }

              if (el.type === "circle") {
                const cx = el.x + el.width / 2;
                const cy = el.y + el.height / 2;
                const r = Math.min(el.width, el.height) / 2;
                return (
                  <g
                    key={el.id}
                    onMouseDown={(e) => handleMouseDown(e, el.id)}
                    onDoubleClick={(e) => { e.stopPropagation(); onSelectElement(el.id); setEditingElementId(el.id); }}
                    className="cursor-move group"
                  >
                    {isViolating && (
                      <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="3 3" />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={el.fillColor || "#ffffff"}
                      stroke={isSelected ? "#2563eb" : el.strokeColor || "#0f172a"}
                      strokeWidth={isSelected ? 2.5 : el.strokeWidth || 2}
                      strokeDasharray={el.strokeStyle === "dashed" ? "4 4" : undefined}
                      className="transition-colors shadow-xs"
                    />
                    {el.refNumber && (
                      <text x={cx} y={el.y - 6} textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="bold" fontFamily="Inter, sans-serif">
                        {el.refNumber}
                      </text>
                    )}
                    <text
                      x={cx}
                      y={el.subText ? cy - 4 : cy + 4}
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize={el.fontSize || 12}
                      fontWeight={el.fontWeight || "bold"}
                      fontFamily="Inter, sans-serif"
                    >
                      {el.text}
                    </text>
                    {el.subText && (
                      <text x={cx} y={cy + 14} textAnchor="middle" fill="#475569" fontSize="10" fontFamily="Inter, sans-serif">
                        {el.subText}
                      </text>
                    )}
                  </g>
                );
              }

              if (el.type === "diamond") {
                const cx = el.x + el.width / 2;
                const cy = el.y + el.height / 2;
                const points = `${cx},${el.y} ${el.x + el.width},${cy} ${cx},${el.y + el.height} ${el.x},${cy}`;
                return (
                  <g
                    key={el.id}
                    onMouseDown={(e) => handleMouseDown(e, el.id)}
                    onDoubleClick={(e) => { e.stopPropagation(); onSelectElement(el.id); setEditingElementId(el.id); }}
                    className="cursor-move"
                  >
                    {isViolating && (
                      <rect x={el.x - 4} y={el.y - 4} width={el.width + 8} height={el.height + 8} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="3 3" />
                    )}
                    <polygon
                      points={points}
                      fill={el.fillColor || "#ffffff"}
                      stroke={isSelected ? "#2563eb" : el.strokeColor || "#0f172a"}
                      strokeWidth={isSelected ? 2.5 : el.strokeWidth || 2}
                    />
                    {el.refNumber && (
                      <text x={cx} y={el.y - 6} textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="bold">
                        {el.refNumber}
                      </text>
                    )}
                    <text
                      x={cx}
                      y={el.subText ? cy - 4 : cy + 4}
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize={el.fontSize || 12}
                      fontWeight={el.fontWeight || "bold"}
                    >
                      {el.text}
                    </text>
                    {el.subText && (
                      <text x={cx} y={cy + 14} textAnchor="middle" fill="#475569" fontSize="10">
                        {el.subText}
                      </text>
                    )}
                  </g>
                );
              }

              if (el.type === "reference-numeral") {
                return (
                  <g
                    key={el.id}
                    onMouseDown={(e) => handleMouseDown(e, el.id)}
                    onDoubleClick={(e) => { e.stopPropagation(); onSelectElement(el.id); setEditingElementId(el.id); }}
                    className="cursor-move"
                  >
                    <rect
                      x={el.x}
                      y={el.y}
                      width={el.width}
                      height={el.height}
                      rx="4"
                      fill="#0f172a"
                      stroke={isSelected ? "#2563eb" : "#0f172a"}
                      strokeWidth={isSelected ? 2 : 1}
                    />
                    <text
                      x={el.x + el.width / 2}
                      y={el.y + 16}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {el.refNumber || el.text}
                    </text>
                  </g>
                );
              }

              if (el.type === "text") {
                return (
                  <g
                    key={el.id}
                    onMouseDown={(e) => handleMouseDown(e, el.id)}
                    onDoubleClick={(e) => { e.stopPropagation(); onSelectElement(el.id); setEditingElementId(el.id); }}
                    className="cursor-move"
                  >
                    {isViolating && (
                      <rect x={el.x - 4} y={el.y - 4} width={el.width + 8} height={el.height + 8} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
                    )}
                    {isSelected && (
                      <rect x={el.x - 4} y={el.y - 4} width={el.width + 8} height={el.height + 8} fill="none" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3 3" />
                    )}
                    <text
                      x={el.textAlign === "left" ? el.x : el.textAlign === "right" ? el.x + el.width : el.x + el.width / 2}
                      y={el.y + (el.fontSize || 14)}
                      textAnchor={el.textAlign === "left" ? "start" : el.textAlign === "right" ? "end" : "middle"}
                      fill={isSelected ? "#2563eb" : el.strokeColor || "#0f172a"}
                      fontSize={el.fontSize || 14}
                      fontWeight={el.fontWeight || "bold"}
                      fontFamily={el.fontFamily || "Inter, sans-serif"}
                    >
                      {el.text}
                    </text>
                  </g>
                );
              }

              // Default Box (rectangle / rounded-rect)
              let textY: number;
              let subTextY: number;

              if (el.textVAlign === "top") {
                textY = el.y + 24;
                subTextY = el.y + 42;
              } else if (el.textVAlign === "bottom") {
                if (el.subText) {
                  textY = el.y + el.height - 30;
                  subTextY = el.y + el.height - 12;
                } else {
                  textY = el.y + el.height - 14;
                  subTextY = el.y + el.height;
                }
              } else {
                // "middle" or default
                if (el.subText) {
                  textY = el.height > 75 ? el.y + 28 : el.y + el.height / 2 - 6;
                  subTextY = el.height > 75 ? el.y + 48 : el.y + el.height / 2 + 14;
                } else {
                  textY = el.y + el.height / 2 + 5;
                  subTextY = el.y + el.height / 2 + 22;
                }
              }

              let textX = el.x + el.width / 2;
              let textAnchor: "start" | "middle" | "end" = "middle";
              if (el.textAlign === "left") {
                textX = el.x + 16;
                textAnchor = "start";
              } else if (el.textAlign === "right") {
                textX = el.x + el.width - 16;
                textAnchor = "end";
              }

              return (
                <g
                  key={el.id}
                  onMouseDown={(e) => handleMouseDown(e, el.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onSelectElement(el.id);
                    setEditingElementId(el.id);
                  }}
                  className="cursor-move"
                >
                  {/* USPTO Margin Violation indicator */}
                  {isViolating && (
                    <rect
                      x={el.x - 5}
                      y={el.y - 5}
                      width={el.width + 10}
                      height={el.height + 10}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      className="animate-pulse"
                    />
                  )}

                  {/* Primary Node Rectangle */}
                  <rect
                    x={el.x}
                    y={el.y}
                    width={el.width}
                    height={el.height}
                    rx={el.type === "rounded-rect" ? 8 : 0}
                    fill={el.fillColor || "#ffffff"}
                    stroke={isSelected ? "#2563eb" : el.strokeColor || "#0f172a"}
                    strokeWidth={isSelected ? 2.5 : el.strokeWidth || 2}
                    strokeDasharray={el.strokeStyle === "dashed" ? "5 5" : undefined}
                    className="shadow-xs"
                  />

                  {/* Patent Reference Numeral */}
                  {el.refNumber && (
                    <text
                      x={el.x + el.width - 16}
                      y={el.y - 6}
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="Inter, sans-serif"
                    >
                      {el.refNumber}
                    </text>
                  )}

                  {/* Main Title */}
                  <text
                    x={textX}
                    y={textY}
                    textAnchor={textAnchor}
                    fill="#0f172a"
                    fontSize={el.fontSize || 13}
                    fontWeight={el.fontWeight || "bold"}
                    fontFamily={el.fontFamily || "Inter, sans-serif"}
                  >
                    {el.text}
                  </text>

                  {/* Subtext description lines */}
                  {el.subText && (
                    <text
                      x={textX}
                      y={subTextY}
                      textAnchor={textAnchor}
                      fill="#475569"
                      fontSize={Math.max(9, (el.fontSize || 13) - 3)}
                      fontFamily={el.fontFamily || "Inter, sans-serif"}
                    >
                      {el.subText}
                    </text>
                  )}

                  {/* 4 Interactive Corner Resize Handles when Selected */}
                  {isSelected && (
                    <>
                      <rect
                        x={el.x - 4}
                        y={el.y - 4}
                        width="8"
                        height="8"
                        fill="#2563eb"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="cursor-nwse-resize"
                        onMouseDown={(e) => handleStartResize(e, "nw")}
                      />
                      <rect
                        x={el.x + el.width - 4}
                        y={el.y - 4}
                        width="8"
                        height="8"
                        fill="#2563eb"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="cursor-nesw-resize"
                        onMouseDown={(e) => handleStartResize(e, "ne")}
                      />
                      <rect
                        x={el.x - 4}
                        y={el.y + el.height - 4}
                        width="8"
                        height="8"
                        fill="#2563eb"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="cursor-nesw-resize"
                        onMouseDown={(e) => handleStartResize(e, "sw")}
                      />
                      <rect
                        x={el.x + el.width - 4}
                        y={el.y + el.height - 4}
                        width="8"
                        height="8"
                        fill="#2563eb"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="cursor-nwse-resize"
                        onMouseDown={(e) => handleStartResize(e, "se")}
                      />
                    </>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Floating Quick Action Toolbar for Selected Element */}
          {selectedElement && !editingElementId && (
            <div
              className="absolute z-20 flex items-center gap-1 bg-slate-900/90 backdrop-blur-xs text-white px-2 py-1 rounded-full shadow-xl text-[11px] font-semibold transition-all select-none border border-slate-700 pointer-events-auto"
              style={{
                left: `${Math.max(10, Math.min(940 * (zoom / 100) - 260, (selectedElement.x * zoom) / 100))}px`,
                top: `${Math.max(10, ((selectedElement.y - 34) * zoom) / 100)}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setEditingElementId(selectedElement.id)}
                className="flex items-center gap-1 hover:text-blue-300 px-2 py-0.5 rounded transition-colors"
                title="Edit Text, Subtitle & Numerals"
              >
                <Edit3 className="w-3 h-3 text-blue-400" />
                <span>Edit Text</span>
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={() => toggleFill(selectedElement)}
                className="hover:text-blue-300 px-1.5 py-0.5 rounded transition-colors"
                title="Toggle Fill (Clear / White)"
              >
                {selectedElement.fillColor === "transparent" ? "⚪ Clear" : "⬜ Solid"}
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={() => toggleStrokeStyle(selectedElement)}
                className="hover:text-blue-300 px-1.5 py-0.5 rounded transition-colors"
                title="Toggle Dashed / Solid Border"
              >
                {selectedElement.strokeStyle === "dashed" ? "- - Dashed" : "─── Solid"}
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={() => handleDeleteElement(selectedElement.id)}
                className="hover:text-red-400 p-1 text-slate-400 transition-colors"
                title="Delete Element"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* In-Canvas Direct Inline Text Editor Modal Card */}
          {editingElement && (
            <div
              className="absolute z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-2 border-blue-500 rounded-xl shadow-2xl p-3.5 min-w-[320px] max-w-[380px] select-none pointer-events-auto"
              style={{
                left: `${Math.min(940 * (zoom / 100) - 340, Math.max(12, (editingElement.x * zoom) / 100))}px`,
                top: `${Math.min(640 * (zoom / 100) - 260, Math.max(12, ((editingElement.y + (editingElement.height > 100 ? 12 : editingElement.height + 8)) * zoom) / 100))}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Edit Text & Subtitle
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingElementId(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {/* Title / Main Label */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Main Title / Text
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={editingElement.text || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateFigure({
                        ...figure,
                        elements: figure.elements.map((el) => el.id === editingElement.id ? { ...el, text: val } : el)
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setEditingElementId(null);
                      if (e.key === "Escape") setEditingElementId(null);
                    }}
                    placeholder="Element title..."
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Subtitle / Description */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Subtitle / Description (subText)
                  </label>
                  <input
                    type="text"
                    value={editingElement.subText || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateFigure({
                        ...figure,
                        elements: figure.elements.map((el) => el.id === editingElement.id ? { ...el, subText: val } : el)
                      });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setEditingElementId(null);
                      if (e.key === "Escape") setEditingElementId(null);
                    }}
                    placeholder="Optional subtitle (e.g. Non-volatile crossbar array)"
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Reference Numeral & Vertical Align */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Numeral (#)
                    </label>
                    <input
                      type="text"
                      value={editingElement.refNumber || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateFigure({
                          ...figure,
                          elements: figure.elements.map((el) => el.id === editingElement.id ? { ...el, refNumber: val } : el)
                        });
                      }}
                      placeholder="e.g. 302"
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Vertical Align
                    </label>
                    <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
                      {(["top", "middle", "bottom"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            onUpdateFigure({
                              ...figure,
                              elements: figure.elements.map((el) => el.id === editingElement.id ? { ...el, textVAlign: v } : el)
                            });
                          }}
                          className={`flex-1 text-[10px] font-semibold py-1 rounded capitalize transition-all ${
                            (editingElement.textVAlign || "middle") === v
                              ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs font-bold"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Style quick buttons */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleFill(editingElement)}
                      className="text-[10px] font-bold px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100"
                    >
                      {editingElement.fillColor === "transparent" ? "⚪ Clear Fill" : "⬜ White Fill"}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleStrokeStyle(editingElement)}
                      className="text-[10px] font-bold px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100"
                    >
                      {editingElement.strokeStyle === "dashed" ? "- - Dashed" : "─── Solid"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteElement(editingElement.id)}
                    className="text-[10px] font-bold px-2 py-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    title="Delete Element"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => setEditingElementId(null)}
                    className="h-7 text-xs px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    Done Editing
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── BOTTOM SHEETS STRIP & FIGURE OPERATIONS ─────────────────────── */}
      <div className="h-32 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col shrink-0 px-4 py-2 z-10">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4 text-xs font-bold">
            <button
              onClick={() => setBottomTab("figures")}
              className={`pb-1 border-b-2 transition-colors ${
                bottomTab === "figures"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Figures ({allFigures.length})
            </button>
            <button
              onClick={() => setBottomTab("history")}
              className={`pb-1 border-b-2 transition-colors ${
                bottomTab === "history"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Version History
            </button>
          </div>

          <div className="flex items-center gap-3">
            {onAddFigure && (
              <button
                onClick={onAddFigure}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Figure</span>
              </button>
            )}
            <span className="text-[11px] text-slate-400">Current: FIG. {figure.figureNumber}</span>
          </div>
        </div>

        {/* Figures Carousel */}
        {bottomTab === "figures" ? (
          <div className="flex items-center gap-3 overflow-x-auto py-2 scrollbar-thin">
            {allFigures.map((fig, idx) => {
              const isActive = fig.id === figure.id;
              return (
                <div
                  key={fig.id}
                  onClick={() => onSelectFigure(fig.id)}
                  className={`group relative flex flex-col items-center gap-1 shrink-0 p-1.5 rounded-lg border-2 cursor-pointer transition-all ${
                    isActive
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-400 bg-white dark:bg-slate-900"
                  }`}
                  style={{ width: "138px" }}
                >
                  {/* Schematic Mock Thumbnail */}
                  <div className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center relative overflow-hidden">
                    <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                      FIG. {fig.figureNumber}
                    </span>
                    <div className="absolute inset-x-2 top-2 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
                    <div className="absolute inset-x-4 bottom-2 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />

                    {/* Quick Action Overlay on Hover */}
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                      {onMoveFigure && idx > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onMoveFigure(fig.id, "left"); }}
                          className="p-1 bg-white/20 hover:bg-white/40 text-white rounded"
                          title="Move Left"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                      )}
                      {onDuplicateFigure && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDuplicateFigure(fig.id); }}
                          className="p-1 bg-white/20 hover:bg-white/40 text-white rounded"
                          title="Duplicate Figure"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                      {onMoveFigure && idx < allFigures.length - 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onMoveFigure(fig.id, "right"); }}
                          className="p-1 bg-white/20 hover:bg-white/40 text-white rounded"
                          title="Move Right"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                      {onDeleteFigure && allFigures.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteFigure(fig.id); }}
                          className="p-1 bg-red-600/80 hover:bg-red-600 text-white rounded"
                          title="Delete Figure"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate w-full text-center">
                    {fig.figureNumber}. {fig.figureTitle}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-2 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-6">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200">Current Version:</span> v{figure.version}
            </div>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200">Last Saved:</span> {new Date(figure.lastSavedAt).toLocaleString()}
            </div>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200">Author:</span> Lead Patent Designer
            </div>
          </div>
        )}
      </div>

      {/* ─── USPTO STANDARDS COMPLIANCE AUDIT MODAL ──────────────────────── */}
      {isUsptoAuditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  USPTO Drawing Standards Compliance (37 CFR 1.84)
                </h3>
              </div>
              <button
                onClick={() => setIsUsptoAuditOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Margin Bounds Check */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                {marginViolations.length === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">1-Inch Printable Margins</span>
                    <span className={`font-mono font-bold ${marginViolations.length === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {marginViolations.length === 0 ? "COMPLIANT" : `${marginViolations.length} VIOLATIONS`}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Drawings must remain strictly inside the 1.0 inch (2.5 cm) printable border boundary.
                  </p>
                </div>
              </div>

              {/* Line Weight Check */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                {lineWeightViolations.length === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Line Thickness (≥ 0.35 mm)</span>
                    <span className="font-mono font-bold text-emerald-600">COMPLIANT (≥ 2px)</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    All lines must be dark enough and of uniform thickness to allow high-contrast scanning.
                  </p>
                </div>
              </div>

              {/* Reference Numeral Sizing */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Text & Numeral Size (≥ 3.2 mm / 1/8")</span>
                    <span className="font-mono font-bold text-emerald-600">COMPLIANT (12-14 pt)</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Numbers and reference characters must be clear and legible, never less than 3.2 mm.
                  </p>
                </div>
              </div>

              {/* Contrast / Pure Black */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">High Contrast Monochrome</span>
                    <span className="font-mono font-bold text-emerald-600">PASS</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Pure black vector lines on white printable sheet, preventing ink saturation.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Tools */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoFitMargins}
                  className="text-xs"
                >
                  <Wrench className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  Auto-Fit Margins
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNormalizeLineWeights}
                  className="text-xs"
                >
                  Normalize Weights
                </Button>
              </div>

              <Button
                size="sm"
                onClick={() => setIsUsptoAuditOpen(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                Close Audit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}