// ─────────────────────────────────────────────────────────────────────────────
// MOAT Patent Intelligence Platform — Workflow State Machine
// Centralized workflow status definitions and valid transitions.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All workflow statuses a project can move through.
 * Order matters — it defines the lifecycle progression.
 */
export const WORKFLOW_STATUSES = [
  "New",
  "Assigned",
  "Research",
  "Drafting",
  "Design Review",
  "Patent Analyst Review",
  "CEO Review",
  "Revision",
  "Approved",
  "Filing",
  "Filed",
  "Renewal",
  "Completed",
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

/**
 * Defines which statuses can transition to which other statuses.
 * This enforces the state machine — no random jumps allowed.
 */
export const VALID_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  "New":                    ["Assigned"],
  "Assigned":               ["Research"],
  "Research":               ["Drafting"],
  "Drafting":               ["Design Review", "Patent Analyst Review"],
  "Design Review":          ["Patent Analyst Review"],
  "Patent Analyst Review":  ["CEO Review"],
  "CEO Review":             ["Approved", "Revision"],
  "Revision":               ["Drafting", "CEO Review"],
  "Approved":               ["Filing"],
  "Filing":                 ["Filed"],
  "Filed":                  ["Renewal", "Completed"],
  "Renewal":                ["Completed"],
  "Completed":              [],
};

/**
 * Check whether a transition from one status to another is valid.
 */
export function canTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Maps an event type to the resulting workflow status.
 * Returns null if the event doesn't trigger a status change.
 */
export function getNextStatus(eventType: string): WorkflowStatus | null {
  const EVENT_TO_STATUS: Record<string, WorkflowStatus> = {
    PROJECT_CREATED:         "New",
    PROJECT_ASSIGNED:        "Assigned",
    RESEARCH_STARTED:        "Research",
    RESEARCH_COMPLETED:      "Drafting",
    DRAFT_STARTED:           "Drafting",
    DOCUMENT_UPLOADED:       "Patent Analyst Review",
    DESIGN_REQUESTED:        "Design Review",
    DESIGN_STARTED:          "Design Review",
    DESIGN_COMPLETED:        "Patent Analyst Review",
    PATENT_ANALYST_REVIEW:   "CEO Review",
    REPORT_SUBMITTED:        "CEO Review",
    CEO_REVIEW_STARTED:      "CEO Review",
    CEO_APPROVED:            "Approved",
    CEO_REJECTED:            "Revision",
    REVISION_REQUIRED:       "Revision",
    REVISION_COMPLETED:      "CEO Review",
    FILING_STARTED:          "Filing",
    FILED:                   "Filed",
    RENEWAL_REMINDER:        "Renewal",
    RENEWAL_COMPLETED:       "Completed",
    PROJECT_COMPLETED:       "Completed",
  };
  return EVENT_TO_STATUS[eventType] ?? null;
}

/**
 * Status display metadata — color, icon name, and label for UI rendering.
 */
export interface StatusMeta {
  label: string;
  color: string;        // Tailwind-friendly color key
  bgClass: string;      // Background class
  textClass: string;    // Text color class
  borderClass: string;  // Border class
  icon: string;         // Lucide icon name
}

export const STATUS_META: Record<WorkflowStatus, StatusMeta> = {
  "New":                    { label: "New",                    color: "slate",   bgClass: "bg-slate-500/10",   textClass: "text-slate-500",   borderClass: "border-slate-500/30",   icon: "Plus" },
  "Assigned":               { label: "Assigned",               color: "blue",    bgClass: "bg-blue-500/10",    textClass: "text-blue-500",    borderClass: "border-blue-500/30",    icon: "UserCheck" },
  "Research":               { label: "Research",               color: "indigo",  bgClass: "bg-indigo-500/10",  textClass: "text-indigo-500",  borderClass: "border-indigo-500/30",  icon: "Search" },
  "Drafting":               { label: "Drafting",               color: "violet",  bgClass: "bg-violet-500/10",  textClass: "text-violet-500",  borderClass: "border-violet-500/30",  icon: "FileEdit" },
  "Design Review":          { label: "Design Review",          color: "purple",  bgClass: "bg-purple-500/10",  textClass: "text-purple-500",  borderClass: "border-purple-500/30",  icon: "Palette" },
  "Patent Analyst Review":  { label: "Patent Analyst Review",  color: "amber",   bgClass: "bg-amber-500/10",   textClass: "text-amber-500",   borderClass: "border-amber-500/30",   icon: "ClipboardCheck" },
  "CEO Review":             { label: "CEO Review",             color: "orange",  bgClass: "bg-orange-500/10",  textClass: "text-orange-500",  borderClass: "border-orange-500/30",  icon: "Crown" },
  "Revision":               { label: "Revision Required",      color: "red",     bgClass: "bg-red-500/10",     textClass: "text-red-500",     borderClass: "border-red-500/30",     icon: "RotateCcw" },
  "Approved":               { label: "Approved",               color: "emerald", bgClass: "bg-emerald-500/10", textClass: "text-emerald-500", borderClass: "border-emerald-500/30", icon: "CheckCircle2" },
  "Filing":                 { label: "Filing",                 color: "teal",    bgClass: "bg-teal-500/10",    textClass: "text-teal-500",    borderClass: "border-teal-500/30",    icon: "Upload" },
  "Filed":                  { label: "Filed",                  color: "cyan",    bgClass: "bg-cyan-500/10",    textClass: "text-cyan-500",    borderClass: "border-cyan-500/30",    icon: "Archive" },
  "Renewal":                { label: "Renewal",                color: "sky",     bgClass: "bg-sky-500/10",     textClass: "text-sky-500",     borderClass: "border-sky-500/30",     icon: "RefreshCw" },
  "Completed":              { label: "Completed",              color: "green",   bgClass: "bg-green-500/10",   textClass: "text-green-500",   borderClass: "border-green-500/30",   icon: "Trophy" },
};

/**
 * Get the index of a status in the lifecycle (0-based).
 * Used to determine which stages are "completed" vs "future".
 */
export function getStatusIndex(status: WorkflowStatus): number {
  return WORKFLOW_STATUSES.indexOf(status);
}

/**
 * Determine all completed statuses for a given current status.
 * A status is "completed" if its index is less than the current status index.
 * Special handling for "Revision" — it doesn't mark CEO Review as completed.
 */
export function getCompletedStatuses(currentStatus: WorkflowStatus, history?: { new_status: string }[]): WorkflowStatus[] {
  if (history && history.length > 0) {
    // Use actual history to determine which statuses were visited
    const visited = new Set<string>();
    for (const entry of history) {
      if (entry.new_status !== currentStatus) {
        visited.add(entry.new_status);
      }
    }
    return Array.from(visited).filter(s => WORKFLOW_STATUSES.includes(s as WorkflowStatus)) as WorkflowStatus[];
  }

  // Fallback: use index-based completion
  const currentIdx = getStatusIndex(currentStatus);
  return WORKFLOW_STATUSES.filter((_, idx) => idx < currentIdx) as WorkflowStatus[];
}
