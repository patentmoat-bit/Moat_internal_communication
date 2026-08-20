/**
 * MOAT Enterprise Workflow Engine Types
 * 
 * Defines all type contracts, state machines, SLA limits, task schemas,
 * approval rules, and audit structures for managing the complete lifecycle
 * of Patent and Trademark projects.
 */

export type WorkflowType = "PATENT" | "TRADEMARK";

export type PatentWorkflowStage =
  | "New"
  | "Assigned"
  | "Research"
  | "Patent Search"
  | "Novelty Analysis"
  | "Prior Art Analysis"
  | "Drafting"
  | "Design Review"
  | "Patent Analyst Review"
  | "CEO Review"
  | "Approved"
  | "Revision Required"
  | "Filing"
  | "Filed"
  | "Renewal"
  | "Completed";

export type TrademarkWorkflowStage =
  | "Trademark Created"
  | "Word / Logo Selection"
  | "Trademark Search"
  | "Conflict Check"
  | "Drafting"
  | "Patent Analyst Review"
  | "CEO Approval"
  | "Trademark Filing"
  | "Registration"
  | "Renewal"
  | "Completed";

export type AnyWorkflowStage = PatentWorkflowStage | TrademarkWorkflowStage;

export const VALID_PATENT_TRANSITIONS: Record<PatentWorkflowStage, PatentWorkflowStage[]> = {
  "New": ["Assigned"],
  "Assigned": ["Research", "Patent Search"],
  "Research": ["Patent Search", "Novelty Analysis", "Drafting"],
  "Patent Search": ["Novelty Analysis", "Prior Art Analysis", "Drafting"],
  "Novelty Analysis": ["Prior Art Analysis", "Drafting"],
  "Prior Art Analysis": ["Drafting", "Design Review"],
  "Drafting": ["Design Review", "Patent Analyst Review"],
  "Design Review": ["Patent Analyst Review", "Drafting"],
  "Patent Analyst Review": ["CEO Review", "Drafting", "Revision Required"],
  "CEO Review": ["Approved", "Revision Required"],
  "Approved": ["Filing"],
  "Revision Required": ["Drafting", "Design Review", "Research", "Filing"],
  "Filing": ["Filed", "Revision Required"],
  "Filed": ["Renewal", "Completed"],
  "Renewal": ["Completed", "Filed"],
  "Completed": []
};

export const VALID_TRADEMARK_TRANSITIONS: Record<TrademarkWorkflowStage, TrademarkWorkflowStage[]> = {
  "Trademark Created": ["Word / Logo Selection"],
  "Word / Logo Selection": ["Trademark Search"],
  "Trademark Search": ["Conflict Check"],
  "Conflict Check": ["Drafting"],
  "Drafting": ["Patent Analyst Review"],
  "Patent Analyst Review": ["CEO Approval", "Drafting"],
  "CEO Approval": ["Trademark Filing", "Drafting"],
  "Trademark Filing": ["Registration"],
  "Registration": ["Renewal", "Completed"],
  "Renewal": ["Completed", "Registration"],
  "Completed": []
};

// SLA limits in days per stage
export const STAGE_SLA_DAYS: Record<string, number> = {
  // Patent SLA
  "New": 1,
  "Assigned": 2,
  "Research": 3,
  "Patent Search": 3,
  "Novelty Analysis": 4,
  "Prior Art Analysis": 4,
  "Drafting": 5,
  "Design Review": 3,
  "Patent Analyst Review": 3,
  "CEO Review": 2,
  "Approved": 2,
  "Revision Required": 3,
  "Filing": 5,
  "Filed": 30,
  "Renewal": 60,
  "Completed": 365,
  // Trademark SLA
  "Trademark Created": 1,
  "Word / Logo Selection": 2,
  "Trademark Search": 3,
  "Conflict Check": 3,
  "CEO Approval": 2,
  "Trademark Filing": 5,
  "Registration": 30
};

export type ApprovalActionType = "APPROVE" | "REJECT" | "REQUEST_REVISION" | "REASSIGN" | "ESCALATE";
export type SLAStatusType = "ON_TRACK" | "AT_RISK" | "BREACHED";

export interface WorkflowRecord {
  id: string;
  name: string;
  type: WorkflowType;
  currentStage: AnyWorkflowStage;
  previousStage?: AnyWorkflowStage;
  assignedUserId?: string;
  assignedRole?: string;
  ownerId: string;
  dueDate: string;
  completionPercentage: number;
  slaStatus: SLAStatusType;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTaskRecord {
  id: string;
  workflowId: string;
  title: string;
  description: string;
  assignedUserId: string;
  assignedRole: string;
  stage: AnyWorkflowStage;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  dueDate: string;
  createdAt: string;
}

export interface WorkflowAssignmentRecord {
  id: string;
  workflowId: string;
  userId: string;
  role: string;
  assignedAt: string;
  assignedBy: string;
}

export interface WorkflowHistoryRecord {
  id: string;
  workflowId: string;
  fromStatus: string;
  toStatus: string;
  user: string;
  role: string;
  timestamp: string;
  comments?: string;
}

export interface WorkflowNotificationRecord {
  id: string;
  workflowId: string;
  recipientRole: string;
  recipientUserId?: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface WorkflowEmailRecord {
  id: string;
  recipientEmail: string;
  cc?: string[];
  subject: string;
  body: string;
  timestamp: string;
  status: "SENT" | "QUEUED" | "FAILED";
}

export interface WorkflowEscalationRecord {
  id: string;
  workflowId: string;
  stage: AnyWorkflowStage;
  breachedSlaDays: number;
  escalatedToRoles: string[];
  reason: string;
  timestamp: string;
  resolved: boolean;
}

export interface DashboardSyncEvent {
  id: string;
  targetDashboard: "CEO" | "Patent Analyst" | "Design Team" | "Admin" | "ALL";
  eventType: string;
  workflowId: string;
  payload: any;
  timestamp: string;
}
