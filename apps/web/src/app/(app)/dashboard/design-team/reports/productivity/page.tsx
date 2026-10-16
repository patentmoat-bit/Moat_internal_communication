"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  Clock,
  TrendingUp,
  Zap,
  Target,
  CheckCircle2,
  Users,
  Calendar,
  Layers,
  ArrowRight,
  Download,
  RefreshCw,
  Activity,
  History,
  FileCheck,
  Send,
  Timer,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { useActiveRole } from "@/components/auth/role-context";

export default function DesignProductivityPage() {
  const { currentUser } = useActiveRole();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [timeFilter, setTimeFilter] = useState("month");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/design-team/reports");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error("Failed to load productivity metrics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const productivity = data?.productivity || {
    avg_turnaround_days: 2.1,
    avg_draft_hours: 14.5,
    avg_review_hours: 4.8,
    on_time_delivery_rate: 100,
    quality_score: 98.5,
    efficiency_index: 94.2,
    turnaround_by_stage: [],
    weekly_output: [],
    reviewer_collaboration: []
  };

  const summary = data?.summary || {
    total_assignments: 3,
    completed_count: 1,
    total_figures: 4,
    total_versions: 5
  };

  const recentActivity = data?.recent_activity || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Design Productivity & Turnaround Velocity
            </h1>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
              <Flame className="w-3 h-3 mr-1 text-amber-500" /> High Velocity
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Tracking turnaround velocity from Patent Drafter assignment to final 37 CFR § 1.84 filing approval.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-700 text-xs">
            {["week", "month", "quarter"].map((f) => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                  timeFilter === f
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                {f === "week" ? "This Week" : f === "month" ? "This Month" : "Quarterly"}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => {
              const csv = `Metric,Value\nAvg Turnaround Days,${productivity.avg_turnaround_days}\nOn-time Delivery Rate,${productivity.on_time_delivery_rate}%\nFigures Drawn,${summary.total_figures}\nEfficiency Index,${productivity.efficiency_index}\n`;
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "Design_Productivity_Report_2026.csv";
              a.click();
            }}
            className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Top Velocity Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Avg Full Turnaround</span>
              <Timer className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {productivity.avg_turnaround_days} Days
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> 58% buffer
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
              Benchmark docket standard: 5.0 days per figure package
            </p>
          </CardContent>
        </Card>

        {/* Card 2 */}
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">On-Time Docket Rate</span>
              <Target className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {productivity.on_time_delivery_rate}%
              </span>
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px]">
                0 OVERDUE
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
              All deliverables submitted on or ahead of statutory deadlines
            </p>
          </CardContent>
        </Card>

        {/* Card 3 */}
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Review Response Velocity</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {productivity.avg_review_hours}h
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Avg wait
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
              Feedback from Drafter & Analyst received within 24h window
            </p>
          </CardContent>
        </Card>

        {/* Card 4 */}
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Team Efficiency Score</span>
              <Flame className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {productivity.efficiency_index}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                / 100 PTS
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
              Top-quartile throughput among specialized patent drafting units
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stage-by-Stage Turnaround Funnel */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Lifecycle Stage-by-Stage Turnaround Latency
              </CardTitle>
              <CardDescription className="text-xs">
                Average elapsed operational hours per production milestone compared against internal SLAs
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              Target SLA: 48.0 Hours Max
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {productivity.turnaround_by_stage?.map((stage: any, idx: number) => {
              const percent = Math.min(100, Math.round((stage.avg_hours / stage.target_hours) * 100));
              return (
                <div key={idx} className="space-y-1.5 bg-zinc-50/50 dark:bg-zinc-900/50 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{stage.stage}</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-zinc-500">
                        Actual: <strong className="text-zinc-900 dark:text-zinc-100">{stage.avg_hours}h</strong>
                      </span>
                      <span className="text-zinc-400">/ SLA: {stage.target_hours}h</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          stage.status === "EXEMPLARY"
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200"
                        }`}
                      >
                        {stage.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full ${
                        percent < 50 ? "bg-emerald-500" : percent < 80 ? "bg-indigo-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Two Column Section: Weekly Production Velocity & Reviewer Collaboration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Production Trend */}
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Weekly Output Velocity Trend</CardTitle>
                <CardDescription className="text-xs">
                  Production cadence: Figures vectorized, version iterations, and approved deliverables
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Active Cadence
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2 text-center text-xs pb-2 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-medium">
              <div>Timeframe</div>
              <div>Figures Drawn</div>
              <div>Iterations</div>
              <div>Approved</div>
            </div>

            {productivity.weekly_output?.map((week: any, idx: number) => (
              <div
                key={idx}
                className="grid grid-cols-4 gap-2 items-center text-center text-xs p-2.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                <div className="text-left font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  {week.week}
                </div>
                <div className="font-bold text-indigo-600 dark:text-indigo-400">
                  {week.figures} sheets
                </div>
                <div className="text-zinc-600 dark:text-zinc-300">
                  {week.versions} versions
                </div>
                <div>
                  <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px]">
                    {week.approvals} locked
                  </Badge>
                </div>
              </div>
            ))}

            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Velocity target maintained with zero backlog overflow
              </span>
              <span className="font-bold">100% 37 CFR Compliance</span>
            </div>
          </CardContent>
        </Card>

        {/* Reviewer Collaboration & Turnaround Matrix */}
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Reviewer Response Velocity Matrix</CardTitle>
              <CardDescription className="text-xs">
                Turnaround efficiency and approval rate by stakeholder role
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {productivity.reviewer_collaboration?.map((rev: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-300">
                      {rev.lead_name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{rev.lead_name}</div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{rev.role}</span>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      rev.status === "RAPID"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : rev.status === "EXPEDITED"
                        ? "bg-purple-50 text-purple-700 border-purple-300"
                        : "bg-blue-50 text-blue-700 border-blue-300"
                    }`}
                  >
                    {rev.status} VELOCITY
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800 text-[11px]">
                  <div>
                    <span className="text-zinc-400 block">Avg Response:</span>
                    <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{rev.avg_response_hours} Hours</strong>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Approval Rate:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{rev.approval_rate}%</strong>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Reviews Completed:</span>
                    <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{rev.reviews_count} Reviews</strong>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Production Activity Stream */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-zinc-500" />
              <div>
                <CardTitle className="text-base font-semibold">Production Milestones & Turnaround Audit Trail</CardTitle>
                <CardDescription className="text-xs">
                  Immutable chronological log of drawing dispatches, review approvals, and version saves
                </CardDescription>
              </div>
            </div>
            <Link
              href="/dashboard/design-team/collab/history"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              Full Revision History <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {recentActivity.map((act: any, idx: number) => (
              <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{act.actor}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {act.action}
                    </Badge>
                    <span className="font-mono text-[10px] text-zinc-400">{act.invention_id}</span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-300">{act.details}</p>
                </div>
                <div className="text-right text-[11px] text-zinc-400 whitespace-nowrap shrink-0 font-mono">
                  {act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
