"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  PenTool,
  Search,
  Calendar,
  Clock,
  FileText,
  ImageIcon,
  ArrowRight,
  ExternalLink,
  History,
  Download,
  FolderOpen,
  Filter,
  CheckCircle,
  RotateCcw,
  Sparkles,
  Layers,
  X,
  FileDown,
  Send,
  Code,
  CheckCircle2
} from "lucide-react";
import { useActiveRole } from "@/components/auth/role-context";

export default function MyDesignsPage() {
  const router = useRouter();
  const { currentUser } = useActiveRole();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Version history modal state
  const [historyTask, setHistoryTask] = useState<any | null>(null);

  // Quick Export Modal
  const [exportTask, setExportTask] = useState<any | null>(null);

  // Quick Send To Modal
  const [sendTask, setSendTask] = useState<any | null>(null);
  const [recipientRole, setRecipientRole] = useState("PATENT_DRAFTER");
  const [recipientUser, setRecipientUser] = useState("Alice Drafter");
  const [sendMsg, setSendMsg] = useState("");
  const [sendNotes, setSendNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);

  const fetchDesigns = async () => {
    try {
      const res = await fetch("/api/design-team/assignments");
      if (res.ok) {
        const data = await res.json();
        if (data.assignments) {
          setAssignments(data.assignments);
        }
      }
    } catch (err) {
      console.error("Error fetching designs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesigns();
  }, []);

  const filteredDesigns = assignments.filter((a) => {
    const matchesSearch =
      a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.project_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.invention_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.versions?.some((v: any) => v.file_name?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportPNG = (task: any) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 1400;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#cccccc";
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(80, 80, canvas.width - 160, canvas.height - 160);
    ctx.setLineDash([]);
    ctx.fillStyle = "#000000";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.strokeRect(200, 300, 600, 600);
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.fillText(task.title || "Patent Drawing Sheet", canvas.width / 2, 600);
    ctx.fillText(`FIG. ${task.figure_numbers?.[0] || 1}`, canvas.width / 2, 1260);
    const a = document.createElement("a");
    a.download = `FIG_${task.figure_numbers?.[0] || 1}_Sheet.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
    setExportTask(null);
  };

  const handleExportSVG = (task: any) => {
    const svgStr = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="850" height="1100" viewBox="0 0 850 1100">
  <rect width="850" height="1100" fill="#fff" />
  <rect x="72" y="72" width="706" height="956" stroke="#888" stroke-dasharray="4,4" fill="none" />
  <text x="75" y="55" font-family="monospace" font-size="12">USPTO 37 CFR § 1.84 | APP: ${task.invention_id}</text>
  <rect x="180" y="240" width="490" height="520" stroke="#000" stroke-width="2.5" fill="none" />
  <text x="425" y="800" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle">FIG. ${task.figure_numbers?.[0] || 1}</text>
  <text x="425" y="830" font-family="sans-serif" font-size="14" text-anchor="middle">${task.title}</text>
</svg>`;
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `FIG_${task.figure_numbers?.[0] || 1}_Vector.svg`;
    a.click();
    setExportTask(null);
  };

  const handleExportJSON = (task: any) => {
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(task, null, 2));
    const a = document.createElement("a");
    a.href = jsonStr;
    a.download = `${task.id}_Metadata.json`;
    a.click();
    setExportTask(null);
  };

  const handleSendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendTask) return;
    setSending(true);

    try {
      const res = await fetch("/api/design-team/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: sendTask.id,
          version: sendTask.current_version || 1,
          recipient_role: recipientRole,
          recipient_user: recipientUser,
          message: sendMsg || `Direct delivery of ${sendTask.title} (v${sendTask.current_version || 1}).`,
          notes: sendNotes || "Margins verified per 37 CFR 1.84.",
          actor: currentUser?.name || "Design Team"
        })
      });

      if (res.ok) {
        setSendSuccessMsg(`Submitted ${sendTask.id} to ${recipientRole} successfully.`);
        setSendTask(null);
        await fetchDesigns();
        setTimeout(() => setSendSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error("Error submitting design:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Persistent Asset Library
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              DESIGNER: {currentUser?.name || "Design Team"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <PenTool className="w-7 h-7 text-emerald-600" /> My Designs
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Complete persistent repository of all drawings, schematics, and figures authored or revised by the Design Team across all patent projects.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/design-team/workspace/in-progress">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm">
              <Clock className="w-4 h-4 mr-1.5" /> Continue Active Work
            </Button>
          </Link>
          <Link href="/dashboard/design-team/workspace/assigned">
            <Button variant="outline" className="text-xs font-semibold">
              <FolderOpen className="w-4 h-4 mr-1.5 text-blue-500" /> View Incoming Queue
            </Button>
          </Link>
        </div>
      </div>

      {sendSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {sendSuccessMsg}
          </div>
        </div>
      )}

      {/* Filter and View Toggle Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search design title, file name, project ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs bg-card"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1"
          >
            <option value="ALL">All Statuses</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="REWORK">Rework Required</option>
            <option value="COMPLETED">Completed</option>
            <option value="ASSIGNED">Assigned</option>
          </select>
        </div>

        <div className="flex items-center gap-1 border border-border/40 p-1 rounded-lg bg-card self-end sm:self-auto">
          <Button
            size="sm"
            variant={viewMode === "table" ? "secondary" : "ghost"}
            className="h-7 px-2.5 text-xs"
            onClick={() => setViewMode("table")}
          >
            Table View
          </Button>
          <Button
            size="sm"
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            className="h-7 px-2.5 text-xs"
            onClick={() => setViewMode("grid")}
          >
            Grid View
          </Button>
        </div>
      </div>

      {/* Content Render */}
      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
          Loading library of designs...
        </div>
      ) : filteredDesigns.length === 0 ? (
        <Card className="p-12 text-center bg-card">
          <PenTool className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-bold text-foreground">No design records found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            No design figures match your current search criteria.
          </p>
        </Card>
      ) : viewMode === "table" ? (
        /* Table View */
        <div className="rounded-xl border border-border/40 overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Design Task & Figures</th>
                  <th className="py-3 px-4">Project & Invention</th>
                  <th className="py-3 px-4">Latest File Asset</th>
                  <th className="py-3 px-4 text-center">Version</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Modified</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredDesigns.map((task) => {
                  const latestVersion = task.versions?.[0] || { file_name: "Source_Brief.png", version: 1 };
                  const lastDate = task.last_modified || task.assigned_at;

                  return (
                    <tr key={task.id} className="hover:bg-muted/15 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                            {task.id}
                          </span>
                          <span className="font-bold text-foreground hover:text-emerald-600 cursor-pointer">
                            {task.title}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground block mt-0.5">
                          {task.figure_numbers ? `FIG ${task.figure_numbers.join(", ")}` : "Technical Drawing"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-foreground block">{task.project_title}</span>
                        <span className="text-[11px] text-muted-foreground font-mono">{task.invention_id}</span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-foreground">
                        <div className="flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="truncate max-w-[150px]" title={latestVersion.file_name}>
                            {latestVersion.file_name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <Badge variant="outline" className="text-[10px] font-mono bg-muted/20 font-bold">
                          v{task.current_version || latestVersion.version || 1}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          className={`text-[10px] font-bold ${
                            task.status === "COMPLETED"
                              ? "bg-emerald-600 text-white"
                              : task.status === "IN_PROGRESS"
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                              : task.status === "UNDER_REVIEW"
                              ? "bg-purple-600 text-white"
                              : task.status === "REWORK"
                              ? "bg-rose-600 text-white"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          {task.status.replace("_", " ")}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                        {new Date(lastDate).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit in Workspace */}
                          <Link href={`/dashboard/design-team/workspace/in-progress?id=${task.id}`}>
                            <Button size="sm" className="h-7 px-2.5 text-[11px] bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900">
                              Edit
                            </Button>
                          </Link>

                          {/* Quick Export */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] text-amber-600 hover:text-amber-700"
                            title="Export Options"
                            onClick={() => setExportTask(task)}
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </Button>

                          {/* Quick Send To */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] text-purple-600 hover:text-purple-700"
                            title="Send To Reviewer"
                            onClick={() => setSendTask(task)}
                          >
                            <Send className="w-3.5 h-3.5" />
                          </Button>

                          {/* Version History */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            title="Version History"
                            onClick={() => setHistoryTask(task)}
                          >
                            <History className="w-3.5 h-3.5" />
                          </Button>

                          <Link href={`/inventions/${task.invention_id}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[11px] text-muted-foreground"
                              title="View Project"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDesigns.map((task) => {
            const latestVersion = task.versions?.[0] || { file_name: "Source_Brief.png", version: 1 };

            return (
              <Card key={task.id} className="bg-card border-border/40 hover:border-emerald-500/50 transition-all shadow-sm flex flex-col justify-between">
                <CardHeader className="p-4 pb-2 border-b border-border/30">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[11px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                      {task.id}
                    </span>
                    <Badge
                      className={`text-[9px] font-bold ${
                        task.status === "COMPLETED"
                          ? "bg-emerald-600 text-white"
                          : task.status === "IN_PROGRESS"
                          ? "bg-emerald-600 text-white"
                          : task.status === "UNDER_REVIEW"
                          ? "bg-purple-600 text-white"
                          : task.status === "REWORK"
                          ? "bg-rose-600 text-white"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {task.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground line-clamp-1">
                    {task.title}
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {task.project_title} • <span className="font-mono">{task.invention_id}</span>
                  </p>
                </CardHeader>

                <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  {/* Schematic Preview Thumbnail */}
                  <div className="h-36 bg-slate-100 dark:bg-slate-900 rounded-lg border border-border/40 flex items-center justify-center relative p-3">
                    <div className="text-center space-y-1">
                      <ImageIcon className="w-8 h-8 mx-auto text-emerald-600" />
                      <p className="font-mono text-xs font-bold text-foreground truncate max-w-[200px]">
                        {latestVersion.file_name}
                      </p>
                      <Badge variant="outline" className="text-[9px] font-mono">
                        v{task.current_version || latestVersion.version || 1} • {task.figure_numbers ? `FIG ${task.figure_numbers.join(", ")}` : "Drawing"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-muted-foreground text-[11px]">
                      <span>Lead Drafter:</span>
                      <strong className="text-foreground">{task.assigned_to}</strong>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-[11px]">
                      <span>Due Date:</span>
                      <span>{new Date(task.due_date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/20 flex items-center justify-between gap-2">
                    <Link href={`/dashboard/design-team/workspace/in-progress?id=${task.id}`} className="flex-1">
                      <Button size="sm" className="w-full h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900">
                        Edit in Canvas
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-xs text-amber-600"
                      title="Export Options"
                      onClick={() => setExportTask(task)}
                    >
                      <FileDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-xs text-purple-600"
                      title="Send To Reviewer"
                      onClick={() => setSendTask(task)}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* VERSION HISTORY MODAL */}
      {historyTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-foreground">
                  Version Iteration History: {historyTask.title}
                </h3>
              </div>
              <button onClick={() => setHistoryTask(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {historyTask.versions?.map((ver: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-lg border border-border/40 bg-muted/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-600 text-white font-mono text-xs">v{ver.version}</Badge>
                      <span className="font-bold text-xs text-foreground">{ver.title}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {new Date(ver.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{ver.notes}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-border/20 text-[11px]">
                    <span className="font-mono text-muted-foreground">File: {ver.file_name}</span>
                    <span className="text-muted-foreground">Author: {ver.uploaded_by}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border/40 bg-muted/10 flex justify-end">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setHistoryTask(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK EXPORT MODAL */}
      {exportTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileDown className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-foreground">Export: {exportTask.title}</h3>
              </div>
              <button onClick={() => setExportTask(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-2.5">
              <div
                onClick={() => handleExportPNG(exportTask)}
                className="p-3 rounded-lg border border-border/40 bg-card hover:bg-muted/20 cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <div>
                    <h5 className="text-xs font-bold text-foreground">High-Resolution PNG Sheet</h5>
                    <p className="text-[10px] text-muted-foreground">300 DPI Monochrome line art</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-muted-foreground" />
              </div>

              <div
                onClick={() => handleExportSVG(exportTask)}
                className="p-3 rounded-lg border border-border/40 bg-card hover:bg-muted/20 cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Code className="w-4 h-4 text-purple-600" />
                  <div>
                    <h5 className="text-xs font-bold text-foreground">Scalable Vector SVG</h5>
                    <p className="text-[10px] text-muted-foreground">37 CFR § 1.84 compliant vector paths</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-muted-foreground" />
              </div>

              <div
                onClick={() => handleExportJSON(exportTask)}
                className="p-3 rounded-lg border border-border/40 bg-card hover:bg-muted/20 cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <div>
                    <h5 className="text-xs font-bold text-foreground">Metadata Package (JSON)</h5>
                    <p className="text-[10px] text-muted-foreground">Version descriptors & task state</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div className="p-4 border-t border-border/40 bg-muted/10 flex justify-end">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setExportTask(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK SEND MODAL */}
      {sendTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-foreground">Submit Design for Review</h3>
              </div>
              <button onClick={() => setSendTask(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendSubmit} className="p-5 space-y-4">
              <div className="bg-muted/20 p-3 rounded-lg border border-border/30 text-xs">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">Deliverable</span>
                <span className="font-bold text-foreground">{sendTask.title} (v{sendTask.current_version || 1})</span>
                <p className="text-muted-foreground text-[11px] mt-0.5">{sendTask.project_title} • {sendTask.invention_id}</p>
              </div>

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
                <label className="text-xs font-bold text-foreground block mb-1">Message</label>
                <Input
                  placeholder="e.g. Completed schematic formalization ready for review."
                  value={sendMsg}
                  onChange={(e) => setSendMsg(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Compliance Notes</label>
                <textarea
                  placeholder="Compliance and numeral notes..."
                  value={sendNotes}
                  onChange={(e) => setSendNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1"
                />
              </div>

              <div className="pt-3 border-t border-border/40 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setSendTask(null)}>
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
