# Enterprise FTO Search & Risk Analysis Engine - Audit Report

## 1. Current State Analysis

### 1.1 User Interface (`src/app/dashboard/risk/page.tsx`)
- **Flow:** Simple 1-step input (Description -> Generate -> Report).
- **Components:** Uses custom hooks (`useAnalysis`) and presentation components (`ConsoleShell`, `MetricBar`, `Pill`, `ScoreBadge`).
- **Data Display:** Renders Overall Exposure, Recommendations, Blocking Patents, Exposure by Feature, and Mitigation Paths immediately after the API returns.
- **Shortcomings:** 
  - Lacks granular workflow controls necessary for professional Patent Analysts.
  - No capability to review/edit intermediate states (features, classifications, jurisdictions).
  - Lacks visual stepper and live progress indication for a multi-stage enterprise search.
  - Missing file upload support (PDF, DOCX, CAD, Image).

### 1.2 Backend API (`src/app/api/fto/route.ts`)
- **Flow:** Receives `query`, `concepts`, and `project_id`. Either hits OpenAI LLM (`completeJSON`) or falls back to `mockFto`.
- **Persistence:** Successfully utilizes `SearchRepository` to persist the search to the project (`project_searches` table).
- **Shortcomings:** 
  - **Security:** Critically missing Role-Based Access Control (RBAC). It does not validate `supabase.auth.getUser()` before executing potentially expensive enterprise queries.
  - **Granularity:** The API is a monolithic endpoint. It cannot support a multi-stage execution pipeline (Extract -> Classify -> Search -> Map Claims -> Recommend).
  - **LLM Dependency:** Relies on LLM for patent generation rather than serving as an intelligence layer on top of a deterministic patent database search.

### 1.3 Enterprise Integrations
- **Project Mapping:** Basic mapping exists via `SearchRepository.upsertSearch(projectId, "FTO", assessment)`.
- **PFS Generator:** Automatically supported via the `project_searches` table (state changes to `COMPLETED` will automatically trigger PFS).
- **Notification & Workflow:** Missing automated state transitions (e.g., updating the parent `inventions` status to 'Pending CEO Review', dispatching `emails`, logging to `audit_logs`).

---

## 2. Transformation Path & Gap Analysis

### Gap 1: UI/UX Orchestration (Phase 2-11)
The monolithic text area must be replaced with a highly structured, 11-stage enterprise stepper UI matching the MOAT aesthetic (similar to the newly refined Novelty Search).
- **Stages Required:**
  1. Product Description (with file upload placeholders)
  2. Technical Feature Extraction (editable cards)
  3. Commercial Scope (Target Countries & Markets)
  4. Patent Classification
  5. Search Configuration (Active/Expired filtering, Data sources)
  6. Enterprise Search Engine (Live Progress UI)
  7. Infringement Analysis (Blocking Patents)
  8. Claim Mapping
  9. FTO Intelligence (Metrics, Country Risk)
  10. Design Around Suggestions
  11. Final Enterprise Report

### Gap 2: Backend Orchestration & Security (Phase 12-15)
- **Security Upgrade:** Implement `supabase.auth.getUser()` validation in `/api/fto` and `/api/fto/submit`.
- **Workflow State Management:** Create a dedicated `/api/fto/submit` endpoint (similar to Novelty) that:
  - Updates `project_searches` status.
  - Transitions parent Project status.
  - Generates immutable `audit_logs`.
  - Dispatches admin/CEO notifications via the `emails` table.

### Gap 3: Performance (Phase 14)
- Shift intermediate state management (feature extraction, classifications, jurisdictions) entirely to the client-side to prevent network round-trips.
- Execute the heavy API call only once at Stage 6 (Enterprise Search) with a non-blocking, progressive UI.

---

## 3. Reusable Modules
- **Design System:** Existing MOAT aesthetic (`bg-indigo-600` primary actions, centered max-w-4xl cards, "Step X of Y" indicators) can be heavily reused.
- **Persistence:** `SearchRepository` and `ReportRepository` are fully robust and reusable.
- **Submission Logic:** The orchestration logic developed for Novelty Submission (`/api/novelty/submit`) can be adapted for FTO.

---

## 4. Execution Plan
1. **Approval:** Await user sign-off on this audit.
2. **Phase 2-11:** Re-architect `/dashboard/risk/page.tsx` into the 11-stage Enterprise Workflow.
3. **Phase 12-13:** Implement `/api/fto/submit` for secure PFS integration.
4. **Phase 14-16:** Optimize performance, finalize RBAC security, and polish the UI/UX.
