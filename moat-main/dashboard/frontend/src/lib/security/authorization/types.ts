/**
 * Enterprise API Authorization & Business Logic Security Types
 * 
 * Defines all type contracts, role hierarchies, permission matrices,
 * valid workflow state transitions, audit event structures, and request contexts
 * for the MOAT Patent Intelligence Platform.
 */

export type EnterpriseRole = 
  | "CEO" 
  | "Patent Analyst" 
  | "Design Team" 
  | "Admin" 
  | "super_admin" 
  | "viewer" 
  | "Finance Manager"
  | "Patent Drafter"
  | string;

export type PermissionAction = 
  // Patents & Trademarks
  | "patents:read" | "patents:write" | "patents:delete" | "patents:approve" | "patents:submit_review"
  | "trademarks:read" | "trademarks:write" | "trademarks:delete" | "trademarks:approve"
  | "portfolio:read" | "portfolio:analytics" | "executive:dashboard"
  // Projects
  | "projects:read" | "projects:create" | "projects:edit" | "projects:delete" | "projects:assign_members"
  // Documents
  | "documents:read" | "documents:download" | "documents:upload" | "documents:edit" | "documents:delete" | "documents:restore_version"
  // Workflows
  | "workflows:read" | "workflows:transition" | "workflows:override"
  // Administration
  | "admin:full" | "users:manage" | "roles:manage" | "security:manage" | "settings:manage" | "email_rules:manage" | "audit_logs:read";

export type WorkflowStage = 
  | "New"
  | "Assigned"
  | "Research"
  | "Drafting"
  | "Design Review"
  | "Patent Analyst Review"
  | "CEO Review"
  | "Approved"
  | "Filing"
  | "Filed"
  | "Renewal"
  | "Completed"
  | "Rejected";

export const VALID_WORKFLOW_TRANSITIONS: Record<WorkflowStage, WorkflowStage[]> = {
  "New": ["Assigned", "Rejected"],
  "Assigned": ["Research", "Drafting", "Rejected"],
  "Research": ["Drafting", "Design Review", "Rejected"],
  "Drafting": ["Design Review", "Patent Analyst Review", "Rejected"],
  "Design Review": ["Patent Analyst Review", "Drafting", "Rejected"],
  "Patent Analyst Review": ["CEO Review", "Drafting", "Rejected"],
  "CEO Review": ["Approved", "Patent Analyst Review", "Rejected"],
  "Approved": ["Filing"],
  "Filing": ["Filed"],
  "Filed": ["Renewal", "Completed"],
  "Renewal": ["Completed", "Filed"],
  "Completed": [],
  "Rejected": ["New", "Drafting"]
};

// Roles that can perform specific transitions
export const STAGE_TRANSITION_PERMISSIONS: Record<WorkflowStage, EnterpriseRole[]> = {
  "New": ["Admin", "CEO", "Patent Analyst"],
  "Assigned": ["Admin", "CEO", "Patent Analyst"],
  "Research": ["Admin", "CEO", "Patent Analyst"],
  "Drafting": ["Admin", "CEO", "Patent Analyst", "Design Team"],
  "Design Review": ["Admin", "CEO", "Patent Analyst", "Design Team"],
  "Patent Analyst Review": ["Admin", "CEO", "Patent Analyst"],
  "CEO Review": ["Admin", "CEO", "Patent Analyst"], // Analyst submits TO CEO Review
  "Approved": ["Admin", "CEO"], // ONLY CEO and Admin can transition TO Approved
  "Filing": ["Admin", "CEO", "Patent Analyst"],
  "Filed": ["Admin", "CEO", "Patent Analyst"],
  "Renewal": ["Admin", "CEO", "Patent Analyst"],
  "Completed": ["Admin", "CEO"],
  "Rejected": ["Admin", "CEO", "Patent Analyst"]
};

export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  organizationId?: string;
  status: string;
  members: string[]; // List of user IDs assigned to the project
  assignedRoles?: Record<string, EnterpriseRole>;
  createdAt: string;
}

export type AuthorizationAuditEventType = 
  | "ACCESS_GRANTED"
  | "ACCESS_DENIED"
  | "APPROVAL_GRANTED"
  | "APPROVAL_DENIED"
  | "WORKFLOW_TRANSITION"
  | "WORKFLOW_TAMPERING_BLOCKED"
  | "FILE_DOWNLOAD"
  | "FILE_DOWNLOAD_DENIED"
  | "ROLE_CHANGE"
  | "IDOR_ATTEMPT_BLOCKED"
  | "PRIVILEGE_ESCALATION_BLOCKED";

export interface AuthorizationAuditRecord {
  id: string;
  timestamp: string;
  userId: string;
  userRole: EnterpriseRole;
  projectId?: string;
  targetObjectId?: string;
  action: AuthorizationAuditEventType;
  endpoint?: string;
  httpMethod?: string;
  ipAddress: string;
  details: string;
  severity: "INFO" | "WARNING" | "FAILURE" | "CRITICAL";
}

export interface AuthorizationContext {
  userId?: string;
  userRole?: EnterpriseRole;
  isActive?: boolean;
  token?: string;
  clientIp?: string;
  endpoint?: string;
  httpMethod?: string;
  requiredPermission?: PermissionAction;
  projectId?: string;
  targetObjectId?: string;
  targetObjectType?: "project" | "document" | "patent" | "trademark" | "user" | "workflow";
  currentWorkflowStage?: WorkflowStage;
  targetWorkflowStage?: WorkflowStage;
}

export interface AuthorizationResult {
  authorized: boolean;
  userId: string;
  userRole: EnterpriseRole;
  projectId?: string;
  reason?: string;
  violationType?: "IDOR_BOLA" | "BFLA_PRIVILEGE" | "WORKFLOW_TAMPERING" | "UNAUTHENTICATED" | "INACTIVE_USER" | "UNAUTHORIZED_DOCUMENT";
  auditLogId?: string;
}
