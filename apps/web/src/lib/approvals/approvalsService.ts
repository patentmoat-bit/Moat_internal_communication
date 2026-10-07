import { 
  ApprovalItem, 
  ApprovalStatus, 
  ApprovalsSummaryStats, 
  ApprovalAuditRecord,
  ApprovalDocument
} from "@/types/approvals";

// In-memory store merged with Supabase for persistent, interactive state
let memoryApprovals: ApprovalItem[] = [];
let isInitialized = false;

function buildDefaultDocuments(title: string): ApprovalDocument[] {
  return [
    {
      id: `doc-${Math.random().toString(36).slice(2, 9)}`,
      name: `${title} - Specification & Claims Draft.docx`,
      document_type: "patent_draft",
      display_type: "Patent Draft Specification",
      current_version: "v3",
      file_type: "docx",
      uploaded_by: "Lead Patent Drafter",
      uploaded_at: "2026-10-04T14:30:00.000Z",
      status: "CEO Review",
      pages_count: 52,
      word_count: 14850,
      content_preview: `TITLE OF INVENTION: ${title.toUpperCase()}\n\nFIELD OF THE INVENTION:\nThe present invention relates to advanced computing systems, deterministic latency optimization, and distributed cryptographic verification architectures.\n\nBACKGROUND:\nConventional processing systems encounter significant latency degradation when evaluating non-linear neural weight matrices under resource-constrained edge environments. Prior art techniques rely on heuristic cloud offloading, creating vulnerability to intermittent telemetry failures.\n\nSUMMARY OF THE INVENTION:\nDisclosed herein is a deterministic signal orchestration pipeline that computes continuous gradient approximations within a localized hardware enclave, bypassing main-bus memory bottlenecks while maintaining cryptographically verifiable state consistency across distributed nodes.`,
      versions: [
        {
          version: "v1",
          version_number: 1,
          uploaded_by: "Patent Drafter",
          uploaded_at: "2026-09-20T10:00:00.000Z",
          status: "Draft",
          changes_summary: "Initial technical disclosure disclosure ingestion.",
          file_size: "1.8 MB",
        },
        {
          version: "v2",
          version_number: 2,
          uploaded_by: "Patent Analyst",
          uploaded_at: "2026-09-28T16:15:00.000Z",
          status: "Reworked",
          changes_summary: "Refined Independent Claim 1 to address prior art US20240189211A1.",
          file_size: "2.1 MB",
        },
        {
          version: "v3",
          version_number: 3,
          uploaded_by: "Legal Counsel",
          uploaded_at: "2026-10-04T14:30:00.000Z",
          status: "CEO Review",
          changes_summary: "Prepared final executive filing package with PCT designation roadmap.",
          file_size: "2.4 MB",
        },
      ],
    },
    {
      id: `doc-${Math.random().toString(36).slice(2, 9)}`,
      name: `${title} - Formal Claims Set (1-20).pdf`,
      document_type: "claims",
      display_type: "Claims Set (Independent & Dependent)",
      current_version: "v3",
      file_type: "pdf",
      uploaded_by: "Patent Attorney",
      uploaded_at: "2026-10-04T15:00:00.000Z",
      status: "CEO Review",
      pages_count: 14,
      word_count: 4200,
      content_preview: `WHAT IS CLAIMED IS:\n\n1. A computer-implemented system for deterministic low-latency edge inference, comprising:\n  a memory storing a localized neural matrix parameter array; and\n  one or more hardware processors configured to execute instructions to:\n    receive an asynchronous sensory input telemetry stream;\n    transform the telemetry stream via a non-linear piecewise activation transform;\n    generate an execution trace verified via a zero-knowledge circuit constraint;\n    and publish an authenticated output payload within a bounded execution window of less than 2.5 milliseconds.\n\n2. The system of claim 1, wherein the localized neural matrix parameter array comprises non-volatile synaptic memory cell architectures configured in a crossbar array.\n\n3. The system of claim 1, wherein the zero-knowledge circuit constraint incorporates a lattice-based commitment protocol resistant to quantum Shor algorithms.`,
      versions: [
        {
          version: "v1",
          version_number: 1,
          uploaded_by: "Patent Attorney",
          uploaded_at: "2026-09-22T09:00:00.000Z",
          status: "Draft",
          changes_summary: "Initial 15 claims drafted.",
          file_size: "420 KB",
        },
        {
          version: "v2",
          version_number: 2,
          uploaded_by: "Patent Attorney",
          uploaded_at: "2026-09-29T11:20:00.000Z",
          status: "Reworked",
          changes_summary: "Added Claims 16-20 covering hybrid hardware-software fallback.",
          file_size: "510 KB",
        },
        {
          version: "v3",
          version_number: 3,
          uploaded_by: "Patent Attorney",
          uploaded_at: "2026-10-04T15:00:00.000Z",
          status: "CEO Review",
          changes_summary: "Cleaned antecedent basis in Claims 1 and 7 per USPTO pre-examination checklist.",
          file_size: "530 KB",
        },
      ],
    },
    {
      id: `doc-${Math.random().toString(36).slice(2, 9)}`,
      name: `${title} - Formal Technical Drawings (FIG 1-12).pdf`,
      document_type: "drawings",
      display_type: "Formal Patent Drawings",
      current_version: "v2",
      file_type: "pdf",
      uploaded_by: "Technical Illustrator",
      uploaded_at: "2026-10-03T11:00:00.000Z",
      status: "CEO Review",
      pages_count: 12,
      content_preview: `DRAWING SHEET LIST:\n- FIG. 1: Top-level distributed network topography showing client nodes, edge gateways, and central orchestration cluster.\n- FIG. 2: Schematic block diagram of the neuromorphic signal pipeline.\n- FIG. 3: Timing diagram illustrating bounded sub-3ms convergence cycle.\n- FIG. 4: Flowchart of asynchronous telemetry conditioning.\n- FIG. 5-12: Circuit schematics and state machine transition graphs.`,
      versions: [
        {
          version: "v1",
          version_number: 1,
          uploaded_by: "Technical Illustrator",
          uploaded_at: "2026-09-25T14:00:00.000Z",
          status: "Draft",
          changes_summary: "FIG 1 to FIG 8 drafted.",
          file_size: "3.5 MB",
        },
        {
          version: "v2",
          version_number: 2,
          uploaded_by: "Technical Illustrator",
          uploaded_at: "2026-10-03T11:00:00.000Z",
          status: "CEO Review",
          changes_summary: "Added FIG 9-12 with PCT margin compliance.",
          file_size: "4.8 MB",
        },
      ],
    },
    {
      id: `doc-${Math.random().toString(36).slice(2, 9)}`,
      name: `${title} - Prior Art Search & Novelty Report.pdf`,
      document_type: "prior_art_report",
      display_type: "Prior Art & FTO Clearance Dossier",
      current_version: "v1",
      file_type: "pdf",
      uploaded_by: "Patent Analyst",
      uploaded_at: "2026-10-02T16:45:00.000Z",
      status: "CEO Review",
      pages_count: 28,
      word_count: 8900,
      content_preview: `PRIOR ART SEARCH FINDINGS:\nDatabase coverage: USPTO, EPO, WIPO, JPO, CNIPA (2010 - 2026).\nTotal analyzed documents: 1,420.\nPrimary cited references: US10848201B2, EP3821098A1, US20240189211A1.\n\nNOVELTY SCORE: 91/100.\nConclusion: Strong novelty clearance. No cited reference discloses the combination of localized weight transformation with decentralized zero-knowledge attestation. Freedom-to-Operate (FTO) clearance risk assessed as LOW.`,
      versions: [
        {
          version: "v1",
          version_number: 1,
          uploaded_by: "Patent Analyst",
          uploaded_at: "2026-10-02T16:45:00.000Z",
          status: "CEO Review",
          changes_summary: "Completed comprehensive global patent search.",
          file_size: "3.2 MB",
        },
      ],
    },
    {
      id: `doc-${Math.random().toString(36).slice(2, 9)}`,
      name: `${title} - Executive Filing Package & Authorization.pdf`,
      document_type: "filing_package",
      display_type: "Statutory Filing Package",
      current_version: "v1",
      file_type: "pdf",
      uploaded_by: "Legal Operations Lead",
      uploaded_at: "2026-10-05T09:15:00.000Z",
      status: "CEO Review",
      pages_count: 8,
      content_preview: `STATUTORY FILING AUTHORIZATION REQUEST:\nApplicant: MOAT Enterprise Innovations, Inc.\nJurisdictions designated: USPTO (US Non-Provisional), PCT International, EPO (European Patent Office).\nTotal estimated statutory filing and search fees: $14,500 USD.\nResponsible Counsel: Foley & Lardner LLP / Internal IP Docket Team.\n\nACTION REQUESTED: Executive Signoff by Chief Executive Officer (Romila) to trigger electronic EFS-Web and ePCT submission.`,
      versions: [
        {
          version: "v1",
          version_number: 1,
          uploaded_by: "Legal Operations Lead",
          uploaded_at: "2026-10-05T09:15:00.000Z",
          status: "CEO Review",
          changes_summary: "Prepared official fee sheet and application transmittal forms.",
          file_size: "1.1 MB",
        },
      ],
    },
  ];
}

const SEED_APPROVALS: ApprovalItem[] = [
  {
    id: "app-2026-001",
    matter_id: "inv-2026-001",
    name: "AI Predictive Monitoring System",
    type: "Patent Filing",
    owner: "Patent Analyst",
    assigned_team: "Legal & Patent Drafting",
    current_stage: "CEO Final Review",
    submitted_by: "Siddharth Rao (Lead Patent Analyst)",
    submitted_date: "2026-10-05T09:30:00.000Z",
    priority: "High",
    deadline: "2026-10-20",
    status: "Pending Approval",
    summary: "Complete patent filing package covering predictive industrial anomaly detection using transformer attention across high-speed sensor buses.",
    recommendation: "Prior art clear across all 20 claims. Novelty score 92%. Recommend immediate statutory authorization before European filing deadline.",
    risk_level: "Low",
    cost_estimate: 14500,
    novelty_score: 92,
    documents: buildDefaultDocuments("AI Predictive Monitoring System"),
    audit_history: [
      {
        id: "aud-001",
        approval_id: "app-2026-001",
        matter_id: "inv-2026-001",
        matter_name: "AI Predictive Monitoring System",
        action: "APPROVED",
        action_label: "Engineering Peer Signoff",
        comment: "Specification meets 35 U.S.C. 112 sufficiency requirements.",
        previous_status: "Draft",
        new_status: "CEO Final Review",
        ceo_user: "Legal Ops",
        document_version: "v2",
        timestamp: "2026-10-04T16:00:00.000Z",
      },
    ],
    docket_link: {
      docket_id: "dkt-2026-001",
      event_type: "FILING_DEADLINE",
      deadline: "2026-10-20",
    },
    created_at: "2026-10-05T09:30:00.000Z",
    updated_at: "2026-10-05T09:30:00.000Z",
  },
  {
    id: "app-2026-002",
    matter_id: "inv-2026-002",
    name: "Distributed Edge Neuromorphic Signal Accelerator",
    type: "Patent Filing",
    owner: "Engineering Lead",
    assigned_team: "Neuromorphic Hardware R&D",
    current_stage: "Executive Filing Signoff",
    submitted_by: "Dr. Elena Rostova (Hardware Architect)",
    submitted_date: "2026-10-04T11:00:00.000Z",
    priority: "Critical",
    deadline: "2026-10-15",
    status: "Pending Approval",
    summary: "Patent filing application for asynchronous crossbar synaptic arrays achieving 0.8 milliwatt deep inference on localized sensors.",
    recommendation: "Core MOAT moat asset. Directly counters recent competitor activity. Authorize accelerated PACE examination track.",
    risk_level: "Low",
    cost_estimate: 18200,
    novelty_score: 95,
    documents: buildDefaultDocuments("Distributed Edge Neuromorphic Signal Accelerator"),
    audit_history: [],
    docket_link: {
      docket_id: "dkt-2026-002",
      event_type: "FILING_DEADLINE",
      deadline: "2026-10-15",
    },
    created_at: "2026-10-04T11:00:00.000Z",
    updated_at: "2026-10-04T11:00:00.000Z",
  },
  {
    id: "app-2026-003",
    matter_id: "inv-2026-003",
    name: "Quantum-Resistant Lattice Key Exchange Protocol",
    type: "Invention",
    owner: "Cryptography Lab",
    assigned_team: "Security & Applied Math",
    current_stage: "Claim Territory Review",
    submitted_by: "Marcus Vance (Principal Cryptographer)",
    submitted_date: "2026-10-03T15:20:00.000Z",
    priority: "High",
    deadline: "2026-10-24",
    status: "Pending Approval",
    summary: "Invention disclosure and claim territory formulation for Module Learning with Errors (M-LWE) key encapsulation protocol.",
    recommendation: "Expand Claim 1 to encompass FPGA microcode implementations. Approve advancing from CLAIM stage to PROTECT stage.",
    risk_level: "Medium",
    cost_estimate: 12000,
    novelty_score: 89,
    documents: buildDefaultDocuments("Quantum-Resistant Lattice Key Exchange Protocol"),
    audit_history: [],
    created_at: "2026-10-03T15:20:00.000Z",
    updated_at: "2026-10-03T15:20:00.000Z",
  },
  {
    id: "app-2026-004",
    matter_id: "inv-2026-004",
    name: "Zero-Knowledge Attestation Framework for Autonomous Agents",
    type: "Project",
    owner: "System Architecture Team",
    assigned_team: "Distributed Systems Lab",
    current_stage: "Disclosure Validation",
    submitted_by: "Kenji Sato (Lead Software Engineer)",
    submitted_date: "2026-10-02T13:45:00.000Z",
    priority: "Medium",
    deadline: "2026-10-28",
    status: "Pending Approval",
    summary: "R&D project authorization and formal invention disclosure for recursive cryptographic SNARK state validation across heterogeneous AI swarms.",
    recommendation: "Approve project R&D budget commitment and patent drafting mandate.",
    risk_level: "Low",
    cost_estimate: 8500,
    novelty_score: 87,
    documents: buildDefaultDocuments("Zero-Knowledge Attestation Framework for Autonomous Agents"),
    audit_history: [],
    created_at: "2026-10-02T13:45:00.000Z",
    updated_at: "2026-10-02T13:45:00.000Z",
  },
  {
    id: "app-2026-005",
    matter_id: "inv-2026-005",
    name: "Low-Power Biosensor Neural Interface Enclave",
    type: "Document",
    owner: "Patent Drafter",
    assigned_team: "Bio-Medical IP Group",
    current_stage: "Claims & Spec Revision",
    submitted_by: "David Chen (IP Specialist)",
    submitted_date: "2026-10-01T17:10:00.000Z",
    priority: "High",
    deadline: "2026-10-18",
    status: "Rework Required",
    summary: "Patent claims drafting revision. CEO requested clarification on signal-to-noise ratio threshold definitions in dependent claims 8-12.",
    recommendation: "Team revised dependent claims with empirical millivolt parameters. Awaiting re-inspection.",
    risk_level: "Medium",
    cost_estimate: 15000,
    novelty_score: 85,
    rework_comments: "Previous CEO review: Define precise voltage thresholds for biometric noise suppression in Claim 8.",
    documents: buildDefaultDocuments("Low-Power Biosensor Neural Interface Enclave"),
    audit_history: [
      {
        id: "aud-005",
        approval_id: "app-2026-005",
        matter_id: "inv-2026-005",
        matter_name: "Low-Power Biosensor Neural Interface Enclave",
        action: "REWORK_REQUESTED",
        action_label: "Rework Requested by CEO",
        comment: "Clarify signal-to-noise ratio threshold definitions in dependent claims 8-12.",
        reason: "Overly ambiguous claim syntax risks USPTO 112 rejection.",
        previous_status: "Pending Approval",
        new_status: "Rework Required",
        ceo_user: "Romila (CEO)",
        document_version: "v1",
        timestamp: "2026-10-01T18:00:00.000Z",
      },
    ],
    created_at: "2026-10-01T17:10:00.000Z",
    updated_at: "2026-10-01T18:00:00.000Z",
  },
  {
    id: "app-2026-006",
    matter_id: "inv-2026-006",
    name: "Dynamic Frequency Hopping Mesh Network",
    type: "Patent Filing",
    owner: "Telecom Research",
    assigned_team: "Wireless Protocol Engineering",
    current_stage: "Filing Authorized",
    submitted_by: "Aisha Patel (Senior Telecom Engineer)",
    submitted_date: "2026-09-28T10:00:00.000Z",
    priority: "High",
    deadline: "2026-10-10",
    status: "Approved",
    summary: "High-resilience mesh packet routing utilizing pseudo-random frequency shifts synchronized via blockchain timestamps.",
    recommendation: "Approved by CEO for prioritized USPTO Track One examination.",
    risk_level: "Low",
    cost_estimate: 16000,
    novelty_score: 93,
    documents: buildDefaultDocuments("Dynamic Frequency Hopping Mesh Network"),
    audit_history: [
      {
        id: "aud-006",
        approval_id: "app-2026-006",
        matter_id: "inv-2026-006",
        matter_name: "Dynamic Frequency Hopping Mesh Network",
        action: "APPROVED",
        action_label: "Filing Authorized by CEO",
        comment: "Proceed with USPTO Track One examination.",
        previous_status: "Pending Approval",
        new_status: "Approved",
        ceo_user: "Romila (CEO)",
        document_version: "v3",
        timestamp: "2026-09-29T14:30:00.000Z",
      },
    ],
    created_at: "2026-09-28T10:00:00.000Z",
    updated_at: "2026-09-29T14:30:00.000Z",
  },
];

export class ApprovalsService {
  private static async syncFromInventions(): Promise<void> {
    if (isInitialized && memoryApprovals.length > 0) return;

    try {
      const itemsMap = new Map<string, ApprovalItem>();

      // Seed items first
      for (const item of SEED_APPROVALS) {
        itemsMap.set(item.id, item);
      }

      // Try optional sync from FastAPI backend if available
      try {
        const res = await fetch("http://127.0.0.1:8000/api/inventions", { cache: "no-store" });
        if (res.ok) {
          const inventionsData = await res.json();
          const list = Array.isArray(inventionsData) ? inventionsData : (inventionsData?.items || []);
          list.forEach((inv: any) => {
            const meta = inv.metadata || {};
            const currentStage = meta.current_stage || "CAPTURE";
            const existingId = `app-${inv.id}`;
            if (!itemsMap.has(existingId)) {
              itemsMap.set(existingId, {
                id: existingId,
                matter_id: inv.id,
                name: inv.title || "Invention Disclosure",
                type: currentStage === "PROTECT" ? "Patent Filing" : "Invention",
                owner: meta.owner || meta.lead_inventor || "Engineering Team",
                assigned_team: meta.business_area || "R&D Innovation Lab",
                current_stage: currentStage === "PROTECT" ? "Executive Filing Signoff" : `CEO ${currentStage} Review`,
                submitted_by: meta.created_by_name || meta.lead_inventor || "Research Lead",
                submitted_date: inv.created_at || new Date().toISOString(),
                priority: meta.risk === "High" ? "Critical" : "High",
                deadline: meta.deadline || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
                status: "Pending Approval",
                summary: inv.problem_statement || inv.description || "Invention disclosure undergoing formal MOAT review.",
                recommendation: meta.recommendation || "Review claims and technical mechanism.",
                risk_level: meta.risk || "Low",
                cost_estimate: meta.est_filing_cost || 14500,
                novelty_score: meta.novelty_score || 88,
                documents: buildDefaultDocuments(inv.title || "Invention Disclosure"),
                audit_history: [],
                created_at: inv.created_at,
                updated_at: inv.updated_at,
              });
            }
          });
        }
      } catch {
        // backend fetch is optional
      }

      memoryApprovals = Array.from(itemsMap.values());
      isInitialized = true;
    } catch (e) {
      if (memoryApprovals.length === 0) {
        memoryApprovals = [...SEED_APPROVALS];
      }
      isInitialized = true;
    }
  }

  static async getAllApprovals(filters?: {
    type?: string;
    status?: string;
    priority?: string;
    search?: string;
  }): Promise<{ summary: ApprovalsSummaryStats; items: ApprovalItem[] }> {
    await this.syncFromInventions();

    let items = [...memoryApprovals];

    if (filters) {
      if (filters.type && filters.type !== "All") {
        items = items.filter((i) => i.type.toLowerCase() === filters.type!.toLowerCase());
      }
      if (filters.status && filters.status !== "All") {
        items = items.filter((i) => i.status.toLowerCase() === filters.status!.toLowerCase());
      }
      if (filters.priority && filters.priority !== "All") {
        items = items.filter((i) => i.priority.toLowerCase() === filters.priority!.toLowerCase());
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        items = items.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.owner.toLowerCase().includes(q) ||
            i.assigned_team.toLowerCase().includes(q) ||
            i.summary.toLowerCase().includes(q)
        );
      }
    }

    // Sort: Pending/Rework first, then by deadline
    items.sort((a, b) => {
      const isPendingA = a.status === "Pending Approval" ? 0 : a.status === "Rework Required" ? 1 : 2;
      const isPendingB = b.status === "Pending Approval" ? 0 : b.status === "Rework Required" ? 1 : 2;
      if (isPendingA !== isPendingB) return isPendingA - isPendingB;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    const summary: ApprovalsSummaryStats = {
      pending_approvals: memoryApprovals.filter((a) => a.status === "Pending Approval").length,
      project_approvals: memoryApprovals.filter((a) => a.type === "Project" && a.status === "Pending Approval").length,
      filing_approvals: memoryApprovals.filter((a) => a.type === "Patent Filing" && a.status === "Pending Approval").length,
      rework_required: memoryApprovals.filter((a) => a.status === "Rework Required").length,
      recently_approved: memoryApprovals.filter((a) => a.status === "Approved").length,
    };

    return { summary, items };
  }

  static async getApprovalById(id: string): Promise<ApprovalItem | null> {
    await this.syncFromInventions();
    const item = memoryApprovals.find((a) => a.id === id || a.matter_id === id);
    return item || null;
  }

  static async executeDecision(params: {
    id: string;
    action: "APPROVE" | "REWORK" | "REJECT";
    comment?: string;
    reason?: string;
    document_version?: string;
    user_name?: string;
    user_id?: string;
  }): Promise<{ success: boolean; item: ApprovalItem; audit: ApprovalAuditRecord }> {
    await this.syncFromInventions();

    const item = memoryApprovals.find((a) => a.id === params.id || a.matter_id === params.id);
    if (!item) {
      throw new Error(`Approval item ${params.id} not found.`);
    }

    const previousStatus = item.status;
    let newStatus: ApprovalStatus = "Approved";
    let actionLabel = "Approved by CEO";

    if (params.action === "REWORK") {
      newStatus = "Rework Required";
      actionLabel = "Rework Requested by CEO";
      item.rework_comments = params.comment || params.reason || "Revisions required.";
    } else if (params.action === "REJECT") {
      newStatus = "Rejected";
      actionLabel = "Rejected by CEO";
      item.rejection_reason = params.reason || "Rejected during executive review.";
    }

    item.status = newStatus;
    item.updated_at = new Date().toISOString();

    // Mark current document version status
    if (item.documents && item.documents.length > 0) {
      item.documents.forEach((doc) => {
        if (params.action === "APPROVE") {
          doc.status = "Approved";
        } else if (params.action === "REWORK") {
          doc.status = "Rework Required";
        }
      });
    }

    // Create immutable audit entry
    const auditRecord: ApprovalAuditRecord = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      approval_id: item.id,
      matter_id: item.matter_id,
      matter_name: item.name,
      action: params.action === "APPROVE" ? "APPROVED" : params.action === "REWORK" ? "REWORK_REQUESTED" : "REJECTED",
      action_label: actionLabel,
      comment: params.comment || "",
      reason: params.reason || "",
      previous_status: previousStatus,
      new_status: newStatus,
      ceo_user: params.user_name || "Romila (CEO)",
      document_version: params.document_version || item.documents[0]?.current_version || "v3",
      timestamp: new Date().toISOString(),
    };

    item.audit_history.unshift(auditRecord);

    console.log(`[ApprovalsService] CEO Action executed: ${params.action} on ${item.name} (${item.type}). Audit ID: ${auditRecord.id}`);

    return { success: true, item, audit: auditRecord };
  }
}
