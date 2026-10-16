# MOAT IP INTELLIGENCE PLATFORM
# PHASE 1 — DESIGN TEAM WORKFLOW SPECIFICATION & ARCHITECTURE BLUEPRINT

**Document Version:** 1.0.0  
**Status:** Approved & Target Architecture  
**Target Role:** Design Team (`DESIGN_TEAM` / Design Team)  
**System Architecture:** Next.js 15 (App Router) + FastAPI Microservices + PostgreSQL / JSON Persistence  

---

## 1. WORKFLOW LIFECYCLE & STATE MACHINE

The Design Team workflow connects the **Patent Drafter**, **Patent Analyst**, and **CEO** with the **Design Team**, enabling assignment, figure creation, versioned iteration, authorized review, rework, and completion without creating duplicate projects or overwriting source documents.

### 1.1 State Machine Diagram

```text
       +---------------------------------------------+
       |             INVENTION / PROJECT             |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |             DESIGN TASK CREATED             |
       |  (From Drafter, Analyst, or CEO with Files) |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |             STATUS: ASSIGNED                |
       |  (Designer Notified -> "Assigned to Me")    |
       +---------------------------------------------+
                              |
                              | [Action: Accept / Start Work]
                              v
       +---------------------------------------------+
       |            STATUS: IN_PROGRESS              |
       |  (Task Accepted -> Active Drafting/Editing) |
       +---------------------------------------------+
                              |
                              | [Action: Save Version]
                              v
       +---------------------------------------------+
       |               SAVE NEW VERSION              |
       |  (v1 -> v2 -> v3; Original Source Untouched)|
       +---------------------------------------------+
                              |
                              | [Action: Submit to Recipient]
                              v
       +---------------------------------------------+
       |            STATUS: UNDER_REVIEW             |
       |  (Snapshot Locked -> Recipient Notified)    |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |         AUTHORIZED RECIPIENT REVIEWS        |
       |     (Patent Drafter, Analyst, or CEO)       |
       +---------------------------------------------+
                              |
              +---------------+---------------+
              |                               |
              v [Outcome: Rework]             v [Outcome: Accepted]
+---------------------------+   +---------------------------+
|      STATUS: REWORK       |   |     STATUS: COMPLETED     |
| (Reviewer Feedback Persist|   | (Final Deliverable Locked |
| Designer Notified)        |   | Stakeholders Notified)    |
+---------------------------+   +---------------------------+
              |                               |
              v                               v
+---------------------------+   +---------------------------+
|    REVISE & RESUBMIT      |   |   EXPORT / FILING READY   |
|   (Loops to In Progress)  |   |                           |
+---------------------------+   +---------------------------+
```

### 1.2 Status Mapping Table

| Logical Workflow Stage | System Status Code | Active User / Actor | Next Allowed Actions |
|---|---|---|---|
| **Task Creation & Assignment** | `ASSIGNED` | Patent Drafter, Patent Analyst, CEO | Designer clicks "Accept" or "Start Work" |
| **Active Work / Editing** | `IN_PROGRESS` | Designer | Designer edits, uploads revision, saves version, submits |
| **Submitted for Review** | `UNDER_REVIEW` | Reviewer (Drafter, Analyst, CEO) | Reviewer opens snapshot, adds comments, approves or requests rework |
| **Review Feedback / Rework** | `REWORK` | Designer | Designer reviews feedback, uploads new version, resubmits |
| **Accepted & Finalized** | `COMPLETED` | System / Reviewer | Read-only view, download deliverables, export to filing package |

---

## 2. ASSIGNMENT SOURCES & ROLE RULES

### 2.1 Permitted Senders
1. **Patent Drafter:** Assigns patent drawing figures (FIG 1..N), margin compliance adjustments, reference numerals, flowcharts, and hardware block diagrams for patent application specifications.
2. **Patent Analyst:** Assigns technical illustrations, landscape diagrams, whitespace maps, or invention disclosure figures.
3. **CEO:** Assigns executive presentation figures, high-level architecture diagrams, or portfolio illustrations when permitted by the project workflow.

### 2.2 Data Integrity Rules
- The sender **must** select an existing project or invention (`invention_id`).
- Creating a design assignment **never** duplicates the invention or project record.
- Source documents attached by the sender are referenced by immutable ID and are never modified or overwritten by the designer.
- Any new drawing or document created by the designer is registered as a new version or child asset linked to the parent task and invention.

---

## 3. RELATIONAL DATA CONTRACT

```text
PROJECT / INVENTION (id, title, status)
      │
      ├── 1:N ── DESIGN ASSIGNMENT (id, invention_id, title, assigned_to, assigned_by, status, priority, due_date, instructions)
      │                │
      │                ├── 1:N ── SOURCE DOCUMENT REFS (doc_id, filename, file_url)
      │                │
      │                ├── 1:N ── DRAWING VERSIONS (id, assignment_id, version_num, file_url, notes, uploaded_at, uploaded_by)
      │                │
      │                ├── 1:N ── SUBMISSIONS (id, assignment_id, version_num, recipient_role, recipient_id, message, submitted_at)
      │                │                │
      │                │                └── 1:1 ── REVIEW DECISION (id, outcome, comments, reviewer_id, reviewer_role, decided_at)
      │                │
      │                ├── 1:N ── COMMENTS (id, assignment_id, target_version, author_id, author_role, text, created_at)
      │                │
      │                └── 1:N ── DOCKET REMINDERS (id, assignment_id, due_date, status)
      │
      └── 1:N ── ACTIVITY AUDIT LOGS (id, actor, action, timestamp, details)
```

---

## 4. DESIGN TEAM NAVIGATION SPECIFICATION

The navigation for `DESIGN_TEAM` in `apps/web/src/components/shell/nav.ts` adheres strictly to the required sidebar hierarchy:

```text
DESIGN TEAM

DASHBOARD
└── Overview: /dashboard/design-team

DESIGN WORKSPACE
├── My Designs: /dashboard/design-team/workspace/my-designs
├── Assigned to Me: /dashboard/design-team/workspace/assigned
├── In Progress: /dashboard/design-team/workspace/in-progress
├── Under Review: /dashboard/design-team/workspace/under-review
└── Completed: /dashboard/design-team/workspace/completed

DESIGN MATERIALS
├── Drawings: /dashboard/design-team/materials/drawings
├── Technical Documents: /dashboard/design-team/materials/technical-docs
├── Reference Files: /dashboard/design-team/materials/reference-files
└── Export Files: /dashboard/design-team/materials/export-files

REVIEW & COLLABORATION
├── Review Requests: /dashboard/design-team/collab/requests
├── Comments: /dashboard/design-team/collab/comments
└── Revision History: /dashboard/design-team/collab/history

DOCKET
├── Design Deadlines: /dashboard/design-team/docket/deadlines
├── Reminders: /dashboard/design-team/docket/reminders
└── Action Items: /dashboard/design-team/docket/action-items

REPORTS
├── Design Metrics: /dashboard/design-team/reports/metrics
└── Productivity: /dashboard/design-team/reports/productivity

COMMAND INBOX
└── Command Inbox: /dashboard/design-team/inbox

ACTIVITY HISTORY
└── Activity History: /dashboard/design-team/activity
```

---

## 5. SUBMISSION ENGINE & AUTHORIZED RECIPIENTS

When submitting a design version for review:
1. **Recipient Role Options:**
   - `PATENT_DRAFTER`: For patent drawing adjustments, figure additions, and spec alignment.
   - `PATENT_ANALYST`: For research validation, technical disclosure figures, and prior-art comparisons.
   - `CEO`: For executive milestone reviews and filing sign-offs when required by the workflow.
2. **Dynamic User Filtering:**
   - Only users possessing the authorized role and assigned to or associated with the project are selectable.
3. **Submission Snapshot:**
   - The version submitted is captured immutably. A subsequent local edit cannot alter the files being reviewed.
4. **Notifications & Command Inbox:**
   - The selected recipient receives a high-priority notification with direct action link (`/dashboard/patent-drafter/review/...` or `/dashboard/ceo/approvals/...`).

---

## 6. VALIDATION & SECURITY CONSTRAINTS

1. **Self-Approval Prohibition:** A designer cannot approve their own submission. The backend strictly refuses review decisions where `reviewer_id == designer_id` unless the user holds administrator privilege.
2. **Cross-Project Access Prevention:** API endpoints verify the requester's tenant and project assignment before returning records or files.
3. **File Integrity:** Allowed uploads: `image/png`, `image/jpeg`, `application/pdf`. Max size: 20 MB.
4. **Audit Logging:** Every transition (`ASSIGNED`, `IN_PROGRESS`, `SUBMITTED`, `REWORK`, `APPROVED`) logs an entry to `activity.json` and the audit log table.
