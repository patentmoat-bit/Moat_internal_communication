# 🏰 MOAT: The Complete Master Architecture, Role Blueprints & System Specification

> **Document Version:** 1.0.0 (Fresh Architecture Release)  
> **Platform Goal:** AI-Powered Patent Intelligence, IP Management, and Cross-Role Collaboration Ecosystem.  
> **Status:** Ground-Zero Specification for Fresh-Start Development.

---

# 📑 Table of Contents
1. [Executive Vision & Core Philosophy](#1-executive-vision--core-philosophy)
2. [Target Enterprise System Design & Load Balancing Architecture](#2-target-enterprise-system-design--load-balancing-architecture)
3. [The 9 Roles & Persona Master Blueprints (Deep-Dive)](#3-the-9-roles--persona-master-blueprints-deep-dive)
   - [Role 1: Researcher / Inventor / R&D Lead](#role-1-researcher--inventor--rd-lead)
   - [Role 2: Patent Drafter / Patent Agent](#role-2-patent-drafter--patent-agent)
   - [Role 3: Patent Counsel / Legal Head](#role-3-patent-counsel--legal-head)
   - [Role 4: IP & Competitive Intelligence Analyst](#role-4-ip--competitive-intelligence-analyst)
   - [Role 5: Product Manager (PM)](#role-5-product-manager-pm)
   - [Role 6: Chief Technology Officer (CTO)](#role-6-chief-technology-officer-cto)
   - [Role 7: Chief IP Officer (CIO) / IP Strategist](#role-7-chief-ip-officer-cio--ip-strategist)
   - [Role 8: Chief Executive Officer (CEO)](#role-8-chief-executive-officer-ceo)
   - [Role 9: System & Security Administrator (Admin)](#role-9-system--security-administrator-admin)
4. [Universal Role Comparison & Connectivity Matrix](#4-universal-role-comparison--connectivity-matrix)
5. [Advanced Internal Communication & Collaboration Hub](#5-advanced-internal-communication--collaboration-hub)
6. [Clean Unified PostgreSQL Database Schema](#6-clean-unified-postgresql-database-schema)
7. [Fresh Ground-Zero Build Roadmap](#7-fresh-ground-zero-build-roadmap)

---

# 1. Executive Vision & Core Philosophy

### What is MOAT?
In warfare, a **moat** is a deep, protective water barrier surrounding a castle to prevent enemy invasions. In modern technology business, a **MOAT** is the impregnable wall of **Patents, Trade Secrets, and Intellectual Property (IP)** built around a company’s proprietary technology so competitors cannot copy or steal it.

### Core Problems MOAT Solves:
1. **Disconnected Teams:** Engineers invent things, but Legal only discovers it months later when it's too late.
2. **Expensive & Slow Patent Drafting:** Writing a patent costs \$10,000–\$25,000 and takes 3–6 months. AI-assisted drafting cuts this to 2 days.
3. **Patent Blindness:** Companies launch products without knowing if Apple, Google, or patent trolls already own a blocking patent (Lack of Freedom to Operate).
4. **Poor Collaboration & Spam:** Reviewing patent claims using email creates confusion, lost context, and confidentiality risks.

---

# 2. Target Enterprise System Design & Load Balancing Architecture

```mermaid
graph TD
    Client["Clients (Web / Mobile / Desktop)"] -->|HTTPS / WSS| Cloudflare["Cloudflare Edge (WAF, DDoS, SSL)"]
    
    subgraph K8s["Kubernetes Production Cluster (Namespace: patent-platform)"]
        Cloudflare -->|Layer 7 Load Balancing| Ingress["NGINX Ingress Controller + Rate Limiter (100r/s)"]
        
        Ingress -->|Route: / | FrontendHPA["Frontend (Next.js 15 SSR) - HPA (3 to 10 Pods)"]
        Ingress -->|Route: /api/* | FastAPIBff["Unified API Gateway / FastAPI - HPA (3 to 20 Pods)"]
        
        FastAPIBff -->|Semantic Cache (<100ms)| RedisCache["Redis Cluster (Semantic Cache + Session State)"]
        
        FastAPIBff -->|High Priority Queue| CeleryHigh["Celery Workers (Novelty, Triage, Live Alerts)"]
        FastAPIBff -->|Bulk Ingestion Queue| CeleryBulk["Celery Workers (50MB+ PDF OCR, Vector Indexing)"]
        
        FastAPIBff --> PgBouncer["PgBouncer Connection Pooler (10,000 conns -> 50 pool)"]
        PgBouncer --> PostgreSQL[("PostgreSQL 16 (Relational DB + JSONB)")]
        
        FastAPIBff --> Weaviate[("Weaviate Vector DB (Semantic Embeddings)")]
        FastAPIBff --> Elasticsearch[("Elasticsearch (BM25 Keyword & CPC Search)")]
        FastAPIBff --> Neo4j[("Neo4j Graph DB (Citation Network)")]
    end
```

### Key Architectural Pillars:
1. **Unified API Gateway (Single Source of Truth):**
   - Eliminate split-brain routing. Next.js handles pure UI presentation; all business logic, AI pipelines, and database operations run through FastAPI (`/api/v1/...`).
2. **Elastic High-Availability Load Balancing:**
   - Layer 7 NGINX Ingress with sticky sessions for WebSockets, GZIP/Brotli compression, and automatic **Horizontal Pod Autoscaling (HPA)** based on CPU/Memory thresholds.
3. **Connection Pooling via PgBouncer:**
   - Multiplies database concurrency by 100x, preventing `FATAL: remaining connection slots are reserved` crashes.
4. **Multi-Tier Task Queueing:**
   - Heavy 500-page OCR jobs never block instant AI novelty calculations or user notifications.
5. **Redis Semantic Caching:**
   - Caches vector embeddings and LLM responses. Repeated searches return in <80ms with 0 API token cost.

---

# 3. The 9 Roles & Persona Master Blueprints (Deep-Dive)

---

## 🔬 Role 1: Researcher / Inventor / R&D Lead

### 1. Person / Role – Yaaru?
* The core engineering genius, software architect, hardware designer, AI researcher, or scientist building proprietary breakthroughs.
* **Motto:** *"I just invented a novel mechanism; is it patentable?"*

### 2. Responsibilities – Enna pannuvaanga?
* Document new inventions into structured **Invention Disclosure Forms (IDF)**.
* Run instant novelty and prior-art checks before publishing blogs or pushing open-source code.
* Collaborate with Patent Drafters to explain the technical architecture and mathematical proofs.

### 3. Core Concepts & IP Terminologies:
* **Invention Disclosure Form (IDF):** The initial internal document describing the problem, solution, technical novelty, and diagrams.
* **Novelty (புதுமைத்தனம்):** Absolute global uniqueness. If the idea is already in any public document worldwide, novelty is broken.
* **Prior Art (முந்தைய ஆவணங்கள்):** All existing world patents, academic papers (IEEE, arXiv), blogs, and GitHub repositories.
* **Novelty Score (0–100%):** Vector similarity inverse metric measuring how far this idea is from existing patents.

### 4. What they do in MOAT:
1. Logs into `/dashboard/research` (R&D Novelty Studio).
2. Drops technical specs, code snippets, or architecture diagrams into the **IDF Submission Portal**.
3. MOAT AI parses the text, extracts core claim hypotheses, searches 120M+ global patents, and generates an instant **Novelty Score + Prior Art Heatmap**.
4. If score > 80%, submits IDF to the **Legal Approval Pipeline** with one click.
5. Uses inline discussions to answer questions from the Patent Drafter.

### 5. Features & Functionalities Needed:
* 📝 **Smart IDF Composer:** Rich markdown/LaTeX editor with drag-and-drop code & diagram support.
* ⚡ **Realtime AI Novelty Radar:** Live prior-art overlap breakdown with direct links to similar USPTO/EPO patents.
* 💬 **Inline Discussion Overlay:** Pin questions on specific technical sentences and tag `@zyra` or `@legal`.
* 📊 **Inventor Pipeline Dashboard:** Track submission stage (`Drafting` -> `Legal Review` -> `Filed` -> `Granted`).

---

## ✍️ Role 2: Patent Drafter / Patent Agent

### 1. Person / Role – Yaaru?
* The technical-legal writer and patent engineer who converts raw engineer notes into enforceable legal documents.
* **Motto:** *"I transform technical ideas into unbreakable patent claims."*

### 2. Responsibilities – Enna pannuvaanga?
* Write complete Patent Specifications (Abstract, Background, Summary, Detailed Description, Embodiments).
* Draft and engineer the legal **Claims Hierarchy** (Independent & Dependent claims).
* Ensure claims are broad enough to block competitors, but narrow enough to survive Patent Office scrutiny.

### 3. Core Concepts & IP Terminologies:
* **Independent Claims:** Standalone claims defining the broadest essential features of the invention.
* **Dependent Claims:** Narrower claims referencing an independent claim to add specific fallback protections.
* **Claim Tree Hierarchy:** Visual tree showing dependencies (Claim 1 -> Claims 2–5).
* **Enablement & Best Mode:** Legal requirement that the specification must explain the invention thoroughly enough for a skilled person to build it.

### 4. What they do in MOAT:
1. Opens `/dashboard/patent-drafter` (AI Drafting Studio).
2. Selects an approved IDF from the R&D queue.
3. Uses **AI Drafting Copilot** to auto-generate Abstract, Technical Background, and First-Pass Claims.
4. Uses the **Interactive Claim Tree Visualizer** to edit claim dependencies and check for ambiguous terms.
5. Runs **Claim Scope Analyzer** to ensure no loopholes exist.
6. Submits completed draft to Legal Counsel for final sign-off.

### 5. Features & Functionalities Needed:
* 🤖 **AI Patent Drafting Studio:** Auto-generates complete USPTO/EPO compliant sections.
* 🌳 **Interactive Claim Tree Visualizer:** Drag-and-drop claim hierarchy editor with circular dependency checks.
* 🔍 **Claim Scope & Antecedent Basis Checker:** Flags ambiguous terms and missing definitions automatically.
* 📄 **Multi-Format Exporter:** 1-click export to DOCX, PDF, and USPTO XML formats.

---

## ⚖️ Role 3: Patent Counsel / Legal Head

### 1. Person / Role – Yaaru?
* The company’s in-house Patent Attorney, IP Director, or General Counsel responsible for legal compliance, patentability, risk, and litigation.
* **Motto:** *"We protect the business, mitigate lawsuit risks, and build enforceable assets."*

### 2. Responsibilities – Enna pannuvaanga?
* Review all submitted IDFs and make formal **Patentability Decisions** (Approve / Reject / Hold).
* Conduct **Freedom to Operate (FTO)** clearance searches before commercial product releases.
* Manage legal matters, filing deadlines, official Patent Office correspondence (Office Actions), and maintenance fees.
* Execute patent invalidation and infringement lawsuits against infringing competitors.

### 3. Core Concepts & IP Terminologies:
* **Patentability Criteria (USPTO §101, 102, 103):** Subject Matter Eligibility (§101), Novelty (§102), Non-Obviousness (§103).
* **Freedom to Operate (FTO / Clearance):** Guarantee that our product does not violate any third-party active patents.
* **Office Action (OA):** Official objection or rejection letter from a Patent Office Examiner.
* **Matter & Docketing:** Case management tracking application numbers, priority dates, office action deadlines, and renewal fees.
* **Claim Chart & Evidence of Use (EoU):** Side-by-side mapping proving that a competitor's product infringes our patent claims.

### 4. What they do in MOAT:
1. Opens `/dashboard/legal` (Counsel Cockpit) and `/dashboard/matters`.
2. Reviews incoming IDFs in the **Decision Matrix** (Evaluates Novelty Score vs Legal Risk vs Business Value).
3. 1-Click approves high-value IDFs or requests changes via inline notes.
4. Tracks active patent matters across global jurisdictions (US, EP, JP, IN, CN) with visual deadline alerts.
5. Generates **Claim Charts** to support litigation or licensing.

### 5. Features & Functionalities Needed:
* ⚖️ **Patentability & Decision Matrix:** Multi-factor scoring engine (Legal Risk, Novelty, Commercial Value).
* 📂 **Matter Docketing Engine:** Global filing calendar with countdowns to statutory deadlines.
* 🛡️ **Risk & FTO Clearance Analyzer:** Red/Amber/Green safety indicator for upcoming product releases.
* ⚔️ **Invalidity & Claim Chart Generator:** Auto-generates side-by-side evidence charts for litigation.

---

## 🔎 Role 4: IP & Competitive Intelligence Analyst

### 1. Person / Role – Yaaru?
* The market intelligence researcher and patent analyst who monitors competitor technologies and identifies strategic industry gaps.
* **Motto:** *"I discover what competitors are building before they announce it."*

### 2. Responsibilities – Enna pannuvaanga?
* Track competitor patent filing trajectories (Google, Apple, Microsoft, etc.).
* Identify **Technology Whitespaces** (unclaimed technology areas where we can patent first).
* Run complex semantic, boolean, and citation network queries across millions of patents.

### 3. Core Concepts & IP Terminologies:
* **Patent Landscape (தொழில்நுட்ப வரைபடம்):** 2D/3D cluster map showing technological density and major players in a domain.
* **Whitespace Analysis (வெற்றிட வாய்ப்புகள்):** Uncrowded areas on the technology map representing untapped patent opportunities.
* **Forward & Backward Citations:** Who cited this patent (Forward) and what patents did this patent cite (Backward).
* **CPC / IPC Classification:** International patent taxonomy codes (e.g., `G06N` for Neural Networks).

### 4. What they do in MOAT:
1. Opens `/dashboard/analyst`, `/dashboard/competitor`, and `/dashboard/landscape`.
2. Queries the **Hybrid Search Engine** (Combining Elasticsearch BM25 + Weaviate vector search).
3. Generates **Interactive 2D/3D Tech Landscape Clusters** to identify competitor clusters.
4. Discovers whitespaces and notifies the CTO and Product Managers to patent those gaps.
5. Exports executive intelligence reports.

### 5. Features & Functionalities Needed:
* 🗺️ **3D Interactive Patent Landscape Visualizer:** Dynamic cluster map with PCA/t-SNE dimensionality reduction.
* 🕵️ **Competitor Radar & Realtime Feed:** Automated weekly alerts when competitors file new patents.
* 🔍 **Hybrid Multi-Engine Search:** Boolean logic (`AND/OR/NOT`) + semantic vector similarity + CPC code filtering.
* 📊 **Automated Report Builder:** 1-click export to executive PDF/PPT presentations.

---

## 📦 Role 5: Product Manager (PM)

### 1. Person / Role – Yaaru?
* The product owner guiding feature development, commercial releases, and user experience.
* **Motto:** *"I want our product features protected by patents with zero legal launch risks."*

### 2. Responsibilities – Enna pannuvaanga?
* Map upcoming product features to company patent portfolios.
* Request **FTO Clearance** from Legal before every major feature release.
* Convert Product Requirement Documents (PRD) into Invention Disclosures.

### 3. Core Concepts & IP Terminologies:
* **Feature-to-Patent Mapping:** Associating software/hardware features directly with patent claims.
* **Launch Clearance:** Legal sign-off confirming no competitor patents block feature deployment.
* **Product Moat Strength:** The percentage of commercial features shielded by proprietary patents.

### 4. What they do in MOAT:
1. Opens `/dashboard/product` and `/dashboard/projects`.
2. Connects product roadmap milestones with patent filings.
3. Submits PRD sections to MOAT AI to auto-extract potential invention ideas.
4. Verifies the **FTO Launch Safety Indicator** before pushing features to production.

### 5. Features & Functionalities Needed:
* 🗺️ **Feature-to-Patent Linker Matrix:** Visual grid connecting commercial features to underlying patents.
* 🚦 **Launch Safety Indicator:** Real-time FTO status check per product release.
* 💡 **PRD-to-IDF AI Extractor:** Converts feature specs into structured invention disclosure drafts.

---

## 💻 Role 6: Chief Technology Officer (CTO)

### 1. Person / Role – Yaaru?
* The executive leader overseeing total engineering strategy, technology architecture, and R&D velocity.
* **Motto:** *"Is our core technology architecture future-proof and protected against copycats?"*

### 2. Responsibilities – Enna pannuvaanga?
* Monitor R&D team productivity, invention velocity, and patent yields.
* Evaluate competitor technical threats and technology shift trends.
* Ensure company crown jewels (core algorithms, protocols) have unbreakable patent moats.

### 3. Core Concepts & IP Terminologies:
* **Tech Moat Index:** Metric scoring how defensible the company's core software stack is.
* **R&D Patent Yield:** Number of high-value patents generated per million dollars of R&D budget.
* **Technology Threat Radar:** Real-time assessment of competitor patent advancements in our core domain.

### 4. What they do in MOAT:
1. Opens `/dashboard/cto` and `/dashboard/landscape`.
2. Reviews the **Tech Moat Health Index** and R&D invention pipeline.
3. Identifies emerging technological threats from competitors and reallocates engineering resources.

### 5. Features & Functionalities Needed:
* 📊 **Tech Moat Index & R&D Velocity Dashboard:** Real-time R&D patent conversion metrics.
* 🧭 **Technology Threat Matrix:** Heatmap comparing our patent density vs competitors across core tech stacks.
* 🔬 **Invention Pipeline Funnel:** Track conversion rates from raw idea to granted patent.

---

## 💼 Role 7: Chief IP Officer (CIO) / IP Strategist

### 1. Person / Role – Yaaru?
* The executive managing the patent portfolio as a strategic financial and revenue-generating asset.
* **Motto:** *"I maximize the commercial valuation and monetization ROI of our IP portfolio."*

### 2. Responsibilities – Enna pannuvaanga?
* Calculate patent portfolio valuation (\$M) for investors, board members, and M&A transactions.
* Manage international filing budgets and prune weak patents to save renewal fees.
* Drive patent monetization, licensing agreements, and cross-licensing deals.

### 3. Core Concepts & IP Terminologies:
* **Portfolio Valuation (\$M):** Monetary value of the company's IP based on citation weight, market size, and claim breadth.
* **Patent Pruning (Cost Optimization):** Dropping low-value patents to save recurring maintenance fees.
* **Patent Monetization & Royalty Licensing:** Licensing patents to third parties for recurring royalty revenue.

### 4. What they do in MOAT:
1. Opens `/dashboard/cio` and `/dashboard/marketplace`.
2. Inspects total **Portfolio Valuation (\$M)** and cost-vs-value maintenance curves.
3. Prunes weak patents to save \$100k+ in international annuity fees.
4. Manages out-licensing opportunities in the **Patent Marketplace**.

### 5. Features & Functionalities Needed:
* 💰 **IP Financial & Valuation Engine:** Algorithmic dollar valuation per patent asset.
* 🌐 **Global Jurisdictional Budget Optimizer:** Cost projections across US, EP, CN, JP, IN.
* 🏷️ **Patent Monetization Hub:** Track licensing deals, royalties, and commercialization pipeline.

---

## 👑 Role 8: Chief Executive Officer (CEO)

### 1. Person / Role – Yaaru?
* The enterprise leader driving company valuation, market dominance, and investor relations.
* **Motto:** *"How strong is our defensive wall, and what is our IP worth to investors?"*

### 2. Responsibilities – Enna pannuvaanga?
* Understand high-level IP defensibility in 30 seconds.
* Present IP moat strength to Board of Directors, Venture Capitalists, and M&A buyers.
* Avoid existential lawsuit risks.

### 3. Core Concepts & IP Terminologies:
* **Enterprise Valuation Multiple:** Premium added to company valuation due to a strong proprietary patent moat.
* **Litigation Exposure:** Financial risk posed by competitor lawsuits or patent trolls.
* **Moat Strength Index:** Single 1–100 executive score representing overall market defensibility.

### 4. What they do in MOAT:
1. Opens `/dashboard/ceo` (Executive Moat Studio).
2. Views the 30-second **Executive Summary KPIs** (Moat Score: 94/100, Valuation: \$45M, Active Threats: 0).
3. Interacts with **Zyra Executive Copilot** via natural language voice/text query (*"Summarize our patent defensibility against Google"*).
4. Generates 1-Click Board-Ready PDF reports.

### 5. Features & Functionalities Needed:
* ⚡ **30-Second Executive KPI Summary:** Total Valuation, Moat Health Index, Active Threats.
* 🗣️ **Zyra Executive AI Copilot:** Instant natural language conversational intelligence.
* 📄 **1-Click Board Decks:** Auto-compiled presentation slides for investors and board meetings.

---

## 🛠️ Role 9: System & Security Administrator (Admin)

### 1. Person / Role – Yaaru?
* The DevOps, SecOps, and IT administrator managing platform security, access control, and integrations.

### 2. Responsibilities & Features:
* Manage **Role-Based Access Control (RBAC)** across all 9 personas.
* Manage API Keys & AI Provider connections (OpenAI, Anthropic, Weaviate, Elastic).
* Enforce military-grade encryption and review security audit logs (preventing unfiled invention leaks).

---

# 4. Universal Role Comparison & Connectivity Matrix

| Role | Main Question Asked | Core Metric / Concept | Primary Workspace Route |
| :--- | :--- | :--- | :--- |
| **Researcher** | *"Is my invention novel and unique?"* | Novelty Score, Prior Art Overlap | `/dashboard/research` |
| **Patent Drafter** | *"How do I draft enforceable claims?"* | Claims, Specification, Claim Tree | `/dashboard/patent-drafter` |
| **Patent Counsel** | *"Is this patentable and legally safe?"* | Patentability, FTO Clearance, Matters | `/dashboard/legal` |
| **IP Analyst** | *"What are competitors filing?"* | Landscape Map, Whitespace, Radar | `/dashboard/analyst` |
| **Product Manager**| *"Can we release this feature safely?"*| Feature Mapping, Launch Clearance | `/dashboard/product` |
| **CTO** | *"Is our core tech future-proof?"* | Tech Moat Index, R&D Velocity | `/dashboard/cto` |
| **CIO** | *"What is the financial ROI of our IP?"*| Portfolio Valuation (\$M), Licensing | `/dashboard/cio` |
| **CEO** | *"How strong is our defensive wall?"* | Moat Health Score, Enterprise Value | `/dashboard/ceo` |
| **Admin** | *"Is data secure & access compliant?"* | RBAC Scopes, Audit Trail, Secrets | `/dashboard/admin` |

---

# 5. Advanced Internal Communication & Collaboration Hub

To prevent email spam and eliminate lost context, MOAT employs an integrated 4-part communication system:

```text
1. Contextual Inline Anchor Comments (Figma-style)
   └── Pinned directly to Patent Claims, IDF Descriptions, or Novelty Scores.
   └── Margin badges with smooth scroll navigation and resolution status.

2. Actionable Slide-Over Drawer
   └── Notifications categorized by: All, Mentions @, Approvals, AI Daily Digest.
   └── Direct 1-click in-drawer actions (Approve IDF, Request Changes, Reply).

3. Zyra AI In-Thread Copilot
   └── Tag @zyra in any thread to get instant §102/103 prior art analysis and citations.

4. Granular Notification Preferences
   └── User-controlled toggles: In-App Alerts, Urgent Mentions Only, Daily 9 AM AI Digest, Slack/Teams Webhooks.
```

---

# 6. Clean Unified PostgreSQL Database Schema

```sql
-- 1. RBAC & USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- researcher, drafter, legal, analyst, product, cto, cio, ceo, admin
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INVENTIONS & DISCLOSURES (IDF)
CREATE TABLE inventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    abstract TEXT,
    technical_description TEXT NOT NULL,
    inventor_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'draft', -- draft, novelty_scored, legal_review, approved, drafting, filed, rejected
    novelty_score NUMERIC(5,2), -- e.g. 94.50
    novelty_analysis JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PATENTS & CLAIMS
CREATE TABLE patents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invention_id UUID REFERENCES inventions(id),
    patent_number VARCHAR(100) UNIQUE, -- e.g. US-11849204-B2
    title VARCHAR(500) NOT NULL,
    abstract TEXT,
    jurisdiction VARCHAR(10) DEFAULT 'US',
    status VARCHAR(50) DEFAULT 'drafting', -- drafting, filed, published, granted, abandoned
    filing_date DATE,
    grant_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patent_id UUID REFERENCES patents(id) ON DELETE CASCADE,
    claim_number INT NOT NULL,
    claim_type VARCHAR(20) DEFAULT 'independent', -- independent, dependent
    parent_claim_id UUID REFERENCES claims(id),
    claim_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MATTERS & DOCKETING
CREATE TABLE matters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patent_id UUID REFERENCES patents(id),
    docket_number VARCHAR(100) UNIQUE NOT NULL,
    responsible_counsel_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'active',
    filing_deadline DATE,
    office_action_deadline DATE,
    budget NUMERIC(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COLLABORATION & INTERNAL COMMUNICATION
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(50) NOT NULL, -- patent, invention, claim
    target_id UUID NOT NULL,
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id),
    anchor_line INT,
    anchor_text TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- mention, approval_request, approval_decision, deadline, ai_digest
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_type VARCHAR(50),
    target_id UUID,
    action_url VARCHAR(500),
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    in_app_alerts BOOLEAN DEFAULT TRUE,
    urgent_mentions_email BOOLEAN DEFAULT TRUE,
    daily_morning_digest BOOLEAN DEFAULT TRUE,
    slack_webhook_enabled BOOLEAN DEFAULT FALSE,
    slack_webhook_url VARCHAR(500)
);
```

---

# 7. Fresh Ground-Zero Build Roadmap

To build this cleanly from scratch without legacy bugs:

```text
Phase 1: Foundation & Infrastructure (Days 1–3)
 ├── 1. Clean Database Schema migrations via Alembic.
 ├── 2. Seed Default Roles, Permissions & Master Users.
 └── 3. Deploy Kubernetes Ingress Load Balancer with HPA and Rate Limiting.

Phase 2: Unified API Gateway & AI Engines (Days 4–7)
 ├── 1. FastAPI Core Endpoints (Inventions, Patents, Claims, Matters).
 ├── 2. Multi-tier Celery Queues (High-Priority vs Bulk Ingestion).
 ├── 3. Weaviate Vector & Elasticsearch Semantic Search Pipelines.
 └── 4. Redis Semantic Response Caching.

Phase 3: Next-Gen UI/UX & Global Shell (Days 8–11)
 ├── 1. Next.js 15 App Router with Obsidian & Cyber-Amber Theme.
 ├── 2. Global Cmd+K Command Palette.
 ├── 3. Categorized Collapsible Navigation Sidebar & Dynamic Header.
 └── 4. Actionable Communication Drawer & Realtime WebSocket Channel.

Phase 4: Role-Specific Workspaces (Days 12–16)
 ├── 1. Researcher / Inventor Studio (IDF Submission + Live Novelty Radar).
 ├── 2. Patent Drafter Studio (AI Drafting Copilot + Claim Tree Editor).
 ├── 3. Legal Counsel Cockpit (Patentability Matrix + Matter Docketing).
 ├── 4. Analyst & Product Studios (Landscape 3D Cluster + FTO Clearance).
 └── 5. Executive Moat Studios (CEO / CTO / CIO Valuation & Zyra AI).

Phase 5: Verification, Hardening & Launch (Days 17–20)
 ├── 1. End-to-End Automated Testing (Pytest + Playwright).
 ├── 2. Concurrency & Load Testing (Locust: 5,000 virtual users).
 └── 3. Final Production Deployment.
```
