"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileText,
  History,
  Layers,
  User,
  Building,
  Edit3,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckSquare,
  Scale,
  Paperclip,
  GitBranch,
  RefreshCw,
  Share2
} from "lucide-react";
import { DocketItem, DocketUrgency, DocketHistoryRecord } from "@/types/docket";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CeoDocketDetailPage({ params }: PageProps) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const docketId = unwrappedParams.id;

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<DocketItem | null>(null);

  // Edit Date Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [dateField, setDateField] = useState<"official_deadline" | "internal_target_date" | "renewal_date">("internal_target_date");
  const [newDateVal, setNewDateVal] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ceo/docket/${docketId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.item) {
          setItem(json.item);
          setNewDateVal(json.item.internal_target_date || json.item.official_deadline);
        }
      }
    } catch (err) {
      console.error("Failed to load docket item details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [docketId]);

  const handleSaveDateEdit = async () => {
    if (!item) return;
    if (!newDateVal) {
      setEditError("Please specify a valid date.");
      return;
    }
    if (!editReason.trim()) {
      setEditError("A formal reason for updating this legal/internal deadline is mandatory.");
      return;
    }

    setEditSubmitting(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/ceo/docket/${item.id}/update-date`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: dateField,
          newDate: newDateVal,
          reason: editReason,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setItem(json.item);
          setEditModalOpen(false);
          setEditReason("");
          setActionNotice(`Docket date successfully updated to ${newDateVal}.`);
          setTimeout(() => setActionNotice(null), 5000);
        } else {
          setEditError(json.error || "Failed to update deadline.");
        }
      }
    } catch (e: any) {
      setEditError(e?.message || "Network error updating date.");
    } finally {
      setEditSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 flex items-center justify-center text-foreground font-sans">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading IP matter docket details...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-foreground font-sans">
        <Link
          href="/dashboard/ceo/docket"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Docket Command Center
        </Link>
        <div className="p-8 rounded-xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground dark:text-[#e8dfc8]">Docket Event Not Found</h2>
          <p className="text-xs text-muted-foreground mt-1">
            The requested docket record ID does not exist or has been archived.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen pb-24 text-foreground font-sans">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-border dark:border-[#c9a84c]/20 pb-4">
        <Link
          href="/dashboard/ceo/docket"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground dark:hover:text-[#e8dfc8] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to IP Docket Command Center
        </Link>

        <button
          onClick={() => {
            setEditModalOpen(true);
            setEditError(null);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border dark:border-[#c9a84c]/30 text-foreground dark:text-[#e8dfc8] hover:bg-[#c9a84c]/10 text-xs font-bold transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#9a751a] dark:text-[#c9a84c]" />
          Edit Docket Deadline
        </button>
      </div>

      {/* Action Notice */}
      {actionNotice && (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-500 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Connected CEO Approval Banner */}
      {item.requires_ceo_approval && (
        <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground dark:text-[#e8dfc8]">
                Executive Authorization Required for Statutory Filing
              </div>
              <p className="text-[11px] text-muted-foreground">
                This docket deadline is gated by CEO signoff. Review claims and drafting package in CEO Approvals.
              </p>
            </div>
          </div>

          <Link
            href={`/dashboard/ceo/approvals/${item.approval_id || "app-2026-001"}`}
            className="px-4 py-2 rounded-lg bg-[#175a74] hover:bg-[#114459] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 whitespace-nowrap transition-all"
          >
            <span>Review in CEO Approvals</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Docket Header Card */}
      <div className="p-6 rounded-2xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider bg-[#c9a84c]/10 text-[#9a751a] dark:text-[#c9a84c] border border-[#c9a84c]/30">
                {item.event_type_label}
              </span>
              <span className="px-2 py-0.5 rounded-sm text-[10px] font-black uppercase bg-muted/40 dark:bg-[#131309] text-muted-foreground border border-border dark:border-[#c9a84c]/20">
                {item.jurisdiction}
              </span>
              <span className="px-2 py-0.5 rounded-sm text-[10px] font-black uppercase border border-border dark:border-[#c9a84c]/20 text-muted-foreground">
                Status: {item.status}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">Docket ID: <strong className="text-foreground dark:text-[#e8dfc8]">{item.id}</strong></span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-foreground dark:text-[#e8dfc8] tracking-tight">
              {item.title}
            </h1>
            <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
              Matter: <strong className="text-foreground dark:text-[#e8dfc8]">{item.matter_name}</strong> • {item.description}
            </p>
          </div>

          {/* Urgent Countdown Card */}
          <div className="p-4 rounded-xl border border-border dark:border-[#c9a84c]/20 bg-muted/20 dark:bg-[#131309] text-center min-w-[160px]">
            <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Days to Deadline</div>
            <div className={`text-3xl font-black mt-0.5 ${
              item.urgency === "OVERDUE"
                ? "text-rose-500"
                : item.urgency === "DUE_TODAY"
                ? "text-amber-500 animate-pulse"
                : item.urgency === "DUE_SOON"
                ? "text-amber-500"
                : "text-emerald-500"
            }`}>
              {item.days_remaining}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-bold">
              {item.urgency.replace(/_/g, " ")}
            </div>
          </div>
        </div>

        {/* IP Matter Chain Progression */}
        <div className="pt-4 border-t border-border dark:border-[#c9a84c]/10">
          <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">
            Integrated IP Matter Lifecycle Chain
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {["PROJECT", "INVENTION", "PATENT_FILING", "PROSECUTION", "OFFICE_ACTION", "RESPONSE", "RENEWAL"].map((st, idx) => {
              const isCurrent = 
                (st === "PATENT_FILING" && item.event_type === "FILING_DEADLINE") ||
                (st === "OFFICE_ACTION" && item.event_type === "OFFICE_ACTION_RESPONSE") ||
                (st === "RENEWAL" && item.event_type === "RENEWAL_ANNUITY") ||
                (st === "PROSECUTION" && ["EXAMINATION_REQUEST", "ORAL_HEARING"].includes(item.event_type));
              return (
                <React.Fragment key={st}>
                  <div className={`px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-wider ${
                    isCurrent
                      ? "bg-[#175a74] text-white shadow-xs"
                      : "bg-muted/40 dark:bg-[#131309] text-muted-foreground border border-border dark:border-[#c9a84c]/15"
                  }`}>
                    {st.replace(/_/g, " ")}
                  </div>
                  {idx < 6 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Detailed Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border dark:border-[#c9a84c]/10 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Official Statutory Deadline:</span>
            <span className="font-bold text-amber-500 text-sm">{item.official_deadline}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Internal Target Date:</span>
            <span className="font-bold text-foreground dark:text-[#e8dfc8] text-sm">{item.internal_target_date || item.official_deadline}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Assigned Owner:</span>
            <div className="flex items-center justify-between w-full">
              <span className="font-semibold text-foreground dark:text-[#e8dfc8]">{item.owner} ({item.responsible_team})</span>
              <button onClick={() => setAssignModalOpen(true)} className="ml-4 px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-bold transition-colors shadow-sm">Assign to Drafter</button>
            </div>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Priority Rating:</span>
            <span className="font-semibold text-foreground dark:text-[#e8dfc8]">{item.priority}</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Prosecution Timeline & Notes (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-5 rounded-2xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] shadow-sm space-y-4">
            <h2 className="text-sm font-black text-foreground dark:text-[#e8dfc8] flex items-center gap-2 border-b border-border dark:border-[#c9a84c]/10 pb-3">
              <Layers className="w-4 h-4 text-[#9a751a] dark:text-[#c9a84c]" />
              Matter Prosecution & Action Timeline
            </h2>

            <div className="space-y-3">
              <div className="relative pl-6 border-l border-border dark:border-[#c9a84c]/20 space-y-6">
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-background" />
                  <div className="text-xs font-bold text-foreground dark:text-[#e8dfc8]">Priority Application Filed</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Original provisional filing registered with USPTO (Application: {item.application_number || "US18/942,109"}).
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">2025-10-20</div>
                </div>

                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-[#c9a84c] border-2 border-background" />
                  <div className="text-xs font-bold text-[#9a751a] dark:text-[#c9a84c]">
                    Active Docket Milestone: {item.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {item.description}
                  </div>
                  <div className="text-[10px] text-amber-500 font-bold mt-1">
                    Statutory Expiration: {item.official_deadline}
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-muted-foreground border-2 border-background" />
                  <div className="text-xs font-bold text-muted-foreground">Post-Grant Annuity / Renewal Phase</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Subsequent maintenance fees and annuity renewal requirements scheduled.
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">Estimated 2029-2030</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] shadow-sm space-y-3">
            <h2 className="text-sm font-black text-foreground dark:text-[#e8dfc8] flex items-center gap-2 border-b border-border dark:border-[#c9a84c]/10 pb-3">
              <FileText className="w-4 h-4 text-[#9a751a] dark:text-[#c9a84c]" />
              Legal & Prosecution Notes ({item.notes?.length || 0})
            </h2>

            {item.notes && item.notes.length > 0 ? (
              <div className="space-y-2">
                {item.notes.map((note, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/20 dark:bg-[#131309] border border-border dark:border-[#c9a84c]/15 text-xs text-muted-foreground leading-relaxed">
                    "{note}"
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">No special legal notes attached.</p>
            )}
          </div>
        </div>

        {/* Right Column: Date Audit History & Documents (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 rounded-2xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border dark:border-[#c9a84c]/10 pb-3">
              <h2 className="text-sm font-black text-foreground dark:text-[#e8dfc8] flex items-center gap-2">
                <History className="w-4 h-4 text-[#9a751a] dark:text-[#c9a84c]" />
                Docket Date Modification Audit ({item.history.length})
              </h2>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Immutable</span>
            </div>

            {item.history.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">
                Original deadline registered. No subsequent modifications made.
              </p>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {item.history.map((record) => (
                  <div
                    key={record.id}
                    className="p-3 rounded-xl bg-muted/20 dark:bg-[#131309] border border-border dark:border-[#c9a84c]/15 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-sm text-[10px] font-black uppercase bg-[#c9a84c]/10 text-[#9a751a] dark:text-[#c9a84c] border border-[#c9a84c]/20">
                        {record.field_changed.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {record.updated_at.split("T")[0]}
                      </span>
                    </div>

                    <div className="text-[11px] text-muted-foreground">
                      Changed from <strong className="text-muted-foreground">{record.old_value}</strong> to{" "}
                      <strong className="text-amber-500">{record.new_value}</strong>
                    </div>

                    <div className="p-2 rounded bg-muted/40 dark:bg-[#1a1a0e] border border-border dark:border-[#c9a84c]/10 text-[11px] text-muted-foreground italic">
                      "{record.reason}"
                    </div>

                    <div className="text-[10px] text-muted-foreground">
                      Updated By: {record.updated_by}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl border border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] shadow-sm space-y-3">
            <h2 className="text-sm font-black text-foreground dark:text-[#e8dfc8] flex items-center gap-2 border-b border-border dark:border-[#c9a84c]/10 pb-3">
              <Paperclip className="w-4 h-4 text-[#9a751a] dark:text-[#c9a84c]" />
              Matter Documents & Filing Package
            </h2>

            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-muted/20 dark:bg-[#131309] border border-border dark:border-[#c9a84c]/15 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-foreground dark:text-[#e8dfc8]">{item.matter_name} - Patent Package.pdf</div>
                  <div className="text-[10px] text-muted-foreground">Statutory Filing Specification • Verified</div>
                </div>
                <button className="px-2.5 py-1 rounded-sm border border-border dark:border-[#c9a84c]/30 text-foreground dark:text-[#e8dfc8] text-[11px] font-bold">
                  View
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Assignment Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background rounded-2xl border border-border/50 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-border/40">
              <h3 className="text-xl font-bold">Assign Project to Drafter</h3>
              <p className="text-sm text-muted-foreground mt-1">Select a patent drafter and provide instructions.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Patent Drafter</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={assignDrafter} onChange={e => setAssignDrafter(e.target.value)}>
                  <option value="">Select Drafter...</option>
                  <option value="DRAFTER-01">Shenbagakumar (Patent Drafter)</option>
                  <option value="DRAFTER-02">External Counsel</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Instructions</label>
                <textarea 
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                  placeholder="Draft claims based on attached Architecture PDF..."
                  value={assignInstructions}
                  onChange={e => setAssignInstructions(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Documents to Share</label>
                <div className="text-xs p-2 bg-blue-50 text-blue-700 rounded border border-blue-200">
                  <span className="font-bold">2 Authorized Files</span> will be shared with this assignment.
                </div>
              </div>
            </div>
            <div className="p-4 bg-muted/30 border-t border-border/40 flex justify-end gap-3">
              <button className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted rounded-md" onClick={() => setAssignModalOpen(false)}>Cancel</button>
              <button className="px-4 py-2 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-md shadow-sm" onClick={handleAssignProject} disabled={isAssigning || !assignDrafter}>
                {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Date Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1a1a0e] border border-stone-200 dark:border-[#c9a84c]/30 p-6 space-y-4 shadow-2xl text-stone-900 dark:text-[#e8dfc8]">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-[#c9a84c]/20 pb-3">
              <div>
                <h3 className="text-sm font-black text-stone-900 dark:text-[#e8dfc8] flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#9a751a] dark:text-[#c9a84c]" />
                  Edit Docket Date
                </h3>
                <p className="text-xs text-stone-600 dark:text-[#e8dfc8]/70 mt-0.5">{item.matter_name}</p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 dark:text-[#e8dfc8]/60 dark:hover:text-[#e8dfc8] p-1 rounded-md text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-900 dark:text-[#e8dfc8] mb-1">
                  Target Date Field
                </label>
                <select
                  value={dateField}
                  onChange={(e) => setDateField(e.target.value as any)}
                  className="w-full rounded-lg bg-stone-50 dark:bg-[#131309] border border-stone-300 dark:border-[#c9a84c]/30 p-2.5 text-xs text-stone-900 dark:text-[#e8dfc8] font-medium focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50 focus:border-[#c9a84c]"
                >
                  <option value="internal_target_date">Internal Target Date (Safest)</option>
                  <option value="official_deadline">Official Statutory Deadline (Authorized)</option>
                  <option value="renewal_date">Renewal / Annuity Date</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-900 dark:text-[#e8dfc8] mb-1">
                  New Date
                </label>
                <input
                  type="date"
                  value={newDateVal}
                  onChange={(e) => setNewDateVal(e.target.value)}
                  className="w-full rounded-lg bg-stone-50 dark:bg-[#131309] border border-stone-300 dark:border-[#c9a84c]/30 p-2.5 text-xs text-stone-900 dark:text-[#e8dfc8] font-medium focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50 focus:border-[#c9a84c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-900 dark:text-[#e8dfc8] mb-1">
                  Reason for Date Change (Mandatory)
                </label>
                <textarea
                  rows={3}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Official USPTO extension granted, statutory deadline adjusted, or internal acceleration..."
                  className="w-full rounded-lg bg-stone-50 dark:bg-[#131309] border border-stone-300 dark:border-[#c9a84c]/30 p-2.5 text-xs text-stone-900 dark:text-[#e8dfc8] placeholder:text-stone-400 dark:placeholder:text-[#e8dfc8]/40 focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50 focus:border-[#c9a84c]"
                />
              </div>

              {editError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  {editError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-stone-200 dark:border-[#c9a84c]/20">
              <button
                onClick={() => setEditModalOpen(false)}
                disabled={editSubmitting}
                className="px-4 py-2 rounded-lg border border-stone-300 dark:border-[#c9a84c]/30 bg-white dark:bg-transparent text-stone-700 dark:text-[#e8dfc8] hover:bg-stone-100 dark:hover:bg-[#c9a84c]/10 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDateEdit}
                disabled={editSubmitting}
                className="px-5 py-2 rounded-lg bg-[#175a74] hover:bg-[#114459] text-white text-xs font-black shadow-sm transition-all"
              >
                {editSubmitting ? "Saving..." : "Commit Change"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
