# MOAT IP INTELLIGENCE PLATFORM
# DESIGN TEAM WORKFLOW AUDIT REPORT (PHASE 0)

**Document Version:** 1.0.0  
**Audit Scope:** Full Platform Architecture (Frontend, Next.js App Router, FastAPI Backend, Database Models, Local Persistence Layer, Security & RBAC, Storage Services)  
**Target Role:** Design Team (`DESIGN_TEAM` / Design & Illustration Lead)  
**Implementation Source of Truth:** MOAT IP Intelligence Platform Repository (`Moat_admin_control`)  
**Audit Execution Date:** Current Session  

---

## 1. EXECUTIVE SUMMARY

This audit provides a factual, code-verified baseline of the MOAT IP Intelligence Platform to guide the end-to-end implementation of the **Design Team Workflow**.

The Design Team role in MOAT is responsible for receiving assigned patent drawings, technical documents, and reference disclosures; understanding the related invention; editing or revising figures and schematics; saving versioned deliverables; submitting work to authorized recipients (Patent Drafter, Patent Analyst, or CEO); receiving review feedback; performing iterative rework; and completing assignments.

### Key Audit Findings
1. **Frontend Architecture:** The application runs on Next.js 15 (App Router, React 19, TypeScript, Tailwind CSS, Lucide Icons, `@moat/ui`). A prototype drawings route exists at `/design`, backed by `drawing-card.tsx` and `drawings-panel.tsx`. However, the sidebar navigation for `DESIGN_TEAM` in `nav.ts` contains only a 4-item stub pointing to `/design`, `/trademarks`, and `/inbox`. None of the required 7 workspace hierarchies (Dashboard, Design Workspace [5 sub-views], Design Materials [4 sub-views], Review & Collaboration [3 sub-views], Docket [3 sub-views], Reports [2 sub-views], Command Inbox, Activity History) currently exist.
2. **Backend Architecture:** A hybrid architecture is in place:
   - **Canonical Backend (FastAPI):** `apps/api/src/moat_api/` contains comprehensive SQLAlchemy models for design figures (`Drawing`, `DrawingVersion`, `DrawingReview` in `db/models/design.py`), S3-backed storage with strict quarantine and magic byte validation (`services/storage.py`), and FastAPI routers (`api/v1/drawings.py`).
   - **Active Full-Stack Next.js Route Handlers:** `apps/web/src/app/api/` hosts active, lightweight persistent route handlers (`/api/patent-drafter/...`, `/api/notifications`, `/api/ceo/...`) backed by JSON files in `apps/web/data/` (`assignments.json`, `documents.json`, `claims.json`, `notifications.json`, `activity.json`). The Next.js dev server proxies unmatched API calls to FastAPI via `next.config.ts` fallback rewrites.
3. **Cross-Role Integration Points:**
   - **Patent Drafter:** Can request drawing figures via `/api/patent-drafter/documents` and dispatch notifications targeted to `DESIGN_TEAM` (e.g., `Drawing Enhancement Request`).
   - **Patent Analyst:** Creates disclosures and project records in `/matters` and `/inventions`.
   - **CEO:** Reviews milestones, filings, and docket decisions in `/dashboard/ceo/approvals` and `/dashboard/ceo/docket`.
4. **Data Integrity & Versioning:** The existing FastAPI design service (`services/design.py`) specifies a strict state machine: `requested` → `in_progress` → `submitted` → `approved` / `rework`. Every uploaded image must be recorded as a new immutable `version`, and review verdicts are attached to exact versions. The frontend must implement this exact semantic lifecycle without silent overwrites or client-side fabrication.

---

## 2. EXISTING FRONTEND STRUCTURE

### 2.1 Navigation & Shell
- **Navigation Definition (`apps/web/src/components/shell/nav.ts`):**
  - Defines `ROLE_NAVIGATIONS.DESIGN_TEAM`, which currently contains only:
    - *Design Suite*: `/design` (Design Workspace), `/design` (Drawing Assets & Sheets), `/trademarks` (Logo & Specimen Review)
    - *Workflow*: `/inbox` (Drawing Requests & Revisions)
  - `landingForRole("DESIGN_TEAM")` redirects to `/design`.
  - **Deficiency:** Missing the full specification sidebar requested in the Master Prompt:
    - DASHBOARD
    - DESIGN WORKSPACE (My Designs, Assigned to Me, In Progress, Under Review, Completed)
    - DESIGN MATERIALS (Drawings, Technical Documents, Reference Files, Export Files)
    - REVIEW & COLLABORATION (Review Requests, Comments, Revision History)
    - DOCKET (Design Deadlines, Reminders, Action Items)
    - REPORTS (Design Metrics, Productivity)
    - COMMAND INBOX
    - ACTIVITY HISTORY
- **Role & Authentication Context (`apps/web/src/components/auth/role-context.tsx`):**
  - Contains `DESIGN_TEAM` role definition in `RoleType`:
    - `id: "DESIGN_TEAM"`
    - `title: "Design & Illustration Lead"`
    - `defaultRoute: "/design"`
    - `description: "FIG 1..N patent drawings, margin compliance, and technical schematics."`
    - `color: "emerald"`
  - `useActiveRole()` provides `currentUser`, `currentRole`, `setRole()`, and `switchUser()`.
  - Supports switching users and roles in-browser with `localStorage` persistence.

### 2.2 Existing Design Pages & Components
- **`apps/web/src/app/(app)/design/page.tsx`:**
  - Prototype page that fetches `/drawings/queue` via `serverApi<Drawing[]>()`.
  - Permission guard checks `session?.permissions.includes("drawing.read")`.
  - Displays grid of `DrawingCard` components.
- **`apps/web/src/components/design/drawing-card.tsx`:**
  - Displays figure number, caption, brief, status (`requested`, `in_progress`, `submitted`, `approved`, `rework`).
  - Displays current version image preview via `/api/v1/drawings/${drawing.id}/versions/${drawing.currentVersion}/file`.
  - Provides actions: "Take this figure" (assign), "Upload new version", and "Review version".
  - Shows version history dropdown with reviewer outcome badges.
- **`apps/web/src/components/design/drawings-panel.tsx`:**
  - Client component for requesting new figures tied to a patent specification document.
  - Submits figure requests (`figureNumber`, `caption`, `brief`) via POST `/drafts/${documentId}/drawings`.

### 2.3 Other Role Dashboards & Pages
- **Patent Drafter Dashboard (`apps/web/src/app/(app)/dashboard/patent-drafter/`):**
  - Full modular hierarchy: `drafts/`, `invention/`, `claims/`, `documents/`, `review/`, `docket/`, `reports/`, `editor/`, `command-inbox/`, `activity/`.
  - Drawing management page (`documents/drawings/page.tsx`) lets Drafters view figures, upload new drawings, and dispatch "Send to Design Team" notifications.
  - Three-panel Draft Editor (`editor/page.tsx`) connects invention context with section-based drafting.
- **CEO Dashboard (`apps/web/src/app/(app)/dashboard/ceo/`):**
  - Executive modules: `approvals/`, `docket/`, `reports/`, `activity/`, `news/`.

---

## 3. EXISTING BACKEND & API STRUCTURE

### 3.1 Next.js App Router API Handlers (`apps/web/src/app/api/`)
The active local persistence layer utilizes Next.js Route Handlers:
- `/api/patent-drafter/assignments`: Manages assignments stored in `apps/web/data/assignments.json`.
- `/api/patent-drafter/documents`: Manages disclosures, prior-art, drawings, and export files stored in `apps/web/data/documents.json`.
- `/api/patent-drafter/claims`: Manages claim sets, versions, and review submissions in `apps/web/data/claims.json`.
- `/api/patent-drafter/docket`: Manages deadlines and reminders in `apps/web/data/docket.json`.
- `/api/patent-drafter/reports`: Logs time tracking and metric records in `apps/web/data/reports.json`.
- `/api/patent-drafter/activity`: Logs system activity events in `apps/web/data/activity.json`.
- `/api/notifications`: Dispatches and filters role-based notifications (`target_role: DESIGN_TEAM | PATENT_DRAFTER | CEO | PATENT_ANALYST`) in `apps/web/data/notifications.json`.

### 3.2 FastAPI Microservices (`apps/api/src/moat_api/`)
- **`api/v1/drawings.py`:**
  - `GET /drawings/queue`: Returns figures in queue for current tenant.
  - `POST /drawings/{id}/assign`: Assigns figure to current principal.
  - `POST /drawings/{id}/versions`: Uploads drawing image/PDF, saves version snapshot, triggers status transition to `submitted`.
  - `POST /drawings/{id}/reviews`: Records review outcome (`approved` or `rework`) with reviewer notes against the exact version.
  - `GET /drawings/{id}/versions/{version}/file`: Streams verified drawing asset from private object storage.
- **`services/design.py`:**
  - Enforces valid status transitions:
    - `("requested", "assign") -> "in_progress"`
    - `("requested", "upload") -> "submitted"`
    - `("in_progress", "upload") -> "submitted"`
    - `("rework", "upload") -> "submitted"`
    - `("submitted", "approve") -> "approved"`
    - `("submitted", "rework") -> "rework"`
    - `("approved", "rework") -> "rework"`
  - Enforces `ALLOWED_DRAWING_TYPES = {"image/png", "image/jpeg", "application/pdf"}`.
  - Sets upload size limit `MAX_DRAWING_BYTES = 20 * 1024 * 1024` (20 MB).

---

## 4. DATABASE SCHEMA & DATA RELATIONSHIPS

### 4.1 FastAPI / PostgreSQL Models (`apps/api/src/moat_api/db/models/`)
- **`Drawing` (`db/models/design.py`):**
  - Primary key: `id` (UUID), `tenant_id` (UUID).
  - Foreign key: `document_id` -> `documents.id`.
  - Fields: `figure_number` (int, unique per document), `caption` (varchar 500), `brief` (text), `status` (varchar 16), `current_version` (int), `requested_by_id` (User), `assigned_to_id` (User), `due_at` (timestamptz).
  - Relationship: 1:N with `DrawingVersion`.
- **`DrawingVersion` (`db/models/design.py`):**
  - Primary key: `id`, `tenant_id`.
  - Foreign key: `drawing_id` -> `drawings.id`, `source_object_id` -> `source_objects.id`.
  - Fields: `version` (int), `notes` (text), `uploaded_by_id` (User).
- **`DrawingReview` (`db/models/design.py`):**
  - Primary key: `id`, `tenant_id`.
  - Foreign key: `drawing_id` -> `drawings.id`, `drawing_version_id` -> `drawing_versions.id`.
  - Fields: `version` (int), `reviewer_id` (User), `outcome` ("approved" | "rework"), `notes` (text).
- **`Invention` & `Project` (`db/models/invention.py`, `project.py`):**
  - Holds primary patent disclosure, technical fields, inventors, and status.
  - Linked to `ProjectAssignment` where team members are assigned roles (`drafter`, `analyst`, `designer`).

### 4.2 Active Local Persistence Schema (`apps/web/data/*.json`)
- **`assignments.json`:**
  - Structure: `[{ id, invention_id, title, assignee, status, due_date, instructions, assigned_by, assigned_at }]`.
  - Missing field: `target_team` ("DESIGN_TEAM" vs "PATENT_DRAFTER"), `source_documents` array, `priority`.
- **`documents.json`:**
  - Structure: `[{ invention_id, disclosures: [], prior_art: [], drawings: [{ id, filename, uploader, size, created_at, version, file_url }], exports: [] }]`.
  - Preserves drawing records and metadata per invention.
- **`notifications.json`:**
  - Structure: `[{ id, title, message, target_role, sender, actionUrl, readAt, createdAt }]`.
  - Successfully routes notifications to `"DESIGN_TEAM"`.
- **`activity.json`:**
  - Structure: `[{ id, actor, action, invention_id, details, timestamp }]`.
  - Centralized audit trail.

---

## 5. REUSABLE COMPONENTS AND SERVICES

The existing codebase contains production-ready components that should be reused directly:
1. **Design System & UI Components (`@moat/ui` and `apps/web/src/components/ui/`):**
   - `Card`, `CardContent`, `CardHeader`, `CardTitle`
   - `Button`, `Badge`, `Input`, `Textarea`, `Dialog`, `DropdownMenu`, `Tabs`, `Table`
   - `Panel`, `PanelHeader`, `PanelBody`, `EmptyState` from `@moat/ui`
2. **Layout Shell:**
   - `PageHeader` (`apps/web/src/components/shell/page-header.tsx`)
   - `AppSidebar` (`apps/web/src/components/shell/app-sidebar.tsx`)
   - `nav.ts` (`apps/web/src/components/shell/nav.ts`)
3. **Role & Identity:**
   - `useActiveRole` hook (`apps/web/src/components/auth/role-context.tsx`) for user information, current role, and role switching.
4. **Drawing Assets & Previews:**
   - `DrawingCard` (`apps/web/src/components/design/drawing-card.tsx`) for image viewing, figure labels, version histories, and rework notes.
5. **Storage & Validation Utilities:**
   - `storage.py` MIME validation and magic-byte verification patterns.
   - Client-side image preview and download helpers.
6. **Notification System:**
   - `POST /api/notifications` and `GET /api/notifications?role=DESIGN_TEAM`.

---

## 6. GAP ANALYSIS & MISSING FUNCTIONALITY

To deliver the Master Prompt requirements, the following components, pages, APIs, and data models must be implemented:

| Requirement Area | Current State | Required Target Implementation |
|---|---|---|
| **Sidebar Navigation** | 4-item stub in `nav.ts` | Complete 7-group hierarchy under `ROLE_NAVIGATIONS.DESIGN_TEAM` matching the exact Master Prompt spec. |
| **Design Team Dashboard** | None (`/design` is a basic queue) | `/dashboard/design-team` featuring quick stats (assigned, in-progress, under review, rework, completed), active tasks, deadlines, and notifications. |
| **Design Workspace** | None | 5 dedicated sub-routes:<br>• `my-designs`: Library of authenticated designer's assets<br>• `assigned`: Queue of newly received tasks<br>• `in-progress`: Active working tasks with editor/reviser<br>• `under-review`: Tasks submitted to reviewers<br>• `completed`: Final accepted designs |
| **Design Materials** | None | 4 dedicated sub-routes:<br>• `drawings`: Figures (FIG 1..N) with labels & specs<br>• `technical-docs`: Specifications and architecture docs<br>• `reference-files`: Research & disclosure references<br>• `export-files`: Deliverable bundles & downloads |
| **Review & Collaboration** | None | 3 dedicated sub-routes:<br>• `requests`: Pending review requests sent out<br>• `comments`: Threaded comments on figures/docs<br>• `history`: Complete version & review audit trail |
| **Submission Engine** | None | Submission modal with recipient dropdown restricted to authorized roles (Patent Drafter, Patent Analyst, CEO), version snapshot creation, and notification triggers. |
| **Review Feedback & Rework** | None | Review decision UI supporting `Approved` and `Revision Required`, persisting reviewer comments, and transitioning task to rework or completed. |
| **Docket** | None | 3 sub-routes: `deadlines`, `reminders`, `action-items` populated from persisted assignment records. |
| **Reports** | None | 2 sub-routes: `metrics` and `productivity` computed dynamically from real assignment and review data. |
| **Command Inbox & Activity** | Shared generic `/inbox` | Dedicated `command-inbox` and `activity` views filtered for Design Team actions. |

---

## 7. REQUIRED API & SCHEMA ENHANCEMENTS

### 7.1 Next.js App Router API Routes (`apps/web/src/app/api/design-team/`)
We must add a unified, persistent API controller family for the Design Team under `apps/web/src/app/api/design-team/`:
1. `/api/design-team/assignments`:
   - `GET`: Retrieve assignments filtered by status (`ASSIGNED`, `IN_PROGRESS`, `UNDER_REVIEW`, `REWORK`, `COMPLETED`) and assigned designer.
   - `POST`: Create new design task (from Drafter, Analyst, or CEO).
   - `PUT`: Update status (e.g., Accept / Start Work).
2. `/api/design-team/drawings`:
   - `GET`: Retrieve drawing items and version history for a project.
   - `POST`: Upload/save new revision version with notes.
3. `/api/design-team/submissions`:
   - `POST`: Submit working version for review with selected authorized recipient (`PATENT_DRAFTER`, `PATENT_ANALYST`, `CEO`), message, and snapshot reference.
4. `/api/design-team/reviews`:
   - `GET`: Retrieve review requests and reviewer feedback.
   - `POST`: Record reviewer decision (`Approved` or `Revision Required`) with comments.
5. `/api/design-team/docket`:
   - `GET`: Calculate upcoming deadlines and action items from assignments.
   - `POST`/`PUT`: Create and toggle reminders.
6. `/api/design-team/reports`:
   - `GET`: Calculate actual turnaround times, task completion counts, revision rates, and workload metrics.

### 7.2 Persistence Layer Enhancements (`apps/web/data/`)
- **`apps/web/data/design_assignments.json`:**
  - Structure:
    ```json
    {
      "id": "DSG-001",
      "invention_id": "INN-0012",
      "title": "FIG 1 - Smart Thermostat Block Diagram",
      "assigned_to": "Design & Illustration Lead",
      "assigned_by": "Alice Drafter",
      "sender_role": "PATENT_DRAFTER",
      "status": "ASSIGNED | IN_PROGRESS | UNDER_REVIEW | REWORK | COMPLETED",
      "priority": "HIGH | MEDIUM | LOW",
      "due_date": "2026-10-25T00:00:00Z",
      "instructions": "Revise interconnects and add reference numerals 102 through 118.",
      "source_files": [{ "name": "disclosure.pdf", "url": "/..." }],
      "current_version": 1,
      "versions": [...],
      "created_at": "2026-10-12T10:00:00Z"
    }
    ```
- **`apps/web/data/design_submissions.json`:**
  - Records immutable submission snapshots, target recipient role/user, submission message, review decision, reviewer comments, and review timestamp.
- **`apps/web/data/design_docket.json`:**
  - Stores reminders, alerts, and deadline dismissals.

---

## 8. APPLICATION SECURITY & ACCESS CONTROL

1. **Role-Based Access Control (RBAC):**
   - Endpoints must verify that the requesting user possesses the `DESIGN_TEAM` role for drafting/uploading or authorized reviewer roles (`PATENT_DRAFTER`, `PATENT_ANALYST`, `CEO`) for review actions.
   - Prevent self-approval: A designer cannot approve their own submitted work.
2. **Project and Document Isolation:**
   - Users can only access assignments, drawings, and documents associated with their assigned tenant/project.
   - IDs must be validated against persisted records; arbitrary ID parameter manipulation must return 403 or 404.
3. **Private File Storage & Validation:**
   - Allowed file types: `image/png`, `image/jpeg`, `application/pdf`.
   - File size ceiling: 20 MB max.
   - Content sanitization: Disallow executable scripts or untyped binaries.
4. **Audit Trail Immutability:**
   - Every status change, assignment creation, file version upload, submission, and review decision must be written to `activity.json` with actor, timestamp, and details.

---

## 9. IMPLEMENTATION & TESTING PLAN (PHASE 1 - 15)

- **Phase 1: Target Workflow Definition:** Formalize state transitions, role relationships, and data contracts.
- **Phase 2: Assignment Creation & Delivery:** Implement "Send to Design Team" in projects/drafter workspace and "Assigned to Me" view.
- **Phase 3: My Designs & In Progress Workspace:** Implement persistent library, active task editor, version save, and download.
- **Phase 4: Design Materials:** Build Drawings, Technical Documents, Reference Files, and Export Files explorers.
- **Phase 5: Submission to Authorized Recipients:** Implement submission panel with role-filtered recipient selector, snapshot generation, and inbox/notification triggers.
- **Phase 6: Under Review & Review Feedback:** Implement reviewer feedback loop, `Revision Required` rework flow, and `Accepted` completion flow.
- **Phase 7: Review & Collaboration:** Build Review Requests, Threaded Comments, and Revision History views.
- **Phase 8: Completed Workspace:** Build locked final deliverables view with version audit and export options.
- **Phase 9: Docket:** Build Deadlines, Reminders, and Action Items views.
- **Phase 10: Reports:** Build dynamic Design Metrics and Productivity turnaround calculations.
- **Phase 11: Backend & Database Integration:** Wire up all REST endpoints with atomic transaction safety and JSON/FastAPI persistence.
- **Phase 12: Security Hardening:** Verify RBAC, multi-tenant boundaries, and anti-tamper constraints.
- **Phase 13: Frontend UX Polish:** Ensure seamless MOAT theme styling, responsive layouts, empty states, and loading indicators.
- **Phase 14: End-to-End Testing:** Run full cross-role workflow test (Analyst/Drafter -> Designer -> Submission -> Reviewer Feedback -> Acceptance -> Docket/Reports).
- **Phase 15: Documentation & Implementation Report:** Compile `docs/DESIGN_TEAM_WORKFLOW_IMPLEMENTATION_REPORT.md`.

---

## 10. CONCLUSION & NEXT STEPS

The repository is in a healthy, modular state. The data models and design services exist in FastAPI, the local JSON persistence layer is proven and stable in the Next.js App Router, and the UI design system is well-established.

**Awaiting user review and authorization to proceed to Phase 1.**
