"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Clock,
  Bell,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X
} from "lucide-react";
import { useActiveRole } from "@/components/auth/role-context";

export default function DeadlinesDocketPage() {
  const router = useRouter();
  const { currentUser } = useActiveRole();
  const [loading, setLoading] = useState(true);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("ALL");

  // Extension request modal
  const [extensionTask, setExtensionTask] = useState<any | null>(null);
  const [requestedDays, setRequestedDays] = useState(3);
  const [extensionReason, setExtensionReason] = useState("");
  const [extSuccessMsg, setExtSuccessMsg] = useState<string | null>(null);

  const fetchDocket = async () => {
    try {
      const res = await fetch("/api/design-team/docket");
      if (res.ok) {
        const data = await res.json();
        if (data.deadlines) {
          setDeadlines(data.deadlines);
          setCounts(data.counts || {});
        }
      }
    } catch (err) {
      console.error("Error fetching docket deadlines:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocket();
  }, []);

  const filtered = deadlines.filter((d) => {
    const matchesSearch =
      d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.project_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.invention_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.assignment_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUrgency = urgencyFilter === "ALL" || d.urgency === urgencyFilter;
    return matchesSearch && matchesUrgency;
  });

  const handleRequestExtension = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extensionTask) return;
    setExtSuccessMsg(`Extension request (+${requestedDays} days) submitted to ${extensionTask.assigned_by} (${extensionTask.sender_role}).`);
    setExtensionTask(null);
    setExtensionReason("");
    setTimeout(() => setExtSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              Filing Calendar & Turnaround
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              ROLE: {currentUser?.name || "Design Team"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Calendar className="w-7 h-7 text-rose-600" /> Design Deadlines Docket
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Schedule of patent figure completion deadlines, client deliverable targets, and USPTO filing cutoffs across all projects.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/design-team/docket/action-items">
            <Button className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm">
              <AlertCircle className="w-4 h-4 mr-1.5" /> Action Items
            </Button>
          </Link>
          <Link href="/dashboard/design-team/workspace/in-progress">
            <Button variant="outline" className="text-xs font-semibold">
              <Sparkles className="w-4 h-4 mr-1.5 text-emerald-600" /> Drawing Studio
            </Button>
          </Link>
        </div>
      </div>

      {extSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" /> {extSuccessMsg}
        </div>
      )}

      {/* Docket Navigation Tab Strip */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2 overflow-x-auto">
        <Link href="/dashboard/design-team/docket/deadlines">
          <Button size="sm" className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-8">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-rose-500" /> Deadlines ({deadlines.length})
          </Button>
        </Link>
        <Link href="/dashboard/design-team/docket/reminders">
          <Button size="sm" variant="outline" className="text-xs h-8">
            <Bell className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Reminders ({counts.reminders || 3})
          </Button>
        </Link>
        <Link href="/dashboard/design-team/docket/action-items">
          <Button size="sm" variant="outline" className="text-xs h-8">
            <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Action Items ({counts.action_items || 3})
          </Button>
        </Link>
      </div>

      {/* Search & Urgency Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search deadline title, invention ID, or task..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs bg-card"
          />
        </div>

        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1 self-end sm:self-auto"
        >
          <option value="ALL">All Urgencies</option>
          <option value="CRITICAL">Critical (&lt; 48 hours)</option>
          <option value="HIGH">High (&lt; 7 days)</option>
          <option value="NORMAL">Normal</option>
        </select>
      </div>

      {/* Deadlines List */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">
          Loading docket deadlines...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center bg-card">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-bold text-foreground">No deadlines found</h3>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((dl) => (
            <Card
              key={dl.id}
              className={`bg-card transition-all shadow-sm border ${
                dl.urgency === "CRITICAL"
                  ? "border-rose-500/60 bg-rose-50/10 dark:bg-rose-950/10"
                  : dl.urgency === "HIGH"
                  ? "border-amber-500/50"
                  : "border-border/50"
              }`}
            >
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                      {dl.assignment_id}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">{dl.invention_id}</Badge>
                    <Badge
                      className={`text-[9px] font-bold ${
                        dl.urgency === "CRITICAL"
                          ? "bg-rose-600 text-white"
                          : dl.urgency === "HIGH"
                          ? "bg-amber-600 text-white"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {dl.urgency === "CRITICAL" ? "DUE SOON" : `${dl.urgency} PRIORITY`}
                    </Badge>
                    <Badge variant="secondary" className="text-[9px]">
                      FIG. {dl.figure_numbers ? dl.figure_numbers.join(", ") : "1"}
                    </Badge>
                  </div>

                  <h3 className="text-sm font-bold text-foreground">{dl.title}</h3>
                  <p className="text-xs text-muted-foreground">{dl.project_title} • Requested by <strong>{dl.assigned_by}</strong> ({dl.sender_role})</p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 flex-wrap">
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <Clock className="w-3.5 h-3.5 text-rose-500" />
                      Target Due Date: {new Date(dl.due_date).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span className="text-rose-600 font-bold font-mono">
                      {dl.days_remaining > 0 ? `${dl.days_remaining} days remaining` : "Due today"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setExtensionTask(dl)}
                  >
                    Request Extension
                  </Button>

                  <Link href={`/dashboard/design-team/workspace/in-progress?id=${dl.assignment_id}`}>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    >
                      Draw in Studio →
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* EXTENSION MODAL */}
      {extensionTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-base text-foreground">Request Deadline Extension</h3>
              </div>
              <button onClick={() => setExtensionTask(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestExtension} className="p-5 space-y-4">
              <div className="p-3 bg-muted/20 rounded-lg border border-border/30 text-xs">
                <span className="text-[10px] uppercase text-muted-foreground block">Task</span>
                <span className="font-bold text-foreground">{extensionTask.title}</span>
                <p className="text-muted-foreground text-[11px] mt-0.5">Assigned by: {extensionTask.assigned_by} ({extensionTask.sender_role})</p>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Additional Days Needed</label>
                <select
                  value={requestedDays}
                  onChange={(e) => setRequestedDays(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1"
                >
                  <option value={2}>+2 Business Days</option>
                  <option value={3}>+3 Business Days</option>
                  <option value={5}>+5 Business Days (1 Week)</option>
                  <option value={7}>+7 Business Days</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Justification / Reason</label>
                <textarea
                  placeholder="e.g. Additional prior art comparative schematics requested by analyst..."
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1"
                  required
                />
              </div>

              <div className="pt-3 border-t border-border/40 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setExtensionTask(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                >
                  Submit Extension Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
