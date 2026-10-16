"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Send,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Bell,
  MessageSquare,
  History,
  FolderOpen,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { useActiveRole } from "@/components/auth/role-context";

export default function ReviewRequestsCollabPage() {
  const router = useRouter();
  const { currentUser } = useActiveRole();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [inspectSub, setInspectSub] = useState<any | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch("/api/design-team/submissions");
      if (res.ok) {
        const data = await res.json();
        if (data.submissions) {
          setSubmissions(data.submissions);
        }
      }
    } catch (err) {
      console.error("Error fetching review requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const filtered = submissions.filter((s) => {
    const matchesSearch =
      s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.project_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.invention_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.recipient_user?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRemind = async (sub: any) => {
    try {
      const res = await fetch("/api/design-team/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: sub.id,
          action: "REMIND"
        })
      });
      if (res.ok) {
        setAlertMsg(`Reminder notification dispatched to ${sub.recipient_role} (${sub.recipient_user}).`);
        setTimeout(() => setAlertMsg(null), 4000);
      }
    } catch (err) {}
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Cross-Role Collaboration
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              ROLE: {currentUser?.name || "Design Team"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Send className="w-7 h-7 text-purple-600" /> Review Requests Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Live lifecycle management for all design packages submitted for formal cross-functional review across Patent Drafters, Analysts, and Executive leadership.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/design-team/workspace/under-review">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm">
              <Clock className="w-4 h-4 mr-1.5" /> Under Review Queue
            </Button>
          </Link>
          <Link href="/dashboard/design-team/collab/comments">
            <Button variant="outline" className="text-xs font-semibold">
              <MessageSquare className="w-4 h-4 mr-1.5 text-blue-500" /> Discussion Threads
            </Button>
          </Link>
        </div>
      </div>

      {alertMsg && (
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" /> {alertMsg}
        </div>
      )}

      {/* Collaboration Navigation Tab Strip */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2 overflow-x-auto">
        <Link href="/dashboard/design-team/collab/requests">
          <Button size="sm" className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs h-8">
            <Send className="w-3.5 h-3.5 mr-1.5 text-purple-500" /> Review Requests ({submissions.length})
          </Button>
        </Link>
        <Link href="/dashboard/design-team/collab/comments">
          <Button size="sm" variant="outline" className="text-xs h-8">
            <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Comments & Annotations
          </Button>
        </Link>
        <Link href="/dashboard/design-team/collab/history">
          <Button size="sm" variant="outline" className="text-xs h-8">
            <History className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Revision History Log
          </Button>
        </Link>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search request title, recipient, or invention ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs bg-card"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1 self-end sm:self-auto"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REWORK_REQUESTED">Rework Requested</option>
        </select>
      </div>

      {/* Requests Table */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">
          Loading review requests...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center bg-card">
          <Send className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-bold text-foreground">No review requests found</h3>
        </Card>
      ) : (
        <div className="rounded-xl border border-border/40 overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Request & Deliverable</th>
                  <th className="py-3 px-4">Target Invention</th>
                  <th className="py-3 px-4">Reviewer</th>
                  <th className="py-3 px-4 text-center">Version</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/15 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                          {sub.id}
                        </span>
                        <span className="font-bold text-foreground hover:text-purple-600 cursor-pointer" onClick={() => setInspectSub(sub)}>
                          {sub.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground block truncate max-w-sm mt-0.5">
                        {sub.message}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-foreground">
                      <span className="font-semibold block">{sub.project_title}</span>
                      <span className="text-muted-foreground">{sub.invention_id}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <strong className="text-foreground block">{sub.recipient_user}</strong>
                      <span className="text-[10px] text-muted-foreground">{sub.recipient_role}</span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <Badge variant="outline" className="font-mono text-[10px]">v{sub.submitted_version || 1}</Badge>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        className={`text-[9px] font-bold ${
                          sub.status === "APPROVED"
                            ? "bg-emerald-600 text-white"
                            : sub.status === "REWORK_REQUESTED"
                            ? "bg-rose-600 text-white"
                            : "bg-purple-600 text-white"
                        }`}
                      >
                        {sub.status === "REWORK_REQUESTED" ? "REWORK" : sub.status?.replace("_", " ")}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                      {new Date(sub.submitted_at).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => setInspectSub(sub)}
                          title="Inspect Request"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {sub.status === "PENDING_REVIEW" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] text-blue-600"
                            onClick={() => handleRemind(sub)}
                            title="Ping Reviewer"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        <Link href="/dashboard/design-team/workspace/under-review">
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-[11px] bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          >
                            Queue →
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INSPECT MODAL */}
      {inspectSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-foreground">{inspectSub.title}</h3>
              </div>
              <button onClick={() => setInspectSub(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="p-3.5 bg-muted/20 rounded-lg border border-border/30 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned Reviewer:</span>
                  <span className="font-bold text-foreground">{inspectSub.recipient_user} ({inspectSub.recipient_role})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Project:</span>
                  <span className="font-mono text-foreground">{inspectSub.project_title} • {inspectSub.invention_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submission Status:</span>
                  <Badge className="bg-purple-600 text-white text-[9px]">{inspectSub.status}</Badge>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-foreground block mb-1">Message to Reviewer:</span>
                <p className="text-xs text-muted-foreground bg-card p-3 rounded border border-border/30">
                  {inspectSub.message}
                </p>
              </div>

              {inspectSub.review_notes && (
                <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-bold block mb-0.5">Reviewer Feedback:</span>
                  <p>{inspectSub.review_notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border/40 bg-muted/10 flex justify-end">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setInspectSub(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
