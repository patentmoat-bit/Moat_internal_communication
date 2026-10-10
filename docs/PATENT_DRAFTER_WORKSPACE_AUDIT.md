# Patent Drafter Workspace Audit Report

## 1. Existing Architecture Overview

**Frontend:** Next.js (App Router)
**Backend:** FastAPI (`moat_api`), utilizing SQLAlchemy for ORM.
**Database:** PostgreSQL (with `pgvector` for AI search likely, and JSONB for flexible models).
**Authentication & Security:** Row-Level Security via SQLAlchemy `TenantMixin` enforcing tenant isolation.

### Current Implementation Status
The Patent Drafter workspace currently consists of multiple Next.js dashboard routes under `apps/web/src/app/(app)/dashboard/patent-drafter`. The Claims Workspace (Phase 1-6 from previous iterations) was built using a local JSON fallback backend pattern (`api/patent-drafter/... -> data/*.json`) due to the FastAPI backend being currently disconnected in the local environment, but the physical FastAPI architecture is fully defined in `apps/api/src/moat_api/`.

## 2. Frontend Structure & Reusable Components

**Existing Routes Audited:**
- `/documents/` (Missing sub-routes for disclosures, prior-art, drawings, export-files)
- `/review/` (Missing sub-routes for annotations, approvals, feedback-logs)
- `/docket/` (Missing sub-routes for deadlines, reminders, action-items; partially implemented)
- `/reports/` (Missing sub-routes for drafting-metrics, time-tracking, productivity)

**Reusable Components Identified:**
- `Card`, `Button`, `Input`, `Textarea` from `src/components/ui/`
- Layout components and Sidebar navigation structures (`AppSidebar`, `PatentDrafterSidebar`)
- Contextual data fetching patterns (`useEffect` wrapping API endpoints)

## 3. Backend Services & Structure

**Existing Python Models (`moat_api/db/models/`):**
- `documents.py`: Handles `UploadSession`, state definitions (`quarantined`, `scanning`, `ready`).
- `drafting.py`: Defines core `DOCUMENT_STATUSES`, `CLAIM_SET_STATUSES`, handling workflow logic.
- `invention.py`: Defines `INVENTION_STATUSES`, disclosure entities.
- `project.py`: Defines `ProjectAssignment`, managing Drafter assignment queues and statuses (`ASSIGNED`, `DRAFTING`, `SUBMITTED_FOR_REVIEW`, `APPROVED`).
- `review.py`: Defines `Submission` tracking for approvals and feedback.
- `comments.py`: Handles threaded messaging tied to target entities.

**Reusable Backend Services (`moat_api/services/`):**
- `audit.py`: Tracks activity logs.
- `drafting.py`: Core logic for managing drafts.
- `inventions.py`: Manages disclosure data.
- `storage.py`: Handles S3/Private storage abstractions for document security.

## 4. Existing Tables and Relationships

- `Invention` (1:N) `ProjectAssignment` (1:N) `Drafting`
- `Drafting` (1:N) `ClaimSet`
- `Submission` tracks the exact version/revision of a draft in `in_review` status.
- `Comment` is polymorphic, attaching to `target_id` (which can be a draft version, a claim set, or a drawing).
- `UploadSession` tracks binary artifacts (`documents.py`).

## 5. Missing Functionality

Based on the master prompt, the following logic is currently missing or stubbed:
- **Documents:** Disclosures integration, prior-art metadata matching, drawing associations, and secure export pipelines.
- **Review:** Explicit Annotation engine for granular draft feedback, approval state machines.
- **Docket:** Real-time deadline calculation, Reminder entities (missing from audited models), Action Item aggregations.
- **Reports:** Time-tracking models, metric aggregation views.

## 6. Required Migrations

To support the new workspaces natively within the FastAPI backend (or our local JSON mock layer), we require:
- **Time Records:** A new table/schema for `time_tracking` tied to `ProjectAssignment`.
- **Reminders:** A new table/schema for `reminders` tracking user-defined alerts and dismissals.
- **Annotations:** Upgrading the `Comment` model or adding a specialized `Annotation` model to support text-selection highlighting (`target_passage`).

## 7. Security Gaps & Authorization

- **Backend Authorization:** `TenantMixin` guarantees cross-tenant isolation, but we must verify role-based access control (RBAC). For example, a Drafter should not be able to issue an `APPROVED` status on their own `Submission`.
- **Document Security:** Currently, `UploadSession` tracks objects, but we must ensure that download URLs are securely signed and short-lived via `storage.py`.
- **Local JSON Fallback:** If continuing to use the Next.js API `data/*.json` pattern for these phases, we must manually enforce RBAC and project context boundary checks (e.g., verifying `inventionId` matches the Drafter's assignment).

## 8. Recommended Implementation Order

1. **Phase 1 (Architecture):** Define the precise API contracts (JSON or FastAPI) and folder layout for the four new workspaces.
2. **Phase 2 (Documents):** Implement secure viewing of Disclosures and Prior Art. Build the Drawing upload flow.
3. **Phase 3 (Review):** Extend the Claims feedback loop into full document annotations and formal Approval triggers.
4. **Phase 4 (Docket):** Build the Reminders schema and aggregate actionable items.
5. **Phase 5 (Reports):** Build the Time Tracking and Metric aggregations.
6. **Phases 6-10:** Execute migrations, security audits, and E2E testing.
