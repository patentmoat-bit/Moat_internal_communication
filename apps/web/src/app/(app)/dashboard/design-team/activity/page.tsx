"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { triggerFileDownload } from "@/lib/downloadHelper";
import {
  Activity,
  History,
  Search,
  RefreshCw,
  Clock,
  Layers,
  Folder,
  PenTool,
  Send,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  CalendarClock,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  ImageIcon,
  Grid,
  List,
  Download
} from "lucide-react";

export default function DesignActivityHistoryPage() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [selectedActionCategory, setSelectedActionCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"BY_PROJECT" | "TIMELINE">("BY_PROJECT");
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});

  // Download notification toast
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const fetchActivityData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/design-team/activity");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load design activity:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchActivityData();
  }, []);

  const toggleProjectCollapse = (projectId: string) => {
    setCollapsedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const handleDownload = (fileName: string) => {
    triggerFileDownload(fileName);
    setDownloadNotice(fileName);
    setTimeout(() => {
      setDownloadNotice(null);
    }, 2800);
  };

  // Filter activities
  const filteredActivities = useMemo(() => {
    if (!data?.activities) return [];
    return data.activities.filter((act: any) => {
      const matchesProject =
        selectedProject === "ALL" || act.invention_id === selectedProject;

      const matchesCategory =
        selectedActionCategory === "ALL" ||
        act.action_category === selectedActionCategory;

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        (act.details || "").toLowerCase().includes(query) ||
        (act.project_title || "").toLowerCase().includes(query) ||
        (act.invention_id || "").toLowerCase().includes(query) ||
        (act.file_name || "").toLowerCase().includes(query) ||
        (act.action_label || "").toLowerCase().includes(query) ||
        (act.figure_number && `fig ${act.figure_number}`.toLowerCase().includes(query));

      return matchesProject && matchesCategory && matchesSearch;
    });
  }, [data, selectedProject, selectedActionCategory, searchQuery]);

  // Filter project groups
  const filteredProjects = useMemo(() => {
    if (!data?.projects) return [];
    let list = data.projects;

    if (selectedProject !== "ALL") {
      list = list.filter((p: any) => p.invention_id === selectedProject);
    }

    return list.map((proj: any) => {
      const pActivities = filteredActivities.filter(
        (a: any) => a.invention_id === proj.invention_id
      );
      return {
        ...proj,
        matchingActivities: pActivities
      };
    }).filter((p: any) => p.matchingActivities.length > 0 || selectedProject !== "ALL");
  }, [data, selectedProject, filteredActivities]);

  const summary = data?.summary || {
    total_projects: 3,
    figures_crafted: 7,
    versions_saved: 20,
    completed_deliverables: 4
  };

  const getActionBadgeClass = (category: string) => {
    switch (category) {
      case "VERSION":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "SUBMISSION":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "TASK":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "REVIEW":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "MATERIAL":
        return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
      case "DOCKET":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";
    }
  };

  const getActionIcon = (category: string) => {
    switch (category) {
      case "VERSION":
        return <PenTool className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case "SUBMISSION":
        return <Send className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
      case "TASK":
        return <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case "REVIEW":
        return <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case "MATERIAL":
        return <UploadCloud className="w-3.5 h-3.5 text-cyan-500 shrink-0" />;
      case "DOCKET":
        return <CalendarClock className="w-3.5 h-3.5 text-orange-500 shrink-0" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Download Notification Toast */}
      {downloadNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 border border-white/10 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium">Downloaded file: <strong className="font-mono">{downloadNotice}</strong></span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-mono px-2.5 py-0.5">
              DESIGN TEAM WORKSPACE
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              ROLE: MOAT Design Team
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <History className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            Design Activity History & Project Work Log
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
            Audit record of technical drafting, vector formalizations, version checkpoints, and stakeholder deliverables organized by project.
          </p>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { if (!loading) fetchActivityData(); }}
            className="text-xs flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Link href="/dashboard/design-team/workspace/in-progress">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1.5 shadow-sm"
            >
              <PenTool className="w-3.5 h-3.5" />
              In Progress Studio
            </Button>
          </Link>

          <Link href="/dashboard/design-team/workspace/my-designs">
            <Button
              variant="outline"
              size="sm"
              className="text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Layers className="w-3.5 h-3.5" />
              My Designs
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Stat Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Projects Engaged
              </p>
              <p className="text-xl font-black text-foreground">
                {summary.total_projects} <span className="text-xs font-normal text-muted-foreground">Matters</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Figures Crafted
              </p>
              <p className="text-xl font-black text-foreground">
                {summary.figures_crafted} <span className="text-xs font-normal text-muted-foreground">Patent Figs</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Revisions Logged
              </p>
              <p className="text-xl font-black text-foreground">
                {summary.versions_saved} <span className="text-xs font-normal text-muted-foreground">Version Iterations</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Approved Figures
              </p>
              <p className="text-xl font-black text-foreground">
                {summary.completed_deliverables} <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 font-semibold">Ready for Filing</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Filter Bar */}
      <div className="space-y-3 bg-muted/30 p-3.5 rounded-xl border border-border/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Project Tabs Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-xs font-semibold text-muted-foreground mr-1.5 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5" /> Project:
            </span>
            <button
              onClick={() => setSelectedProject("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedProject === "ALL"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-background hover:bg-muted text-muted-foreground border border-border/40"
              }`}
            >
              All Projects ({data?.activities?.length || 0})
            </button>
            {data?.projects?.map((proj: any) => (
              <button
                key={proj.invention_id}
                onClick={() => setSelectedProject(proj.invention_id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedProject === proj.invention_id
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-background hover:bg-muted text-muted-foreground border border-border/40"
                }`}
              >
                <span className="font-mono text-[11px] opacity-80">{proj.invention_id}:</span>
                <span className="max-w-[180px] truncate">{proj.project_title}</span>
                <Badge variant="outline" className="text-[10px] ml-1 px-1.5 py-0 bg-black/10 dark:bg-white/10 border-none">
                  {proj.activities?.length || 0}
                </Badge>
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
            <span className="text-xs text-muted-foreground font-medium">View:</span>
            <div className="flex items-center bg-background rounded-lg border border-border/60 p-0.5">
              <button
                onClick={() => setViewMode("BY_PROJECT")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  viewMode === "BY_PROJECT"
                    ? "bg-emerald-600 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Group activities under project cards"
              >
                <Grid className="w-3.5 h-3.5" />
                By Project
              </button>
              <button
                onClick={() => setViewMode("TIMELINE")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  viewMode === "TIMELINE"
                    ? "bg-emerald-600 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Show flat chronological activity stream"
              >
                <List className="w-3.5 h-3.5" />
                Chronological
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Filter: Action Type & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/40">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-medium text-muted-foreground mr-1">Action:</span>
            {[
              { id: "ALL", label: "All Work" },
              { id: "VERSION", label: "Revisions (v1-v3)" },
              { id: "SUBMISSION", label: "Submissions" },
              { id: "TASK", label: "Task Starts" },
              { id: "REVIEW", label: "Review Feedback" },
              { id: "MATERIAL", label: "Material Assets" }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedActionCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedActionCategory === cat.id
                    ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search figure, callouts, or file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background border-border/60"
            />
          </div>
        </div>
      </div>

      {/* Main Content: Activity History List Grouped by Project vs Chronological Feed */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
          <p className="text-xs">Loading Design Team Project Work Logs...</p>
        </div>
      ) : filteredActivities.length === 0 ? (
        <Card className="border-border/60 p-12 text-center space-y-3 bg-muted/10">
          <PenTool className="w-10 h-10 mx-auto text-muted-foreground opacity-40" />
          <h3 className="text-base font-semibold text-foreground">No Design Work Records Found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            No work logs matched your selected project or action filters. Try selecting "All Projects" or clearing your search keywords.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSelectedProject("ALL"); setSelectedActionCategory("ALL"); setSearchQuery(""); }}
            className="text-xs"
          >
            Clear Filters
          </Button>
        </Card>
      ) : viewMode === "BY_PROJECT" ? (
        /* PROJECT-CENTRIC ACTIVITY HISTORY CARDS */
        <div className="space-y-6">
          {filteredProjects.map((proj: any) => {
            const isCollapsed = collapsedProjects[proj.invention_id];
            return (
              <Card
                key={proj.invention_id}
                className="border-border/60 shadow-sm overflow-hidden bg-card transition-all"
              >
                {/* Project Header Bar */}
                <CardHeader className="bg-muted/20 border-b border-border/40 p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 font-mono text-xs px-2.5 py-0.5">
                          {proj.invention_id}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            proj.active_status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs"
                          }
                        >
                          {proj.active_status === "COMPLETED" ? "All Deliverables Completed" : "In Progress Workflow"}
                        </Badge>
                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          37 CFR § 1.84 Compliant
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-foreground">
                        {proj.project_title}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {proj.invention_title}
                      </p>
                    </div>

                    {/* Project Metrics & Actions */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right hidden md:block">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {proj.matchingActivities.length}
                          </span> work events logged
                        </div>
                        <div className="flex items-center gap-1 mt-1 justify-end flex-wrap">
                          {proj.figures?.map((fig: any) => (
                            <span
                              key={fig}
                              className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-muted text-foreground border border-border/50"
                            >
                              FIG {fig}
                            </span>
                          ))}
                        </div>
                      </div>

                      <Link href={`/dashboard/design-team/workspace/in-progress`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open Project
                        </Button>
                      </Link>

                      <button
                        onClick={() => toggleProjectCollapse(proj.invention_id)}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                        title={isCollapsed ? "Expand Project Timeline" : "Collapse Project Timeline"}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </CardHeader>

                {/* Project Activity Timeline Content (THE ACTIVITY HISTORY LIST) */}
                {!isCollapsed && (
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/30">
                      {proj.matchingActivities.map((act: any, idx: number) => (
                        <div
                          key={act.id || idx}
                          className="p-4 hover:bg-muted/15 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 p-1.5 rounded-md bg-muted border border-border/40 shrink-0">
                              {getActionIcon(act.action_category)}
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-xs text-foreground">
                                  {act.action_label}
                                </span>

                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-semibold ${getActionBadgeClass(act.action_category)}`}
                                >
                                  {act.action}
                                </Badge>

                                {act.figure_number && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900">
                                    FIG {act.figure_number}
                                  </span>
                                )}

                                {act.version && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                    v{act.version}
                                  </span>
                                )}

                                {act.file_name && (
                                  <button
                                    onClick={() => handleDownload(act.file_name)}
                                    className="font-mono text-[10px] text-emerald-600 hover:text-emerald-700 hover:underline bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1 transition-colors"
                                    title={`Download ${act.file_name}`}
                                  >
                                    <Download className="w-2.5 h-2.5" />
                                    <span>{act.file_name}</span>
                                  </button>
                                )}
                              </div>

                              <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                                {act.details}
                              </p>

                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
                                <span className="font-medium text-foreground">
                                  Actor: {act.actor}
                                </span>
                                <span>•</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                  {act.compliance}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground shrink-0 sm:pt-0.5">
                            <span className="flex items-center gap-1 text-[11px]" suppressHydrationWarning>
                              <Clock className="w-3 h-3 text-muted-foreground/70" />
                              {act.timestamp
                                ? new Date(act.timestamp).toLocaleString("en-US", {
                                    dateStyle: "short",
                                    timeStyle: "medium"
                                  })
                                : "Recently"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        /* FLAT CHRONOLOGICAL STREAM */
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y divide-border/30">
              {filteredActivities.map((act: any, idx: number) => (
                <div
                  key={act.id || idx}
                  className="p-4 hover:bg-muted/15 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-md bg-muted border border-border/40 shrink-0">
                      {getActionIcon(act.action_category)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-emerald-600 text-white font-mono text-[10px] px-2 py-0">
                          {act.invention_id}
                        </Badge>
                        <span className="font-semibold text-xs text-foreground">
                          {act.action_label}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${getActionBadgeClass(act.action_category)}`}
                        >
                          {act.action}
                        </Badge>
                        {act.figure_number && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900">
                            FIG {act.figure_number}
                          </span>
                        )}
                        {act.version && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            v{act.version}
                          </span>
                        )}
                        {act.file_name && (
                          <button
                            onClick={() => handleDownload(act.file_name)}
                            className="font-mono text-[10px] text-emerald-600 hover:text-emerald-700 hover:underline bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1 transition-colors"
                            title={`Download ${act.file_name}`}
                          >
                            <Download className="w-2.5 h-2.5" />
                            <span>{act.file_name}</span>
                          </button>
                        )}
                      </div>

                      <div className="text-[11px] font-medium text-foreground">
                        {act.project_title}
                      </div>

                      <p className="text-xs text-muted-foreground max-w-3xl">
                        {act.details}
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
                        <span className="font-medium text-foreground">
                          Actor: {act.actor}
                        </span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {act.compliance}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground shrink-0 sm:pt-0.5">
                    <span className="flex items-center gap-1 text-[11px]" suppressHydrationWarning>
                      <Clock className="w-3 h-3 text-muted-foreground/70" />
                      {act.timestamp
                        ? new Date(act.timestamp).toLocaleString("en-US", {
                            dateStyle: "short",
                            timeStyle: "medium"
                          })
                        : "Recently"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
