# MOAT Project Workflow Audit

## 1. Existing Workflow
- **CEO Project Creation:** The CEO creates projects (inventions) using the `MyMoatPage` UI (`/dashboard/ceo/moat`). Projects are saved in the `inventions` table via `/api/ceo/projects` or `/api/moat`. 
- **Analyst Assignment:** Projects have an `assigned_to` field, but the current UI for both CEO and Analyst (`/dashboard/research/moat`) acts more like a generic "Idea Vault" than a structured assignment workflow.
- **Status Updates:** Currently, the workflow state is updated manually via a dropdown in the idea form (`draft`, `review`, `filed`, `pfs_search`, `archived`).
- **Research & Tracking:** The Patent Analyst performs research (Traditional or AI Hub) in separate screens. These actions do not currently automatically update the project tracker or state.

## 2. Reusable Components
- **Design System:** Shadcn UI (`Card`, `Button`, `Badge`, `Input`, `DropdownMenu`).
- **Editor:** `MoatEditor` (Rich text content).
- **Icons:** Lucide React (standardized iconography).
- **Event Bus:** Centralized asynchronous event publisher (`lib/events/eventBus.ts`) handles logging, status updates, notifications, and emails concurrently.

## 3. Existing APIs
- **Project APIs:** `/api/moat` (CRUD for inventions), `/api/ceo/projects` (CEO-specific project creation/fetching).
- **Notification/Email APIs:** Dispatched via `EventBus` (`handleNotification`, `handleEmailDispatch`), configured via `/api/settings/email/email_config.json`.
- **Admin APIs:** `/api/dashboard/admin/control-center` (fetches KPIs, workflows, event streams, system health).
- **Workflow & Activity APIs:** EventBus triggers `handleWorkflowUpdate` and `handleAuditLog`.

## 4. Existing Database Tables
- `inventions` (Functions as the core "Projects" table)
- `users` / `roles`
- `audit_logs` (Records all system actions)
- `workflow_history` (Records status transitions)
- `notifications` (In-app alerts)
- `email_logs` (Auditable email records)

## 5. Existing Notification Infrastructure
- The `EventBus` is robust. Every published event (`PROJECT_CREATED`, `RESEARCH_STARTED`, etc.) triggers:
  1. Immutable `audit_logs` entry.
  2. `workflow_history` update.
  3. In-app `notifications`.
  4. Microsoft Graph email dispatch via `handleEmailDispatch`.
- The email engine supports TO/CC routing rules (`lib/events/recipientResolver.ts`).
- Failed emails do not block the workflow; they are logged as `Failed` in `email_logs`.

## 6. Missing Pieces
- **Project-Centric Workspace:** There is no unified workspace for a single project (Tabs: Overview, Research, Analysis, Documents, Reports, Activity). The current "My MOAT" is just a list of cards and a generic form.
- **Automatic Tracker Updates:** The State Machine is not hooked up to actual research actions (e.g., executing a Novelty Search doesn't automatically move the project to `RESEARCH`).
- **Visual Workflow Stepper:** No visual timeline indicating `NEW -> ASSIGNED -> RESEARCH -> ANALYSIS -> DRAFTING -> REVIEW -> APPROVED`.
- **CEO Executive Dashboard:** The CEO needs a higher-level view of project progress (Progress Bar, Next Action) rather than the raw idea form.
- **Admin Centralized Activity Table:** While the backend provides event streams via `control-center`, the Admin UI needs a dedicated, filterable enterprise activity table for the project workflow.

## 7. UX Problems
- **Lack of Differentiation:** The CEO and Patent Analyst see almost the exact same "My MOAT" interface.
- **Disconnected Tools:** Patent Search and MOAT AI HUB are completely disconnected from the context of a "Project". An analyst must search blindly rather than searching *within* a project.
- **Manual Overhead:** Analysts must manually change statuses, which leads to outdated trackers.
- **Notification Overload:** If every action triggers an email, we need to ensure deduplication/batching (currently using `EventBus` for everything).

## 8. Security Gaps
- **Hardcoded Identifiers:** The `/api/ceo/projects/route.ts` and `WorkspaceRepository` use hardcoded fallback `user_id` values to bypass foreign key constraints during development.
- **Data Isolation (BOLA):** The `/api/moat` endpoint returns all inventions. Patent Analysts should *only* see projects where `assigned_to == user_id` (or if they are the creator). Backend RLS / object-level authorization is currently not strictly enforced in the API routes.
- **Admin Notification Hardcoding:** The `handleNotification` currently explicitly adds `"Admin"` to `notifyRoles` rather than strictly evaluating dynamic active admins via RBAC.

## 9. Duplicate Functionality
- `api/ceo/projects` and `api/moat` both handle creation and retrieval of projects/inventions.
- The "My MOAT" page for CEO (`/dashboard/ceo/moat`) and Analyst (`/dashboard/research/moat`) are virtually identical components maintaining duplicate state logic.
