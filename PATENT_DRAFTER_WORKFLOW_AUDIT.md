# MOAT IP Intelligence Platform - Patent Drafter Workflow Audit

## 1. Existing Working Functionality
- **Frontend Framework:** Next.js (App Router) using React, TailwindCSS, and shadcn/ui.
- **Routing Structure:** The Patent Drafter portal is located at `apps/web/src/app/(app)/dashboard/patent-drafter`.
- **Sidebar & Pages:** There are distinct routes for `/drafts` (My Drafts, Assigned, In Progress, etc.) and `/invention` (Details, Technical, Research, Documents).
- **Backend Infrastructure:** A robust FastAPI backend with SQLAlchemy, Postgres, and Celery/Workers (`apps/api`).
- **Existing Models:** `Invention` (in `invention.py`), `Document`/`Draft` (in `drafting.py`), and foundational auth (`User`, `Tenant`).
- **Research Services:** Perplexity API integration exists (`perplexity.py`) and is dynamically wired to the frontend.

## 2. Missing Connections
- **No Overarching Project Context:** The `invention/` and `drafts/` routes are entirely separate. Selecting a draft in `Assigned to Me` does not persist a `[projectId]` globally, causing the Invention panels to lose context.
- **Lack of Assignment Model:** There is no dedicated `Assignment` or `Project` database model tracking the lifecycle of CEO -> Patent Analyst -> Patent Drafter.
- **Hardcoded State:** Many frontend pages rely on static mock data or loosely coupled state variables rather than unified Server Components or a global state provider (Zustand/Context).

## 3. Existing APIs and Database Tables
- **Database Tables:** 
  - `inventions` (ref, title, summary, status)
  - `documents` (ref, title, claim_status)
  - `users` / `tenants` for RBAC.
  - `comments` for collaboration.
- **APIs:** The frontend currently heavily mocks routes like `/api/patent-drafter/docket` and `/activity` due to missing backend dependencies in the workspace.

## 4. Required Status Transitions
The backend needs a strictly enforced state machine for the overarching project:
1. **ASSIGNED**: CEO creates the assignment.
2. **ACCEPTED**: Drafter accepts the work.
3. **DRAFTING**: Drafter is actively writing (Draft in Progress).
4. **SUBMITTED_FOR_REVIEW**: Sent back to Analyst/CEO.
5. **REVISION_REQUIRED**: Reviewer requests changes.
6. **APPROVED**: Final approval.
7. **COMPLETED**: Workflow finalized.

## 5. Authorization Requirements
- **Tenant Isolation:** All queries must strictly filter by `tenant_id`.
- **Role-Based Access (RBAC):** Only `CEO` or `Patent Analyst` can create assignments. Only assigned `Patent Drafter` can view/edit specific drafts.
- **Storage Policies:** Uploads (`documents.py`) must be strictly bound to the authenticated user's assignment ID to prevent horizontal escalation.

## 6. Required Frontend Changes
- **Unified Layout:** Introduce a shared layout (e.g., `/dashboard/patent-drafter/project/[id]/layout.tsx`) to maintain context across both Invention and Drafting workspaces.
- **Dynamic Data Binding:** Replace all static Next.js mock pages with data-fetching Server Components or Tanstack Query hooks connecting to the FastAPI backend.
- **Notification Inbox:** Wire the existing notification components to the backend webhooks.

## 7. Required Backend Changes
- **Assignment Controller:** Build `/api/v1/assignments` to handle the CEO -> Drafter handoff.
- **Drafting Sync:** Build endpoints to continuously auto-save draft editor content to `documents`.
- **Workflow State Machine:** Implement validation logic prohibiting illegal state transitions (e.g., cannot skip from `DRAFTING` to `COMPLETED`).

## 8. Required Database Changes
- **New Table:** `ProjectAssignment` (or similar) linking `Invention_ID`, `Drafter_User_ID`, `Analyst_User_ID`, and tracking overarching `Project_Status`.
- **Foreign Keys:** Ensure `Document` (Draft) explicitly references `ProjectAssignment` or `Invention`.

## 9. Existing Components to Reuse
- **UI System:** shadcn/ui forms, inputs, buttons, and badges.
- **Editor:** Extend the existing draft editor component (currently in `/editor`).
- **File Uploads:** Reuse the `UploadSession` logic in `documents.py` for securely handling authorized invention documents.
