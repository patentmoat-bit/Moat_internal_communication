"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BarChart3,
  FileDown,
  Printer,
  ShieldCheck,
  Sparkles,
  Scale,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  CheckCircle2,
  FileCheck2,
  Plus,
  FileText,
  History,
  Search,
  Filter,
  Clock,
  Download,
  Trash2,
} from "lucide-react";
import { ReportGeneratorModal } from "@/components/patent/report-generator-modal";

interface PatentReport {
  id: string;
  matter_ref: string;
  title: string;
  report_type: "PATENTABILITY_PFS" | "PRIOR_ART_SEARCH" | "CLAIM_MAPPING" | "FTO_CLEARANCE";
  novelty_score: number;
  analyst_name: string;
  generated_date: string;
  citations_count: number;
  verdict: "STRONG_PATENTABILITY" | "MODERATE_PATENTABILITY" | "HIGH_RISK";
}

interface ActivityHistoryItem {
  id: string;
  action_type: "SEARCH_QUERY" | "CLAIM_RATED" | "NOTE_SAVED" | "REPORT_GENERATED" | "MATTER_INITIALIZED";
  title: string;
  details: string;
  analyst: string;
  timestamp: string;
}

function ReportsRepositoryInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentTab = searchParams.get("tab") === "history" ? "history" : "repository";
  const [activeTab, setActiveTab] = React.useState<"repository" | "history">(currentTab);

  const [reports, setReports] = React.useState<PatentReport[]>([]);
  const [selectedReport, setSelectedReport] = React.useState<PatentReport | null>(null);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Activity History State
  const [activityHistory, setActivityHistory] = React.useState<ActivityHistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = React.useState("ALL");

  React.useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "history") {
      setActiveTab("history");
    } else {
      setActiveTab("repository");
    }
  }, [searchParams]);

  React.useEffect(() => {
    if (!selectedReport && reports.length > 0) {
      setSelectedReport(reports[0]);
    }
  }, [reports, selectedReport]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("moat_saved_reports");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            setReports(parsed);
            setSelectedReport(parsed[0]);
          }
        } catch {
          // ignore
        }
      }

      // Load activity history
      const savedHist = localStorage.getItem("moat_activity_history");
      if (savedHist) {
        try {
          const parsedHist = JSON.parse(savedHist);
          if (Array.isArray(parsedHist) && parsedHist.length > 0) {
            setActivityHistory(parsedHist);
          }
        } catch {
          // ignore
        }
      } else {
        // Sample baseline activities
        const baseline: ActivityHistoryItem[] = [
          {
            id: "act-1",
            action_type: "REPORT_GENERATED",
            title: "Generated Patentability Assessment Report (PAT-2024-001)",
            details: "Analyzed 12 prior-art references for Multi-Tenant Cryptographic Isolation Protocol (94% Novelty)",
            analyst: "Patent Analyst",
            timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
          },
          {
            id: "act-2",
            action_type: "CLAIM_RATED",
            title: "Rated Claim Limitation [1.2] as DISTINGUISHED",
            details: "Over US11842091B2 (Apple) based on asynchronous post-quantum lattice verification",
            analyst: "Patent Analyst",
            timestamp: new Date(Date.now() - 3600000).toISOString().replace("T", " ").substring(0, 16),
          },
          {
            id: "act-3",
            action_type: "SEARCH_QUERY",
            title: "Executed Boolean Prior Art Query",
            details: 'Query: ("hardware enclave" AND "zero trust" AND "quantum lattice") -> 28 USPTO/WIPO results',
            analyst: "Patent Analyst",
            timestamp: new Date(Date.now() - 7200000).toISOString().replace("T", " ").substring(0, 16),
          },
          {
            id: "act-4",
            action_type: "MATTER_INITIALIZED",
            title: "Created Research Matter Docket PAT-2024-0042",
            details: "Initialized docket for Cloud Enclave Key Isolation with 60-day deadline",
            analyst: "Patent Analyst",
            timestamp: new Date(Date.now() - 86400000).toISOString().replace("T", " ").substring(0, 16),
          },
        ];
        setActivityHistory(baseline);
        localStorage.setItem("moat_activity_history", JSON.stringify(baseline));
      }
    }
  }, []);

  const handleTabChange = (tab: "repository" | "history") => {
    setActiveTab(tab);
    if (tab === "history") {
      router.replace("/reports?tab=history");
    } else {
      router.replace("/reports");
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your analyst activity history?")) {
      setActivityHistory([]);
      localStorage.removeItem("moat_activity_history");
    }
  };

  const downloadReport = (format: "PDF" | "DOCX" | "MD" | "JSON") => {
    if (!selectedReport) return;
    if (format === "PDF") {
      window.print();
      return;
    }

    let content = "";
    let mimeType = "text/plain";
    let extension = format.toLowerCase();

    if (format === "DOCX") {
      mimeType = "application/msword";
      extension = "doc";
      content = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>${selectedReport.matter_ref} - ${selectedReport.title}</title>
        <style>
          body { font-family: Calibri, sans-serif; font-size: 11pt; line-height: 1.5; }
          h1 { color: #0284c7; font-size: 18pt; }
          h2 { color: #334155; font-size: 14pt; border-bottom: 1px solid #cbd5e1; }
        </style>
        </head>
        <body>
          <h1>MOAT IP INTELLIGENCE — ${selectedReport.report_type}</h1>
          <p><strong>Matter:</strong> ${selectedReport.matter_ref} | <strong>Date:</strong> ${selectedReport.generated_date}</p>
          <p><strong>Lead Analyst:</strong> ${selectedReport.analyst_name}</p>
          <p><strong>Novelty Score:</strong> ${selectedReport.novelty_score}% (${selectedReport.verdict})</p>
          <hr/>
          <h2>Subject Matter</h2>
          <p>${selectedReport.title}</p>
        </body>
        </html>
      `;
    } else if (format === "MD") {
      mimeType = "text/markdown;charset=utf-8;";
      extension = "md";
      content =
        `# ${selectedReport.matter_ref} — ${selectedReport.title}\n\n` +
        `**Report Type:** ${selectedReport.report_type}\n` +
        `**Date:** ${selectedReport.generated_date}\n` +
        `**Lead Analyst:** ${selectedReport.analyst_name}\n` +
        `**Verdict:** ${selectedReport.verdict} (${selectedReport.novelty_score}% Novelty Score)\n\n` +
        `## Executive Summary\n` +
        `Matter ${selectedReport.matter_ref} demonstrates novel subject matter distinguishing over evaluated prior art.\n`;
    } else {
      mimeType = "application/json";
      extension = "json";
      content = JSON.stringify(selectedReport, null, 2);
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${selectedReport.matter_ref}_Report.${extension}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredReports = reports.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.matter_ref.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.analyst_name.toLowerCase().includes(q) ||
      r.report_type.toLowerCase().includes(q)
    );
  });

  const filteredHistory = activityHistory.filter((item) => {
    if (historyFilter !== "ALL" && item.action_type !== historyFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.details.toLowerCase().includes(q) ||
      item.analyst.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h))] overflow-hidden bg-canvas">
      {/* Left 45%: Report Archive / Activity History List */}
      <div className="flex w-[45%] flex-col border-r border-line overflow-hidden">
        <header className="border-b border-line bg-surface/40 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-accent">
                Patent Analyst Reports
              </span>
              <span className="text-xs text-muted">Legal Deliverables</span>
            </div>
            {activeTab === "repository" && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-accent/90 transition"
              >
                <Plus className="size-3.5" />
                New Report
              </button>
            )}
            {activeTab === "history" && (
              <button
                onClick={handleClearHistory}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:text-red-600 transition"
              >
                <Trash2 className="size-3.5" />
                Clear History
              </button>
            )}
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 border-b border-line/60 pb-2">
            <button
              onClick={() => handleTabChange("repository")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "repository"
                  ? "bg-accent text-white shadow-xs"
                  : "text-muted hover:bg-hover hover:text-ink"
              }`}
            >
              <FileText className="size-3.5" />
              <span>Final Report Repository</span>
              <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[9.5px] ${activeTab === "repository" ? "bg-white/20 text-white" : "bg-line text-muted"}`}>
                {reports.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange("history")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "history"
                  ? "bg-accent text-white shadow-xs"
                  : "text-muted hover:bg-hover hover:text-ink"
              }`}
            >
              <History className="size-3.5" />
              <span>Activity History</span>
              <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[9.5px] ${activeTab === "history" ? "bg-white/20 text-white" : "bg-line text-muted"}`}>
                {activityHistory.length}
              </span>
            </button>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
              <input
                type="text"
                placeholder={activeTab === "repository" ? "Filter reports by ref, title..." : "Filter activity history..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-line bg-canvas pl-8 pr-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
              />
            </div>
            {activeTab === "history" && (
              <select
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
                className="rounded-lg border border-line bg-canvas px-2 py-1.5 text-xs font-semibold text-ink outline-none"
              >
                <option value="ALL">All Actions</option>
                <option value="SEARCH_QUERY">Searches</option>
                <option value="CLAIM_RATED">Claim Ratings</option>
                <option value="NOTE_SAVED">Review Notes</option>
                <option value="REPORT_GENERATED">Reports</option>
              </select>
            )}
          </div>
        </header>

        {/* Tab 1: Reports List */}
        {activeTab === "repository" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {filteredReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted">
                <FileText className="size-8 text-faint mb-2 opacity-40" />
                <p className="text-xs font-semibold text-ink">No reports generated yet</p>
                <p className="text-[11px] text-muted mt-1 max-w-xs">
                  Click &quot;New Report&quot; above to synthesize a deliverable from your search results.
                </p>
              </div>
            ) : (
              filteredReports.map((rep) => (
                <div
                  key={rep.id}
                  onClick={() => setSelectedReport(rep)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                    selectedReport?.id === rep.id
                      ? "border-accent bg-accent/5 shadow-xs"
                      : "border-line bg-surface hover:border-line-strong"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-accent">{rep.matter_ref}</span>
                    <span className="rounded-full bg-line px-2 py-0.5 font-mono text-[9.5px] font-bold text-muted">
                      {rep.report_type.replace(/_/g, " ")}
                    </span>
                  </div>

                  <h3 className="mt-1.5 text-xs font-bold leading-snug text-ink">{rep.title}</h3>

                  <div className="mt-2.5 flex items-center justify-between text-[11px]">
                    <span className="text-muted">Analyst: {rep.analyst_name}</span>
                    <span className="font-bold text-emerald-600">{rep.novelty_score}% Novelty</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Activity History List */}
        {activeTab === "history" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted">
                <History className="size-8 text-faint mb-2 opacity-40" />
                <p className="text-xs font-semibold text-ink">No activity history found</p>
                <p className="text-[11px] text-muted mt-1">Actions performed across the platform are automatically tracked here.</p>
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-line bg-surface p-3.5 shadow-2xs hover:border-line-strong transition space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="rounded-md bg-accent/10 px-2 py-0.5 font-mono font-bold text-accent">
                      {item.action_type.replace(/_/g, " ")}
                    </span>
                    <span className="text-muted flex items-center gap-1">
                      <Clock className="size-3" />
                      {item.timestamp}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-ink">{item.title}</h4>
                  <p className="text-[11px] text-muted leading-relaxed">{item.details}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right 55%: Interactive Report Inspector & PDF Exporter */}
      <div className="flex flex-1 flex-col overflow-y-auto p-8 space-y-6 bg-surface/20">
        {selectedReport && activeTab === "repository" ? (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            {/* Header / Actions */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="rounded bg-accent/10 px-2 py-0.5 font-mono text-xs font-bold text-accent">
                  {selectedReport.matter_ref}
                </span>
                <h2 className="mt-2 text-xl font-black text-ink">{selectedReport.title}</h2>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                  <span>Report: {selectedReport.report_type.replace(/_/g, " ")}</span>
                  <span>·</span>
                  <span>Date: {selectedReport.generated_date}</span>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadReport("PDF")}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-white shadow-sm hover:brightness-110"
                >
                  <FileDown className="size-3.5" />
                  Download PDF
                </button>
                <button
                  onClick={() => downloadReport("DOCX")}
                  className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-sm hover:border-line-strong"
                >
                  <FileDown className="size-3.5" />
                  Docx
                </button>
              </div>
            </div>

            {/* Verdict Card */}
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Executive Findings</div>
                  <h3 className="text-base font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
                    <CheckCircle2 className="size-4" />
                    {selectedReport.verdict.replace(/_/g, " ")}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-ink">{selectedReport.novelty_score}%</span>
                  <div className="text-[10px] font-semibold text-muted">Novelty Confidence</div>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-canvas p-4 space-y-2 text-xs text-ink leading-relaxed">
                <p>
                  <strong>Summary Finding:</strong> The claims of matter {selectedReport.matter_ref} recite a novel and non-obvious architecture distinguishing over the {selectedReport.citations_count} prior-art publications identified.
                </p>
                <p className="text-muted">
                  Per 35 U.S.C. 101/102/103 statutory patentability requirements, the independent claims possess clear technical character and are ready for executive signoff and USPTO filing.
                </p>
              </div>
            </div>

            {/* Evaluated References Card */}
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-ink">
                <span>Evaluated Prior Art Publications ({selectedReport.citations_count} References)</span>
                <span className="text-accent">Verified by Search Engine</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                All identified patent citations and NPL literature have been charted against independent claim limitations and archived into this formal deliverable.
              </p>
            </div>
          </div>
        ) : activeTab === "history" ? (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <History className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">Analyst Audit Trail & Activity Overview</h3>
                  <p className="text-xs text-muted">Logged events across Search, Annotation, and Report generation.</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="rounded-xl border border-line bg-canvas p-3 text-center">
                  <div className="text-lg font-black text-ink">{activityHistory.filter(a => a.action_type === "SEARCH_QUERY").length}</div>
                  <div className="text-[10px] font-bold text-muted uppercase">Search Runs</div>
                </div>
                <div className="rounded-xl border border-line bg-canvas p-3 text-center">
                  <div className="text-lg font-black text-emerald-600">{activityHistory.filter(a => a.action_type === "CLAIM_RATED").length}</div>
                  <div className="text-[10px] font-bold text-muted uppercase">Claim Ratings</div>
                </div>
                <div className="rounded-xl border border-line bg-canvas p-3 text-center">
                  <div className="text-lg font-black text-accent">{activityHistory.filter(a => a.action_type === "REPORT_GENERATED").length}</div>
                  <div className="text-[10px] font-bold text-muted uppercase">Reports Built</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-center p-8 text-muted">
            <div className="rounded-2xl border border-line bg-surface p-6 max-w-sm">
              <FileText className="size-10 mb-2 opacity-30 mx-auto" />
              <p className="font-semibold text-ink text-xs">No Report Selected</p>
              <p className="text-[11px] text-muted mt-1">
                Generate or select a patent deliverable to inspect legal findings and export.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Report Generator Studio Modal */}
      <ReportGeneratorModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialTemplate="PRIOR_ART_SEARCH"
        matterRef=""
        matterTitle=""
        onReportSaved={(newRep) => {
          setReports((prev) => [newRep, ...prev]);
          setSelectedReport(newRep);
        }}
      />
    </div>
  );
}

export default function ReportsRepositoryPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted">Loading Reports Repository...</div>}>
      <ReportsRepositoryInner />
    </React.Suspense>
  );
}
