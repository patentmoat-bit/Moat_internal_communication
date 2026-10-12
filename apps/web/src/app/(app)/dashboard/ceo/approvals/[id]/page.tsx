"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  Eye,
  History,
  Layers,
  Calendar,
  User,
  Building,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  MessageSquare,
  FileCheck2,
  FileCode,
  Tag,
  Paperclip,
  Share2
} from "lucide-react";
import { 
  ApprovalItem, 
  ApprovalStatus, 
  ApprovalDocument, 
  ApprovalDocumentVersion, 
  ApprovalAuditRecord 
} from "@/types/approvals";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CeoApprovalDetailPage({ params }: PageProps) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const approvalId = unwrappedParams.id;

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<ApprovalItem | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<ApprovalDocument | null>(null);
  const [viewingVersionHistory, setViewingVersionHistory] = useState<ApprovalDocument | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  // Decision Modal State
  const [decisionModal, setDecisionModal] = useState<"APPROVE" | "REWORK" | "REJECT" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ceo/approvals/${approvalId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.approval) {
          setItem(json.approval);
          if (json.approval.documents && json.approval.documents.length > 0) {
            setSelectedDoc(json.approval.documents[0]);
            setPreviewContent(json.approval.documents[0].content_preview || null);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load approval details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [approvalId]);

  const handleSelectDoc = (doc: ApprovalDocument) => {
    setSelectedDoc(doc);
    setPreviewContent(doc.content_preview || null);
  };

  const executeDecision = async () => {
    if (!decisionModal || !item) return;

    if (decisionModal === "REWORK" && !actionReason.trim()) {
      setValidationError("A specific reason detailing required revisions is mandatory.");
      return;
    }
    if (decisionModal === "REJECT" && !actionReason.trim()) {
      setValidationError("A formal justification is mandatory to reject this matter.");
      return;
    }

    setSubmitting(true);
    setValidationError(null);

    const action = decisionModal === "APPROVE" ? "APPROVE" : decisionModal === "REWORK" ? "REWORK" : "REJECT";

    try {
      const res = await fetch(`/api/ceo/approvals/${approvalId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: actionReason,
          document_version: selectedDoc?.current_version || "v2.1",
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.approval) {
          setItem(json.approval);
          setDecisionModal(null);
          setActionReason("");
          const msg =
            action === "APPROVE"
              ? "Matter approved for statutory patent filing."
              : action === "REWORK"
              ? "Matter returned for technical rework. Legal drafting team notified."
              : "Matter rejected and formal justification recorded in audit log.";
          setActionSuccess(msg);
          setTimeout(() => setActionSuccess(null), 6000);
        } else {
          setValidationError(json.error || "Failed to commit decision.");
        }
      } else {
        setValidationError("Server error recording decision.");
      }
    } catch (err: any) {
      setValidationError(err?.message || "Network error submitting executive decision.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 flex items-center justify-center text-foreground font-sans">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-accent-line border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading matter approval details...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-foreground font-sans">
        <Link
          href="/dashboard/ceo/approvals"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Approvals Queue
        </Link>
        <div className="p-8 rounded-xl border border-border bg-card text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground ">Approval Item Not Found</h2>
          <p className="text-xs text-muted-foreground mt-1">
            The requested approval matter ID does not exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen pb-32 text-foreground font-sans">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <Link
          href="/dashboard/ceo/approvals"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to CEO Approvals Queue
        </Link>

        <div className="flex items-center gap-2">
          {item.connected_docket_id && (
            <Link
              href={`/dashboard/ceo/docket/${item.connected_docket_id}`}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border text-foreground hover:bg-accent/10 transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-accent-text " />
              Connected IP Docket Item
            </Link>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccess && (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Matter Header Banner */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider bg-accent/10 text-accent-text border border-accent-line">
                {item.type}
              </span>
              <span className={`px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase ${
                item.status === "Approved"
                  ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/40"
                  : item.status === "Rework Required"
                  ? "bg-orange-500/15 text-orange-500 border border-orange-500/40"
                  : item.status === "Rejected"
                  ? "bg-rose-500/15 text-rose-500 border border-rose-500/40"
                  : "bg-amber-500/15 text-amber-500 border border-amber-500/40 animate-pulse"
              }`}>
                {item.status}
              </span>
              <span className="px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase bg-rose-500/15 text-rose-500 border border-rose-500/30">
                {item.priority} Priority
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">Matter Ref: <strong className="text-foreground ">{item.matter_id}</strong></span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              {item.name}
            </h1>
            <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
              {item.summary}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-sunken/20 border border-border text-center min-w-[100px]">
              <div className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Novelty Score</div>
              <div className="text-lg font-black text-emerald-500 mt-0.5">
                {item.novelty_score || 89}%
              </div>
            </div>

            <div className="p-3 rounded-xl bg-sunken/20 border border-border text-center min-w-[100px]">
              <div className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Risk Level</div>
              <div className="text-lg font-black text-foreground mt-0.5">
                {item.risk_level || "Low"}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-sunken/20 border border-border text-center min-w-[110px]">
              <div className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Est. Filing Cost</div>
              <div className="text-lg font-black text-accent-text mt-0.5">
                ${(item.cost_estimate || 14500).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Chain Visual */}
        <div className="pt-4 border-t border-border ">
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">
            Governance Decision Workflow
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {["DRAFT_READY", "CEO_REVIEW", item.status === "Rework Required" ? "REVISION_REQUIRED" : item.status === "Approved" ? "APPROVED" : item.status === "Rejected" ? "REJECTED" : "CEO_DECISION", "STATUTORY_FILING"].map((st, idx) => {
              const isCurrent = 
                (st === "CEO_REVIEW" && item.status === "Pending Approval") ||
                (st === "APPROVED" && item.status === "Approved") ||
                (st === "REVISION_REQUIRED" && item.status === "Rework Required") ||
                (st === "REJECTED" && item.status === "Rejected");
              return (
                <React.Fragment key={st}>
                  <div className={`px-3 py-1 rounded-md font-bold text-[11px] ${
                    isCurrent
                      ? "bg-accent text-on-accent shadow-xs font-black"
                      : "bg-sunken/20 text-muted-foreground border border-border "
                  }`}>
                    {st.replace(/_/g, " ")}
                  </div>
                  {idx < 3 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Detailed Meta Tags */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px] font-semibold">Owner / Lead:</span>
            <span className="font-bold text-foreground ">{item.owner}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px] font-semibold">Assigned Team:</span>
            <span className="font-bold text-foreground ">{item.assigned_team}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px] font-semibold">Submitted Date:</span>
            <span className="font-bold text-foreground ">{item.submitted_date.split("T")[0]} ({item.submitted_by})</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px] font-semibold">Target Deadline:</span>
            <span className="font-bold text-amber-500">{item.deadline}</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Documents & Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Document File Tree & Versions (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent-text " />
                Matter Documents & Deliverables ({item.documents.length})
              </h2>
              <span className="text-[11px] text-muted-foreground">Secure Storage</span>
            </div>

            <div className="space-y-2">
              {item.documents.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-accent/15 border-accent-line text-foreground shadow-xs"
                        : "bg-sunken/20 border-border hover:border-accent-line text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent/20 text-accent-text border border-accent-line">
                            {doc.current_version}
                          </span>
                          <span className="text-[11px] font-semibold text-foreground ">
                            {doc.display_type}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-foreground line-clamp-1">
                          {doc.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Uploaded by {doc.uploaded_by} • {doc.uploaded_at.split("T")[0]}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingVersionHistory(doc);
                          }}
                          title="View Version History"
                          className="p-1.5 rounded-md hover:bg-accent/10 text-muted-foreground hover:text-accent-text transition-colors"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={`/api/ceo/approvals/${item.id}/documents/${doc.id}/download`}
                          onClick={(e) => e.stopPropagation()}
                          title="Secure Download"
                          download
                          className="p-1.5 rounded-md hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit History Timeline */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-500" />
                Immutable Approval Audit Trail ({item.audit_history.length})
              </h2>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">SOX / IP Verified</span>
            </div>

            {item.audit_history.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">
                No previous decisions recorded yet. Initial submission in review.
              </p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {item.audit_history.map((record) => (
                  <div
                    key={record.id}
                    className="p-3 rounded-lg bg-sunken/20 border border-border text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        record.action === "APPROVED"
                          ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                          : record.action === "REWORK_REQUESTED"
                          ? "bg-orange-500/15 text-orange-500 border border-orange-500/30"
                          : "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                      }`}>
                        {record.action}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {record.timestamp.replace("T", " ").substring(0, 19)}
                      </span>
                    </div>

                    <div className="text-[11px] text-foreground ">
                      Decided by: <strong>{record.ceo_user}</strong> • Target Ver: {record.document_version}
                    </div>

                    {record.comment && (
                      <div className="p-2 rounded bg-card border border-border text-[11px] text-foreground italic">
                        "{record.comment}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Secure Document Viewer (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4 min-h-[580px] flex flex-col">
            {/* Viewer Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-black">
                  Active Document Preview
                </div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mt-0.5">
                  <FileText className="w-4 h-4 text-accent-text " />
                  {selectedDoc?.name || "Select a document to inspect"}
                </h3>
              </div>

              {selectedDoc && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-sunken/30 text-[11px] font-bold text-muted-foreground border border-border ">
                    Version: {selectedDoc.current_version}
                  </span>
                  <a
                    href={`/api/ceo/approvals/${item.id}/documents/${selectedDoc.id}/download`}
                    download
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-accent/10 text-xs font-bold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                </div>
              )}
            </div>

            {/* Document Details Strip */}
            {selectedDoc && (
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-sunken/20 border border-border text-[11px]">
                <div>
                  <span className="text-muted-foreground">Type:</span>{" "}
                  <span className="text-foreground font-bold">{selectedDoc.display_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Length:</span>{" "}
                  <span className="text-foreground font-bold">{selectedDoc.word_count || "N/A"} w ({selectedDoc.pages_count || 1} pgs)</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Storage:</span>{" "}
                  <span className="text-emerald-500 font-bold">RBAC Private Enclave</span>
                </div>
              </div>
            )}

            {/* Document Content View */}
            <div className="flex-1 rounded-xl bg-sunken/20 border border-border p-5 font-mono text-xs text-foreground overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
              {previewContent ? (
                previewContent
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Select a document on the left panel to preview content securely.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Executive Decision Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border p-4 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 border border-accent-line text-accent-text ">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground ">CEO Executive Authorization Control</div>
              <div className="text-[11px] text-muted-foreground">
                Current Status: <span className="text-amber-500 font-bold">{item.status}</span> • Matter: {item.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Request Rework Button */}
            <button
              onClick={() => {
                setDecisionModal("REWORK");
                setActionReason("");
                setValidationError(null);
              }}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-lg border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Request Rework
            </button>

            {/* Reject Button */}
            <button
              onClick={() => {
                setDecisionModal("REJECT");
                setActionReason("");
                setValidationError(null);
              }}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject Matter
            </button>

            {/* Approve Button */}
            <button
              onClick={() => {
                setDecisionModal("APPROVE");
                setActionReason("");
                setValidationError(null);
              }}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-on-accent text-xs font-black shadow-lg shadow-[#175a74]/20 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve for Filing
            </button>
          </div>
        </div>
      </div>

      {/* Decision Modal */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface border border-stone-200 p-6 space-y-5 shadow-2xl text-stone-900 ">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                {decisionModal === "APPROVE" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {decisionModal === "REWORK" && <RotateCcw className="w-5 h-5 text-orange-500" />}
                {decisionModal === "REJECT" && <XCircle className="w-5 h-5 text-rose-500" />}
                <span>
                  {decisionModal === "APPROVE" && "Authorize & Approve Matter"}
                  {decisionModal === "REWORK" && "Request Document Revision / Rework"}
                  {decisionModal === "REJECT" && "Formally Reject Matter"}
                </span>
              </h3>
              <button
                onClick={() => setDecisionModal(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-md text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-stone-600 leading-relaxed">
                {decisionModal === "APPROVE" && (
                  <>You are authorizing <strong className="text-stone-900 ">{item.name}</strong> for statutory patent filing. The workflow engine will advance to final filing execution.</>
                )}
                {decisionModal === "REWORK" && (
                  <>Specify required changes, claim adjustments, or technical clarifications. The responsible drafting team will be immediately notified to publish a new version.</>
                )}
                {decisionModal === "REJECT" && (
                  <>Provide the formal business/legal justification for rejection. This action will be recorded in the immutable audit log.</>
                )}
              </p>

              <div>
                <label className="block text-xs font-bold text-stone-900 mb-1">
                  {decisionModal === "APPROVE"
                    ? "CEO Comment (Optional)"
                    : "Reason / Specific Instructions (Mandatory)"}
                </label>
                <textarea
                  rows={4}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={
                    decisionModal === "APPROVE"
                      ? "Add executive comments or commercial instructions..."
                      : decisionModal === "REWORK"
                      ? "Detail exact claim edits, prior art differences, or benchmark clarifications required..."
                      : "State strategic reason for matter rejection..."
                  }
                  className="w-full rounded-xl bg-sunken border border-stone-300 p-3 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-accent-line focus:border-accent-line"
                />
              </div>

              {validationError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
                  {validationError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200 ">
              <button
                onClick={() => setDecisionModal(null)}
                disabled={submitting}
                className="px-4 py-2 rounded-lg border border-stone-300 bg-surface dark:bg-transparent text-stone-700 hover:bg-stone-100 text-xs font-bold transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={executeDecision}
                disabled={submitting}
                className={`px-5 py-2 rounded-lg text-xs font-black shadow-sm transition-all flex items-center gap-2 ${
                  decisionModal === "APPROVE"
                    ? "bg-accent hover:bg-accent-hover text-on-accent"
                    : decisionModal === "REWORK"
                    ? "bg-orange-600 hover:bg-orange-500 text-white"
                    : "bg-rose-600 hover:bg-rose-500 text-white"
                }`}
              >
                {submitting ? "Recording Decision..." : "Confirm & Commit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {viewingVersionHistory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface border border-stone-200 p-6 space-y-4 shadow-2xl text-stone-900 ">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-accent-text " />
                  Document Version History
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">{viewingVersionHistory.name}</p>
              </div>
              <button
                onClick={() => setViewingVersionHistory(null)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-md text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-[350px] overflow-y-auto">
              {viewingVersionHistory.versions.map((ver) => (
                <div
                  key={ver.version}
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    ver.version === viewingVersionHistory.current_version
                      ? "bg-accent/15 border-accent-line text-stone-900 "
                      : "bg-sunken border-stone-200 text-stone-600 "
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-accent-text ">{ver.version}</span>
                    <span className="text-[10px] text-stone-500 dark:text-muted-foreground">{ver.uploaded_at.split("T")[0]}</span>
                  </div>
                  <div className="text-[11px] text-stone-900 ">
                    Uploaded by: <strong className="font-semibold">{ver.uploaded_by}</strong> ({ver.file_size || "1.5 MB"})
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-muted-foreground italic">
                    "{ver.changes_summary}"
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-stone-200 ">
              <button
                onClick={() => setViewingVersionHistory(null)}
                className="px-4 py-2 rounded-lg border border-stone-300 bg-surface dark:bg-transparent text-stone-700 hover:bg-stone-100 text-xs font-bold transition-colors"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
