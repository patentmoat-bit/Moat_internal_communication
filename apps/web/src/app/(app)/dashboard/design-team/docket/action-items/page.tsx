"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  ClipboardList,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Bell,
  Search,
  PenTool,
  Clock,
  Layers
} from "lucide-react";
import { useActiveRole } from "@/components/auth/role-context";

export default function ActionItemsDocketPage() {
  const router = useRouter();
  const { currentUser } = useActiveRole();
  const [loading, setLoading] = useState(true);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchDocket = async () => {
    try {
      const res = await fetch("/api/design-team/docket");
      if (res.ok) {
        const data = await res.json();
        if (data.action_items) {
          setActionItems(data.action_items);
          setCounts(data.counts || {});
        }
      }
    } catch (err) {
      console.error("Error fetching action items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocket();
  }, []);

  const filtered = actionItems.filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.invention_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "ALL" || item.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Operational Queue
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              ROLE: {currentUser?.name || "Design Team"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <AlertCircle className="w-7 h-7 text-blue-600" /> Prioritized Action Items
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Real-time actionable queue highlighting immediate tasks requiring designer intervention: incoming handoffs, reviewer rework loops, and urgent deadlines.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/design-team/workspace/in-progress">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm">
              <PenTool className="w-4 h-4 mr-1.5" /> Drawing Studio
            </Button>
          </Link>
          <Link href="/dashboard/design-team/docket/deadlines">
            <Button variant="outline" className="text-xs font-semibold">
              <Calendar className="w-4 h-4 mr-1.5 text-rose-500" /> Deadlines
            </Button>
          </Link>
        </div>
      </div>

      {/* Docket Navigation Tab Strip */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2 overflow-x-auto">
        <Link href="/dashboard/design-team/docket/deadlines">
          <Button size="sm" variant="outline" className="text-xs h-8">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-rose-500" /> Deadlines ({counts.deadlines || 2})
          </Button>
        </Link>
        <Link href="/dashboard/design-team/docket/reminders">
          <Button size="sm" variant="outline" className="text-xs h-8">
            <Bell className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Reminders ({counts.reminders || 3})
          </Button>
        </Link>
        <Link href="/dashboard/design-team/docket/action-items">
          <Button size="sm" className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-8">
            <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Action Items ({actionItems.length})
          </Button>
        </Link>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search action items, tasks, or projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs bg-card"
          />
        </div>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1 self-end sm:self-auto"
        >
          <option value="ALL">All Priorities</option>
          <option value="CRITICAL">Critical (Rework Required)</option>
          <option value="HIGH">High (New Assignments)</option>
          <option value="NORMAL">Normal (Active Work)</option>
        </select>
      </div>

      {/* Action Items List */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">
          Evaluating operational action items...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center bg-card">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600 mb-3" />
          <h3 className="text-base font-bold text-foreground">All clear! No pending action items</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            You have addressed all assigned drawings, rework loops, and review checkpoints.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isCritical = item.priority === "CRITICAL";
            const isHigh = item.priority === "HIGH";

            return (
              <Card
                key={item.id}
                className={`bg-card transition-all shadow-sm border ${
                  isCritical
                    ? "border-rose-500/60 bg-rose-50/10 dark:bg-rose-950/10"
                    : isHigh
                    ? "border-blue-500/50"
                    : "border-border/50"
                }`}
              >
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1">
                    <div
                      className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                        isCritical
                          ? "bg-rose-500/10 text-rose-600"
                          : isHigh
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      {isCritical ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : isHigh ? (
                        <ClipboardList className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={`text-[9px] font-bold ${
                            isCritical
                              ? "bg-rose-600 text-white"
                              : isHigh
                              ? "bg-blue-600 text-white"
                              : "bg-slate-700 text-white"
                          }`}
                        >
                          {item.priority} PRIORITY
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {item.invention_id}
                        </Badge>
                      </div>

                      <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  </div>

                  <div className="shrink-0 sm:self-center">
                    <Link href={item.link}>
                      <Button
                        size="sm"
                        className={`h-8 text-xs font-semibold shadow-sm ${
                          isCritical
                            ? "bg-rose-600 hover:bg-rose-700 text-white"
                            : isHigh
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        }`}
                      >
                        {isCritical
                          ? "Perform Rework →"
                          : isHigh
                          ? "Review & Accept →"
                          : "Open Studio →"}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
