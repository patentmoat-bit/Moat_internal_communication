# TARGET ARCHITECTURE - MOAT Patent Intelligence Platform

## Purpose

This document defines the target enterprise architecture for MOAT, an AI-powered Patent Intelligence Platform. It is intentionally forward-looking and should guide implementation without rebuilding the existing application from scratch.

The existing product already contains patent search, authentication, frontend, backend APIs, database models, search services, AI hooks, workspaces, matters, and invention analysis. The target architecture consolidates those assets into an enterprise-grade system for invention discovery, prior-art retrieval, novelty analysis, patentability assessment, filing recommendations, patent drafting, and competitor monitoring.

## Architecture Principles

1. Backend-owned intelligence: production AI workflows should be orchestrated by backend services, not scattered across frontend Next API routes.
2. Corpus-grounded outputs: every novelty, prior-art, FTO, invalidity, and patentability conclusion should cite retrieved patents, snippets, claim mappings, or stored evidence.
3. Durable workflows: analyses should be persisted as jobs/runs with status, inputs, outputs, model metadata, and audit records.
4. Human-in-the-loop: attorney and inventor review checkpoints must be first-class workflow states.
5. Enterprise tenancy: every object should be attributable to an organization, workspace, matter, user, role, and audit trail.
6. Modular intelligence: search, AI reasoning, analytics, drafting, and monitoring should be independently evolvable services behind stable APIs.
7. Preserve the existing platform: reuse current FastAPI, Next.js, SQLAlchemy, Elasticsearch, Weaviate, Neo4j, Celery, and dashboard modules where possible.

## Target System Context

```text
Users
  Inventors
  Patent attorneys
  R&D leaders
  IP analysts
  Executives
  Admins

MOAT Platform
  UI Layer
  API Layer
  Search Layer
  AI Layer
  Intelligence Layer
  Analytics Layer
  Storage Layer

External Systems
  Patent data providers
  USPTO / EPO / WIPO / Google Patents style data sources
  Enterprise SSO / IdP
  Email / notification providers
  Object storage
  LLM providers
  Optional billing / CRM / document management systems
```

## Layer 1: UI Layer

### Responsibility

The UI Layer provides the enterprise SaaS experience for patent intelligence workflows. It should remain a Next.js application but evolve from separate pages into connected workflows.

### Target UI Modules

- Global dashboard shell
- Organization and workspace switcher
- Matter management
- Invention disclosure workspace
- Guided invention discovery interview
- Prior-art search workspace
- Patent result review and triage
- Novelty matrix viewer
- Patentability assessment viewer
- FTO / risk claim chart viewer
- Invalidity analysis workspace
- Landscape and competitor monitoring dashboards
- Filing recommendation cockpit
- Patent drafting workspace
- Reports and exports
- Admin, audit, settings, billing/usage if required

### UI Workflow Model

```text
Workspace
  -> Matter
    -> Invention
      -> Disclosure
      -> Intelligence Runs
      -> Prior Art Set
      -> Novelty Matrix
      -> Patentability Report
      -> FTO / Risk Report
      -> Filing Recommendation
      -> Drafting Project
      -> Review / Export
```

### UI Design Targets

- Dense enterprise SaaS layout, not marketing pages.
- Consistent light/dark theme tokens.
- All intelligence outputs include confidence, source references, and review state.
- Long-running AI tasks show job progress and resumable status.
- Every major generated artifact has actions: save, compare, annotate, export, assign, approve.

### Existing Modules to Reuse

- `components/layout/*`
- `components/ui/*`
- `components/patents/*`
- `components/search/*`
- `components/inventions/InventionWorkspace.tsx`
- `components/matters/MatterWorkspace.tsx`
- `app/dashboard/workspace/*`
- `app/dashboard/search/*`
- `app/dashboard/decision/*`
- `app/dashboard/novelty/*`
- `app/dashboard/risk/*`
- `app/dashboard/patentability/*`
- `app/dashboard/invalidity/*`
- `app/dashboard/landscape/*`
- `app/dashboard/reports/*`

### UI Layer Migration

- Move production AI calls out of frontend Next API routes into backend intelligence APIs.
- Keep frontend mock/demo routes only for local demos or storybook-like fixtures.
- Standardize route hierarchy under `/dashboard`.
- Normalize branding to MOAT.

## Layer 2: API Layer

### Responsibility

The API Layer exposes stable enterprise contracts to the UI and external clients. It handles authentication, authorization, request validation, orchestration entry points, and response shaping.

### Target API Domains

```text
/api/v1/auth
/api/v1/orgs
/api/v1/users
/api/v1/workspaces
/api/v1/matters
/api/v1/inventions
/api/v1/patents
/api/v1/search
/api/v1/prior-art
/api/v1/intelligence-runs
/api/v1/novelty
/api/v1/patentability
/api/v1/fto
/api/v1/invalidity
/api/v1/landscape
/api/v1/competitors
/api/v1/drafting
/api/v1/reports
/api/v1/alerts
/api/v1/analytics
/api/v1/admin
```

### API Responsibilities

- Enforce tenant, workspace, matter, and role boundaries.
- Validate inputs with Pydantic schemas.
- Create durable `intelligence_runs` for async AI workflows.
- Return consistent envelopes for job status, errors, warnings, and audit IDs.
- Expose paginated and filterable resources.
- Support export/download endpoints for reports and patent drafts.
- Provide webhooks or event streams for job completion and alerts.

### Target API Patterns

```text
POST /api/v1/intelligence-runs
  Creates an async run for novelty, patentability, FTO, landscape, invalidity, drafting, or filing recommendation.

GET /api/v1/intelligence-runs/{run_id}
  Returns run status, progress, metadata, output summary, and links to artifacts.

GET /api/v1/intelligence-runs/{run_id}/evidence
  Returns retrieved evidence, snippets, citations, and claim mappings.

POST /api/v1/inventions/{id}/prior-art-search
  Starts a corpus-grounded prior-art run for an invention.

POST /api/v1/inventions/{id}/filing-recommendation
  Starts integrated filing recommendation workflow.
```

### Existing API Assets to Reuse

- FastAPI router structure.
- Existing auth, search, patents, collections, workspaces, matters, inventions, reports, visualization, ingestion, collaboration, and AI routers.
- Existing dependency injection and exception handling.

### API Layer Migration

- Consolidate frontend Next analysis APIs into backend FastAPI services.
- Add versioned schemas for intelligence outputs.
- Introduce organization/tenant context.
- Add run/job status endpoints before building deeper UI workflows.

## Layer 3: Search Layer

### Responsibility

The Search Layer retrieves and ranks patent and non-patent evidence. It supports keyword search, semantic search, citation search, family expansion, classification filtering, legal status filtering, and image/figure search.

### Target Search Services

1. Keyword Search Service
   - Elasticsearch-backed full-text search.
   - Advanced filtering by assignee, inventor, date, status, CPC/IPC, jurisdiction, source.

2. Semantic Search Service
   - Weaviate-backed vector retrieval.
   - Invention-to-patent, claim-to-patent, feature-to-patent search.

3. Hybrid Retrieval Service
   - Merges keyword, semantic, citation, and classification search.
   - Deduplicates by patent family.
   - Reranks based on claim-element overlap and date relevance.

4. Prior Art Retrieval Service
   - Generates search strategy from invention disclosure.
   - Searches across patents, uploaded files, and optionally external APIs.
   - Stores search sessions and evidence sets.

5. Citation and Graph Retrieval Service
   - Uses Neo4j for citation neighborhoods, assignee relationships, technology clusters.

6. Image / Figure Search Service
   - Searches diagrams and patent figures by visual description and eventually multimodal embeddings.

### Search Flow

```text
Invention Disclosure
  -> Concept Extraction
  -> Claim Element Extraction
  -> Query Expansion
  -> Keyword Search
  -> Semantic Search
  -> Citation Expansion
  -> Family Deduplication
  -> Legal Status Filter
  -> Reranking
  -> Evidence Set
```

### Search Outputs

- Ranked patent references.
- Patent family groupings.
- Claim/snippet matches.
- Relevance rationale.
- Retrieval score components.
- Source provenance.
- Search strategy metadata.

### Existing Search Assets to Reuse

- `SearchService`
- `PatentService`
- `PatentRepository`
- `ElasticsearchIndexer`
- `app.ai.embeddings`
- ingestion connectors and parsers
- visualization/Neo4j services

### Search Layer Data Contracts

Core objects:

- `SearchSession`
- `EvidenceSet`
- `EvidenceItem`
- `PatentFamily`
- `ClaimElementMatch`
- `RetrievalTrace`

## Layer 4: AI Layer

### Responsibility

The AI Layer provides model access, prompt orchestration, embedding generation, structured extraction, RAG composition, model governance, fallback behavior, and evaluation hooks.

### Target AI Services

1. Model Gateway
   - Provider abstraction for OpenAI and future providers.
   - Model routing by task type.
   - Retry, timeout, rate-limit, and cost controls.

2. Prompt Registry
   - Versioned prompts for invention extraction, novelty, FTO, patentability, drafting, and reports.
   - Prompt metadata, owner, status, tests, and rollout flags.

3. Structured Extraction Service
   - Extracts invention concepts, problems, solutions, components, workflows, claim elements, embodiments, advantages, and constraints.

4. RAG Composer
   - Combines retrieved evidence with task-specific prompts.
   - Requires citation-grounded outputs.
   - Produces structured JSON and human-readable summaries.

5. Embedding Service
   - Patent embeddings.
   - Claim embeddings.
   - Invention embeddings.
   - Figure/image embeddings when supported.

6. AI Evaluation Service
   - Golden test sets.
   - JSON schema validation.
   - Citation coverage checks.
   - Hallucination and unsupported-claim checks.
   - Regression scoring.

7. AI Audit Service
   - Stores prompt version, model, parameters, input hashes, retrieval traces, output, user, tenant, and timestamp.

### AI Layer Flow

```text
Task Request
  -> Policy / Permissions Check
  -> Prompt Version Selection
  -> Retrieval Context Assembly
  -> Model Call
  -> JSON Validation
  -> Evidence Grounding Check
  -> Confidence Calibration
  -> Persisted Output
  -> Audit Record
```

### Existing AI Assets to Reuse

- `app.ai.client`
- `app.ai.router`
- `app.ai.embeddings`
- `app.ai.chat`
- `app.ai.summarization`
- `app.ai.similarity`
- `app.ai.feature_extraction`
- `app.services.inventions.analysis`
- frontend `lib/analysis/*` as prompt/design references, not final production authority

### AI Layer Migration

- Move production intelligence prompts from frontend to backend prompt registry.
- Keep deterministic fallback as a clearly marked offline/demo mode.
- Add schema validation and source grounding before outputs reach users.

## Layer 5: Intelligence Layer

### Responsibility

The Intelligence Layer converts search results and AI outputs into patent-specific business artifacts: novelty matrices, patentability assessments, FTO charts, filing recommendations, patent drafts, and competitor intelligence.

This layer is the core differentiator of MOAT.

### Target Intelligence Services

1. Invention Discovery Service
   - Guided interview.
   - Disclosure completeness scoring.
   - Problem/solution extraction.
   - Technical feature extraction.
   - Inventor review workflow.

2. Invention Analysis Service
   - Component map.
   - Workflow map.
   - Technical architecture.
   - Differentiators.
   - Embodiments and implementation variants.

3. Prior Art Intelligence Service
   - Search strategy generation.
   - Prior-art evidence set creation.
   - Closest reference ranking.
   - Element coverage mapping.

4. Novelty Service
   - Claim element matrix.
   - Novelty score.
   - Closest prior art comparison.
   - Differentiator recommendations.

5. Patentability Service
   - Statutory criteria assessment.
   - Section 101/102/103/112 issue spotting.
   - Disclosure gap analysis.
   - Prosecution risk estimate.

6. FTO / Risk Service
   - Product feature extraction.
   - Live claim overlap analysis.
   - Claim chart generation.
   - Design-around suggestions.
   - License/challenge recommendations.

7. Invalidity Service
   - Target patent claim parsing.
   - Pre-priority prior-art search.
   - Anticipation/obviousness mapping.
   - Challenge strategy recommendation.

8. Filing Recommendation Service
   - Filing readiness score.
   - Claim scope strategy.
   - Filing type recommendation: provisional, non-provisional, PCT, continuation, defensive publication, trade secret.
   - Jurisdiction/family strategy.
   - Budget/timing/risk notes.

9. Drafting Service
   - Claim set generation.
   - Specification generation.
   - Embodiments.
   - Figure descriptions.
   - Abstract/background/summary.
   - Reference numeral and dependency management.

10. Competitor Intelligence Service
    - Competitor profiles.
    - Assignee portfolio monitoring.
    - Filing velocity.
    - Technology clusters.
    - Alerts and watchlists.

### Intelligence Workflow

```text
Invention
  -> Discovery Interview
  -> Structured Disclosure
  -> Prior Art Retrieval
  -> Novelty Matrix
  -> Patentability Assessment
  -> FTO Risk Assessment
  -> Filing Recommendation
  -> Drafting Workspace
  -> Attorney Review
  -> Export / Monitoring
```

### Target Intelligence Artifacts

- `InventionDisclosure`
- `ConceptMap`
- `ClaimElementSet`
- `PriorArtSearchSession`
- `EvidenceSet`
- `NoveltyReport`
- `PatentabilityReport`
- `FtoReport`
- `InvalidityReport`
- `LandscapeReport`
- `FilingRecommendation`
- `DraftingProject`
- `ClaimSet`
- `SpecificationDraft`
- `CompetitorWatchlist`
- `IntelligenceRun`

### Existing Assets to Reuse

- Invention models and services.
- Matter and workspace models.
- Frontend decision/analysis UI concepts.
- Existing local novelty/FTO/patentability/invalidity/landscape schemas as initial output schema drafts.
- Reports and scheduled reports.

## Layer 6: Analytics Layer

### Responsibility

The Analytics Layer converts patent, usage, search, intelligence, and competitor data into dashboards, metrics, alerts, and decision support.

### Target Analytics Domains

1. Patent Portfolio Analytics
   - Filing trends.
   - Assignee share.
   - Technology clusters.
   - Citation influence.
   - Family coverage.

2. Competitor Analytics
   - Filing velocity.
   - New filings by assignee.
   - Technology entry/exit signals.
   - Threat/opportunity alerts.

3. Invention Pipeline Analytics
   - Inventions by stage.
   - Filing readiness distribution.
   - Review bottlenecks.
   - Conversion from disclosure to filing.

4. Search Analytics
   - Query history.
   - Saved searches.
   - Search effectiveness.
   - Retrieval precision feedback.

5. AI Quality Analytics
   - Model usage.
   - Cost and latency.
   - Output acceptance/rejection.
   - Citation coverage.
   - Human correction patterns.

6. Enterprise Usage Analytics
   - Active users.
   - Workspace/matter activity.
   - Storage usage.
   - API usage.
   - Export/report usage.

### Analytics Outputs

- Executive dashboards.
- Workspace dashboards.
- Matter-level summaries.
- Competitor watch dashboards.
- AI governance dashboards.
- Alert digests.

### Existing Assets to Reuse

- `analytics/router.py`
- Search analytics in `SearchService`
- Visualization routes and components
- Alerts model and routes
- Reports and scheduled reports
- Dashboard chart/feed components

### Analytics Layer Migration

- Standardize event capture.
- Add `events` or expand `audit_logs` for analytics-safe telemetry.
- Materialize expensive analytics as background jobs.
- Add role-specific dashboards.

## Layer 7: Storage Layer

### Responsibility

The Storage Layer persists transactional data, search indexes, vector indexes, graph data, files, audit logs, generated artifacts, and analytics aggregates.

### Target Storage Components

1. PostgreSQL
   - System of record.
   - Users, organizations, workspaces, matters, inventions, patents, reports, intelligence runs, drafts, permissions, audit logs.

2. Elasticsearch
   - Keyword/full-text patent search.
   - Filtering, facets, aggregations.

3. Weaviate
   - Vector search for patents, claims, inventions, uploaded documents, and image descriptions.

4. Neo4j
   - Citation graph.
   - Assignee graph.
   - Technology relationship graph.
   - Patent family graph if useful.

5. Redis
   - Celery broker/result backend.
   - Caching.
   - Short-lived locks and job state.

6. Object Storage
   - Uploaded documents.
   - Patent PDFs.
   - Figures/images.
   - Generated reports.
   - Draft exports.

7. Analytics Store / Materialized Views
   - Optional future layer for aggregate analytics.
   - Could start as PostgreSQL materialized views.

### Target New Tables / Models

```text
organizations
organization_members
api_keys
permissions

intelligence_runs
intelligence_run_steps
intelligence_evidence
retrieval_traces
ai_audit_logs
prompt_versions
model_invocations

prior_art_search_sessions
prior_art_references
claim_elements
claim_element_matches
novelty_reports
patentability_reports
fto_reports
invalidity_reports
filing_recommendations

patent_families
patent_family_members
legal_status_events
assignee_profiles
competitor_watchlists
competitor_alerts

patent_drafts
claim_sets
claims
specification_sections
draft_exports
review_comments
```

### Existing Storage Assets to Reuse

- PostgreSQL via SQLAlchemy and Alembic.
- Existing patents, saved patents, collections, workspaces, matters, inventions, reports, alerts, audit logs.
- Elasticsearch indexer.
- Weaviate patent/image collections.
- Neo4j graph client.
- Redis/Celery.

### Storage Layer Migration

- Decide whether backend PostgreSQL or Supabase is the system of record.
- Add tenant/org columns before enterprise rollout.
- Add intelligence run models before deep AI workflow implementation.
- Add object storage abstraction before production uploads/exports.

## Cross-Cutting Enterprise Architecture

### Security and Tenancy

- Organization-level tenancy.
- Workspace and matter-scoped permissions.
- RBAC: owner, admin, attorney, analyst, inventor, viewer.
- Optional ABAC for confidential matters and restricted inventions.
- SSO/OIDC/SAML-ready auth architecture.
- API keys for enterprise integrations.
- Audit logging for data access and AI output generation.

### Compliance and Legal Governance

- Clear legal disclaimer boundaries.
- Human review state for all filing/legal conclusions.
- Evidence provenance on every AI conclusion.
- Immutable audit trails for generated recommendations.
- Data retention policies by organization and matter.
- Export controls and confidentiality flags where needed.

### Async Jobs and Events

Long-running workflows should run asynchronously:

```text
API request
  -> intelligence_runs row created
  -> Celery task enqueued
  -> run steps update progress
  -> evidence and artifacts persisted
  -> notification emitted
  -> UI polls/subscribes to status
```

Candidate events:

- `invention.created`
- `invention.analyzed`
- `prior_art.completed`
- `novelty.completed`
- `patentability.completed`
- `filing_recommendation.completed`
- `draft.generated`
- `competitor.alert.created`

### Observability

- API latency and error rates.
- Search latency and zero-result rates.
- AI model latency, cost, token usage, and failure rates.
- Job queue depth and failure rates.
- Retrieval quality and citation coverage.
- User workflow conversion metrics.

## Target End-to-End Workflows

### Workflow A: Invention to Filing Recommendation

```text
1. User creates invention disclosure.
2. MOAT extracts concepts, components, embodiments, and claim elements.
3. MOAT runs hybrid prior-art retrieval.
4. MOAT generates novelty matrix.
5. MOAT evaluates patentability criteria.
6. MOAT optionally evaluates FTO risk.
7. MOAT generates filing recommendation.
8. Attorney reviews and approves/rejects recommendation.
9. User starts patent draft from approved recommendation.
```

### Workflow B: Prior-Art Search

```text
1. User submits invention, claim, patent, or keyword query.
2. Search Layer performs hybrid retrieval.
3. Intelligence Layer groups references by family and relevance.
4. UI shows ranked evidence with snippets and claim-element matches.
5. User saves references to matter or report.
```

### Workflow C: Patent Drafting

```text
1. User selects invention and approved filing recommendation.
2. Drafting Service creates claim strategy.
3. Claims are generated with dependencies.
4. Specification sections are generated from disclosure and embodiments.
5. Attorney edits, comments, and exports.
```

### Workflow D: Competitor Monitoring

```text
1. User creates competitor watchlist or assignee profile.
2. Search Layer periodically checks new filings.
3. Analytics Layer detects velocity, cluster, and threat changes.
4. Intelligence Layer summarizes impact.
5. Alerts are delivered and linked to workspaces/matters.
```

## Component Ownership Map

| Layer | Primary Backend Ownership | Primary Frontend Ownership |
|---|---|---|
| UI | N/A | Next.js dashboard, workflows, review UX |
| API | FastAPI routers, schemas, auth, RBAC | API clients, hooks, stores |
| Search | Search services, indexers, retrieval traces | Search UI, filters, review panels |
| AI | Model gateway, prompts, RAG, evaluation | Job status UX, output review UX |
| Intelligence | Domain services and persisted artifacts | Report/matrix/drafting workspaces |
| Analytics | Aggregation services, event capture | Dashboards and alerts UI |
| Storage | PostgreSQL, ES, Weaviate, Neo4j, Redis, object storage | No direct production storage access except approved upload/download URLs |

## Migration Roadmap

### Phase 1: Architecture Consolidation

- Normalize MOAT branding.
- Decide source of truth for auth and database.
- Move frontend Next AI analysis APIs behind backend service contracts.
- Add `intelligence_runs` and `ai_audit_logs`.
- Add object storage abstraction.

### Phase 2: Invention Intelligence Pipeline

- Add concept extraction and claim-element extraction.
- Connect invention workspace to hybrid prior-art retrieval.
- Persist evidence sets.
- Generate and persist novelty reports.
- Generate and persist patentability reports.

### Phase 3: Filing and Drafting

- Add filing recommendation service.
- Add draft project, claim set, and specification models.
- Build drafting UI.
- Add review and export flows.

### Phase 4: Competitor Monitoring and Analytics

- Add assignee/competitor profiles.
- Add watchlists and scheduled searches.
- Add alert intelligence summaries.
- Add executive dashboards.

### Phase 5: Enterprise Hardening

- Organization tenancy and RBAC.
- SSO/API keys.
- Usage metering.
- AI evaluation suite.
- Compliance, audit, and retention controls.

## Target Architecture Diagram

```text
                           UI LAYER
  -----------------------------------------------------------------
  Next.js Dashboard | Invention Workspace | Search | Reports | Drafting
                              |
                              v
                          API LAYER
  -----------------------------------------------------------------
  FastAPI Routers | Auth/RBAC | Job APIs | Resource APIs | Webhooks
                              |
             -----------------------------------------
             |                   |                   |
             v                   v                   v
        SEARCH LAYER          AI LAYER        INTELLIGENCE LAYER
  ---------------------  -----------------  -------------------------
  Elasticsearch          Model Gateway       Novelty Service
  Weaviate               Prompt Registry     Patentability Service
  Neo4j                  RAG Composer        FTO Service
  Hybrid Retrieval       Eval/Audit          Drafting Service
             |                   |                   |
             --------------------|--------------------
                                  v
                            ANALYTICS LAYER
  -----------------------------------------------------------------
  Portfolio Analytics | Competitor Analytics | AI Quality | Usage
                                  |
                                  v
                             STORAGE LAYER
  -----------------------------------------------------------------
  PostgreSQL | Elasticsearch | Weaviate | Neo4j | Redis | Object Storage
```

## Architecture Decision Records Needed

1. Backend PostgreSQL vs Supabase as source of truth.
2. Tenant model and role model.
3. AI provider strategy and model gateway design.
4. Object storage provider.
5. Patent data provider strategy.
6. Patent family/legal status normalization strategy.
7. Async job model and eventing strategy.
8. Draft export format requirements.

## Final Target State

MOAT should become a workflow-native Patent Intelligence Platform:

```text
Search Platform
  -> Invention Intelligence System
    -> Corpus-Grounded Patent Analysis
      -> Filing Strategy and Drafting Platform
        -> Enterprise IP Intelligence Operating System
```

The existing application should be evolved by consolidating current modules, grounding AI outputs in search evidence, persisting intelligence artifacts, and adding enterprise controls around tenancy, auditability, permissions, and AI governance.
