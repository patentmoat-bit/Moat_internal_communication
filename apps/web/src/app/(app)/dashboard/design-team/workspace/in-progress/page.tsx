"use client";

import { triggerFileDownload } from "@/lib/downloadHelper";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Clock,
  PenTool,
  UploadCloud,
  Save,
  CheckCircle2,
  AlertTriangle,
  History,
  Eye,
  Download,
  FolderOpen,
  FileText,
  ImageIcon,
  ArrowRight,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Send,
  Layers,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  SplitSquareVertical,
  Plus,
  Trash2,
  Edit3,
  Clipboard,
  FileDown,
  X,
  Share2,
  Sparkles,
  Check,
  Copy,
  Move,
  MousePointer,
  Sliders,
  Square,
  Circle,
  Database,
  Cpu,
  FileJson,
  RefreshCw,
  Code
} from "lucide-react";
import { useActiveRole } from "@/components/auth/role-context";

export interface CalloutElement {
  id: string;
  numeral: string;
  label: string;
  type: "box" | "circle" | "diamond" | "bus" | "cylinder";
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
}

// Pre-built schematic templates for rapid patent drawing creation
const PRESET_TEMPLATES = [
  {
    id: "system-arch",
    title: "Multi-Tier Cloud System Architecture",
    description: "Client application tier, API gateway, cluster orchestrator, and database store.",
    elements: [
      { id: "tmpl-1", numeral: "102", label: "Client Edge Terminal", type: "box" as const, x: 20, y: 22 },
      { id: "tmpl-2", numeral: "104", label: "Secure Gateway Router", type: "diamond" as const, x: 50, y: 22 },
      { id: "tmpl-3", numeral: "106", label: "Neural Inference Core", type: "box" as const, x: 80, y: 22 },
      { id: "tmpl-4", numeral: "108", label: "Central High-Speed Bus", type: "bus" as const, x: 50, y: 55 },
      { id: "tmpl-5", numeral: "110", label: "Persistent Ledger DB", type: "cylinder" as const, x: 25, y: 78 },
      { id: "tmpl-6", numeral: "112", label: "Audit Telemetry Store", type: "cylinder" as const, x: 75, y: 78 },
    ]
  },
  {
    id: "process-flow",
    title: "Method / Decision Logic Flowchart",
    description: "Start node, condition branch, processing loop, and verified termination point.",
    elements: [
      { id: "tmpl-11", numeral: "202", label: "Data Ingestion Hook", type: "circle" as const, x: 50, y: 15 },
      { id: "tmpl-12", numeral: "204", label: "Payload Decryption Step", type: "box" as const, x: 50, y: 35 },
      { id: "tmpl-13", numeral: "206", label: "Cryptographic Validation", type: "diamond" as const, x: 50, y: 58 },
      { id: "tmpl-14", numeral: "208", label: "Fallback Quarantine", type: "box" as const, x: 18, y: 58 },
      { id: "tmpl-15", numeral: "210", label: "Authorized Execution", type: "box" as const, x: 50, y: 82 },
    ]
  },
  {
    id: "iot-hardware",
    title: "Hardware / Embedded Sensor Circuit",
    description: "Antenna transceiver, microcontroller unit, power regulator, and transducer array.",
    elements: [
      { id: "tmpl-21", numeral: "302", label: "Dipole Antenna Element", type: "diamond" as const, x: 18, y: 25 },
      { id: "tmpl-22", numeral: "304", label: "RF Front-End Modulator", type: "box" as const, x: 45, y: 25 },
      { id: "tmpl-23", numeral: "306", label: "Main MCU Processor", type: "box" as const, x: 78, y: 35 },
      { id: "tmpl-24", numeral: "308", label: "Energy Harvesting Unit", type: "cylinder" as const, x: 30, y: 68 },
      { id: "tmpl-25", numeral: "310", label: "Environmental Transducer", type: "circle" as const, x: 78, y: 70 },
    ]
  },
  {
    id: "ai-pipeline",
    title: "Deep Learning Pipeline & Latent Embeddings",
    description: "Input matrix, attention layer, latent representation, and softmax classifier.",
    elements: [
      { id: "tmpl-31", numeral: "402", label: "Normalized Feature Tensor", type: "box" as const, x: 18, y: 40 },
      { id: "tmpl-32", numeral: "404", label: "Multi-Head Attention Layer", type: "diamond" as const, x: 45, y: 40 },
      { id: "tmpl-33", numeral: "406", label: "Latent Manifold Space", type: "circle" as const, x: 72, y: 30 },
      { id: "tmpl-34", numeral: "408", label: "Probabilistic Head", type: "box" as const, x: 72, y: 68 },
    ]
  }
];

export default function InProgressWorkspacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("id");
  const { currentUser, users } = useActiveRole();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<any | null>(null);

  // Active workspace tabs: "editor" | "source" | "compare" | "history"
  const [activeTab, setActiveTab] = useState<"editor" | "source" | "compare" | "history">("editor");

  // Viewport controls
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showMargins, setShowMargins] = useState<boolean>(true);
  const [clickToPlaceMode, setClickToPlaceMode] = useState<boolean>(false);

  // Editable Figure Elements State
  const [figureNum, setFigureNum] = useState<number>(1);
  const [figureCaption, setFigureCaption] = useState<string>("");
  const [elements, setElements] = useState<CalloutElement[]>([
    { id: "el-1", numeral: "102", label: "Cloud Coordinator", type: "box", x: 20, y: 25 },
    { id: "el-2", numeral: "104", label: "Neural Weight Engine", type: "diamond", x: 65, y: 25 },
    { id: "el-3", numeral: "106", label: "Thermostat Router", type: "box", x: 20, y: 65 },
    { id: "el-4", numeral: "108", label: "Power Allocation Matrix", type: "bus", x: 65, y: 65 },
  ]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>("el-1");

  // Dragging state on canvas
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Add Callout form inputs
  const [newNumeral, setNewNumeral] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<"box" | "circle" | "diamond" | "bus" | "cylinder">("box");

  // Staged / Uploaded / Pasted Base Image
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [stagedFileName, setStagedFileName] = useState<string>("");

  // Revision Form State
  const [revisionTitle, setRevisionTitle] = useState("");
  const [revisionNotes, setRevisionNotes] = useState("");
  const [savingVersion, setSavingVersion] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Send To Form State
  const [recipientRole, setRecipientRole] = useState<string>("PATENT_DRAFTER");
  const [recipientUser, setRecipientUser] = useState<string>("Alice Drafter");
  const [sendMsg, setSendMsg] = useState("");
  const [sendNotes, setSendNotes] = useState("");
  const [checkMarginCompliant, setCheckMarginCompliant] = useState(true);
  const [checkNumeralsConsistent, setCheckNumeralsConsistent] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Version Comparison
  const [compareV1, setCompareV1] = useState<number>(1);
  const [compareV2, setCompareV2] = useState<number>(2);

  // Selected element helper
  const selectedElement = elements.find((el) => el.id === selectedElementId) || null;

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/design-team/assignments");
      if (res.ok) {
        const data = await res.json();
        if (data.assignments) {
          setTasks(data.assignments);
          let current = null;
          if (requestedId) {
            current = data.assignments.find((t: any) => t.id === requestedId);
          }
          if (!current) {
            current =
              data.assignments.find((t: any) => t.status === "IN_PROGRESS" || t.status === "REWORK") ||
              data.assignments[0];
          }
          setActiveTask(current);
          if (current) {
            setFigureNum(current.figure_numbers?.[0] || 1);
            setFigureCaption(current.title || "");
            if (current.versions?.length > 1) {
              setCompareV1(current.versions[1].version);
              setCompareV2(current.versions[0].version);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [requestedId]);

  // Clipboard Paste Support for Images (Ctrl + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const url = URL.createObjectURL(file);
            setBaseImage(url);
            const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
            setStagedFileName(`Clipboard_Paste_${stamp}.png`);
            setRevisionTitle(`Pasted Line Art - FIG ${figureNum}`);
            setCopiedNotice(true);
            setTimeout(() => setCopiedNotice(false), 3000);
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [figureNum]);

  // Dragging handlers on canvas
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(5, Math.min(95, Math.round(rawX)));
    const clampedY = Math.max(8, Math.min(90, Math.round(rawY)));

    setElements((prev) =>
      prev.map((el) => (el.id === draggingId ? { ...el, x: clampedX, y: clampedY } : el))
    );
  };

  const handleCanvasMouseUp = () => {
    setDraggingId(null);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!clickToPlaceMode || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(5, Math.min(95, Math.round(rawX)));
    const clampedY = Math.max(8, Math.min(90, Math.round(rawY)));

    // Generate next numeral auto-incremented
    const maxNum = elements.reduce((max, el) => {
      const parsed = parseInt(el.numeral, 10);
      return !isNaN(parsed) && parsed > max ? parsed : max;
    }, 100);
    const nextNum = maxNum + 2;

    const newEl: CalloutElement = {
      id: "el-" + Date.now(),
      numeral: String(nextNum),
      label: `Component ${nextNum}`,
      type: "box",
      x: clampedX,
      y: clampedY,
    };
    setElements([...elements, newEl]);
    setSelectedElementId(newEl.id);
    setClickToPlaceMode(false);
  };

  const handleSelectTask = (task: any) => {
    setActiveTask(task);
    setFigureNum(task.figure_numbers?.[0] || 1);
    setFigureCaption(task.title || "");
    setBaseImage(null);
    setStagedFileName("");
    setRevisionTitle("");
    setRevisionNotes("");
    setSaveSuccess(false);
    setSendSuccess(false);
    if (task.versions?.length > 1) {
      setCompareV1(task.versions[1].version);
      setCompareV2(task.versions[0].version);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setBaseImage(previewUrl);
      setStagedFileName(file.name);
      setRevisionTitle(`Imported: ${file.name.replace(/\.[^/.]+$/, "")}`);
    }
  };

  // Add Callout Element
  const handleAddCallout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumeral || !newLabel) return;
    const newEl: CalloutElement = {
      id: "el-" + Date.now(),
      numeral: newNumeral.trim(),
      label: newLabel.trim(),
      type: newType,
      x: 35 + Math.floor(Math.random() * 30),
      y: 35 + Math.floor(Math.random() * 30),
    };
    setElements([...elements, newEl]);
    setSelectedElementId(newEl.id);
    setNewNumeral("");
    setNewLabel("");
  };

  // Update Existing Selected Element
  const handleUpdateSelectedElement = (updates: Partial<CalloutElement>) => {
    if (!selectedElementId) return;
    setElements((prev) =>
      prev.map((el) => (el.id === selectedElementId ? { ...el, ...updates } : el))
    );
  };

  // Duplicate Element
  const handleDuplicateElement = (id: string) => {
    const orig = elements.find((el) => el.id === id);
    if (!orig) return;
    const dup: CalloutElement = {
      ...orig,
      id: "el-" + Date.now(),
      numeral: orig.numeral + "A",
      label: orig.label + " (Subcomponent)",
      x: Math.min(90, orig.x + 8),
      y: Math.min(90, orig.y + 8),
    };
    setElements([...elements, dup]);
    setSelectedElementId(dup.id);
  };

  // Delete Callout Element
  const handleDeleteCallout = (id: string) => {
    setElements(elements.filter((el) => el.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  // Load Preset Template
  const handleLoadTemplate = (tmpl: (typeof PRESET_TEMPLATES)[0]) => {
    setElements(tmpl.elements);
    setFigureCaption(`FIG. ${figureNum} — ${tmpl.title}`);
    setSelectedElementId(tmpl.elements[0]?.id || null);
    setShowImportModal(false);
  };

  // Import JSON Metadata file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.elements && Array.isArray(parsed.elements)) {
          setElements(parsed.elements);
          if (parsed.figure_number) setFigureNum(parsed.figure_number);
          if (parsed.title) setFigureCaption(parsed.title);
          setSelectedElementId(parsed.elements[0]?.id || null);
          console.log(`Imported ${parsed.elements.length} callouts from ${file.name}`);
        }
      } catch (err) {
        console.warn("Failed to parse JSON metadata file.");
      }
    };
    reader.readAsText(file);
    setShowImportModal(false);
  };

  // Save New Version
  const handleSaveRevision = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeTask) return;
    setSavingVersion(true);
    setSaveSuccess(false);

    try {
      const fileName =
        stagedFileName || `FIG_${figureNum}_Formal_v${(activeTask.current_version || 1) + 1}.png`;
      const notesWithElements = `${revisionNotes || "Updated patent figure drawing."} [Reference Numerals: ${elements.map((el) => `[${el.numeral}] ${el.label}`).join(", ")}]`;

      const res = await fetch("/api/design-team/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: activeTask.id,
          title:
            revisionTitle ||
            `FIG ${figureNum} Formal Drawing v${(activeTask.current_version || 1) + 1}`,
          file_name: fileName,
          file_size: "1.8 MB",
          file_type: "image/png",
          notes: notesWithElements,
          actor: currentUser?.name || "Design Team",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSaveSuccess(true);
        setRevisionTitle("");
        setRevisionNotes("");
        await fetchTasks();
        if (data.assignment) setActiveTask(data.assignment);
      }
    } catch (err) {
      console.error("Error saving revision:", err);
    } finally {
      setSavingVersion(false);
      setTimeout(() => setSaveSuccess(false), 3500);
    }
  };

  // Submit to Authorized Recipient (Send To)
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask) return;
    setSending(true);

    try {
      const checklistNotes = [
        checkMarginCompliant ? "Margins compliant with 37 CFR § 1.84." : "",
        checkNumeralsConsistent ? "Reference numerals verified with claim draft." : "",
        `Numerals included: ${elements.map((el) => el.numeral).join(", ")}.`,
        sendNotes,
      ]
        .filter(Boolean)
        .join(" | ");

      const res = await fetch("/api/design-team/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: activeTask.id,
          version: activeTask.current_version || 1,
          recipient_role: recipientRole,
          recipient_user: recipientUser,
          message:
            sendMsg ||
            `Line art ready for review on FIG ${figureNum} (${activeTask.title}) - version v${activeTask.current_version || 1}.`,
          notes: checklistNotes,
          actor: currentUser?.name || "Design Team",
        }),
      });

      if (res.ok) {
        setSendSuccess(true);
        setShowSendModal(false);
        await fetchTasks();
      }
    } catch (err) {
      console.error("Error submitting review:", err);
    } finally {
      setSending(false);
    }
  };

  // Export handlers
  const handleExportPNG = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background white
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Margins per 37 CFR 1.84 (1.0 inch top/left, 0.625 inch right/bottom)
    ctx.strokeStyle = "#cccccc";
    ctx.setLineDash([8, 8]);
    ctx.lineWidth = 2;
    ctx.strokeRect(100, 100, canvas.width - 180, canvas.height - 200);
    ctx.setLineDash([]);

    // Patent sheet header
    ctx.fillStyle = "#444444";
    ctx.font = "16px monospace";
    ctx.textAlign = "left";
    ctx.fillText(
      `APPLICATION REF: ${activeTask?.invention_id || "INV-001"} | SHEET 1/1`,
      110,
      80
    );

    // Draw elements
    ctx.fillStyle = "#000000";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;

    // Draw central diagram framework
    ctx.strokeRect(250, 350, 700, 750);
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.fillText("DISTRIBUTED LOGIC INTERCONNECT", 600, 390);

    // Draw callout nodes
    elements.forEach((el) => {
      const px = (el.x / 100) * 800 + 200;
      const py = (el.y / 100) * 900 + 300;

      // Draw shape
      if (el.type === "circle") {
        ctx.beginPath();
        ctx.arc(px, py, 45, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#000000";
        ctx.stroke();
      } else if (el.type === "diamond") {
        ctx.beginPath();
        ctx.moveTo(px, py - 40);
        ctx.lineTo(px + 65, py);
        ctx.lineTo(px, py + 40);
        ctx.lineTo(px - 65, py);
        ctx.closePath();
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#000000";
        ctx.stroke();
      } else if (el.type === "cylinder") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(px - 60, py - 35, 120, 70);
        ctx.strokeRect(px - 60, py - 35, 120, 70);
      } else {
        // default box or bus
        const width = el.type === "bus" ? 180 : 130;
        const height = el.type === "bus" ? 50 : 60;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(px - width / 2, py - height / 2, width, height);
        ctx.strokeRect(px - width / 2, py - height / 2, width, height);
      }

      // Draw numeral and label
      ctx.fillStyle = "#000000";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`[${el.numeral}]`, px, py - 5);
      ctx.font = "14px sans-serif";
      ctx.fillText(el.label, px, py + 18);
    });

    // Sheet Bottom Identification
    ctx.fillStyle = "#000000";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`FIG. ${figureNum}`, canvas.width / 2, 1460);
    ctx.font = "20px sans-serif";
    ctx.fillText(figureCaption || activeTask?.title || "Formal Patent Drawing", canvas.width / 2, 1500);

    const a = document.createElement("a");
    a.download = `FIG_${figureNum}_Patent_Drawing_Sheet.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
    setShowExportModal(false);
  };

  const handleExportSVG = () => {
    const width = 850;
    const height = 1100;
    let svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .uspto-border { stroke: #999; stroke-dasharray: 4,4; stroke-width: 1; fill: none; }
    .box { stroke: #000; stroke-width: 2.5; fill: #fff; }
    .numeral { font-family: monospace; font-size: 16px; font-weight: bold; fill: #000; text-anchor: middle; }
    .label { font-family: sans-serif; font-size: 11px; fill: #000; text-anchor: middle; }
    .fig-title { font-family: sans-serif; font-size: 24px; font-weight: bold; fill: #000; text-anchor: middle; }
    .fig-caption { font-family: sans-serif; font-size: 14px; fill: #333; text-anchor: middle; }
    .header-text { font-family: monospace; font-size: 12px; fill: #555; }
  </style>
  <rect width="${width}" height="${height}" fill="#ffffff" />
  <rect x="72" y="72" width="${width - 120}" height="${height - 144}" class="uspto-border" />
  <text x="75" y="55" class="header-text">USPTO 37 CFR § 1.84 | APP: ${activeTask?.invention_id || "INV-001"} | SHEET 1/1</text>
  <rect x="160" y="220" width="530" height="580" stroke="#000" stroke-width="2" fill="none" />
  <text x="425" y="250" class="numeral">CENTRAL SYSTEM ARCHITECTURE</text>
`;

    elements.forEach((el) => {
      const cx = (el.x / 100) * 600 + 120;
      const cy = (el.y / 100) * 650 + 180;

      if (el.type === "circle") {
        svgContent += `  <circle cx="${cx}" cy="${cy}" r="35" class="box" />\n`;
      } else if (el.type === "diamond") {
        svgContent += `  <polygon points="${cx},${cy - 30} ${cx + 50},${cy} ${cx},${cy + 30} ${cx - 50},${cy}" class="box" />\n`;
      } else {
        const w = el.type === "bus" ? 140 : 110;
        const h = el.type === "bus" ? 40 : 50;
        svgContent += `  <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="2" class="box" />\n`;
      }
      svgContent += `  <text x="${cx}" y="${cy - 2}" class="numeral">[${el.numeral}]</text>\n`;
      svgContent += `  <text x="${cx}" y="${cy + 15}" class="label">${el.label}</text>\n`;
    });

    svgContent += `  <text x="${width / 2}" y="${height - 90}" class="fig-title">FIG. ${figureNum}</text>\n`;
    svgContent += `  <text x="${width / 2}" y="${height - 65}" class="fig-caption">${figureCaption || activeTask?.title || "Patent Figure"}</text>\n`;
    svgContent += `</svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const dl = document.createElement("a");
    dl.href = url;
    dl.download = `FIG_${figureNum}_Vector_Patent_Drawing.svg`;
    dl.click();
    setShowExportModal(false);
  };

  const handleExportPDF = () => {
    // Open a formatted print preview window with exact USPTO dimensions
    const printWin = window.open("", "_blank");
    if (!printWin) {
      console.warn("Please allow popups to open the PDF Sheet generator.");
      return;
    }
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>FIG_${figureNum}_Patent_Sheet</title>
          <style>
            @page { size: letter portrait; margin: 1.0in 0.6in 0.75in 1.0in; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; color: #000; margin: 0; padding: 20px; }
            .header { font-size: 10pt; font-family: monospace; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 24px; display: flex; justify-content: space-between; }
            .sheet-border { border: 2px solid #000; padding: 30px; min-height: 700px; display: flex; flex-direction: column; justify-content: space-between; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin: 40px 0; }
            .item { border: 2px solid #000; padding: 16px; text-align: center; border-radius: 4px; }
            .numeral { font-family: monospace; font-size: 14pt; font-weight: bold; margin-bottom: 4px; }
            .label { font-size: 10pt; font-weight: 500; }
            .footer { text-align: center; margin-top: 30px; border-top: 1px solid #000; padding-top: 10px; }
            .fig-title { font-size: 16pt; font-weight: bold; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="header">
            <span>USPTO 37 CFR § 1.84 SPECIFICATION DRAWING</span>
            <span>APPLICATION: ${activeTask?.invention_id || "INV-001"} | SHEET 1 OF 1</span>
          </div>
          <div class="sheet-border">
            <div style="text-align: center; font-family: monospace; font-size: 11pt; font-weight: bold;">
              DISTRIBUTED ARCHITECTURAL SCHEMATIC
            </div>
            <div class="grid">
              ${elements
                .map(
                  (el) => `
                <div class="item">
                  <div class="numeral">[${el.numeral}]</div>
                  <div class="label">${el.label}</div>
                </div>
              `
                )
                .join("")}
            </div>
            <div class="footer">
              <div class="fig-title">FIG. ${figureNum}</div>
              <div style="font-size: 10pt; color: #333; margin-top: 4px;">${figureCaption || activeTask?.title}</div>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
    setShowExportModal(false);
  };

  const handleExportJSON = () => {
    const payload = {
      figure_number: figureNum,
      title: figureCaption || activeTask?.title,
      assignment_id: activeTask?.id,
      invention_id: activeTask?.invention_id,
      version: activeTask?.current_version || 1,
      exported_by: currentUser?.name || "Design Team",
      exported_at: new Date().toISOString(),
      elements: elements,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `FIG_${figureNum}_Patent_Callouts_Metadata.json`);
    dlAnchor.click();
    setShowExportModal(false);
  };

  const handleCopyCalloutsClipboard = () => {
    const summary = elements.map((el) => `[${el.numeral}] ${el.label} (${el.type})`).join("\n");
    navigator.clipboard.writeText(summary);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Interactive Drawing Studio
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              DESIGNER: {currentUser?.name || "Design Team"}
            </span>
            {copiedNotice && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300 animate-in fade-in">
                ✓ Copied to clipboard!
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Clock className="w-7 h-7 text-emerald-600" /> In Progress Workspace
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Live technical drafting, schematic formalization, reference numeral placement, version diffing, and authorized recipient dispatch.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold shadow-sm"
            onClick={() => setShowImportModal(true)}
          >
            <UploadCloud className="w-4 h-4 mr-1.5 text-blue-500" /> Import Drawing / Paste
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold shadow-sm"
            onClick={() => setShowExportModal(true)}
          >
            <FileDown className="w-4 h-4 mr-1.5 text-amber-500" /> Export Sheet
          </Button>

          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm"
            onClick={() => setShowSendModal(true)}
            disabled={!activeTask}
          >
            <Send className="w-4 h-4 mr-1.5" /> Send to Reviewer...
          </Button>
        </div>
      </div>

      {sendSuccess && (
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Work submitted to {recipientRole} ({recipientUser}) successfully! Status updated to Under Review.
          </div>
          <Link href="/dashboard/design-team/workspace/under-review" className="underline text-xs">
            Open Under Review Queue →
          </Link>
        </div>
      )}

      {/* Main Dual-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Tasks Selection List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Tasks Queue</h3>
            <Badge variant="outline" className="text-[10px]">{tasks.length} Total</Badge>
          </div>

          <div className="space-y-2 max-h-[820px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground bg-muted/10 rounded-lg border border-border/30">
                No active tasks found.
              </div>
            ) : (
              tasks.map((task) => {
                const isSelected = activeTask?.id === task.id;
                return (
                  <div
                    key={task.id}
                    onClick={() => handleSelectTask(task)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 shadow-sm ring-1 ring-emerald-500"
                        : "bg-card border-border/40 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        {task.id}
                      </span>
                      <Badge
                        className={`text-[9px] font-bold ${
                          task.status === "IN_PROGRESS"
                            ? "bg-emerald-600 text-white"
                            : task.status === "REWORK"
                            ? "bg-rose-600 text-white"
                            : task.status === "UNDER_REVIEW"
                            ? "bg-purple-600 text-white"
                            : "bg-blue-600 text-white"
                        }`}
                      >
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>

                    <h4 className="text-xs font-bold text-foreground line-clamp-1">{task.title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {task.project_title} • <span className="font-mono">{task.invention_id}</span>
                    </p>

                    <div className="mt-2 pt-2 border-t border-border/20 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="font-mono font-bold text-foreground">v{task.current_version || 1}</span>
                      <span>Due {new Date(task.due_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Columns: Active Studio */}
        <div className="lg:col-span-3 space-y-4">
          {!activeTask ? (
            <Card className="p-16 text-center bg-card">
              <PenTool className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-bold text-foreground">Select a Task to Begin Editing</h3>
            </Card>
          ) : (
            <>
              {/* Task Status & Controls Header */}
              <Card className="bg-card border-border/50 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/30">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                          {activeTask.id}
                        </span>
                        <Badge variant="outline" className="text-xs font-mono">{activeTask.invention_id}</Badge>
                        <Badge className="bg-emerald-600 text-white text-xs font-bold font-mono">
                          v{activeTask.current_version || 1}
                        </Badge>
                        <Badge
                          className={`text-xs font-bold ${
                            activeTask.priority === "HIGH"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 border-rose-200"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 border-amber-200"
                          }`}
                        >
                          {activeTask.priority} Priority
                        </Badge>
                      </div>
                      <h2 className="text-lg font-bold text-foreground">{activeTask.title}</h2>
                      <p className="text-xs text-muted-foreground">
                        Project: {activeTask.project_title} • Requested by: <strong>{activeTask.assigned_by}</strong> ({activeTask.sender_role})
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => setShowSendModal(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm h-9"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" /> Send to Reviewer
                      </Button>
                    </div>
                  </div>

                  {/* Rework Alert Banner */}
                  {activeTask.status === "REWORK" && (
                    <div className="mt-3 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-800 dark:text-rose-300">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                      <div>
                        <span className="font-bold uppercase tracking-wider text-[10px] block">Reviewer Feedback:</span>
                        <p>{activeTask.last_notes || "Please adjust reference numerals and sheet margins as specified."}</p>
                      </div>
                    </div>
                  )}

                  {/* Studio Navigation Tabs */}
                  <div className="flex items-center gap-2 pt-3 flex-wrap">
                    <Button
                      size="sm"
                      variant={activeTab === "editor" ? "default" : "outline"}
                      className={`text-xs h-8 ${activeTab === "editor" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : ""}`}
                      onClick={() => setActiveTab("editor")}
                    >
                      <PenTool className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Interactive Drawing & Annotations
                    </Button>

                    <Button
                      size="sm"
                      variant={activeTab === "source" ? "default" : "outline"}
                      className={`text-xs h-8 ${activeTab === "source" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : ""}`}
                      onClick={() => setActiveTab("source")}
                    >
                      <FolderOpen className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Source Directives & Briefs
                    </Button>

                    <Button
                      size="sm"
                      variant={activeTab === "compare" ? "default" : "outline"}
                      className={`text-xs h-8 ${activeTab === "compare" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : ""}`}
                      onClick={() => setActiveTab("compare")}
                    >
                      <SplitSquareVertical className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Version Compare ({activeTask.versions?.length || 1})
                    </Button>

                    <Button
                      size="sm"
                      variant={activeTab === "history" ? "default" : "outline"}
                      className={`text-xs h-8 ${activeTab === "history" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : ""}`}
                      onClick={() => setActiveTab("history")}
                    >
                      <History className="w-3.5 h-3.5 mr-1.5 text-purple-500" /> Revision History
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Tab 1: Interactive Drawing Canvas & Editable Annotations */}
              {activeTab === "editor" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Viewport Canvas (2 Cols) */}
                  <div className="lg:col-span-2 space-y-3">
                    <Card className="bg-card border-border/50 overflow-hidden shadow-sm">
                      {/* Canvas Control Bar */}
                      <div className="px-4 py-2.5 bg-muted/30 border-b border-border/40 flex items-center justify-between text-xs flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">
                            {stagedFileName ? stagedFileName : activeTask.versions?.[0]?.file_name || `FIG_${figureNum}_Sheet.png`}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {baseImage ? "IMPORTED IMAGE" : `v${activeTask.current_version || 1}`}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Click-to-place toggle */}
                          <Button
                            size="sm"
                            variant={clickToPlaceMode ? "default" : "outline"}
                            className={`h-7 px-2 text-[11px] ${clickToPlaceMode ? "bg-emerald-600 text-white animate-pulse" : ""}`}
                            onClick={() => setClickToPlaceMode((c) => !c)}
                            title="Click anywhere on the sheet to place a new numeral callout"
                          >
                            <MousePointer className="w-3.5 h-3.5 mr-1" />
                            {clickToPlaceMode ? "Click Sheet to Place" : "+ Click to Place"}
                          </Button>

                          <div className="h-4 w-px bg-border/40 mx-0.5" />

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                            title="Zoom Out"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </Button>
                          <span className="text-[11px] font-mono w-9 text-center">{zoomLevel}%</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => setZoomLevel((z) => Math.min(200, z + 25))}
                            title="Zoom In"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </Button>

                          <div className="h-4 w-px bg-border/40 mx-0.5" />

                          <Button
                            size="sm"
                            variant={showGrid ? "secondary" : "ghost"}
                            className="h-7 px-2 text-[11px]"
                            onClick={() => setShowGrid((g) => !g)}
                          >
                            <Grid className="w-3.5 h-3.5 mr-1" /> Grid
                          </Button>

                          <Button
                            size="sm"
                            variant={showMargins ? "secondary" : "ghost"}
                            className="h-7 px-2 text-[11px]"
                            onClick={() => setShowMargins((m) => !m)}
                          >
                            <Maximize2 className="w-3.5 h-3.5 mr-1" /> Margins
                          </Button>
                        </div>
                      </div>

                      {/* Interactive Canvas Viewport */}
                      <div
                        className="h-[520px] bg-slate-100 dark:bg-slate-950/80 relative overflow-hidden flex items-center justify-center p-6 select-none"
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                      >
                        {/* Patent Sheet Container */}
                        <div
                          ref={canvasRef}
                          onClick={handleCanvasClick}
                          style={{
                            transform: `scale(${zoomLevel / 100})`,
                            transformOrigin: "center center",
                            cursor: clickToPlaceMode ? "crosshair" : "default"
                          }}
                          className={`relative w-[420px] h-[480px] bg-white text-slate-900 shadow-2xl rounded-sm transition-transform duration-75 border border-slate-300 flex flex-col ${
                            showGrid
                              ? "bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"
                              : ""
                          }`}
                        >
                          {/* USPTO Margin Guide Overlay */}
                          {showMargins && (
                            <div className="absolute inset-4 border border-dashed border-red-400/50 pointer-events-none flex flex-col justify-between p-1.5 z-10">
                              <span className="text-[9px] text-red-500/80 font-mono">1.0" TOP MARGIN (37 CFR § 1.84)</span>
                              <span className="text-[9px] text-red-500/80 font-mono text-right">0.6" RIGHT MARGIN</span>
                            </div>
                          )}

                          {/* Base Image or Drawn Diagram */}
                          <div className="flex-1 relative flex items-center justify-center p-6 overflow-hidden">
                            {baseImage ? (
                              <img
                                src={baseImage}
                                alt="Imported Base Schematic"
                                className="max-h-[350px] max-w-full object-contain pointer-events-none"
                              />
                            ) : (
                              /* Default Vector Line Art */
                              <div className="w-[320px] h-[290px] border-2 border-slate-900 rounded bg-white p-4 relative flex flex-col justify-between pointer-events-none">
                                <div className="text-[10px] font-mono border-b border-slate-900 pb-1 flex justify-between font-bold">
                                  <span>CENTRAL LOGIC BUS</span>
                                  <span>37 CFR § 1.84</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 my-auto">
                                  <div className="border-2 border-slate-900 p-2 text-center text-[10px] font-mono rounded font-semibold">
                                    INFERENCE ENGINE
                                  </div>
                                  <div className="border-2 border-slate-900 p-2 text-center text-[10px] font-mono rounded font-semibold">
                                    SHARED REPOSITORY
                                  </div>
                                </div>
                                <div className="text-[10px] font-mono border-t border-slate-900 pt-1 text-center font-bold">
                                  SYSTEM ARBITRATION MATRIX
                                </div>
                              </div>
                            )}

                            {/* Rendered Callout / Reference Numeral Labels Overlay */}
                            {elements.map((el) => {
                              const isSel = selectedElementId === el.id;
                              return (
                                <div
                                  key={el.id}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setSelectedElementId(el.id);
                                    setDraggingId(el.id);
                                  }}
                                  style={{
                                    left: `${el.x}%`,
                                    top: `${el.y}%`,
                                    transform: "translate(-50%, -50%)"
                                  }}
                                  className={`absolute cursor-move p-1.5 rounded transition-shadow hover:scale-105 z-20 select-none ${
                                    isSel
                                      ? "bg-amber-100 border-2 border-amber-600 shadow-lg ring-2 ring-amber-400"
                                      : "bg-white/95 border border-slate-900 shadow-sm"
                                  }`}
                                >
                                  <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-slate-900">
                                    <span className="text-red-600">[{el.numeral}]</span>
                                    <span>{el.label}</span>
                                    <Move className="w-2.5 h-2.5 text-muted-foreground ml-0.5 opacity-60" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Sheet Bottom Identification (FIG. X) */}
                          <div className="p-3 text-center border-t border-slate-200 bg-white z-10">
                            <span className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900">
                              FIG. {figureNum}
                            </span>
                            <p className="text-[11px] text-slate-600 mt-0.5 truncate px-4">
                              {figureCaption || activeTask.title}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Viewport Status & Paste Notice */}
                      <div className="px-4 py-2 border-t border-border/40 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clipboard className="w-3.5 h-3.5 text-blue-500" />
                          Tip: Drag callouts directly on canvas or paste images with <strong>Ctrl + V</strong>
                        </span>
                        <div className="flex items-center gap-3">
                          <span>{elements.length} Callouts</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-[10px]"
                            onClick={handleCopyCalloutsClipboard}
                          >
                            <Copy className="w-3 h-3 mr-1" /> Copy Summary
                          </Button>
                        </div>
                      </div>
                    </Card>

                    {/* Editable Figure Metadata Panel */}
                    <Card className="bg-card border-border/50">
                      <CardHeader className="p-4 pb-2 border-b border-border/40">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Edit3 className="w-3.5 h-3.5 text-emerald-600" /> Editable Figure Metadata
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-1">
                          <label className="text-[11px] font-bold text-muted-foreground block mb-1">Figure Number</label>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={1}
                              max={50}
                              value={figureNum}
                              onChange={(e) => setFigureNum(Number(e.target.value))}
                              className="text-xs font-mono font-bold"
                            />
                          </div>
                        </div>
                        <div className="sm:col-span-3">
                          <label className="text-[11px] font-bold text-muted-foreground block mb-1">Figure Title / Sheet Caption</label>
                          <Input
                            value={figureCaption}
                            onChange={(e) => setFigureCaption(e.target.value)}
                            placeholder="e.g. FIG. 1 - Distributed Logic Interconnect Schematic"
                            className="text-xs font-semibold"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column: Selected Element Inspector & Revision Save */}
                  <div className="lg:col-span-1 space-y-4">
                    {/* Live Inspector for Selected Callout Element */}
                    <Card className="bg-card border-border/50 shadow-sm ring-1 ring-border/60">
                      <CardHeader className="p-4 pb-2 border-b border-border/40 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-amber-500" /> Element Inspector
                        </CardTitle>
                        {selectedElement && (
                          <Badge variant="outline" className="text-[10px] font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40">
                            [{selectedElement.numeral}]
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        {selectedElement ? (
                          <div className="space-y-3 bg-muted/20 p-3 rounded-lg border border-border/30">
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">Numeral</label>
                                <Input
                                  value={selectedElement.numeral}
                                  onChange={(e) => handleUpdateSelectedElement({ numeral: e.target.value })}
                                  className="text-xs font-mono font-bold h-8"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">Component Label</label>
                                <Input
                                  value={selectedElement.label}
                                  onChange={(e) => handleUpdateSelectedElement({ label: e.target.value })}
                                  className="text-xs h-8"
                                />
                              </div>
                            </div>

                            {/* Shape Type Selector */}
                            <div>
                              <label className="text-[10px] font-bold text-muted-foreground block mb-1">Node Type</label>
                              <div className="grid grid-cols-4 gap-1">
                                {(["box", "circle", "diamond", "bus"] as const).map((t) => (
                                  <Button
                                    key={t}
                                    type="button"
                                    size="sm"
                                    variant={selectedElement.type === t ? "secondary" : "ghost"}
                                    className={`h-6 text-[10px] capitalize px-1 ${selectedElement.type === t ? "font-bold border border-border/50" : ""}`}
                                    onClick={() => handleUpdateSelectedElement({ type: t })}
                                  >
                                    {t}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* Fine Positioning Sliders */}
                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>Horizontal Position (X)</span>
                                <span className="font-mono">{selectedElement.x}%</span>
                              </div>
                              <input
                                type="range"
                                min={5}
                                max={95}
                                value={selectedElement.x}
                                onChange={(e) => handleUpdateSelectedElement({ x: Number(e.target.value) })}
                                className="w-full h-1.5 bg-muted rounded cursor-pointer accent-emerald-600"
                              />

                              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                                <span>Vertical Position (Y)</span>
                                <span className="font-mono">{selectedElement.y}%</span>
                              </div>
                              <input
                                type="range"
                                min={8}
                                max={90}
                                value={selectedElement.y}
                                onChange={(e) => handleUpdateSelectedElement({ y: Number(e.target.value) })}
                                className="w-full h-1.5 bg-muted rounded cursor-pointer accent-emerald-600"
                              />
                            </div>

                            {/* Element Actions */}
                            <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] flex-1"
                                onClick={() => handleDuplicateElement(selectedElement.id)}
                              >
                                <Copy className="w-3 h-3 mr-1" /> Duplicate
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="h-7 text-[10px]"
                                onClick={() => handleDeleteCallout(selectedElement.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-lg">
                            Click any callout box on the canvas to inspect & edit its attributes.
                          </div>
                        )}

                        {/* Add New Callout Form */}
                        <form onSubmit={handleAddCallout} className="space-y-2 bg-muted/10 p-3 rounded-lg border border-border/30">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Add New Callout
                          </span>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Input
                                placeholder="Num (116)"
                                value={newNumeral}
                                onChange={(e) => setNewNumeral(e.target.value)}
                                className="text-xs font-mono font-bold h-8"
                                required
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                placeholder="Label (e.g. Gateway)"
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                className="text-xs h-8"
                                required
                              />
                            </div>
                          </div>
                          <Button type="submit" size="sm" className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Reference Callout
                          </Button>
                        </form>

                        {/* List of active elements */}
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {elements.map((el) => (
                            <div
                              key={el.id}
                              onClick={() => setSelectedElementId(el.id)}
                              className={`flex items-center justify-between p-1.5 px-2 rounded border text-xs cursor-pointer transition-colors ${
                                selectedElementId === el.id
                                  ? "bg-amber-50 dark:bg-amber-950/30 border-amber-500"
                                  : "bg-muted/10 border-border/30 hover:bg-muted/20"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-red-600">[{el.numeral}]</span>
                                <span className="font-medium text-foreground truncate max-w-[130px]">{el.label}</span>
                              </div>
                              <span className="text-[9px] font-mono text-muted-foreground">{el.x}%,{el.y}%</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Save Revision Version Card */}
                    <Card className="bg-card border-border/50 shadow-sm">
                      <CardHeader className="p-4 pb-2 border-b border-border/40">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                          <Save className="w-4 h-4 text-emerald-600" /> Save Version v{(activeTask.current_version || 1) + 1}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        {saveSuccess && (
                          <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                            <Check className="w-4 h-4" /> Version v{activeTask.current_version} saved to database!
                          </div>
                        )}

                        <div>
                          <label className="text-[11px] font-bold text-muted-foreground block mb-1">Revision Title</label>
                          <Input
                            placeholder={`FIG ${figureNum} Formalized Line Art`}
                            value={revisionTitle}
                            onChange={(e) => setRevisionTitle(e.target.value)}
                            className="text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-muted-foreground block mb-1">Notes / Changelog</label>
                          <textarea
                            placeholder="Describe what was updated, modified, or added in this iteration..."
                            value={revisionNotes}
                            onChange={(e) => setRevisionNotes(e.target.value)}
                            rows={3}
                            className="w-full p-2 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1"
                          />
                        </div>

                        <Button
                          onClick={() => handleSaveRevision()}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 shadow-sm"
                          disabled={savingVersion}
                        >
                          <Save className="w-4 h-4 mr-1.5" />
                          {savingVersion ? "Saving Version..." : "Save Revision Version"}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Tab 2: Source Directives */}
              {activeTab === "source" && (
                <Card className="bg-card border-border/50 shadow-sm">
                  <CardHeader className="p-4 pb-2 border-b border-border/40">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-blue-500" /> Sender Design Directives & Source Briefs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="bg-muted/20 p-4 rounded-lg border border-border/30 text-xs leading-relaxed space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Design Directives
                      </span>
                      <p className="whitespace-pre-wrap text-foreground font-medium">{activeTask.instructions}</p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-bold text-foreground block">Attached Source Documents:</span>
                      {activeTask.source_files?.map((file: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card hover:bg-muted/20">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded bg-muted/40 text-muted-foreground">
                              {file.type === "drawing" ? <ImageIcon className="w-4 h-4 text-emerald-600" /> : <FileText className="w-4 h-4 text-blue-600" />}
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-foreground">{file.name}</h5>
                              <span className="text-[11px] text-muted-foreground">{file.type?.toUpperCase()} • {file.size || "1.2 MB"}</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8"
                            onClick={() => triggerFileDownload(file.name)}
                          >
                            <Download className="w-3.5 h-3.5 mr-1" /> Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tab 3: Version Comparison */}
              {activeTab === "compare" && (
                <Card className="bg-card border-border/50 shadow-sm">
                  <CardHeader className="p-4 pb-2 border-b border-border/40 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <SplitSquareVertical className="w-4 h-4 text-amber-500" /> Side-by-Side Version Diff
                    </CardTitle>
                    <div className="flex items-center gap-2 text-xs">
                      <span>Compare:</span>
                      <select
                        value={compareV1}
                        onChange={(e) => setCompareV1(Number(e.target.value))}
                        className="h-8 px-2 rounded border border-input bg-card text-xs font-mono"
                      >
                        {activeTask.versions?.map((v: any) => (
                          <option key={v.version} value={v.version}>v{v.version}: {v.title}</option>
                        ))}
                      </select>
                      <span>with</span>
                      <select
                        value={compareV2}
                        onChange={(e) => setCompareV2(Number(e.target.value))}
                        className="h-8 px-2 rounded border border-input bg-card text-xs font-mono"
                      >
                        {activeTask.versions?.map((v: any) => (
                          <option key={v.version} value={v.version}>v{v.version}: {v.title}</option>
                        ))}
                      </select>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Version Left */}
                      <div className="border border-border/40 rounded-xl p-4 bg-muted/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-slate-800 text-white font-mono text-xs">Version {compareV1}</Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {activeTask.versions?.find((v: any) => v.version === compareV1)?.uploaded_by}
                          </span>
                        </div>
                        <div className="h-60 bg-white rounded border border-slate-300 flex items-center justify-center p-4">
                          <div className="text-center space-y-2">
                            <ImageIcon className="w-12 h-12 mx-auto text-slate-400" />
                            <p className="text-xs font-mono font-bold text-slate-800">
                              {activeTask.versions?.find((v: any) => v.version === compareV1)?.file_name}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground italic bg-card p-2 rounded border border-border/20">
                          "{activeTask.versions?.find((v: any) => v.version === compareV1)?.notes || "No notes."}"
                        </p>
                      </div>

                      {/* Version Right */}
                      <div className="border border-border/40 rounded-xl p-4 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-emerald-600 text-white font-mono text-xs">Version {compareV2}</Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {activeTask.versions?.find((v: any) => v.version === compareV2)?.uploaded_by}
                          </span>
                        </div>
                        <div className="h-60 bg-white rounded border border-slate-300 flex items-center justify-center p-4">
                          <div className="text-center space-y-2">
                            <ImageIcon className="w-12 h-12 mx-auto text-emerald-600" />
                            <p className="text-xs font-mono font-bold text-slate-800">
                              {activeTask.versions?.find((v: any) => v.version === compareV2)?.file_name}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground italic bg-card p-2 rounded border border-border/20">
                          "{activeTask.versions?.find((v: any) => v.version === compareV2)?.notes || "No notes."}"
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tab 4: Revision Log */}
              {activeTab === "history" && (
                <Card className="bg-card border-border/50 shadow-sm">
                  <CardHeader className="p-4 pb-2 border-b border-border/40">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <History className="w-4 h-4 text-purple-600" /> Version Iteration Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 divide-y divide-border/20">
                    {activeTask.versions?.map((ver: any, idx: number) => (
                      <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-600 text-white font-mono text-[10px]">v{ver.version}</Badge>
                            <span className="text-xs font-bold text-foreground">{ver.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{ver.notes}</p>
                          <span className="text-[10px] text-muted-foreground block font-mono">
                            File: {ver.file_name} • By: {ver.uploaded_by}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {new Date(ver.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-foreground">Import Drawing Asset or Template</h3>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,application/pdf"
                className="hidden"
                onChange={(e) => {
                  handleFileChange(e);
                  setShowImportModal(false);
                }}
              />

              <input
                ref={jsonImportRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportJSON}
              />

              {/* Option 1: File Browser */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/60 hover:border-blue-500/60 rounded-xl p-5 text-center cursor-pointer transition-colors bg-muted/10 hover:bg-muted/20"
              >
                <UploadCloud className="w-8 h-8 mx-auto text-blue-600 mb-1 opacity-80" />
                <p className="text-xs font-bold text-foreground">Upload Drawing from Local Disk</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">PNG, JPEG, SVG, PDF (Max 20MB)</p>
              </div>

              {/* Option 2: Pre-Built Patent Schematics */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Load Pre-Built Patent Schematic Preset
                  </span>
                  <Badge variant="outline" className="text-[10px]">Instant Layout</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRESET_TEMPLATES.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      onClick={() => handleLoadTemplate(tmpl)}
                      className="p-3 rounded-lg border border-border/40 bg-card hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 hover:border-emerald-500/60 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Cpu className="w-4 h-4 text-emerald-600" />
                        <h5 className="text-xs font-bold text-foreground">{tmpl.title}</h5>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{tmpl.description}</p>
                      <span className="text-[9px] font-mono text-emerald-600 font-bold block mt-1.5">
                        {tmpl.elements.length} Callouts Pre-Positioned →
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Option 3: Import JSON Metadata */}
              <div
                onClick={() => jsonImportRef.current?.click()}
                className="p-3 rounded-lg border border-border/40 bg-card hover:bg-muted/20 cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <FileJson className="w-4 h-4 text-blue-600" />
                  <div>
                    <h5 className="text-xs font-bold text-foreground">Import Metadata Package (.json)</h5>
                    <p className="text-[10px] text-muted-foreground">Restore numeral coordinates & labels previously exported</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-xs">Browse JSON</Button>
              </div>

              {/* Clipboard Notice */}
              <div className="p-3 rounded-lg border border-border/30 bg-muted/20 flex items-center gap-3">
                <Clipboard className="w-5 h-5 text-purple-600 shrink-0" />
                <div className="text-xs text-foreground">
                  <span className="font-bold block">Clipboard Paste Ready</span>
                  <p className="text-muted-foreground text-[11px]">Copy any image in Figma, Visio, or browser and press <strong>Ctrl + V</strong> to load immediately.</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border/40 bg-muted/10 flex justify-end">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowImportModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileDown className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-foreground">Export Patent Drawing Deliverable</h3>
              </div>
              <button onClick={() => setShowExportModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-muted-foreground">
                Export FIG. {figureNum} with reference numerals, figure caption, and USPTO 37 CFR § 1.84 compliant margins:
              </p>

              <div className="space-y-2">
                {/* 1: PNG */}
                <div
                  onClick={handleExportPNG}
                  className="p-3.5 rounded-lg border border-border/40 bg-card hover:bg-muted/20 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <ImageIcon className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Export as High-Resolution PNG</h4>
                      <p className="text-[11px] text-muted-foreground">300 DPI Monochrome line art with numeral callouts & margin guides</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </div>

                {/* 2: Vector SVG */}
                <div
                  onClick={handleExportSVG}
                  className="p-3.5 rounded-lg border border-border/40 bg-card hover:bg-muted/20 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Code className="w-5 h-5 text-purple-600" />
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Export as Scalable Vector SVG</h4>
                      <p className="text-[11px] text-muted-foreground">Pure vector paths, scalable black strokes, 37 CFR 1.84 formatted</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </div>

                {/* 3: Patent PDF Sheet */}
                <div
                  onClick={handleExportPDF}
                  className="p-3.5 rounded-lg border border-border/40 bg-card hover:bg-muted/20 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-red-600" />
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Export as USPTO Patent PDF Sheet</h4>
                      <p className="text-[11px] text-muted-foreground">Standard 8.5" x 11" page layout, 1.0" top margin, print-ready</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </div>

                {/* 4: Metadata JSON */}
                <div
                  onClick={handleExportJSON}
                  className="p-3.5 rounded-lg border border-border/40 bg-card hover:bg-muted/20 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-blue-600" />
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Export Numeral Metadata Package (JSON)</h4>
                      <p className="text-[11px] text-muted-foreground">Full coordinate array, label catalog, and version traceability</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border/40 bg-muted/10 flex justify-end">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowExportModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SEND TO REVIEWER MODAL */}
      {showSendModal && activeTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-foreground">Send Drawing for Review</h3>
              </div>
              <button onClick={() => setShowSendModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-5 space-y-4">
              <div className="bg-muted/20 p-3 rounded-lg border border-border/30 text-xs">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">Submitting Deliverable</span>
                <span className="font-bold text-foreground">{activeTask.title} (v{activeTask.current_version || 1})</span>
                <p className="text-muted-foreground text-[11px] mt-0.5">Project: {activeTask.project_title} • {activeTask.invention_id}</p>
              </div>

              {/* Recipient Dropdown (Patent Drafter / Patent Analyst / CEO) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Recipient Role</label>
                  <select
                    value={recipientRole}
                    onChange={(e) => {
                      const r = e.target.value;
                      setRecipientRole(r);
                      if (r === "PATENT_DRAFTER") setRecipientUser("Alice Drafter");
                      else if (r === "PATENT_ANALYST") setRecipientUser("Dr. Sarah Analyst");
                      else if (r === "CEO") setRecipientUser("Executive / CEO");
                    }}
                    className="w-full h-9 px-3 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1"
                  >
                    <option value="PATENT_DRAFTER">Patent Drafter</option>
                    <option value="PATENT_ANALYST">Patent Analyst</option>
                    <option value="CEO">CEO / Executive</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Recipient User</label>
                  <Input
                    value={recipientUser}
                    onChange={(e) => setRecipientUser(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Submission Message</label>
                <Input
                  placeholder="e.g. FIG 1 formal drawing completed with numerals 102-114. Ready for review."
                  value={sendMsg}
                  onChange={(e) => setSendMsg(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              {/* Compliance Verification Checkboxes */}
              <div className="space-y-2 p-3 bg-muted/15 rounded-lg border border-border/30 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  USPTO Quality Checklist
                </span>
                <label className="flex items-center gap-2 cursor-pointer text-foreground">
                  <input
                    type="checkbox"
                    checked={checkMarginCompliant}
                    onChange={(e) => setCheckMarginCompliant(e.target.checked)}
                    className="rounded border-border text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Margins compliant with 37 CFR § 1.84 (1.0" top/left)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-foreground">
                  <input
                    type="checkbox"
                    checked={checkNumeralsConsistent}
                    onChange={(e) => setCheckNumeralsConsistent(e.target.checked)}
                    className="rounded border-border text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>All reference numerals match draft specification & claims</span>
                </label>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Submission Notes & Instructions</label>
                <textarea
                  placeholder="Additional notes for reviewer, e.g. section where figure should be inserted..."
                  value={sendNotes}
                  onChange={(e) => setSendNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1"
                />
              </div>

              <div className="pt-3 border-t border-border/40 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setShowSendModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                  disabled={sending}
                >
                  {sending ? "Submitting..." : "Submit to Recipient"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
