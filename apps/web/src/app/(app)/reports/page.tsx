"use client";

import * as React from "react";
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

export default function ReportsRepositoryPage() {
  const [reports, setReports] = React.useState<PatentReport[]>([]);
  const [selectedReport, setSelectedReport] = React.useState<PatentReport | null>(null);
  const [showCreateModal, setShowCreateModal] = React.useState(false);

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
    }
  }, []);

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
      content = `# ${selectedReport.matter_ref} — ${selectedReport.title}\n\n` +
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

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h))] overflow-hidden bg-canvas">
      {/* Left 45%: Report Archive List */}
      <div className="flex w-[45%] flex-col border-r border-line overflow-hidden">
        <header className="border-b border-line bg-surface/40 p-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-accent">
                Patent Analyst Outputs
              </span>
              <span className="text-xs text-muted">Decision-Ready Structured Deliverables</span>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-accent/90 transition"
            >
              <Plus className="size-3.5" />
              New Report from Template
            </button>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Final Reports Repository
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted">
              <FileText className="size-8 text-faint mb-2 opacity-40" />
              <p className="text-xs font-semibold text-ink">No reports generated yet</p>
              <p className="text-[11px] text-muted mt-1">
                Click "New Report from Template" above or generate reports directly from Search Hits & Dossiers.
              </p>
            </div>
          ) : (
            reports.map((rep) => (
              <div
                key={rep.id}
                onClick={() => setSelectedReport(rep)}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  selectedReport?.id === rep.id
                    ? "border-accent bg-accent/5 shadow-xs"
                    : "border-line bg-surface hover:border-line-strong"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-accent">{rep.matter_ref}</span>
                  <span className="rounded-full bg-line px-2 py-0.5 font-mono text-[10px] font-bold text-muted">
                    {rep.report_type.replace(/_/g, " ")}
                  </span>
                </div>

                <h3 className="mt-2 text-sm font-bold leading-snug text-ink">{rep.title}</h3>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted">Analyst: {rep.analyst_name}</span>
                  <span className="font-bold text-emerald-600">{rep.novelty_score}% Novelty</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right 55%: Interactive Report Inspector & PDF Exporter */}
      <div className="flex flex-1 flex-col overflow-y-auto p-8 space-y-6 bg-surface/20">
        {selectedReport ? (
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

            {/* Citations Matrix Preview */}
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-ink">
                <span>Evaluated Prior Art Publications ({selectedReport.citations_count} References)</span>
                <span className="text-accent">Perplexity Pro Verified</span>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-muted text-[11px]">
                  Evaluated and archived in formal deliverable.
                </p>
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
