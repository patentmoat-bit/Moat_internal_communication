"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  Eye,
  Bell,
  Download,
  FolderOpen,
  Layers,
  ArrowRight,
  UserCheck,
  ShieldCheck,
  X,
  FileText,
  ImageIcon,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { useActiveRole } from "@/components/auth/role-context";

export default function UnderReviewWorkspacePage() {
  const router = useRouter();
  const { currentUser } = useActiveRole();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Inspect Modal
  const [inspectSub, setInspectSub] = useState<any | null>(null);

  // Review Simulator Modal
  const [simulatorSub, setSimulatorSub] = useState<any | null>(null);
  const [simAction, setSimAction] = useState<"ACCEPT" | "REWORK">("ACCEPT");
  const [simFeedback, setSimFeedback] = useState("");
  const [processingSim, setProcessingSim] = useState(false);

  // Action status message
  const [actionAlert, setActionAlert] = useState<{ type: "success" | "warning"; msg: string } | null>(null);

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
      console.error("Error fetching submissions:", err);
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
    const matchesRole = roleFilter === "ALL" || s.recipient_role === roleFilter;
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPending = submissions.filter((s) => s.status === "PENDING_REVIEW").length;
  const drafterPending = submissions.filter((s) => s.status === "PENDING_REVIEW" && s.recipient_role === "PATENT_DRAFTER").length;
  const analystPending = submissions.filter((s) => s.status === "PENDING_REVIEW" && s.recipient_role === "PATENT_ANALYST").length;
  const ceoPending = submissions.filter((s) => s.status === "PENDING_REVIEW" && s.recipient_role === "CEO").length;
  const reworkCount = submissions.filter((s) => s.status === "REWORK_REQUESTED").length;

  const handleRemindReviewer = async (sub: any) => {
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
        setActionAlert({
          type: "success",
          msg: `Reminder sent to ${sub.recipient_role} (${sub.recipient_user}) for deliverable '${sub.title}'.`
        });
        await fetchSubmissions();
        setTimeout(() => setActionAlert(null), 4000);
      }
    } catch (err) {
      console.error("Error sending reminder:", err);
    }
  };

  const handleExecuteSimulatedReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatorSub) return;
    setProcessingSim(true);

    try {
      const defaultFeedback =
        simAction === "ACCEPT"
          ? "All figures, reference numerals, and margin spacing approved for formal draft filing."
          : simFeedback || "FIG reference numerals require repositioning away from margin boundaries per 37 CFR 1.84.";

      const res = await fetch("/api/design-team/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: simulatorSub.id,
          action: simAction,
          reviewer_name: simulatorSub.recipient_user,
          reviewer_role: simulatorSub.recipient_role,
          feedback_notes: simFeedback || defaultFeedback
        })
      });

      if (res.ok) {
        setActionAlert({
          type: simAction === "ACCEPT" ? "success" : "warning",
          msg:
            simAction === "ACCEPT"
              ? `Submission approved! Assignment status advanced to COMPLETED.`
              : `Rework requested. Assignment moved to REWORK loop with feedback logged.`
        });
        setSimulatorSub(null);
        setSimFeedback("");
        await fetchSubmissions();
        setTimeout(() => setActionAlert(null), 4000);
      }
    } catch (err) {
      console.error("Error executing simulated review:", err);
    } finally {
      setProcessingSim(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Review Queue & Turnaround
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              DESIGNER: {currentUser?.name || "Design Team"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Clock className="w-7 h-7 text-purple-600" /> Under Review Deliverables
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Real-time tracking of drawings and technical figures submitted to Patent Drafters, Patent Analysts, and Executive leadership for approval.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/design-team/workspace/in-progress">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm">
              <RotateCcw className="w-4 h-4 mr-1.5" /> Continue Active Work
            </Button>
          </Link>
          <Link href="/dashboard/design-team/workspace/completed">
            <Button variant="outline" className="text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-blue-500" /> Completed Deliverables
            </Button>
          </Link>
        </div>
      </div>

      {actionAlert && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
            actionAlert.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400"
          }`}
        >
          {actionAlert.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {actionAlert.msg}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="bg-card border-border/40 shadow-sm p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Total In Review
          </span>
          <div className="text-2xl font-black text-foreground mt-1 font-mono">{totalPending}</div>
          <span className="text-[10px] text-purple-600 font-medium">Awaiting decision</span>
        </Card>

        <Card className="bg-card border-border/40 shadow-sm p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Patent Drafter
          </span>
          <div className="text-2xl font-black text-blue-600 mt-1 font-mono">{drafterPending}</div>
          <span className="text-[10px] text-muted-foreground">Detailed description alignment</span>
        </Card>

        <Card className="bg-card border-border/40 shadow-sm p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Patent Analyst
          </span>
          <div className="text-2xl font-black text-indigo-600 mt-1 font-mono">{analystPending}</div>
          <span className="text-[10px] text-muted-foreground">Prior art differentiation</span>
        </Card>

        <Card className="bg-card border-border/40 shadow-sm p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            CEO / Executive
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1 font-mono">{ceoPending}</div>
          <span className="text-[10px] text-muted-foreground">Strategic sign-off</span>
        </Card>

        <Card className="bg-card border-border/40 shadow-sm p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Rework Loop
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1 font-mono">{reworkCount}</div>
          <span className="text-[10px] text-rose-600 font-medium">Revisions requested</span>
        </Card>
      </div>

      {/* Controls & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search submission title, reviewer name, or project ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs bg-card"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1"
          >
            <option value="ALL">All Recipient Roles</option>
            <option value="PATENT_DRAFTER">Patent Drafter</option>
            <option value="PATENT_ANALYST">Patent Analyst</option>
            <option value="CEO">CEO / Executive</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REWORK_REQUESTED">Rework Requested</option>
          </select>
        </div>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">
          Loading active review submissions...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center bg-card">
          <Clock className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-bold text-foreground">No submissions found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            All submitted design packages have been processed or no submissions match the current filter.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((sub) => (
            <Card
              key={sub.id}
              className={`bg-card transition-all shadow-sm border ${
                sub.status === "REWORK_REQUESTED"
                  ? "border-rose-500/50 bg-rose-50/10 dark:bg-rose-950/10"
                  : sub.status === "APPROVED"
                  ? "border-emerald-500/50 bg-emerald-50/10 dark:bg-emerald-950/10"
                  : "border-border/50 hover:border-purple-500/50"
              }`}
            >
              <CardContent className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-5">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                      {sub.id}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">{sub.invention_id}</Badge>
                    <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                      v{sub.submitted_version || 1}
                    </Badge>
                    <Badge
                      className={`text-[9px] font-bold ${
                        sub.status === "APPROVED"
                          ? "bg-emerald-600 text-white"
                          : sub.status === "REWORK_REQUESTED"
                          ? "bg-rose-600 text-white"
                          : "bg-purple-600 text-white"
                      }`}
                    >
                      {sub.status === "REWORK_REQUESTED" ? "REWORK REQUESTED" : sub.status?.replace("_", " ")}
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-foreground">{sub.title}</h3>
                  <p className="text-xs text-muted-foreground">{sub.message}</p>

                  {/* Reviewer Note Banner if Rework */}
                  {sub.status === "REWORK_REQUESTED" && sub.review_notes && (
                    <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Reviewer Feedback from {sub.reviewed_by || sub.recipient_user}:</span>
                      </div>
                      <p className="pl-5 italic">"{sub.review_notes}"</p>
                    </div>
                  )}

                  {/* Submission Metadata Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs text-muted-foreground">
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block">Assigned Reviewer</span>
                      <strong className="text-foreground">{sub.recipient_user}</strong> ({sub.recipient_role})
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block">Submitted On</span>
                      <span>{new Date(sub.submitted_at).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-muted-foreground block">Turnaround Status</span>
                      <span className="text-purple-600 font-semibold">
                        {sub.status === "APPROVED"
                          ? "✓ Decision Finalized"
                          : sub.status === "REWORK_REQUESTED"
                          ? "Action Required: Rework"
                          : "⏳ Awaiting Review Response"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Column */}
                <div className="flex flex-col gap-2 shrink-0 md:w-52">
                  {sub.status === "REWORK_REQUESTED" ? (
                    <Link href={`/dashboard/design-team/workspace/in-progress?id=${sub.assignment_id}`}>
                      <Button size="sm" className="w-full h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm">
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Start Rework in Studio
                      </Button>
                    </Link>
                  ) : sub.status === "PENDING_REVIEW" ? (
                    <>
                      {/* Reviewer Action Simulator Button */}
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm"
                        onClick={() => {
                          setSimulatorSub(sub);
                          setSimAction("ACCEPT");
                        }}
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Reviewer Decision Mode...
                      </Button>

                      {/* Reminder Ping Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleRemindReviewer(sub)}
                      >
                        <Bell className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Ping Reviewer
                      </Button>
                    </>
                  ) : (
                    <Link href="/dashboard/design-team/workspace/completed">
                      <Button size="sm" variant="outline" className="w-full h-8 text-xs text-emerald-600 border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> View Completed Archive
                      </Button>
                    </Link>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full h-8 text-xs text-muted-foreground"
                    onClick={() => setInspectSub(sub)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" /> Inspect Package
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* INSPECT SUBMISSION MODAL */}
      {inspectSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-foreground">
                  Submission Details: {inspectSub.id}
                </h3>
              </div>
              <button onClick={() => setInspectSub(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="p-3.5 bg-muted/20 rounded-lg border border-border/30 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deliverable:</span>
                  <span className="font-bold text-foreground">{inspectSub.title} (v{inspectSub.submitted_version})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project:</span>
                  <span className="font-mono text-foreground">{inspectSub.project_title} • {inspectSub.invention_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recipient Reviewer:</span>
                  <span className="font-semibold text-foreground">{inspectSub.recipient_user} ({inspectSub.recipient_role})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className="bg-purple-600 text-white text-[9px]">{inspectSub.status}</Badge>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-foreground block mb-1">Submission Message:</span>
                <p className="text-xs text-muted-foreground bg-card p-3 rounded border border-border/30">
                  {inspectSub.message}
                </p>
              </div>

              {inspectSub.notes && (
                <div>
                  <span className="text-xs font-bold text-foreground block mb-1">Compliance Notes & Numerals:</span>
                  <p className="text-xs text-muted-foreground bg-card p-3 rounded border border-border/30">
                    {inspectSub.notes}
                  </p>
                </div>
              )}

              {inspectSub.files && inspectSub.files.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-foreground block">Attached Drawing Files:</span>
                  {inspectSub.files.map((file: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded border border-border/30 bg-muted/10 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-emerald-600" />
                        <span className="font-mono font-medium">{file.file_name || file.name || "Drawing_Sheet.png"}</span>
                      </div>
                      <span className="text-muted-foreground font-mono">{file.file_size || "1.5 MB"}</span>
                    </div>
                  ))}
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

      {/* REVIEWER DECISION SIMULATOR MODAL */}
      {simulatorSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/60 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/40 flex items-center justify-between bg-purple-50/20 dark:bg-purple-950/20">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="font-bold text-base text-foreground">Simulate Reviewer Action</h3>
                  <p className="text-[11px] text-muted-foreground">Acting as: <strong>{simulatorSub.recipient_user}</strong> ({simulatorSub.recipient_role})</p>
                </div>
              </div>
              <button onClick={() => setSimulatorSub(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteSimulatedReview} className="p-5 space-y-4">
              <div className="p-3 bg-muted/20 rounded-lg border border-border/30 text-xs">
                <span className="text-[10px] uppercase text-muted-foreground block">Deliverable</span>
                <span className="font-bold text-foreground">{simulatorSub.title} (v{simulatorSub.submitted_version})</span>
              </div>

              {/* Decision Toggle */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-2">Review Decision</label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setSimAction("ACCEPT")}
                    className={`p-3.5 rounded-lg border cursor-pointer text-center transition-all ${
                      simAction === "ACCEPT"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 ring-1 ring-emerald-600"
                        : "bg-card border-border/40 hover:bg-muted/20"
                    }`}
                  >
                    <CheckCircle2 className={`w-5 h-5 mx-auto mb-1 ${simAction === "ACCEPT" ? "text-emerald-600" : "text-muted-foreground"}`} />
                    <span className="text-xs font-bold block text-foreground">Approve Deliverable</span>
                    <span className="text-[10px] text-muted-foreground">Mark COMPLETED & incorporate</span>
                  </div>

                  <div
                    onClick={() => setSimAction("REWORK")}
                    className={`p-3.5 rounded-lg border cursor-pointer text-center transition-all ${
                      simAction === "REWORK"
                        ? "bg-rose-50 dark:bg-rose-950/40 border-rose-600 ring-1 ring-rose-600"
                        : "bg-card border-border/40 hover:bg-muted/20"
                    }`}
                  >
                    <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${simAction === "REWORK" ? "text-rose-600" : "text-muted-foreground"}`} />
                    <span className="text-xs font-bold block text-foreground">Request Rework</span>
                    <span className="text-[10px] text-muted-foreground">Return to Design Team with notes</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  {simAction === "ACCEPT" ? "Approval Notes (Optional)" : "Specific Rework Instructions"}
                </label>
                <textarea
                  placeholder={
                    simAction === "ACCEPT"
                      ? "e.g. Line art approved. Figure alignment with Claim 1 verified."
                      : "e.g. FIG 4 reference numeral 106 overlaps bus line. Adjust 1.0 inch top margin per 37 CFR 1.84."
                  }
                  value={simFeedback}
                  onChange={(e) => setSimFeedback(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 rounded-md border border-input bg-card text-xs text-foreground focus:outline-none focus:ring-1"
                  required={simAction === "REWORK"}
                />
              </div>

              <div className="pt-3 border-t border-border/40 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setSimulatorSub(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className={`text-xs font-semibold text-white ${
                    simAction === "ACCEPT" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                  disabled={processingSim}
                >
                  {processingSim
                    ? "Executing..."
                    : simAction === "ACCEPT"
                    ? "Confirm Approval"
                    : "Send Rework Request"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
