"use client";

import * as React from "react";
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Sparkles,
  Download,
  Copy,
  Check,
  FileCheck2,
  FileText,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

export type DisclosureStatus =
  | "FULL_DISCLOSURE"
  | "PARTIAL_DISCLOSURE"
  | "NOT_DISCLOSED"
  | "OBVIOUS_COMBINATION";

export interface KeyFeature {
  id: string;
  code: string; // e.g. "1.1", "1.2", "1.3"
  title: string;
  description: string;
}

export interface CellMapping {
  featureId: string;
  publicationId: string;
  status: DisclosureStatus;
  citation_ref: string; // e.g. "Col. 4, lines 12-28; FIG. 2"
  verbatim_quote: string;
  analyst_comment: string;
}

export interface FeatureMatrixData {
  matter_ref: string;
  matter_title: string;
  features: KeyFeature[];
  references: {
    publication_id: string;
    title: string;
    applicant: string;
    jurisdiction: string;
  }[];
  mappings: Record<string, CellMapping>; // key: `${featureId}::${publicationId}`
}

const DEFAULT_FEATURES: KeyFeature[] = [];

export const DISCLOSURE_STATUS_CONFIG: Record<
  DisclosureStatus,
  {
    label: string;
    shortLabel: string;
    color: string;
    border: string;
    bg: string;
    icon: any;
    description: string;
  }
> = {
  FULL_DISCLOSURE: {
    label: "Full Disclosure (102 Anticipates / High Risk)",
    shortLabel: "Full (102)",
    color: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/30",
    bg: "bg-rose-500/10",
    icon: XCircle,
    description: "Element identically and explicitly disclosed in cited reference.",
  },
  PARTIAL_DISCLOSURE: {
    label: "Partial / Analogous Disclosure",
    shortLabel: "Partial",
    color: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    icon: AlertTriangle,
    description: "Element partially taught or analogous art without exact identity.",
  },
  NOT_DISCLOSED: {
    label: "Not Disclosed (Core Novelty Differentiator)",
    shortLabel: "Novel (Clear)",
    color: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    icon: CheckCircle2,
    description: "Element completely absent from reference — constitutes novelty point.",
  },
  OBVIOUS_COMBINATION: {
    label: "103 Obvious Combination (Secondary Art)",
    shortLabel: "103 Combo",
    color: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/10",
    icon: HelpCircle,
    description: "Taught in secondary reference, combinable under 35 U.S.C. § 103.",
  },
};

interface KeyFeaturesMappingProps {
  initialReferences?: {
    publication_id: string;
    title: string;
    applicant: string;
    jurisdiction: string;
  }[];
  matterRef?: string;
  matterTitle?: string;
  onSendToReport?: (matrixData: FeatureMatrixData) => void;
}

export function KeyFeaturesMapping({
  initialReferences = [],
  matterRef = "",
  matterTitle = "",
  onSendToReport,
}: KeyFeaturesMappingProps) {
  const [features, setFeatures] = React.useState<KeyFeature[]>(DEFAULT_FEATURES);
  const [references, setReferences] = React.useState(initialReferences);
  const [mappings, setMappings] = React.useState<Record<string, CellMapping>>({});
  const [editingCellKey, setEditingCellKey] = React.useState<string | null>(null);
  const [newFeatureText, setNewFeatureText] = React.useState<string>("");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (initialReferences && initialReferences.length > 0) {
      setReferences(initialReferences);
    }
  }, [initialReferences]);

  const updateCellStatus = (
    featureId: string,
    publicationId: string,
    status: DisclosureStatus
  ) => {
    const key = `${featureId}::${publicationId}`;
    setMappings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        featureId,
        publicationId,
        status,
        citation_ref: prev[key]?.citation_ref || "Updated by analyst",
        verbatim_quote: prev[key]?.verbatim_quote || "Analyst claim evaluation.",
        analyst_comment: prev[key]?.analyst_comment || "",
      },
    }));
  };

  const updateCellCitation = (
    featureId: string,
    publicationId: string,
    citation_ref: string,
    verbatim_quote: string
  ) => {
    const key = `${featureId}::${publicationId}`;
    setMappings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        featureId,
        publicationId,
        citation_ref,
        verbatim_quote,
      },
    }));
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    const newFeat: KeyFeature = {
      id: `feat-${Date.now()}`,
      code: `Element 1.${features.length + 1}`,
      title: newFeatureText.trim(),
      description: newFeatureText.trim(),
    };
    setFeatures([...features, newFeat]);
    setNewFeatureText("");
  };

  const handleDeleteFeature = (id: string) => {
    setFeatures(features.filter((f) => f.id !== id));
  };

  const calculateNoveltyScore = () => {
    let fullyAnticipatedCount = 0;
    features.forEach((feat) => {
      const isAnticipatedByAny = references.some((ref) => {
        const key = `${feat.id}::${ref.publication_id}`;
        return mappings[key]?.status === "FULL_DISCLOSURE";
      });
      if (isAnticipatedByAny) fullyAnticipatedCount++;
    });
    const noveltyPct = Math.round(
      ((features.length - fullyAnticipatedCount) / Math.max(features.length, 1)) * 100
    );
    return { noveltyPct, fullyAnticipatedCount, totalFeatures: features.length };
  };

  const { noveltyPct, fullyAnticipatedCount, totalFeatures } = calculateNoveltyScore();

  const handleExportCSV = () => {
    let csv = "Element Code,Key Feature / Limitation," + references.map((r) => r.publication_id).join(",") + "\n";
    features.forEach((f) => {
      const row = [
        `"${f.code}"`,
        `"${f.title.replace(/"/g, '""')}"`,
        ...references.map((r) => {
          const m = mappings[`${f.id}::${r.publication_id}`];
          return `"${m?.status || "N/A"}: ${m?.citation_ref || ""}"`;
        }),
      ];
      csv += row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${matterRef}_Key_Features_Mapping_Matrix.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyMarkdownTable = () => {
    let md = `### Key Features & Claim Element Comparison Matrix (${matterRef})\n\n`;
    md += `| Element | Technical Limitation | ` + references.map((r) => `${r.publication_id} (${r.applicant})`).join(" | ") + " |\n";
    md += `|---|---|` + references.map(() => "---").join("|") + "|\n";
    features.forEach((f) => {
      md += `| **${f.code}** | ${f.title} | ` + references.map((r) => {
        const m = mappings[`${f.id}::${r.publication_id}`];
        return `${DISCLOSURE_STATUS_CONFIG[m?.status || "NOT_DISCLOSED"].shortLabel} (${m?.citation_ref || "-"})`;
      }).join(" | ") + " |\n";
    });

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-sm">
      {/* Header & Barometer */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-accent/10 px-2 py-0.5 font-mono text-xs font-bold text-accent">
              {matterRef}
            </span>
            <span className="text-xs text-muted">Element-by-Element Claim Chart & Mapping Matrix</span>
          </div>
          <h2 className="mt-1 text-base font-bold text-ink">{matterTitle}</h2>
        </div>

        {/* Novelty Barometer */}
        <div className="flex items-center gap-4 rounded-xl border border-line bg-canvas p-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-ink">Invention Novelty Strength:</span>
              <span
                className={`font-mono font-bold text-sm ${
                  noveltyPct >= 70
                    ? "text-emerald-500"
                    : noveltyPct >= 40
                    ? "text-amber-500"
                    : "text-rose-500"
                }`}
              >
                {noveltyPct}% Novel
              </span>
            </div>
            <div className="h-2 w-48 overflow-hidden rounded-full bg-line">
              <div
                className={`h-full transition-all duration-500 ${
                  noveltyPct >= 70
                    ? "bg-emerald-500"
                    : noveltyPct >= 40
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
                style={{ width: `${noveltyPct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted">
              {totalFeatures - fullyAnticipatedCount} of {totalFeatures} claim elements unique
            </p>
          </div>

          <div className="flex flex-col gap-1.5 border-l border-line pl-3">
            <button
              onClick={copyMarkdownTable}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-accent transition"
            >
              {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              {copied ? "Copied Markdown" : "Copy Markdown"}
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-accent transition"
            >
              <Download className="size-3" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-canvas/40 p-3 text-xs">
        <span className="font-bold text-muted text-[11px] uppercase tracking-wider mr-2">
          Disclosure Legend:
        </span>
        {(Object.keys(DISCLOSURE_STATUS_CONFIG) as DisclosureStatus[]).map((st) => {
          const cfg = DISCLOSURE_STATUS_CONFIG[st];
          const Icon = cfg.icon;
          return (
            <span
              key={st}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold ${cfg.bg} ${cfg.border} ${cfg.color}`}
            >
              <Icon className="size-3" />
              {cfg.label}
            </span>
          );
        })}
      </div>

      {/* Interactive Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-line bg-canvas">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-line bg-surface/90 text-[11px] font-bold text-muted uppercase tracking-wider">
              <th className="p-3.5 w-64 min-w-[240px]">Key Feature / Claim Element</th>
              {references.map((ref) => (
                <th key={ref.publication_id} className="p-3.5 min-w-[220px]">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-accent font-bold text-xs">{ref.publication_id}</span>
                    <span className="rounded bg-line px-1.5 py-0.2 font-mono text-[9px] text-muted">
                      {ref.jurisdiction}
                    </span>
                  </div>
                  <div className="mt-0.5 font-normal text-muted truncate text-[10.5px]">
                    {ref.applicant}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {features.length === 0 ? (
              <tr>
                <td colSpan={Math.max(references.length + 1, 2)} className="p-8 text-center text-muted">
                  <Layers className="size-8 text-muted/40 mx-auto mb-2" />
                  <p className="font-semibold text-ink text-xs">No claim elements or key features defined yet</p>
                  <p className="text-[11px] text-muted mt-1">
                    Add invention claim elements using the input below to map them against prior art references.
                  </p>
                </td>
              </tr>
            ) : (
              features.map((feat) => (
              <tr key={feat.id} className="hover:bg-surface/50 transition">
                {/* Feature Description Column */}
                <td className="p-3.5 align-top space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-line px-2 py-0.5 font-mono text-[10.5px] font-bold text-accent">
                      {feat.code}
                    </span>
                    <button
                      onClick={() => handleDeleteFeature(feat.id)}
                      className="text-muted hover:text-rose-500 p-1 transition"
                      title="Remove feature"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                  <h4 className="font-bold text-ink text-xs leading-snug">{feat.title}</h4>
                  <p className="text-[11px] text-muted leading-relaxed">{feat.description}</p>
                </td>

                {/* Matrix Reference Intersection Cells */}
                {references.map((ref) => {
                  const cellKey = `${feat.id}::${ref.publication_id}`;
                  const mapping = mappings[cellKey] || {
                    featureId: feat.id,
                    publicationId: ref.publication_id,
                    status: "NOT_DISCLOSED",
                    citation_ref: "Not evaluated",
                    verbatim_quote: "No quote snippet",
                    analyst_comment: "",
                  };

                  const cfg = DISCLOSURE_STATUS_CONFIG[mapping.status];
                  const Icon = cfg.icon;
                  const isEditing = editingCellKey === cellKey;

                  return (
                    <td key={ref.publication_id} className="p-3 align-top border-l border-line">
                      <div className="space-y-2">
                        {/* Status selector */}
                        <div className="flex items-center gap-1">
                          <select
                            value={mapping.status}
                            onChange={(e) =>
                              updateCellStatus(
                                feat.id,
                                ref.publication_id,
                                e.target.value as DisclosureStatus
                              )
                            }
                            className={`w-full rounded-lg border p-1.5 font-bold text-[11px] focus:outline-none ${cfg.bg} ${cfg.border} ${cfg.color}`}
                          >
                            {(Object.keys(DISCLOSURE_STATUS_CONFIG) as DisclosureStatus[]).map((st) => (
                              <option key={st} value={st}>
                                {DISCLOSURE_STATUS_CONFIG[st].shortLabel}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Citation & Quote Box */}
                        {isEditing ? (
                          <div className="space-y-2 rounded-lg border border-accent/40 bg-surface p-2.5 shadow-xs">
                            <input
                              type="text"
                              value={mapping.citation_ref}
                              onChange={(e) =>
                                updateCellCitation(
                                  feat.id,
                                  ref.publication_id,
                                  e.target.value,
                                  mapping.verbatim_quote
                                )
                              }
                              placeholder="Citation (e.g. Col. 3, lines 10-25; FIG. 2)"
                              className="w-full rounded border border-line bg-canvas p-1.5 text-[11px] text-ink focus:outline-none"
                            />
                            <textarea
                              rows={2}
                              value={mapping.verbatim_quote}
                              onChange={(e) =>
                                updateCellCitation(
                                  feat.id,
                                  ref.publication_id,
                                  mapping.citation_ref,
                                  e.target.value
                                )
                              }
                              placeholder="Verbatim claim or specification excerpt..."
                              className="w-full rounded border border-line bg-canvas p-1.5 text-[10.5px] text-muted focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setEditingCellKey(null)}
                              className="w-full rounded bg-accent py-1 text-[10.5px] font-bold text-white"
                            >
                              Done Editing
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingCellKey(cellKey)}
                            className="group cursor-pointer rounded-lg border border-line/70 bg-surface/80 p-2 text-[10.5px] hover:border-line-strong hover:bg-surface transition space-y-1"
                          >
                            <div className="flex items-center justify-between text-muted">
                              <span className="font-semibold text-accent truncate">
                                📍 {mapping.citation_ref || "Add citation reference..."}
                              </span>
                              <Edit2 className="size-2.5 opacity-0 group-hover:opacity-100 transition text-muted" />
                            </div>
                            <p className="line-clamp-2 text-muted italic">
                              "{mapping.verbatim_quote || "Click to add claim snippet..."}"
                            </p>
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add New Key Feature Input & Send to Report Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-xl">
          <input
            type="text"
            value={newFeatureText}
            onChange={(e) => setNewFeatureText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddFeature()}
            placeholder="Add new Key Feature / Claim Limitation (e.g. Asymmetric root signature verification)..."
            className="flex-1 rounded-xl border border-line bg-canvas px-3.5 py-2 text-xs text-ink placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="button"
            onClick={handleAddFeature}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold text-ink hover:border-accent hover:text-accent transition shrink-0"
          >
            <Plus className="size-4" /> Add Feature
          </button>
        </div>

        {onSendToReport && (
          <button
            type="button"
            onClick={() =>
              onSendToReport({
                matter_ref: matterRef,
                matter_title: matterTitle,
                features,
                references,
                mappings,
              })
            }
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-accent/90 transition shrink-0"
          >
            <FileCheck2 className="size-4" />
            Generate Report from Feature Matrix
          </button>
        )}
      </div>
    </div>
  );
}
