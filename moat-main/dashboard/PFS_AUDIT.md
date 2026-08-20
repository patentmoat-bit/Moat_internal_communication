# PFS Orchestration Engine Audit (PFS_AUDIT.md)

## 1. Existing Search Modules

The system currently supports the following distinct search and analysis tools. They all share a common architecture: a Next.js API route that either delegates to a FastAPI backend or returns a mocked response, and a React page that displays the data using a `useAnalysis` hook.

*   **PFS Generator (Patentability Assessment)**:
    *   API: `src/app/api/patentability/route.ts`
    *   UI: `src/app/dashboard/patentability/page.tsx`
*   **Novelty Search**:
    *   API: `src/app/api/novelty/route.ts`
    *   UI: `src/app/dashboard/novelty/page.tsx`
*   **FTO (Freedom to Operate) Search**:
    *   API: `src/app/api/fto/route.ts`
    *   UI: `src/app/dashboard/fto/page.tsx`
*   **Invalidity/Validity Search**:
    *   API: `src/app/api/invalidity/route.ts`
    *   UI: `src/app/dashboard/invalidity/page.tsx`
*   **Landscape Search**:
    *   API: `src/app/api/landscape/route.ts`
    *   UI: `src/app/dashboard/landscape/page.tsx`
*   **Design Search**:
    *   API: `src/app/api/designer/route.ts` (assuming this covers design similarity)

## 2. Gaps & Duplicate Logic

*   **Ephemeral Execution (No Storage)**: Currently, none of the search APIs store their results in the database. When an analyst runs a search, the result is displayed in the UI, but if the page is refreshed, the data is lost.
*   **Lack of Project Context**: The search APIs only accept a `query` and `concepts`. They are entirely disconnected from the concept of a "Project" (`project_id`). This violates Phase 2's requirement that every search must belong to a project.
*   **Siloed Execution**: Because searches are not persisted or linked to a project, the PFS Generator cannot currently aggregate them. It acts as just another isolated search tool rather than an orchestrator.
*   **Duplicate Boilerplate**: Every search API has the same boilerplate for parsing requests (`query`, `concepts`), calling OpenAI/FastAPI, and falling back to a mock.
*   **No Versioning**: There is no version history for reports or search results.

## 3. Database Schema Overview

*   **Projects (`inventions` table)**: Represents the core entity. We need a way to link searches to these records.
*   **Search Repository (Missing)**: We need a new table (e.g., `project_searches`) to store the persisted outcomes of Novelty, FTO, Landscape, etc., mapped to a `project_id`.
*   **Reports (`reports` table or similar)**: Needs to be updated to support structured PFS composition and versioning (Draft, Submitted, Reviewed, Approved, Archived).

## 4. Integration Opportunities & Architecture Plan

To satisfy the requirements of the orchestration engine without redesigning the UI:

1.  **Unified Search Repository (Phase 2 & 3)**: Create a `project_searches` table with columns: `project_id`, `search_type`, `search_status`, `result_data` (JSONB), `created_by`, `completed_at`, `report_id`.
2.  **API Refactoring (Phase 4)**: Update the search pages (`useAnalysis` hook or the backend API) to pass `project_id`. When an API generates a result, it should upsert it into the `project_searches` table.
3.  **PFS Orchestrator (Phase 5)**: Modify the PFS Generator API (`/api/patentability`) to fetch all completed searches for the active `project_id` from the `project_searches` table. It will compose the final report by extracting and aggregating sections from these independent search results.
4.  **Versioning & Storage (Phase 6)**: Create a `pfs_reports` table (or adapt the existing reports schema) that tracks versions of the aggregated report.
5.  **Workflow Hooks (Phase 7)**: Tie the generation of the PFS report into the `EventBus` and existing state machine to notify the CEO and Admin, and transition the project status appropriately.
