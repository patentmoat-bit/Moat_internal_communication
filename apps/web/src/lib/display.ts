import type { Tone } from "@moat/ui";
import type { AnalysisRun, InventionStatus } from "./types";

export const statusMeta: Record<
  InventionStatus,
  { label: string; tone: Tone; description: string }
> = {
  draft: {
    label: "Draft",
    tone: "neutral",
    description: "Only contributors can see this disclosure.",
  },
  submitted: {
    label: "Submitted",
    tone: "accent",
    description: "Waiting to be picked up by counsel.",
  },
  in_review: {
    label: "In review",
    tone: "accent",
    description: "A named reviewer is assessing this revision.",
  },
  approved: {
    label: "Approved",
    tone: "positive",
    description: "Approved for drafting at the reviewed revision.",
  },
  returned: {
    label: "Returned",
    tone: "caution",
    description: "Sent back to the inventor with requested changes.",
  },
  filed: {
    label: "Filed",
    tone: "positive",
    description: "An application has been filed from this disclosure.",
  },
};

export const analysisMeta: Record<
  AnalysisRun["status"],
  { label: string; tone: Tone }
> = {
  queued: { label: "Queued", tone: "neutral" },
  running: { label: "Running", tone: "accent" },
  complete: { label: "Evidence available", tone: "accent" },
  failed: { label: "Failed", tone: "critical" },
  insufficient_evidence: { label: "Insufficient evidence", tone: "caution" },
};

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}


export const documentStatusMeta: Record<
  string,
  { label: string; tone: Tone; description: string }
> = {
  drafting: {
    label: "Drafting",
    tone: "neutral",
    description: "Being written. Claims can still change freely.",
  },
  in_review: {
    label: "With counsel",
    tone: "accent",
    description: "A frozen claim set is being reviewed.",
  },
  approved: {
    label: "Approved",
    tone: "positive",
    description: "Cleared for filing at the reviewed claim set.",
  },
  filed: {
    label: "Filed",
    tone: "positive",
    description: "An application has been filed. The text is now immutable.",
  },
  abandoned: {
    label: "Abandoned",
    tone: "caution",
    description: "No longer being pursued.",
  },
};

export const severityMeta: Record<string, { label: string; tone: Tone }> = {
  error: { label: "Error", tone: "critical" },
  warning: { label: "Warning", tone: "caution" },
  info: { label: "Note", tone: "neutral" },
};

export const claimCategoryLabels: Record<string, string> = {
  apparatus: "Apparatus",
  method: "Method",
  system: "System",
  composition: "Composition",
  crm: "Computer-readable medium",
  other: "Other",
};


export const drawingStatusMeta: Record<string, { label: string; tone: Tone }> = {
  requested: { label: "Requested", tone: "neutral" },
  in_progress: { label: "In progress", tone: "accent" },
  submitted: { label: "Awaiting review", tone: "accent" },
  approved: { label: "Approved", tone: "positive" },
  rework: { label: "Rework", tone: "caution" },
};
