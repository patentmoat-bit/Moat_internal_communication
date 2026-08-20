# CURRENT STATE - MOAT Patent Intelligence Platform

## Audit Scope

This document audits the existing application as-is before any platform transformation work. It intentionally avoids implementation changes and focuses on the current folder structure, feature surface, API surface, database schema, search architecture, AI architecture, reusable modules, outdated modules, and missing modules required to evolve the system into MOAT - an AI-powered Patent Intelligence Platform.

## Executive Summary

The current platform is already more than a simple patent search product. It contains a Next.js frontend, FastAPI backend, PostgreSQL data model, Elasticsearch search path, Weaviate semantic-search path, Neo4j graph hooks, Redis/Celery background infrastructure, Supabase-oriented frontend auth/persistence paths, and several AI-oriented UI modules.

However, the system is not yet a fully integrated Patent Intelligence Platform. Many high-value intelligence modules exist as UI pages, local Next.js API routes, prompt wrappers, deterministic mock fallbacks, or early backend services. The main gap is orchestration: invention discovery, invention analysis, prior-art search, novelty scoring, patentability evaluation, filing recommendations, patent drafting, and competitor monitoring are not yet connected into a durable, corpus-grounded workflow.

## Folder Structure Review

```text
dashboard/
  README.md
  docker-compose.yml
  deploy/
    k8s/
    monitoring/
  backend/
    app/
      main.py
      config.py
      database.py
      celery_app.py
      api/
        auth/
        search/
        patents/
        collections/
        workspace/
        matters/
        inventions/
        understanding/
        image_search/
        ingestion/
        comparison/
        visualization/
        collaboration/
        reports/
        analytics/
        admin/
        copilot/
      ai/
        router.py
        client.py
        embeddings.py
        chat.py
        summarization.py
        similarity.py
        feature_extraction.py
        schemas.py
      core/
        security.py
        graph.py
        exceptions.py
        middleware.py
        logging.py
      ingestion/
        connectors.py
        pipeline.py
        parsers/
        extractors/
        indexers/
        workers/
      models/
      repositories/
      schemas/
      services/
      tasks/
    alembic/
      versions/
    requirements.txt
    Dockerfile
    Dockerfile.worker
  frontend/
    src/
      app/
        dashboard/
        api/
        auth/
        workspace/
      components/
        ai/
        auth/
        collections/
        dashboard/
        decision/
        inventions/
        layout/
        matters/
        modules/
        patents/
        search/
        shared/
        ui/
        visualization/
      hooks/
      lib/
        analysis/
        supabase/
      services/
      stores/
      types/
    supabase_schema.sql
    package.json
    tailwind.config.ts
```

## Existing Feature Map

### Core Patent Search and Patent Management

- Patent search UI and service layer.
- Patent results and patent detail pages.
- Search filters, advanced filters, result cards, patent viewer, and detail panel components.
- Saved patents and saved-search support.
- Collections for organizing patents.
- Search history and analytics support in backend.

### Dashboard and Navigation

- Dashboard shell with sidebar, header, theme toggle, guest/demo identity fallback, and dashboard route grouping.
- Many module pages already exist under `/dashboard`.
- Several module pages are placeholder/workbench-style pages exposing intended endpoint names but not always complete functionality.

### Authentication

- Backend JWT auth endpoints for login, signup, refresh, forgot/reset password, current user, profile update, and OAuth login/callback hooks.
- Frontend auth pages and Next API proxy routes.
- Supabase auth helper usage exists in the frontend.
- Dashboard layout currently allows guest/demo access when no backend session is present.

### Workspaces

- Workspace module with workspace switcher, members, projects, activity, settings, and access model.
- Backend workspace APIs and database tables exist.
- Zustand workspace store and services exist.

### Matter Management

- Matter docket, matter summary, status workflow, sharing/assignment, notes, attachments, and activity timeline UI.
- Backend matter APIs and database tables exist.
- Matter status history and activity models are present.

### Invention Workspace

- Invention intake UI with title, description, uploads, analysis trigger, history/version placeholders, and analysis results panel.
- Backend invention APIs exist for create/list/get/update/upload/analyze/history.
- Invention analysis stores structured JSON results.
- Analysis has OpenAI path plus deterministic fallback.

### AI Analysis Modules

- Decision console routes invention/query intent to novelty, prior-art, FTO, patentability, invalidity, or landscape.
- Novelty page and Next API route.
- FTO/risk page and Next API route.
- Patentability page and Next API route.
- Invalidity page and Next API route.
- Landscape page and Next API route.
- Report generation route with mock/OpenAI output and optional Supabase persistence.
- Copilot, semantic search, similarity, claims, evidence, competitor, marketplace, security, and other module pages exist, but some are placeholder/module-workbench surfaces.

### Prior Art and Semantic Search

- Backend `/api/v1/ai/prior-art` route for source-patent-based prior art.
- Backend `/api/v1/ai/semantic-search` route using Weaviate.
- Frontend dashboard search page calls semantic search directly.
- Novelty/FTO/invalidity frontend analysis routes currently generate plausible references rather than grounding results in backend corpus search.

### Reports

- Backend report generation and scheduled report endpoints exist.
- Frontend Next `/api/report` creates a patentability-style report via OpenAI or mock fallback and may persist through Supabase.

### Visualization and Graph

- Backend visualization APIs for citation graph, technology tree, patent relationships, and graph stats.
- Neo4j connection setup and graph constraints are present.
- Frontend visualization components exist.

### Ingestion

- Backend ingestion API for patent ingest, batch ingest, upload, jobs, retry, connectors, connector search, and connector fetch.
- PDF parsing, patent XML parsing, OCR, metadata extraction, citation extraction, Elasticsearch indexing, pipeline, Celery workers.

### Monitoring and Deployment

- Docker Compose includes backend, worker, PostgreSQL, Elasticsearch, Redis, Weaviate, and Neo4j.
- Kubernetes manifests and monitoring files exist.

## Existing API Map

Backend base prefix: `/api/v1` for included routers. Health check is `/health`.

### Auth

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/auth/me`
- `PUT /api/v1/auth/me`
- `GET /api/v1/auth/{provider}/login`
- `GET /api/v1/auth/{provider}/callback`

### Search

- `GET /api/v1/search`
- `POST /api/v1/search/advanced`
- `GET /api/v1/search/history`
- `DELETE /api/v1/search/history`
- `POST /api/v1/search/saved`
- `GET /api/v1/search/saved`
- `PUT /api/v1/search/saved/{search_id}`
- `DELETE /api/v1/search/saved/{search_id}`
- `GET /api/v1/search/analytics`

### Patents

- `GET /api/v1/patents/saved/list`
- `GET /api/v1/patents`
- `GET /api/v1/patents/{patent_id}`
- `POST /api/v1/patents/{patent_id}/save`
- `DELETE /api/v1/patents/{patent_id}/save`

### Collections

- `GET /api/v1/collections`
- `POST /api/v1/collections`
- `GET /api/v1/collections/{collection_id}`
- `PUT /api/v1/collections/{collection_id}`
- `DELETE /api/v1/collections/{collection_id}`
- `POST /api/v1/collections/{collection_id}/patents/{patent_id}`
- `DELETE /api/v1/collections/{collection_id}/patents/{patent_id}`

### Workspaces

- `GET /api/v1/workspaces`
- `POST /api/v1/workspaces`
- `GET /api/v1/workspaces/{workspace_id}`
- `PUT /api/v1/workspaces/{workspace_id}`
- `DELETE /api/v1/workspaces/{workspace_id}`
- `GET /api/v1/workspaces/{workspace_id}/members`
- `POST /api/v1/workspaces/{workspace_id}/members`
- `PATCH /api/v1/workspaces/{workspace_id}/members/{member_id}`
- `DELETE /api/v1/workspaces/{workspace_id}/members/{member_id}`
- `GET /api/v1/workspaces/{workspace_id}/projects`
- `POST /api/v1/workspaces/{workspace_id}/projects`
- `PATCH /api/v1/workspaces/{workspace_id}/projects/{project_id}`
- `DELETE /api/v1/workspaces/{workspace_id}/projects/{project_id}`
- `GET /api/v1/workspaces/{workspace_id}/activity`
- `GET /api/v1/workspaces/{workspace_id}/audit-logs`

### Matters

- `GET /api/v1/matters`
- `POST /api/v1/matters`
- `GET /api/v1/matters/{matter_id}`
- `PUT /api/v1/matters/{matter_id}`
- `DELETE /api/v1/matters/{matter_id}`
- `GET /api/v1/matters/{matter_id}/members`
- `POST /api/v1/matters/{matter_id}/members`
- `POST /api/v1/matters/{matter_id}/share`
- `PATCH /api/v1/matters/{matter_id}/members/{member_id}`
- `DELETE /api/v1/matters/{matter_id}/members/{member_id}`
- `POST /api/v1/matters/{matter_id}/status`
- `PUT /api/v1/matters/{matter_id}/notes`
- `GET /api/v1/matters/{matter_id}/activity`
- `GET /api/v1/matters/{matter_id}/documents`
- `POST /api/v1/matters/{matter_id}/documents`
- `DELETE /api/v1/matters/{matter_id}/documents/{document_id}`

### Inventions

- `GET /api/v1/inventions`
- `POST /api/v1/inventions`
- `GET /api/v1/inventions/{invention_id}`
- `PUT /api/v1/inventions/{invention_id}`
- `POST /api/v1/inventions/upload`
- `POST /api/v1/inventions/{invention_id}/analyze`
- `GET /api/v1/inventions/{invention_id}/analysis`
- `GET /api/v1/inventions/{invention_id}/analysis/history`

### AI

- `POST /api/v1/ai/summarize`
- `POST /api/v1/ai/similarity`
- `POST /api/v1/ai/features`
- `POST /api/v1/ai/semantic-search`
- `POST /api/v1/ai/prior-art`
- `POST /api/v1/ai/chat`
- `POST /api/v1/ai/insights`
- `GET /api/v1/ai/health`

### Understanding

- `POST /api/v1/understanding/analyze`
- `POST /api/v1/understanding/analyze-file`

### Ingestion

- `POST /api/v1/ingestion/patents`
- `POST /api/v1/ingestion/patents/batch`
- `POST /api/v1/ingestion/upload`
- `GET /api/v1/ingestion/jobs`
- `GET /api/v1/ingestion/jobs/{job_id}`
- `POST /api/v1/ingestion/jobs/{job_id}/retry`
- `GET /api/v1/ingestion/connectors`
- `POST /api/v1/ingestion/connectors/search`
- `POST /api/v1/ingestion/connectors/fetch`

### Reports

- `POST /api/v1/reports/generate`
- `GET /api/v1/reports/reports`
- `GET /api/v1/reports/reports/{report_id}`
- `POST /api/v1/reports/scheduled`
- `GET /api/v1/reports/scheduled`

### Visualization and Analytics

- `POST /api/v1/visualization/citation-graph`
- `GET /api/v1/visualization/technology-tree`
- `POST /api/v1/visualization/relationships`
- `GET /api/v1/visualization/stats`
- `GET /api/v1/analytics/landscape`
- `POST /api/v1/analytics/landscape`
- `GET /api/v1/analytics/competitor-velocity`
- `GET /api/v1/analytics/network-graph`

### Collaboration

- `POST /api/v1/collaboration/comments`
- `GET /api/v1/collaboration/comments/{patent_id}`
- `POST /api/v1/collaboration/comments/{comment_id}/resolve`
- `POST /api/v1/collaboration/approvals`
- `GET /api/v1/collaboration/approvals`
- `POST /api/v1/collaboration/approvals/{approval_id}/review`
- `GET /api/v1/collaboration/notifications`
- `POST /api/v1/collaboration/notifications/{notification_id}/read`
- `POST /api/v1/collaboration/notifications/read-all`
- `POST /api/v1/collaboration/share-collection`
- `GET /api/v1/collaboration/audit-logs`

### Frontend Next API Routes

These routes live in the frontend app and are separate from the FastAPI backend:

- `/api/decision`
- `/api/novelty`
- `/api/fto`
- `/api/patentability`
- `/api/invalidity`
- `/api/landscape`
- `/api/report`
- `/api/compare`
- `/api/search`
- `/api/stats`
- `/api/check-alerts`
- `/api/highlights`
- `/api/analyze`
- `/api/understanding/analyze`
- `/api/zyra`
- `/api/auth/*` proxy routes

## Existing Database Schema

### Backend SQLAlchemy / Alembic Schema

Primary tables identified:

- `users`
- `patents`
- `saved_patents`
- `collections`
- `collection_patents`
- `search_history`
- `saved_searches`
- `alerts`
- `reports`
- `scheduled_reports`
- `comments`
- `approvals`
- `notifications`
- `audit_logs`
- `ingestion_jobs`
- `landscape_studies`
- `workspaces`
- `workspace_members`
- `workspace_projects`
- `workspace_activities`
- `matters`
- `matter_members`
- `matter_documents`
- `matter_activity`
- `matter_status_history`
- `inventions`
- `invention_documents`
- `invention_analysis`

### Important Schema Observations

- Patent records store core patent bibliographic data, claims, inventors, classifications, citations, and metadata in JSON fields.
- Inventions are linked optionally to workspaces and matters.
- Invention documents store uploaded artifact metadata and extracted text.
- Invention analyses store structured JSON fields: components, domains, differentiators, workflows, architecture, highlights, confidence score, and model name.
- Matters include owner, workspace, matter number, status, priority, due date, tags, notes, activity, documents, members, and status history.
- Workspaces include owner, members, projects, and activity.
- Search history and saved searches exist for query tracking and alerting.
- Reporting and scheduled reporting tables exist.

### Supabase Schema File

The frontend includes `supabase_schema.sql`, with Supabase/RLS tables:

- `profiles`
- `saved_patents`
- `collections`
- `collection_patents`
- `recent_searches`
- `workspaces`
- `reports`
- `alerts`

This schema partially overlaps with backend SQLAlchemy tables but is not identical. This is an important architectural divergence.

## Existing Search Architecture

### Keyword / Full-Text Patent Search

- Backend search uses `SearchService` and `PatentService`.
- Elasticsearch is preferred where configured.
- SQLAlchemy/PostgreSQL repository search is used as fallback.
- Search supports query, assignee, status, filing date range, CPC class, inventor, advanced filters, pagination, saved searches, history, and analytics.

### Elasticsearch

- Docker Compose includes Elasticsearch 8.16.
- Backend uses `AsyncElasticsearch`.
- `ElasticsearchIndexer` exists under ingestion indexers.
- Patent search multi-match boosts title, abstract, patent number, claims, classifications, assignee, and inventors.
- Advanced search delegates to the indexer and maps result IDs back to database patents.

### Semantic Search

- Weaviate collections are configured for `Patent` and `PatentImage`.
- `Patent` collection properties include patent_id, patent_number, title, abstract, claims, assignee, inventors, dates, classifications, status, and citation_count.
- `PatentImage` collection properties include patent_id, patent_number, image_url, description, and visual_features.
- Semantic search uses Weaviate `near_text` with optional filters.
- Image semantic search exists but is text/description-based, not true multimodal vector search.

### Ingestion and Indexing

- Ingestion pipeline includes connectors, PDF parser, XML parser, OCR, metadata extraction, citation extraction, and indexing.
- Celery worker infrastructure exists.
- Patent ingestion can create jobs and fetch/search connectors.

### Search Architecture Gaps

- Novelty, FTO, invalidity, patentability, and landscape frontend modules are not yet grounded in Elasticsearch/Weaviate results.
- No unified retrieval pipeline combines keyword, semantic, citation graph, jurisdiction filters, family expansion, claim element mapping, and legal status.
- No durable prior-art search sessions tied to invention/matter workflows.
- No claim-chart retrieval layer.
- No patent family normalization or legal status enrichment observed in schema.

## Existing AI Architecture

### Backend AI

- OpenAI client configured through backend settings.
- Weaviate semantic search and embedding collection setup exist.
- AI routes support summarization, similarity, feature extraction, semantic search, prior art, chat, insights, and health.
- Invention analysis service uses OpenAI JSON mode when configured.
- Invention analysis falls back to deterministic keyword/rule analysis.
- AI services are degradable: many paths return fallbacks or empty results if OpenAI/Weaviate is unavailable.

### Frontend AI / Next API Layer

- Frontend has local LLM helper `completeJSON` using OpenAI JSON mode.
- Next API routes implement decision routing, novelty, FTO, patentability, invalidity, landscape, and report generation.
- These routes use OpenAI when configured and deterministic mock fallbacks otherwise.
- The frontend analysis modules generate plausible patent numbers, assignees, claim elements, risk scores, recommendations, and landscape data.

### AI Architecture Gaps

- Split AI architecture: some intelligence lives in backend FastAPI routes, some in frontend Next API routes.
- Core analysis outputs are not consistently persisted.
- Local analysis outputs are not grounded in actual patent search results.
- No RAG pipeline with citations, retrieval provenance, confidence calibration, or source traceability.
- No standardized analysis job model for long-running AI tasks.
- No model governance layer, prompt registry, evaluation suite, or audit trail for AI outputs.
- No drafting engine for patent specification/claims/drawings/office-action style workflows.

## Existing Feature Readiness vs Target Objective

| Objective | Current State | Gap |
|---|---|---|
| Discover inventions | Invention workspace exists with intake and uploads | Needs guided invention discovery, ideation, disclosure interview, problem/solution extraction |
| Analyze inventions | Backend analysis exists with OpenAI/rule fallback | Needs corpus-grounded analysis, claim element extraction, novelty hooks, persistence UX |
| Search prior art | Search, semantic search, prior-art endpoint exist | Needs invention-to-prior-art workflow, claim mapping, family/legal status handling |
| Measure novelty | Frontend novelty module exists | Needs backend service, real prior art grounding, persisted novelty reports |
| Evaluate patentability | Frontend patentability module exists | Needs statutory analysis grounded in prior art and disclosure quality |
| Generate filing recommendations | Mock/report recommendations exist | Needs integrated filing readiness score and attorney-grade decision workflow |
| Draft patents | Not implemented as a real module | Need claim drafting, spec drafting, embodiments, figures, examples, review workflow |
| Monitor competitors | Alerts, analytics, competitor placeholder exist | Need competitor profiles, assignee monitoring, landscapes, alert workflows, portfolio watchlists |

## Reusable Modules

### Frontend

- Dashboard shell: `components/layout/*`.
- UI primitives: `components/ui/*`.
- Patent components: `components/patents/*`, `components/search/*`.
- Workspace module: `app/dashboard/workspace/page.tsx`, `stores/workspaceStore.ts`.
- Matter module: `components/matters/MatterWorkspace.tsx`, `stores/matterStore.ts`.
- Invention workspace: `components/inventions/InventionWorkspace.tsx`, `stores/inventionStore.ts`.
- Analysis components: `components/decision/*`, `lib/analysis/*`.
- API client and services: `lib/apiClient.ts`, `services/*`.
- Visualization components: `components/visualization/*`.

### Backend

- FastAPI router structure and dependency injection.
- SQLAlchemy models and repositories.
- Patent search services and repositories.
- Ingestion pipeline and indexers.
- Invention service and analysis service.
- Workspace and matter services.
- AI router and helper modules.
- Weaviate embeddings module.
- Neo4j graph integration.
- Celery worker/task infrastructure.
- Reporting service and scheduled reports.
- Collaboration/audit/notification models and APIs.

### Infrastructure

- Docker Compose stack for backend, worker, PostgreSQL, Elasticsearch, Redis, Weaviate, Neo4j.
- Kubernetes manifests.
- Monitoring assets.

## Outdated or Inconsistent Modules

- Project branding still mixes PatentAI/PFS/MOAT concepts; no single product identity system yet.
- Frontend Supabase schema overlaps with backend PostgreSQL schema and can create data-model divergence.
- Some dashboard pages are placeholder/module-workbench routes rather than implemented workflows.
- Frontend Next API analysis routes duplicate AI responsibilities that should likely live in backend services for persistence, retrieval, auditability, and enterprise governance.
- Deterministic mock analysis modules are useful for demos but should be clearly separated from production intelligence.
- Some API references in frontend pages point to endpoints that do not appear to exist in backend, such as claim-intelligence/evidence/marketplace/security/competitors as fully implemented APIs.
- Image search UI posts to `/search/image`, while backend image search router is mounted separately as `/image-search` based on router inclusion; route alignment should be verified.
- Backend `PatentService` has likely field mismatch risks around `SavedPatent.saved_by` vs references to `user_id` in some methods.
- Authentication uses a mix of backend JWT, Supabase helper paths, and guest fallback.

## Missing Modules for Complete MOAT Platform

### Invention Discovery

- Guided invention interview wizard.
- Problem/solution extraction.
- Inventor disclosure capture.
- Auto-generated invention records from notes, transcripts, diagrams, and files.
- Collaboration workflow for inventor review and attorney review.

### Corpus-Grounded Prior Art Engine

- Unified retrieval service combining Elasticsearch, Weaviate, citations, patent family expansion, assignee filters, dates, CPC/IPC, and jurisdiction.
- Claim-element extraction and search query expansion.
- Retrieval provenance and source snippets.
- Saved prior-art search sessions tied to inventions/matters.

### Novelty Intelligence

- Backend novelty service.
- Element-by-element novelty matrix.
- Closest reference mapping grounded in retrieved patents.
- Novelty score calibration.
- Persisted novelty reports.

### Patentability Intelligence

- Statutory criteria engine for novelty, non-obviousness, subject-matter eligibility, utility, enablement, written description.
- Disclosure quality scoring.
- Office-action risk prediction.
- Examiner/art-unit analytics if available.

### FTO and Risk Intelligence

- Claim charting against live patents.
- Jurisdiction/legal status/expiry handling.
- Product feature to claim limitation mapping.
- Design-around recommendations tied to specific claim limitations.

### Filing Recommendation Engine

- Filing readiness score.
- Filing strategy: provisional/non-provisional/PCT/continuation/trade secret.
- Claim scope recommendation.
- Family strategy and jurisdiction recommendation.
- Budget/risk/timing guidance.

### Patent Drafting

- Claim drafting module.
- Specification drafting module.
- Embodiment generation.
- Figure/drawing brief generation.
- Reference numeral management.
- Claim dependency graph.
- Attorney review workflow.
- Export to DOCX/PDF.

### Competitor Monitoring

- Competitor/assignee profiles.
- Watchlists.
- New filing alerts.
- Portfolio velocity analytics.
- Technology cluster shifts.
- White-space and threat alerts.

### Enterprise SaaS Foundation

- Tenant/organization model.
- RBAC beyond simple roles.
- Audit log coverage for AI decisions and data access.
- Usage metering.
- Admin console.
- Model/prompt governance.
- Data retention and confidentiality controls.
- Matter-level permissions.
- Billing/subscription hooks if needed.

### AI Platform Foundation

- Central backend AI orchestration layer.
- Retrieval-augmented generation with citations.
- Prompt registry and versioning.
- Model routing.
- Evaluation tests.
- Human review checkpoints.
- Durable AI job queue and job status.
- Confidence scoring and explanation schemas.
- Safety/legal disclaimer governance.

## Recommended Next Architecture Direction

1. Consolidate intelligence APIs in the backend instead of splitting between frontend Next API routes and FastAPI.
2. Introduce an `analysis_jobs` or `intelligence_runs` model for long-running AI analyses.
3. Connect invention analysis to retrieval: invention -> concepts -> prior art -> novelty -> patentability -> filing recommendation.
4. Create persistent report models for novelty, FTO, patentability, invalidity, landscape, and filing recommendations.
5. Normalize product identity to MOAT across UI, docs, schema labels, and navigation.
6. Resolve Supabase-vs-backend database authority.
7. Add claim-element extraction as a first-class service.
8. Build a real patent drafting workflow only after prior-art and novelty pipelines are grounded.

## Audit Conclusion

The existing platform has a strong foundation: search, patents, authentication, database models, workspaces, matters, ingestion, AI hooks, semantic search, and several intelligence-oriented UI surfaces already exist. The next phase should not rebuild the app. It should consolidate, ground, persist, and orchestrate the existing pieces into a coherent MOAT intelligence workflow.

The highest-leverage transformation is to turn the current invention workspace and analysis modules into a backend-driven intelligence pipeline:

```text
Invention Disclosure
  -> Concept and Claim Element Extraction
  -> Hybrid Prior-Art Retrieval
  -> Novelty Matrix
  -> Patentability Assessment
  -> FTO / Risk Assessment
  -> Filing Recommendation
  -> Drafting Workspace
  -> Competitor / Portfolio Monitoring
```
