# NOVELTY_SEARCH_AUDIT.md

## 1. Overview
The current Novelty Search module (`/dashboard/novelty/page.tsx` and `/api/novelty/route.ts`) is designed as a single-step, monolithic search experience. It accepts a `query` (Invention Description) and `concepts`, and immediately attempts to return a fully populated `NoveltyAssessment` object.

## 2. Reusable Modules
*   **UI Components:** `Badge`, `Button`, `Card`, `Separator` are highly reusable from the `ui` library.
*   **Data Structures:** The `NoveltyAssessment` interface in `src/lib/analysis/novelty.ts` contains excellent visualization structures (`HeatmapCell`, `MappingItem`, `NetworkNode`) that should be preserved.
*   **SearchRepository:** The `SearchRepository` implemented in Phase 3 is highly reusable for persisting the final intelligence output to the active project context.

## 3. Duplicate Logic & Missing Workflow
*   **Missing Workflow:** The current implementation completely bypasses the standard enterprise search methodology (Feature Extraction -> Classification -> Multi-Channel Search -> Claim Mapping -> Intelligence). It currently jumps straight from User Input to Final Output in one API call.
*   **Duplicate Logic:** The persistence logic `repo.upsertSearch` is duplicated in both the `try` and `catch` blocks of the API route.

## 4. Scalability Issues
*   **Monolithic API Call:** Waiting for feature extraction, semantic search, hybrid ranking, and report generation in a single HTTP request to `/api/novelty` will cause Vercel/Next.js function timeouts (504s).
*   **Blocking UI:** The frontend sets `loading = true` and waits. There is no progressive UI to stream partial completion (e.g., "Extracting features...", "Querying EPO...").

## 5. Performance Bottlenecks
*   The `useAnalysis` hook relies on a single blocking HTTP request.
*   No support for background processing, WebSockets, or Server-Sent Events (SSE) to handle long-running patent database queries.

## 6. Security Concerns
*   The `/api/novelty` route currently uses the `SearchRepository` without verifying `supabase.auth.getUser()`, relying on potentially insecure input (`project_id`). This violates RBAC constraints.
*   No robust validation on the `query` length, exposing the backend to excessive token processing costs.

## 7. Recommendations for Transformation
To achieve the 10-stage enterprise pipeline requested:
1.  **Refactor Frontend:** Convert `/dashboard/novelty/page.tsx` to use a multi-step wizard state machine instead of a single text area.
2.  **Deconstruct API:** Break `/api/novelty` into specialized endpoints (e.g., `/api/novelty/extract`, `/api/novelty/search`, `/api/novelty/analyze`) to prevent timeouts and allow user intervention.
3.  **Implement RLS:** Secure all new API endpoints using the authenticated user session.
