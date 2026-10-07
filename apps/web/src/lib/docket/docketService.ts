import { 
  DocketItem, 
  DocketSummaryStats, 
  DocketUrgency, 
  DocketEventType,
  DocketHistoryRecord
} from "@/types/docket";

let memoryDocketItems: DocketItem[] = [];
let isInitialized = false;

function calculateDaysRemaining(dateStr: string): { days: number; urgency: DocketUrgency } {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

  let urgency: DocketUrgency = "UPCOMING";
  if (diffDays < 0) urgency = "OVERDUE";
  else if (diffDays === 0) urgency = "DUE_TODAY";
  else if (diffDays <= 7) urgency = "DUE_SOON";

  return { days: diffDays, urgency };
}

const SEED_DOCKET_ITEMS: DocketItem[] = [
  {
    id: "dkt-2026-001",
    matter_id: "inv-2026-001",
    matter_name: "AI Predictive Monitoring System",
    matter_type: "Patent",
    patent_number: "US 18/942,109",
    application_number: "US18/942,109",
    jurisdiction: "USPTO",
    event_type: "FILING_DEADLINE",
    event_type_label: "Statutory Filing Deadline",
    title: "USPTO Non-Provisional Patent Filing Deadline",
    description: "Statutory 12-month Paris Convention priority expiration. Requires CEO authorization before final filing submission.",
    official_deadline: "2026-10-20",
    internal_target_date: "2026-10-15",
    reminder_date: "2026-10-10",
    days_remaining: 14,
    urgency: "DUE_SOON",
    owner: "Siddharth Rao (Patent Analyst)",
    responsible_team: "Legal & Patent Drafting",
    priority: "HIGH",
    status: "CEO Review",
    filing_type: "Non-Provisional Utility",
    priority_date: "2025-10-20",
    target_filing_date: "2026-10-20",
    requires_ceo_approval: true,
    approval_id: "app-2026-001",
    documents: [
      { id: "d1", title: "Complete Specification & Claims Draft", file_type: "docx", date: "2026-10-04", size: "2.4 MB" },
      { id: "d2", title: "Formal Figures 1-12", file_type: "pdf", date: "2026-10-03", size: "4.8 MB" },
    ],
    notes: [
      "Paris Convention 12-month bar date is Oct 20, 2026.",
      "PCT International filing will be prepared in parallel with Foley & Lardner LLP.",
    ],
    history: [
      {
        id: "h-001",
        field_changed: "internal_target_date",
        old_value: "2026-10-18",
        new_value: "2026-10-15",
        reason: "Accelerated to allow 5 business days for final CEO signature and EFS upload.",
        updated_by: "Admin / Docket Lead",
        updated_at: "2026-10-02T11:00:00.000Z",
      },
    ],
    created_at: "2026-09-15T08:00:00.000Z",
    updated_at: "2026-10-04T12:00:00.000Z",
  },
  {
    id: "dkt-2026-002",
    matter_id: "inv-2026-002",
    matter_name: "Distributed Edge Neuromorphic Signal Accelerator",
    matter_type: "Patent",
    patent_number: "EP 26189021.4",
    application_number: "EP26189021.4",
    jurisdiction: "EPO",
    event_type: "FILING_DEADLINE",
    event_type_label: "EPO European Filing Deadline",
    title: "European Patent Office Direct National Filing",
    description: "Designates EPO Member States under accelerated PACE examination procedure with zero surcharge.",
    official_deadline: "2026-10-15",
    internal_target_date: "2026-10-11",
    reminder_date: "2026-10-07",
    days_remaining: 9,
    urgency: "DUE_SOON",
    owner: "Dr. Elena Rostova",
    responsible_team: "Neuromorphic Hardware R&D",
    priority: "CRITICAL",
    status: "CEO Review",
    filing_type: "Direct European Patent Application",
    priority_date: "2025-10-15",
    target_filing_date: "2026-10-15",
    requires_ceo_approval: true,
    approval_id: "app-2026-002",
    documents: [
      { id: "d3", title: "European Specification in English", file_type: "docx", date: "2026-10-04", size: "3.1 MB" },
    ],
    notes: [
      "PACE fast-track request will be included with initial electronic filing.",
    ],
    history: [],
    created_at: "2026-09-10T09:00:00.000Z",
    updated_at: "2026-10-04T10:00:00.000Z",
  },
  {
    id: "dkt-2026-003",
    matter_id: "inv-2026-003",
    matter_name: "Quantum-Resistant Lattice Key Exchange Protocol",
    matter_type: "Patent",
    patent_number: "US 18/612,408",
    application_number: "US18/612,408",
    jurisdiction: "USPTO",
    event_type: "OFFICE_ACTION",
    event_type_label: "Office Action Response Deadline",
    title: "USPTO Non-Final Office Action Response (Art Unit 2441)",
    description: "Examiner rejection under 35 U.S.C. 101 alleging abstract mathematical concepts. Response drafts practical application safe harbor amendments.",
    official_deadline: "2026-11-18",
    internal_target_date: "2026-11-05",
    reminder_date: "2026-10-25",
    days_remaining: 43,
    urgency: "UPCOMING",
    owner: "Marcus Vance",
    responsible_team: "Security & Applied Math",
    priority: "HIGH",
    status: "Response Drafting",
    office: "USPTO - Technology Center 2400",
    office_action_type: "Non-Final Rejection (3-Month Statutory Period)",
    received_date: "2026-08-18",
    requires_ceo_approval: true,
    approval_id: "app-2026-003",
    documents: [
      { id: "d4", title: "USPTO Non-Final Office Action", file_type: "pdf", date: "2026-08-18", size: "840 KB" },
      { id: "d5", title: "Proposed Response & Section 101 Amendments", file_type: "docx", date: "2026-10-03", size: "1.2 MB" },
    ],
    notes: [
      "Strategic delay: file response on or after Nov 1 to benefit from revised USPTO examination guidelines.",
    ],
    history: [],
    created_at: "2026-08-19T07:00:00.000Z",
    updated_at: "2026-10-03T14:00:00.000Z",
  },
  {
    id: "dkt-2026-004",
    matter_id: "inv-2026-007",
    matter_name: "High-Bandwidth Cryptographic Enclave",
    matter_type: "Patent",
    patent_number: "US 11,842,910",
    grant_number: "11,842,910",
    jurisdiction: "USPTO",
    event_type: "RENEWAL",
    event_type_label: "Patent Maintenance Fee",
    title: "USPTO 3.5 Year Patent Maintenance Fee Window",
    description: "First maintenance fee due 3.5 years post-grant. Surcharge window opens on Dec 15, 2026.",
    official_deadline: "2026-12-15",
    internal_target_date: "2026-11-30",
    reminder_date: "2026-11-01",
    days_remaining: 70,
    urgency: "UPCOMING",
    owner: "Legal Operations Lead",
    responsible_team: "IP Portfolio Operations",
    priority: "MEDIUM",
    status: "Pending",
    filing_date: "2020-04-12",
    grant_date: "2023-06-15",
    renewal_date: "2026-12-15",
    renewal_status: "Upcoming",
    documents: [
      { id: "d6", title: "USPTO Letters Patent Grant Document", file_type: "pdf", date: "2023-06-15", size: "5.4 MB" },
    ],
    notes: [
      "Standard entity fee: $2,000 USD (large entity rate).",
    ],
    history: [
      {
        id: "h-002",
        field_changed: "renewal_date",
        old_value: "2026-11-20",
        new_value: "2026-12-15",
        reason: "Recalculated based on exact official USPTO patent issue date calendar.",
        updated_by: "Admin / Authorized User",
        updated_at: "2026-09-25T14:30:00.000Z",
      },
    ],
    created_at: "2026-06-01T08:00:00.000Z",
    updated_at: "2026-09-25T14:30:00.000Z",
  },
  {
    id: "dkt-2026-005",
    matter_id: "inv-2026-008",
    matter_name: "MOAT Brand Word Mark & Emblem",
    matter_type: "Trademark",
    application_number: "US90/812,410",
    grant_number: "6,892,104",
    jurisdiction: "USPTO",
    event_type: "RENEWAL",
    event_type_label: "Trademark Section 8 Declaration",
    title: "USPTO Section 8 Affidavit of Continued Use & Excusable Nonuse",
    description: "Statutory 6-year renewal deadline to maintain federal trademark protection in Classes 9 and 42.",
    official_deadline: "2026-11-08",
    internal_target_date: "2026-10-25",
    reminder_date: "2026-10-15",
    days_remaining: 33,
    urgency: "DUE_SOON",
    owner: "Brand Counsel",
    responsible_team: "Legal Operations",
    priority: "HIGH",
    status: "Under Review",
    filing_date: "2020-05-08",
    grant_date: "2021-11-08",
    renewal_date: "2026-11-08",
    renewal_status: "Due Soon",
    documents: [
      { id: "d7", title: "Certificate of Registration 6,892,104", file_type: "pdf", date: "2021-11-08", size: "1.2 MB" },
      { id: "d8", title: "Specimen of Current Commercial Use in Commerce", file_type: "png", date: "2026-09-18", size: "2.8 MB" },
    ],
    notes: [
      "Commercial use specimens verified across enterprise web UI and software releases.",
    ],
    history: [],
    created_at: "2026-05-01T08:00:00.000Z",
    updated_at: "2026-09-18T16:00:00.000Z",
  },
  {
    id: "dkt-2026-006",
    matter_id: "inv-2026-009",
    matter_name: "Distributed Consensus Mesh Protocol",
    matter_type: "Patent",
    patent_number: "Appeal 2026-00142",
    application_number: "US17/412,883",
    jurisdiction: "USPTO",
    event_type: "PROSECUTION_HEARING",
    event_type_label: "PTAB Oral Hearing",
    title: "PTAB Administrative Patent Judges Oral Hearing",
    description: "Oral argument before Patent Trial and Appeal Board panel on appeal from final rejection of distributed consensus claims.",
    official_deadline: "2026-10-28",
    internal_target_date: "2026-10-24",
    reminder_date: "2026-10-14",
    days_remaining: 22,
    urgency: "UPCOMING",
    owner: "Appellate Counsel",
    responsible_team: "Patent Litigation & Appeals",
    priority: "HIGH",
    status: "Hearing Scheduled",
    documents: [
      { id: "d9", title: "Appellant Brief Before PTAB", file_type: "pdf", date: "2026-07-14", size: "2.1 MB" },
      { id: "d10", title: "PTAB Notice of Hearing Date", file_type: "pdf", date: "2026-09-12", size: "450 KB" },
    ],
    notes: [
      "Virtual hearing via WebEx at 1:00 PM EST. Lead counsel: Foley & Lardner.",
    ],
    history: [],
    created_at: "2026-07-15T09:00:00.000Z",
    updated_at: "2026-09-12T11:00:00.000Z",
  },
  {
    id: "dkt-2026-007",
    matter_id: "inv-2026-010",
    matter_name: "Edge Cache Predictive Pre-Fetching Algorithm",
    matter_type: "Patent",
    patent_number: "US 17/801,234",
    application_number: "US17/801,234",
    jurisdiction: "USPTO",
    event_type: "RESPONSE_DEADLINE",
    event_type_label: "Notice of Allowance Fee",
    title: "USPTO Issue Fee Payment & Publication Fee Due",
    description: "Notice of Allowance received on July 10, 2026. 3-month statutory window to pay issue fee expired on Oct 10.",
    official_deadline: "2026-10-02",
    internal_target_date: "2026-09-28",
    reminder_date: "2026-09-20",
    days_remaining: -4,
    urgency: "OVERDUE",
    owner: "Lead Paralegal",
    responsible_team: "IP Administration",
    priority: "CRITICAL",
    status: "Overdue",
    documents: [
      { id: "d11", title: "USPTO Notice of Allowance", file_type: "pdf", date: "2026-07-10", size: "620 KB" },
    ],
    notes: [
      "URGENT: Petition for Revival under 37 CFR 1.137 must be filed immediately with revival surcharge.",
    ],
    history: [],
    created_at: "2026-07-11T09:00:00.000Z",
    updated_at: "2026-10-03T11:00:00.000Z",
  },
  {
    id: "dkt-2026-008",
    matter_id: "inv-2026-005",
    matter_name: "Low-Power Biosensor Neural Interface Enclave",
    matter_type: "Patent",
    application_number: "US18/901,842",
    jurisdiction: "India",
    event_type: "FILING_DEADLINE",
    event_type_label: "Indian Patent Office National Filing",
    title: "IPO India Convention Application Filing",
    description: "National phase entry into Indian Patent Office (IPO New Delhi).",
    official_deadline: "2026-10-22",
    internal_target_date: "2026-10-18",
    reminder_date: "2026-10-12",
    days_remaining: 16,
    urgency: "DUE_SOON",
    owner: "Indian Associate Counsel",
    responsible_team: "International Patent Strategy",
    priority: "HIGH",
    status: "Filing Preparation",
    filing_type: "Convention Application",
    priority_date: "2025-10-22",
    target_filing_date: "2026-10-22",
    requires_ceo_approval: true,
    approval_id: "app-2026-005",
    documents: [],
    notes: ["Coordinated with Remfry & Sagar local associates in New Delhi."],
    history: [],
    created_at: "2026-09-01T08:00:00.000Z",
    updated_at: "2026-09-20T10:00:00.000Z",
  },
];

export class DocketService {
  private static async syncFromDatabase(): Promise<void> {
    if (isInitialized && memoryDocketItems.length > 0) return;

    try {
      const itemsMap = new Map<string, DocketItem>();

      for (const item of SEED_DOCKET_ITEMS) {
        // Recalculate days and urgency dynamically relative to today
        const calc = calculateDaysRemaining(item.official_deadline);
        itemsMap.set(item.id, {
          ...item,
          days_remaining: calc.days,
          urgency: calc.urgency,
        });
      }

      memoryDocketItems = Array.from(itemsMap.values());
      isInitialized = true;
    } catch (e) {
      if (memoryDocketItems.length === 0) {
        memoryDocketItems = SEED_DOCKET_ITEMS.map((item) => {
          const calc = calculateDaysRemaining(item.official_deadline);
          return { ...item, days_remaining: calc.days, urgency: calc.urgency };
        });
      }
      isInitialized = true;
    }
  }

  static async getAllDocketItems(filters?: {
    event_type?: string;
    jurisdiction?: string;
    urgency?: string;
    status?: string;
    search?: string;
  }): Promise<{ summary: DocketSummaryStats; items: DocketItem[] }> {
    await this.syncFromDatabase();

    let items = [...memoryDocketItems];

    if (filters) {
      if (filters.event_type && filters.event_type !== "All") {
        items = items.filter((i) => i.event_type.toLowerCase() === filters.event_type!.toLowerCase());
      }
      if (filters.jurisdiction && filters.jurisdiction !== "All") {
        items = items.filter((i) => i.jurisdiction.toLowerCase() === filters.jurisdiction!.toLowerCase());
      }
      if (filters.urgency && filters.urgency !== "All") {
        items = items.filter((i) => i.urgency.toLowerCase() === filters.urgency!.toLowerCase());
      }
      if (filters.status && filters.status !== "All") {
        items = items.filter((i) => i.status.toLowerCase() === filters.status!.toLowerCase());
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        items = items.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            i.matter_name.toLowerCase().includes(q) ||
            (i.patent_number && i.patent_number.toLowerCase().includes(q)) ||
            (i.application_number && i.application_number.toLowerCase().includes(q)) ||
            i.owner.toLowerCase().includes(q) ||
            i.jurisdiction.toLowerCase().includes(q)
        );
      }
    }

    // Sort: Overdue first, then by official_deadline ascending
    items.sort((a, b) => {
      if (a.urgency === "OVERDUE" && b.urgency !== "OVERDUE") return -1;
      if (b.urgency === "OVERDUE" && a.urgency !== "OVERDUE") return 1;
      return new Date(a.official_deadline).getTime() - new Date(b.official_deadline).getTime();
    });

    const summary: DocketSummaryStats = {
      upcoming_deadlines: memoryDocketItems.filter((i) => i.days_remaining >= 0 && i.days_remaining <= 60).length,
      filing_deadlines: memoryDocketItems.filter((i) => i.event_type === "FILING_DEADLINE").length,
      office_actions: memoryDocketItems.filter((i) => i.event_type === "OFFICE_ACTION").length,
      renewals_due: memoryDocketItems.filter((i) => i.event_type === "RENEWAL").length,
      prosecution_events: memoryDocketItems.filter((i) => i.event_type === "PROSECUTION_HEARING" || i.event_type === "RESPONSE_DEADLINE").length,
      overdue_items: memoryDocketItems.filter((i) => i.urgency === "OVERDUE").length,
    };

    return { summary, items };
  }

  static async getDocketItemById(id: string): Promise<DocketItem | null> {
    await this.syncFromDatabase();
    const item = memoryDocketItems.find((i) => i.id === id || i.matter_id === id);
    return item || null;
  }

  static async updateDocketDate(params: {
    id: string;
    dateType: "official_deadline" | "internal_target_date" | "reminder_date" | "renewal_date";
    newDate: string;
    reason: string;
    user_name: string;
  }): Promise<{ success: boolean; item: DocketItem; historyRecord: DocketHistoryRecord }> {
    await this.syncFromDatabase();

    const item = memoryDocketItems.find((i) => i.id === params.id);
    if (!item) throw new Error(`Docket item ${params.id} not found.`);

    if (!params.newDate || !params.reason) {
      throw new Error("Both new date and a justification reason are mandatory for docket changes.");
    }

    const field = params.dateType;
    const oldValue = (item as any)[field] || "N/A";

    (item as any)[field] = params.newDate;
    if (field === "official_deadline") {
      const calc = calculateDaysRemaining(params.newDate);
      item.days_remaining = calc.days;
      item.urgency = calc.urgency;
    }

    item.updated_at = new Date().toISOString();

    const historyRecord: DocketHistoryRecord = {
      id: `dkt-hist-${Date.now()}`,
      field_changed: field,
      old_value: oldValue,
      new_value: params.newDate,
      reason: params.reason,
      updated_by: params.user_name || "Admin / Authorized User",
      updated_at: new Date().toISOString(),
    };

    item.history.unshift(historyRecord);

    console.log(`[DocketService] Date updated: ${field} for matter ${item.matter_name} from ${oldValue} to ${params.newDate}. Reason: ${params.reason}`);

    return { success: true, item, historyRecord };
  }

  static async createDocketEvent(params: {
    matter_id?: string;
    matter_name: string;
    matter_type?: "Patent" | "Trademark" | "Invention" | "Project";
    event_type: DocketEventType;
    title: string;
    description: string;
    official_deadline: string;
    internal_target_date?: string;
    reminder_date?: string;
    jurisdiction?: string;
    owner: string;
    responsible_team?: string;
    priority?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    notes?: string;
    user_name: string;
  }): Promise<{ success: boolean; item: DocketItem }> {
    await this.syncFromDatabase();

    const calc = calculateDaysRemaining(params.official_deadline);
    const newId = `dkt-usr-${Date.now()}`;

    const newItem: DocketItem = {
      id: newId,
      matter_id: params.matter_id || `mat-${Date.now()}`,
      matter_name: params.matter_name,
      matter_type: params.matter_type || "Patent",
      jurisdiction: params.jurisdiction || "USPTO",
      event_type: params.event_type,
      event_type_label: params.event_type.replace(/_/g, " "),
      title: params.title,
      description: params.description,
      official_deadline: params.official_deadline,
      internal_target_date: params.internal_target_date || params.official_deadline,
      reminder_date: params.reminder_date || params.official_deadline,
      days_remaining: calc.days,
      urgency: calc.urgency,
      owner: params.owner,
      responsible_team: params.responsible_team || "Legal Operations",
      priority: params.priority || "HIGH",
      status: "Pending",
      notes: params.notes ? [params.notes] : [],
      history: [
        {
          id: `hist-${Date.now()}`,
          field_changed: "created",
          old_value: "None",
          new_value: "Created",
          reason: "Manually registered internal docket event",
          updated_by: params.user_name || "Admin",
          updated_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    memoryDocketItems.unshift(newItem);

    console.log(`[DocketService] New event created: ${newItem.title} for ${newItem.matter_name} (ID: ${newItem.id})`);

    return { success: true, item: newItem };
  }
}
