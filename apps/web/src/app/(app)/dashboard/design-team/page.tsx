"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PenTool,
  Clock,
  CheckCircle,
  Search,
  RotateCcw,
  Users,
  ImageIcon,
  ArrowRight,
  Calendar,
  AlertTriangle,
  FileText,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Send
} from "lucide-react";
import { useActiveRole } from "@/components/auth/role-context";

export default function DesignTeamDashboardPage() {
  const router = useRouter();
  const { currentUser } = useActiveRole();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const fetchAssignments = async () => {
    try {
      const res = await fetch("/api/design-team/assignments");
      if (res.ok) {
        const data = await res.json();
        if (data.assignments) {
          setAssignments(data.assignments);
        }
      }
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleAcceptTask = async (id: string) => {
    setAcceptingId(id);
    try {
      const res = await fetch("/api/design-team/assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action: "accept",
          actor: currentUser.name || "Design Team"
        })
      });
      if (res.ok) {
        await fetchAssignments();
        router.push(`/dashboard/design-team/workspace/in-progress?id=${id}`);
      }
    } catch (err) {
      console.error("Error accepting task:", err);
    } finally {
      setAcceptingId(null);
    }
  };

  const assignedCount = assignments.filter((a) => a.status === "ASSIGNED").length;
  const inProgressCount = assignments.filter((a) => a.status === "IN_PROGRESS").length;
  const underReviewCount = assignments.filter((a) => a.status === "UNDER_REVIEW").length;
  const reworkCount = assignments.filter((a) => a.status === "REWORK").length;
  const completedCount = assignments.filter((a) => a.status === "COMPLETED").length;

  const urgentTasks = assignments.filter((a) => a.status === "ASSIGNED" || a.status === "REWORK");
  const activeTasks = assignments.filter((a) => a.status === "IN_PROGRESS");

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Design Team Workspace
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Authenticated: {currentUser?.name || "Designer"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <PenTool className="w-7 h-7 text-emerald-600 dark:text-emerald-500" /> Design Team Dashboard Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Central illustration hub for technical patent drawings (FIG 1-N), schematic formalization, reviewer feedback loops, and export deliverables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/design-team/workspace/assigned">
            <Button variant="outline" className="text-xs font-semibold shadow-sm">
              <Users className="w-4 h-4 mr-2 text-blue-500" /> Assigned to Me ({assignedCount})
            </Button>
          </Link>
          <Link href="/dashboard/design-team/workspace/in-progress">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm">
              <Clock className="w-4 h-4 mr-2" /> Active Workspace ({inProgressCount})
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Link href="/dashboard/design-team/workspace/assigned" className="group">
          <Card className="hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assigned</span>
                <span className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{assignedCount}</span>
                <span className="text-[11px] text-muted-foreground">New tasks</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/design-team/workspace/in-progress" className="group">
          <Card className="hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">In Progress</span>
                <span className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{inProgressCount}</span>
                <span className="text-[11px] text-muted-foreground">Drafting</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/design-team/workspace/under-review" className="group">
          <Card className="hover:border-purple-500/50 hover:shadow-md transition-all cursor-pointer bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Under Review</span>
                <span className="p-1.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                  <Search className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{underReviewCount}</span>
                <span className="text-[11px] text-muted-foreground">With reviewer</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/design-team/workspace/in-progress" className="group">
          <Card className="hover:border-rose-500/50 hover:shadow-md transition-all cursor-pointer bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rework</span>
                <span className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600">
                  <RotateCcw className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{reworkCount}</span>
                <span className="text-[11px] text-rose-600 font-medium">Feedback ready</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/design-team/workspace/completed" className="group">
          <Card className="hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Completed</span>
                <span className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                  <CheckCircle className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{completedCount}</span>
                <span className="text-[11px] text-muted-foreground">Accepted</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Grid: Urgent Queue + Active Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Immediate Attention / Assigned Queue */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card">
            <CardHeader className="p-5 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" /> New Assignments & Pending Actions
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Tasks dispatched to the Design Team requiring acceptance or rework.</p>
              </div>
              <Link href="/dashboard/design-team/workspace/assigned" className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-5 divide-y divide-border/30">
              {loading ? (
                <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">Loading assigned tasks...</div>
              ) : urgentTasks.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                  No pending assignments waiting. All received tasks are currently in progress or completed.
                </div>
              ) : (
                urgentTasks.map((task) => (
                  <div key={task.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-foreground hover:text-blue-600 transition-colors">
                          {task.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {task.invention_id}
                        </Badge>
                        <Badge
                          className={`text-[10px] font-bold ${
                            task.priority === "HIGH"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 border-rose-200"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 border-amber-200"
                          }`}
                        >
                          {task.priority} Priority
                        </Badge>
                        {task.status === "REWORK" ? (
                          <Badge className="bg-rose-600 text-white text-[10px]">REWORK REQUIRED</Badge>
                        ) : (
                          <Badge className="bg-blue-600 text-white text-[10px]">NEW ASSIGNMENT</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 shrink-0">
                        <Calendar className="w-3.5 h-3.5" /> Due {new Date(task.due_date).toLocaleDateString()}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/20 p-2.5 rounded-md border border-border/30">
                      <strong className="text-foreground">Instructions: </strong> {task.instructions}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>Assigned by: <strong className="text-foreground">{task.assigned_by}</strong> ({task.sender_role})</span>
                        <span>•</span>
                        <span>{task.source_files?.length || 0} files attached</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/design-team/workspace/assigned?id=${task.id}`}>
                          <Button variant="outline" size="sm" className="text-xs h-8">
                            View Details
                          </Button>
                        </Link>
                        {task.status === "ASSIGNED" && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                            onClick={() => handleAcceptTask(task.id)}
                            disabled={acceptingId === task.id}
                          >
                            {acceptingId === task.id ? "Accepting..." : "Accept & Start Work"}
                          </Button>
                        )}
                        {task.status === "REWORK" && (
                          <Link href={`/dashboard/design-team/workspace/in-progress?id=${task.id}`}>
                            <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8">
                              Open Rework Workspace
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Active Work In Progress */}
          <Card className="bg-card">
            <CardHeader className="p-5 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" /> Active Drawings In Progress
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Tasks currently being illustrated or revised by the Design Team.</p>
              </div>
              <Link href="/dashboard/design-team/workspace/in-progress" className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-semibold">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-5 divide-y divide-border/30">
              {loading ? (
                <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Loading active tasks...</div>
              ) : activeTasks.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No tasks currently in progress. Accept an assigned task above to begin drawing.
                </div>
              ) : (
                activeTasks.map((task) => (
                  <div key={task.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{task.title}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">{task.id}</Badge>
                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 border-emerald-200 text-[10px]">
                          v{task.current_version || 1}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Project: {task.project_title} • Target: {task.figure_numbers ? `FIG ${task.figure_numbers.join(', ')}` : 'Illustrations'}
                      </p>
                    </div>
                    <Link href={`/dashboard/design-team/workspace/in-progress?id=${task.id}`}>
                      <Button size="sm" variant="outline" className="text-xs h-8 font-semibold">
                        Continue Drawing <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Quick Navigation & Design Materials Shortcuts */}
        <div className="space-y-6">
          {/* Workspace Quick Links */}
          <Card className="bg-card">
            <CardHeader className="p-4 pb-2 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" /> Design Materials & Libraries
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <Link
                href="/dashboard/design-team/materials/drawings"
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Drawings Catalog</h4>
                    <p className="text-[11px] text-muted-foreground">Patent figures FIG 1..N and line art</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>

              <Link
                href="/dashboard/design-team/materials/technical-docs"
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Technical Documents</h4>
                    <p className="text-[11px] text-muted-foreground">Architecture specs & diagrams</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>

              <Link
                href="/dashboard/design-team/materials/reference-files"
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Reference Files</h4>
                    <p className="text-[11px] text-muted-foreground">Drafter & Analyst research assets</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>

              <Link
                href="/dashboard/design-team/materials/export-files"
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Export Deliverables</h4>
                    <p className="text-[11px] text-muted-foreground">Finalized PDF/PNG filing packages</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>

          {/* Workflow Guidelines Card */}
          <Card className="bg-card border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5" /> USPTO & PCT Drawing Standards
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>• <strong>Sheet Margins:</strong> 1.0" top/left, 0.6" right, 0.4" bottom.</p>
              <p>• <strong>Line Art:</strong> High contrast monochrome line drawings (min 300 DPI).</p>
              <p>• <strong>Numerals:</strong> Consistent reference numerals (100-series for FIG 1, etc.).</p>
              <p>• <strong>Review Flow:</strong> Submit finished revisions directly to the requesting Patent Drafter or Analyst.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
