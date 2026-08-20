# MOAT Patent Hub & AI Hub Architecture Audit

## 1. Frontend Architecture & Routing
- **Framework:** Next.js (App Router).
- **Navigation:** Controlled by `Sidebar.tsx` and `workspaceNavigation.ts`. 
  - *Finding:* A workspace context system already isolates `PATENT`, `TRADEMARK`, and `COPYRIGHT` navigations. 
  - *Phase 1 Action:* `PATENT_NAVIGATION` inside `workspaceNavigation.ts` needs to be updated to precisely match the target spec (Back to Dashboard, Patent Dashboard, Patent Search, MOAT AI Hub, Patentability Engine, Real-Time Tracker, Upload Centre, Document Draft, PFS Generator, Alerts).
- **Dashboard:** The main entry is `/dashboard/patent-analyst`. The Patent Hub dashboard is mapped to `/dashboard/research`.

## 2. Reusable Components & UI
- **Design System:** Shadcn UI + Tailwind CSS.
- **Components:** High reusability for `<Card>`, `<Badge>`, `<DropdownMenu>`, `<Button>`, and `<Tooltip>`. 
- **Icons:** Lucide React is extensively used.
- **Layouts:** `DashboardLayout.tsx` handles responsive shell, sidebar, and headers.

## 3. Existing API & Database Infrastructure
- **Backend:** FastAPI + PostgreSQL + SQLAlchemy.
- **Tables Identified:** `projects`, `trademarks`, `copyrights`, `activity_logs`, `alerts`.
- **Missing Functionality:** 
  - AI Sessions / AI Message history table.
  - Dedicated "Saved Research" records mapped to projects.
  - Dedicated Document Upload tables/relations for the Upload Centre.
- **Workflow State Machine:** Already exists and tracks states (`Drafting`, `Pending Review`, `Filed`). The Real-Time Tracker should reuse these exact status enums.

## 4. Risks & Concerns
- **Data Isolation:** Need to strictly ensure that `project_id` bindings are preserved in API queries so Patent Project A data NEVER leaks to Patent Project B.
- **Performance:** Complex AI searches (FTO, Validity) could take time. We must use non-blocking API polling or WebSocket patterns instead of synchronous requests that freeze the UI.

## 5. Integration Points
- **MOAT AI Hub:** Needs a new or refined `/dashboard/ai-hub` route.
- **Patentability Engine:** Needs its own interface `/dashboard/patentability`.
- **Rith AI Agent:** Needs a backend route in FastAPI to process queries securely without exposing LLM keys on the client.

## 6. Duplicate Functionality Warning
- *Document Draft:* Keep the existing `/dashboard/patent-analyst/documents` logic intact. Do not build a second document editor.
- *Real-Time Tracker:* Needs to pull from existing `projects` table statuses rather than inventing a new tracking database.

---
**Audit Complete.** 
Awaiting approval to begin Phase 1: Patent Hub Information Architecture.
