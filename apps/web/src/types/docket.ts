export type DocketEventType = 
  | "FILING_DEADLINE"
  | "OFFICE_ACTION"
  | "OFFICE_ACTION_RESPONSE"
  | "RENEWAL"
  | "RENEWAL_ANNUITY"
  | "PRIORITY_DEADLINE"
  | "RESPONSE_DEADLINE"
  | "PROSECUTION_HEARING"
  | "DOCUMENT_SUBMISSION"
  | "APPROVAL_DEADLINE"
  | "PCT_NATIONAL_STAGE"
  | "ORAL_HEARING"
  | "EXAMINATION_REQUEST"
  | "APPEAL_DEADLINE"
  | string;

export type DocketUrgency = "OVERDUE" | "DUE_TODAY" | "DUE_SOON" | "UPCOMING";

export type DocketPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface DocketHistoryRecord {
  id: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  reason: string;
  updated_by: string;
  updated_at: string;
}

export interface DocketDocument {
  id: string;
  title: string;
  file_type: string;
  date: string;
  size?: string;
  download_url?: string;
}

export interface DocketItem {
  id: string;
  matter_id: string;
  matter_name: string;
  matter_type: "Patent" | "Trademark" | "Invention" | "Project";
  patent_number?: string;
  application_number?: string;
  grant_number?: string;
  jurisdiction: "USPTO" | "EPO" | "WIPO" | "UK IPO" | "India" | "Japan (JPO)" | "Global" | string;
  event_type: DocketEventType;
  event_type_label: string;
  title: string;
  description: string;
  
  // Date Separation (Requirement #22)
  official_deadline: string; // Statutory / Official legal date
  internal_target_date: string; // Internal operational target
  reminder_date: string; // Scheduled reminder alert date
  days_remaining: number;
  urgency: DocketUrgency;
  
  owner: string;
  responsible_team: string;
  priority: DocketPriority;
  status: 
    | "Pending"
    | "Received"
    | "Under Review"
    | "Response Drafting"
    | "CEO Review"
    | "Filed"
    | "Completed"
    | "Overdue"
    | "Hearing Scheduled"
    | "Filing Preparation"
    | string;
  
  // Office Action specific
  office?: string;
  office_action_type?: string;
  received_date?: string;
  
  // Renewal specific
  filing_date?: string;
  grant_date?: string;
  renewal_date?: string;
  renewal_status?: "Upcoming" | "Due Soon" | "Overdue" | "Completed";
  
  // Filing deadline specific
  target_filing_date?: string;
  actual_filing_date?: string;
  filing_type?: string;
  priority_date?: string;
  
  // Connected Approval
  requires_ceo_approval?: boolean;
  approval_id?: string;
  
  // Prosecution & Timeline
  documents?: DocketDocument[];
  notes?: string[];
  history: DocketHistoryRecord[];
  
  created_at: string;
  updated_at: string;
}

export interface DocketSummaryStats {
  upcoming_deadlines: number;
  filing_deadlines: number;
  office_actions: number;
  renewals_due: number;
  prosecution_events: number;
  overdue_items: number;
}
