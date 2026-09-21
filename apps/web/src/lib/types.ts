/**
 * Client-side mirror of the API contracts.
 *
 * These match the Pydantic schemas in apps/api/src/moat_api/schemas exactly.
 * Once the OpenAPI client generator is wired into CI this file is replaced by
 * generated output; keeping the shapes identical now means that swap is a
 * delete, not a refactor.
 */

export type InventionStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "approved"
  | "returned"
  | "filed";

export type AnalysisStatus =
  | "queued"
  | "running"
  | "complete"
  | "failed"
  | "insufficient_evidence";

export type DecisionOutcome = "approved" | "returned" | "rejected";

export interface PersonRef {
  id: string;
  name: string;
  email: string;
}

export interface TenantRef {
  id: string;
  slug: string;
  name: string;
}

export interface Session {
  user: PersonRef;
  tenant: TenantRef;
  roles: string[];
  permissions: string[];
  availableTenants: TenantRef[];
}

export interface ConceptCoverage {
  id: string;
  label: string;
  /** Passages mentioning this concept. Zero is a place to look, not a finding. */
  matches: number;
}

export interface EvidenceLink {
  id: string;
  publicationId: string;
  title: string;
  applicant: string;
  jurisdiction: string;
  kindCode: string;
  publishedOn: string | null;
  passage: string;
  /** Retrieval rank. Explicitly not a patentability measure. */
  retrievalScore: number;
  matchedConcepts: string[];
}

export interface AnalysisRun {
  id: string;
  inventionRevision: number;
  status: AnalysisStatus;
  startedAt: string;
  completedAt: string | null;
  corpusRevision: string;
  retrievalVersion: string;
  modelVersion: string;
  promptVersion: string;
  failureCategory: string | null;
  concepts: ConceptCoverage[];
  evidence: EvidenceLink[];
}

export interface Decision {
  id: string;
  reviewer: PersonRef;
  revision: number;
  outcome: DecisionOutcome;
  rationale: string;
  decidedAt: string;
  /** True once the disclosure has moved past the revision that was reviewed. */
  superseded: boolean;
}

export interface InventionSummary {
  id: string;
  ref: string;
  title: string;
  summary: string;
  status: InventionStatus;
  revision: number;
  createdAt: string;
  updatedAt: string;
  contributors: PersonRef[];
  classifications: string[];
  evidenceCount: number;
  evidenceRevision: number | null;
}

export interface InventionDetail extends InventionSummary {
  problem: string;
  description: string;
  latestAnalysis: AnalysisRun | null;
  decision: Decision | null;
}

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface Job {
  id: string;
  kind: "analysis" | "extraction" | "indexing" | "export";
  status: JobStatus;
  progress: number;
  detail: string;
  subjectType: string;
  subjectId: string | null;
  failureCategory: string | null;
  attemptCount: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  result: Record<string, unknown>;
}

export interface JobAccepted {
  job: Job;
  statusUrl: string;
  /** False when an identical request was already accepted; the same job is
   *  returned rather than a second one being started. */
  created: boolean;
}

export type DocumentState =
  | "quarantined"
  | "scanning"
  | "extracting"
  | "ready"
  | "rejected";

export interface SourceDocument {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  state: DocumentState;
  rejectionReason: string;
  pageCount: number | null;
  /** Pages with no text layer. Non-zero means OCR is needed to read them. */
  pagesNeedingOcr: number | null;
  createdAt: string;
}

export interface UploadReserved {
  uploadId: string;
  uploadUrl: string;
  method: string;
  expiresAt: string;
  maxBytes: number;
}

export interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string;
  actionUrl: string;
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: string;
  readAt: string | null;
}

/* ------------------------------------------------------------------ drafting */

export type ClaimKind = "independent" | "dependent";
export type ClaimCategory =
  | "apparatus"
  | "method"
  | "system"
  | "composition"
  | "crm"
  | "other";
export type DocumentStatus = "drafting" | "in_review" | "approved" | "filed" | "abandoned";
export type FindingSeverity = "error" | "warning" | "info";

export interface ClaimDraft {
  number: number;
  kind: ClaimKind;
  category: ClaimCategory;
  preamble: string;
  /** "comprising" is open, "consisting of" is closed. The difference decides
   *  whether a competitor adding one element escapes the claim. */
  transition: string;
  body: string;
  /** Claim NUMBERS, which is what a drafter types. Resolved to ids server-side. */
  dependsOn: number[];
}

export interface Claim extends ClaimDraft {
  id: string;
}

export interface Finding {
  code: string;
  severity: FindingSeverity;
  message: string;
  /** The rule behind it. A finding with no authority is one you cannot act on. */
  authority: string;
  claimNumber: number | null;
  excerpt: string;
}

export interface ClaimTreeNode {
  number: number;
  kind: ClaimKind;
  category: ClaimCategory;
  depth: number;
  multipleDependent: boolean;
  dependsOn: number[];
  children: ClaimTreeNode[];
}

export interface ClaimCoverage {
  total: number;
  independent: number;
  dependent: number;
  multipleDependent: number;
  maxDepth: number;
  categories: string[];
}

export interface ClaimSet {
  id: string;
  revision: number;
  status: "draft" | "submitted" | "approved" | "superseded";
  changeNote: string;
  createdAt: string;
  /** Set once submitted. A frozen set is immutable; editing starts a new revision. */
  frozenAt: string | null;
  createdBy: PersonRef | null;
  claims: Claim[];
  tree: ClaimTreeNode[];
  findings: Finding[];
  coverage: ClaimCoverage;
}

export interface DraftSummary {
  id: string;
  ref: string;
  title: string;
  status: DocumentStatus;
  revision: number;
  jurisdiction: string;
  inventionId: string;
  inventionRef: string;
  drafter: PersonRef | null;
  claimCount: number;
  independentCount: number;
  openErrors: number;
  updatedAt: string;
}

export interface DraftDetail extends DraftSummary {
  abstract: string;
  technicalField: string;
  background: string;
  summary: string;
  briefDescriptionOfDrawings: string;
  detailedDescription: string;
  changeNote: string;
  claimSet: ClaimSet | null;
  claimDecision: ClaimSetDecision | null;
}

export interface ClaimSetDecision {
  id: string;
  reviewer: PersonRef;
  claimSetRevision: number;
  outcome: "approved" | "returned";
  rationale: string;
  decidedAt: string;
  /** True once the drafter has amended past the reviewed revision. */
  superseded: boolean;
}

export interface AssistSuggestion {
  field: string;
  value: string;
  /** Why this was produced. Every suggestion restructures the drafter's own
   *  text; the rationale makes that visible. */
  rationale: string;
  replacesExisting: boolean;
}

export interface AssistResponse {
  version: string;
  templateGeneration: boolean;
  modelGeneration: boolean;
  modelNote: string;
  suggestions: AssistSuggestion[];
}

export type ExportFormat = "docx" | "pdf" | "xml";

export interface DraftQueueItem {
  inventionId: string;
  ref: string;
  title: string;
  summary: string;
  approvedAt: string | null;
  reviewer: PersonRef | null;
  contributors: PersonRef[];
}

export interface CheckResult {
  findings: Finding[];
  tree: ClaimTreeNode[];
  coverage: ClaimCoverage;
  checkerVersion: string;
}

/* ------------------------------------------------------------------ drawings */

export type DrawingStatus =
  | "requested"
  | "in_progress"
  | "submitted"
  | "approved"
  | "rework";

export interface DrawingVersion {
  id: string;
  version: number;
  notes: string;
  uploadedBy: PersonRef | null;
  createdAt: string;
  hasFile: boolean;
  contentType: string;
  sizeBytes: number;
}

export interface DrawingReview {
  id: string;
  version: number;
  reviewer: PersonRef;
  outcome: "approved" | "rework";
  notes: string;
  createdAt: string;
}

export interface Drawing {
  id: string;
  documentId: string;
  documentRef: string;
  figureNumber: number;
  /** The line that appears in "Brief description of the drawings". */
  caption: string;
  /** What the drafter needs shown, in their words. */
  brief: string;
  status: DrawingStatus;
  currentVersion: number;
  requestedBy: PersonRef | null;
  assignedTo: PersonRef | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  versions: DrawingVersion[];
  reviews: DrawingReview[];
}

export interface DrawingsSummary {
  text: string;
  approved: number;
  outstanding: number;
}

export interface Colleague {
  id: string;
  name: string;
  email: string;
  roles: string[];
  roleLabels: string[];
}

/** Permission keys, mirroring moat_api.auth.permissions.Permission. */
export const TERMINAL_JOB_STATUSES: JobStatus[] = ["succeeded", "failed", "cancelled"];

export const PERMISSIONS = {
  drawingRequest: "drawing.request",
  drawingUpload: "drawing.upload",
  drawingReview: "drawing.review",
  documentCreate: "document.create",
  documentUpdate: "document.update",
  documentExport: "document.export",
  inventionCreate: "invention.create",
  inventionUpdate: "invention.update",
  inventionSubmit: "invention.submit",
  analysisRun: "analysis.run",
  decisionCreate: "decision.create",
  tenantAdmin: "tenant.admin",
} as const;

export function can(session: Session | null, permission: string): boolean {
  return session?.permissions.includes(permission) ?? false;
}
