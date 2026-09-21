"use client";

import * as React from "react";
import {
  FileCheck2,
  FileText,
  Download,
  Printer,
  X,
  Sparkles,
  Check,
  Scale,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Calendar,
  UserCheck,
  Building,
  ArrowRight,
  Eye,
  FileDown,
} from "lucide-react";
import { type FeatureMatrixData, DISCLOSURE_STATUS_CONFIG } from "./key-features-mapping";

export type ReportTemplateType =
  | "PRIOR_ART_SEARCH"
  | "FTO_CLEARANCE"
  | "PATENTABILITY_PFS"
  | "INVALIDITY_STUDY";

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTemplate?: ReportTemplateType;
  matterRef?: string;
  matterTitle?: string;
  client?: string;
  references?: {
    publication_id: string;
    title: string;
    applicant: string;
    jurisdiction: string;
    score?: number;
    abstract?: string;
  }[];
  featureMatrix?: FeatureMatrixData;
  onReportSaved?: (report: any) => void;
}

const TEMPLATE_CONFIG: Record<
  ReportTemplateType,
  {
    id: ReportTemplateType;
    title: string;
    subtitle: string;
    badge: string;
    icon: any;
    description: string;
  }
> = {
  PRIOR_ART_SEARCH: {
    id: "PRIOR_ART_SEARCH",
    title: "USPTO / PCT Prior Art Search Report",
    subtitle: "Standard International Search Authority (ISA) & Form-Style Deliverable",
    badge: "Official Search Form",
    icon: FileText,
    description:
      "Includes search strategy strings, classification sweeps, cited document categorization (X, Y, A), and novelty opinion.",
  },
  FTO_CLEARANCE: {
    id: "FTO_CLEARANCE",
    title: "Freedom to Operate (FTO) Clearance Opinion",
    subtitle: "Commercial Risk & Patent Infringement Assessment",
    badge: "Clearance Opinion",
    icon: Scale,
    description:
      "Evaluates product launch features against active competitor patent boundaries with design-around recommendations.",
  },
  PATENTABILITY_PFS: {
    id: "PATENTABILITY_PFS",
    title: "Patentability & Novelty Assessment (PFS)",
    subtitle: "Pre-Filing Specification & 35 U.S.C. 102/103 Study",
    badge: "Patentability Study",
    icon: ShieldCheck,
    description:
      "Comprehensive evaluation of technical features against state of the art with element-by-element claim chart.",
  },
  INVALIDITY_STUDY: {
    id: "INVALIDITY_STUDY",
    title: "Competitor Patent Invalidity Study",
    subtitle: "Defense & Litigation Vulnerability Analysis",
    badge: "Invalidity Analysis",
    icon: AlertTriangle,
    description:
      "Analyzes asserted competitor claims, statutory prior art timeline, and KSR motivation to combine combinations.",
  },
};

export function ReportGeneratorModal({
  isOpen,
  onClose,
  initialTemplate = "PRIOR_ART_SEARCH",
  matterRef = "",
  matterTitle = "",
  client = "",
  references = [],
  featureMatrix,
  onReportSaved,
}: ReportGeneratorModalProps) {
  const [template, setTemplate] = React.useState<ReportTemplateType>(initialTemplate);
  const [leadAnalyst, setLeadAnalyst] = React.useState<string>("");
  const [reportDate, setReportDate] = React.useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [customMatterRef, setCustomMatterRef] = React.useState<string>(matterRef);
  const [customTitle, setCustomTitle] = React.useState<string>(matterTitle);
  const [customClient, setCustomClient] = React.useState<string>(client);
  const [executiveSummary, setExecutiveSummary] = React.useState<string>("");
  const [verdict, setVerdict] = React.useState<"STRONG_PATENTABILITY" | "MODERATE_PATENTABILITY" | "HIGH_RISK">(
    "STRONG_PATENTABILITY"
  );
  const [savedSuccess, setSavedSuccess] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (matterRef) setCustomMatterRef(matterRef);
    if (matterTitle) setCustomTitle(matterTitle);
    if (client) setCustomClient(client);
  }, [matterRef, matterTitle, client]);

  if (!isOpen) return null;

  const handleSaveToReportsRepository = () => {
    const reportItem = {
      id: `rep-${Date.now().toString().slice(-4)}`,
      matter_ref: customMatterRef || "MATTER-REF",
      title: customTitle || "Patent Intelligence Deliverable",
      client: customClient || "Client Organization",
      report_type: template,
      novelty_score: verdict === "STRONG_PATENTABILITY" ? 92 : verdict === "MODERATE_PATENTABILITY" ? 78 : 45,
      analyst_name: leadAnalyst || "Patent Analyst",
      generated_date: reportDate,
      citations_count: references.length,
      verdict,
      executive_summary: executiveSummary,
      references: references.map((r) => ({
        publication_id: r.publication_id,
        title: r.title,
        applicant: r.applicant,
        jurisdiction: r.jurisdiction,
      })),
      featureMatrix: featureMatrix || null,
    };

    if (typeof window !== "undefined") {
      const existing = localStorage.getItem("moat_saved_reports");
      let reportsList = [];
      if (existing) {
        try {
          reportsList = JSON.parse(existing);
        } catch {
          // ignore
        }
      }
      reportsList.unshift(reportItem);
      localStorage.setItem("moat_saved_reports", JSON.stringify(reportsList));
    }

    setSavedSuccess(true);
    if (onReportSaved) {
      onReportSaved(reportItem);
    }
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleDownloadDocx = () => {
    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>${customMatterRef} - ${TEMPLATE_CONFIG[template].title}</title>
      <style>
        body { font-family: Calibri, sans-serif; font-size: 11pt; line-height: 1.4; }
        h1 { color: #0284c7; font-size: 18pt; }
        h2 { color: #334155; font-size: 14pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
        table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10pt; text-align: left; }
        th { background-color: #f1f5f9; font-weight: bold; }
        .badge { background-color: #e0f2fe; color: #0369a1; padding: 2px 6px; font-weight: bold; }
      </style>
      </head>
      <body>
        <h1>MOAT INTELLIGENCE — ${TEMPLATE_CONFIG[template].title.toUpperCase()}</h1>
        <p><strong>Matter Reference:</strong> ${customMatterRef || "—"} | <strong>Client:</strong> ${customClient || "—"} | <strong>Date:</strong> ${reportDate}</p>
        <p><strong>Lead Analyst:</strong> ${leadAnalyst || "—"}</p>
        <hr/>
        <h2>1. Executive Summary & Statutory Verdict</h2>
        <p>${executiveSummary || "No executive summary provided."}</p>
        <p><strong>Analyst Verdict:</strong> <span class="badge">${verdict}</span></p>
        <h2>2. Key Prior Art Citations (${references.length})</h2>
        <table>
          <tr><th>Publication ID</th><th>Jurisdiction</th><th>Assignee</th><th>Title</th></tr>
          ${references.length > 0
            ? references
                .map(
                  (r) =>
                    `<tr><td><strong>${r.publication_id}</strong></td><td>${r.jurisdiction}</td><td>${r.applicant}</td><td>${r.title}</td></tr>`
                )
                .join("")
            : `<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No citations attached</td></tr>`
          }
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([docHtml], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${customMatterRef || "Report"}_${template}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadMarkdown = () => {
    let md = `# MOAT IP PLATFORM — ${TEMPLATE_CONFIG[template].title.toUpperCase()}\n\n`;
    md += `**Matter Reference:** ${customMatterRef || "N/A"}  \n`;
    md += `**Invention / Target Title:** ${customTitle || "N/A"}  \n`;
    md += `**Client:** ${customClient || "N/A"}  \n`;
    md += `**Lead Patent Analyst:** ${leadAnalyst || "N/A"}  \n`;
    md += `**Date of Report:** ${reportDate}  \n`;
    md += `**Statutory Verdict:** **${verdict}**\n\n`;
    md += `---\n\n`;
    md += `## 1. Executive Summary\n\n${executiveSummary || "No executive summary provided."}\n\n`;
    md += `## 2. Cited Patent References (${references.length})\n\n`;
    if (references.length > 0) {
      md += `| Publication ID | Jurisdiction | Assignee / Applicant | Title |\n`;
      md += `|---|---|---|---|\n`;
      references.forEach((r) => {
        md += `| **${r.publication_id}** | ${r.jurisdiction} | ${r.applicant} | ${r.title} |\n`;
      });
    } else {
      md += `_No patent citations attached to this report._\n`;
    }

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${customMatterRef || "Report"}_${template}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="flex h-[92vh] w-full max-w-6xl flex-col rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-3.5 bg-surface/90">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <FileCheck2 className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">
                Patent Analyst Report Generator & Template Studio
              </h2>
              <p className="text-xs text-muted">
                Build decision-ready prior art deliverables, FTO clearance opinions, and claim charts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadDocx}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent hover:text-accent transition"
            >
              <FileDown className="size-3.5" /> Word (.doc)
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent hover:text-accent transition"
            >
              <Download className="size-3.5" /> Markdown
            </button>
            <button
              onClick={handlePrintPDF}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent hover:text-accent transition"
            >
              <Printer className="size-3.5" /> Print / PDF
            </button>

            <button
              onClick={handleSaveToReportsRepository}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold text-white shadow-sm transition ${
                savedSuccess ? "bg-emerald-600" : "bg-accent hover:bg-accent/90"
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="size-4" />
                  Saved to Reports!
                </>
              ) : (
                <>
                  <FileCheck2 className="size-4" />
                  Save to Repository
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink transition ml-2"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* 2-Column Studio Layout: Left Controls (35%), Right Live Preview (65%) */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Customization Column */}
          <div className="w-[38%] border-r border-line bg-canvas/60 p-5 overflow-y-auto space-y-5 text-xs">
            {/* Template Selector */}
            <div className="space-y-2">
              <label className="font-bold uppercase tracking-wider text-muted text-[11px]">
                Select Formal Report Template
              </label>
              <div className="space-y-2">
                {(Object.keys(TEMPLATE_CONFIG) as ReportTemplateType[]).map((tKey) => {
                  const tMeta = TEMPLATE_CONFIG[tKey];
                  const Icon = tMeta.icon;
                  const isSelected = template === tKey;
                  return (
                    <div
                      key={tKey}
                      onClick={() => setTemplate(tKey)}
                      className={`cursor-pointer rounded-xl border p-3 transition flex items-start gap-3 ${
                        isSelected
                          ? "border-accent bg-accent/10 shadow-xs ring-1 ring-accent"
                          : "border-line bg-surface hover:border-line-strong hover:bg-surface/80"
                      }`}
                    >
                      <Icon className={`size-4 mt-0.5 ${isSelected ? "text-accent" : "text-muted"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-ink text-xs">{tMeta.title}</h4>
                          <span className="rounded bg-accent/15 px-1.5 py-0.2 font-mono text-[9.5px] font-bold text-accent">
                            {tMeta.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted leading-relaxed mt-0.5">
                          {tMeta.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Matter & Header Metadata */}
            <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
              <h4 className="font-bold text-muted uppercase tracking-wider text-[11px]">
                Report Deliverable Metadata
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10.5px] font-semibold text-muted">Matter Ref #</label>
                  <input
                    type="text"
                    value={customMatterRef}
                    onChange={(e) => setCustomMatterRef(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-semibold text-muted">Report Date</label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10.5px] font-semibold text-muted">Client / Organization</label>
                <input
                  type="text"
                  value={customClient}
                  onChange={(e) => setCustomClient(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="text-[10.5px] font-semibold text-muted">Subject / Invention Title</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="text-[10.5px] font-semibold text-muted">Lead Patent Analyst / Counsel</label>
                <input
                  type="text"
                  value={leadAnalyst}
                  onChange={(e) => setLeadAnalyst(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            {/* Statutory Verdict & Executive Summary */}
            <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
              <h4 className="font-bold text-muted uppercase tracking-wider text-[11px]">
                Analyst Preliminary Verdict
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "STRONG_PATENTABILITY", label: "Strong / Clear", color: "text-emerald-600 border-emerald-500/40 bg-emerald-500/10" },
                  { id: "MODERATE_PATENTABILITY", label: "Moderate Risk", color: "text-amber-600 border-amber-500/40 bg-amber-500/10" },
                  { id: "HIGH_RISK", label: "High Risk / 102", color: "text-rose-600 border-rose-500/40 bg-rose-500/10" },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVerdict(v.id as any)}
                    className={`rounded-lg border p-2 text-center text-[10.5px] font-bold transition ${
                      verdict === v.id ? `${v.color} ring-1 ring-accent` : "border-line text-muted bg-canvas"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[10.5px] font-semibold text-muted">Executive Summary & Findings</label>
                <textarea
                  rows={4}
                  value={executiveSummary}
                  onChange={(e) => setExecutiveSummary(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas p-2.5 text-xs text-ink placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Right Live WYSIWYG Document Preview */}
          <div className="flex-1 bg-surface overflow-y-auto p-8 font-sans print:p-0">
            <div className="max-w-3xl mx-auto space-y-6 text-ink">
              {/* Document Letterhead */}
              <div className="flex items-start justify-between border-b-2 border-accent pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black tracking-wider text-accent">
                      MOAT IP INTELLIGENCE PLATFORM
                    </span>
                    <span className="rounded bg-accent/15 px-2 py-0.5 font-mono text-[10px] font-bold text-accent">
                      CONFIDENTIAL / ATTORNEY WORK PRODUCT
                    </span>
                  </div>
                  <h1 className="mt-2 text-xl font-black text-ink tracking-tight">
                    {TEMPLATE_CONFIG[template].title}
                  </h1>
                  <p className="text-xs text-muted font-medium mt-0.5">
                    {TEMPLATE_CONFIG[template].subtitle}
                  </p>
                </div>

                <div className="text-right font-mono text-xs space-y-1">
                  <div className="font-bold text-accent">{customMatterRef}</div>
                  <div className="text-muted">{reportDate}</div>
                </div>
              </div>

              {/* Metadata Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-line bg-canvas p-3.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Client</span>
                  <span className="font-semibold text-ink">{customClient}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Subject Matter</span>
                  <span className="font-semibold text-ink truncate block">{customTitle}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Lead Analyst</span>
                  <span className="font-semibold text-ink truncate block">{leadAnalyst}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Verdict</span>
                  <span
                    className={`font-mono font-bold text-xs ${
                      verdict === "STRONG_PATENTABILITY"
                        ? "text-emerald-500"
                        : verdict === "MODERATE_PATENTABILITY"
                        ? "text-amber-500"
                        : "text-rose-500"
                    }`}
                  >
                    {verdict}
                  </span>
                </div>
              </div>

              {/* Section 1: Executive Summary */}
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-accent border-b border-line pb-1">
                  1. Executive Summary & Legal Opinion
                </h3>
                <p className="text-xs leading-relaxed text-ink/90 whitespace-pre-wrap">
                  {executiveSummary}
                </p>
              </section>

              {/* Section 2: Cited References */}
              <section className="space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-accent">
                    2. Table of Evaluated Patent Citations ({references.length})
                  </h3>
                  <span className="font-mono text-[10.5px] text-muted">
                    WIPO ST.3 Global Register Alignment
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-line bg-canvas">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-line bg-surface text-[10.5px] font-bold text-muted uppercase">
                        <th className="p-2.5">Pub ID</th>
                        <th className="p-2.5">Country</th>
                        <th className="p-2.5">Applicant / Assignee</th>
                        <th className="p-2.5">Relevance / Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {references.length > 0 ? (
                        references.map((ref, idx) => (
                          <tr key={ref.publication_id} className="hover:bg-surface/60">
                            <td className="p-2.5 font-mono font-bold text-accent">
                              {ref.publication_id}
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-muted">{ref.jurisdiction}</td>
                            <td className="p-2.5 font-semibold text-ink">{ref.applicant}</td>
                            <td className="p-2.5">
                              <span className="rounded bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-bold text-accent">
                                {idx === 0 ? "Category X (102 Primary)" : idx === 1 ? "Category Y (103 Combo)" : "Category A (State of Art)"}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-muted">
                            No evaluated patent citations attached to this report.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Section 3: Key Features & Claim Matrix (if available) */}
              {featureMatrix && (
                <section className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-accent border-b border-line pb-1">
                    3. Element-by-Element Claim Chart & Disclosure Matrix
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-line bg-canvas">
                    <table className="w-full border-collapse text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-line bg-surface text-[10px] font-bold text-muted uppercase">
                          <th className="p-2 w-48">Key Claim Element</th>
                          {featureMatrix.references.map((r) => (
                            <th key={r.publication_id} className="p-2 font-mono text-accent">
                              {r.publication_id}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {featureMatrix.features.map((f) => (
                          <tr key={f.id}>
                            <td className="p-2 font-semibold text-ink align-top">
                              <span className="font-mono text-accent">{f.code}:</span> {f.title}
                            </td>
                            {featureMatrix.references.map((r) => {
                              const m = featureMatrix.mappings[`${f.id}::${r.publication_id}`];
                              const statusCfg = DISCLOSURE_STATUS_CONFIG[m?.status || "NOT_DISCLOSED"];
                              return (
                                <td key={r.publication_id} className="p-2 align-top border-l border-line">
                                  <span className={`font-bold font-mono text-[10px] ${statusCfg.color}`}>
                                    {statusCfg.shortLabel}
                                  </span>
                                  <div className="text-[10px] text-muted italic mt-0.5 line-clamp-2">
                                    {m?.citation_ref || "-"}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Section 4: Search Strategy & Classifications */}
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-accent border-b border-line pb-1">
                  4. Search Strategy & Classification Sweeps
                </h3>
                <div className="rounded-xl border border-line bg-canvas p-3 space-y-2 text-xs font-mono text-muted">
                  <p>
                    <strong className="text-ink">Databases Queried:</strong> USPTO Global Dossier, EPO Espacenet, WIPO PATENTSCOPE, JPO J-PlatPat, CNIPA.
                  </p>
                  <p>
                    <strong className="text-ink">CPC Classifications:</strong> G06F21/62 (Security mechanisms), H04L9/32 (Secret communication & authentication), G06F16/27 (Database replication).
                  </p>
                  <p>
                    <strong className="text-ink">Boolean Strategy:</strong> (cryptographic OR "zero-knowledge" OR encryption) AND (outbox OR "CDC event log") AND CPC:(G06F21/62 OR H04L9/32)
                  </p>
                </div>
              </section>

              {/* Sign-Off Footer */}
              <div className="border-t border-line pt-4 flex items-center justify-between text-xs text-muted">
                <div>
                  <p className="font-semibold text-ink">{leadAnalyst}</p>
                  <p className="text-[11px]">Patent Intelligence & Analytics Practice Group</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px]">MOAT DOC ID: {customMatterRef}-REP-{reportDate}</p>
                  <p className="text-[10px]">Generated via MOAT Autonomous IP Platform</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
