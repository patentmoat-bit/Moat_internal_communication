-- ==============================================================================
-- MOAT Patent Intelligence Platform: Centralized Enterprise Workflow Engine Schema
-- ==============================================================================
-- Manages the complete lifecycle of Patent and Trademark projects, including
-- state machine transitions, task automation, assignments, immutable history,
-- real-time dashboard notifications, and SLA escalation tracking.
-- ==============================================================================

-- 1. Workflows Table: Master record for active patent and trademark projects
CREATE TABLE IF NOT EXISTS workflows (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL CHECK (type IN ('PATENT', 'TRADEMARK')),
    current_stage VARCHAR(64) NOT NULL,
    previous_stage VARCHAR(64),
    assigned_user_id VARCHAR(64),
    assigned_role VARCHAR(64),
    owner_id VARCHAR(64) NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    sla_status VARCHAR(32) NOT NULL DEFAULT 'ON_TRACK' CHECK (sla_status IN ('ON_TRACK', 'AT_RISK', 'BREACHED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wf_type_stage ON workflows(type, current_stage);
CREATE INDEX IF NOT EXISTS idx_wf_assigned_user ON workflows(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_wf_sla_status ON workflows(sla_status);

-- 2. WorkflowStages Table: Configurable definition of lifecycle stages
CREATE TABLE IF NOT EXISTS workflow_stages (
    id VARCHAR(64) PRIMARY KEY,
    workflow_type VARCHAR(32) NOT NULL CHECK (workflow_type IN ('PATENT', 'TRADEMARK')),
    stage_name VARCHAR(64) NOT NULL,
    stage_order INTEGER NOT NULL,
    default_sla_days INTEGER NOT NULL DEFAULT 3,
    requires_executive_approval BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(workflow_type, stage_name)
);

-- 3. WorkflowTransitions Table: State machine configuration rules
CREATE TABLE IF NOT EXISTS workflow_transitions (
    id VARCHAR(64) PRIMARY KEY,
    workflow_type VARCHAR(32) NOT NULL,
    from_stage VARCHAR(64) NOT NULL,
    to_stage VARCHAR(64) NOT NULL,
    allowed_roles VARCHAR(255) NOT NULL, -- JSON array of permitted roles
    requires_comment BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(workflow_type, from_stage, to_stage)
);

-- 4. WorkflowTasks Table: Actionable tasks generated automatically per stage
CREATE TABLE IF NOT EXISTS workflow_tasks (
    id VARCHAR(64) PRIMARY KEY,
    workflow_id VARCHAR(64) NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    assigned_user_id VARCHAR(64) NOT NULL,
    assigned_role VARCHAR(64) NOT NULL,
    stage VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    due_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wf_tasks_workflow ON workflow_tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_tasks_assigned ON workflow_tasks(assigned_user_id, status);

-- 5. WorkflowAssignments Table: Audit trail of user and role project responsibilities
CREATE TABLE IF NOT EXISTS workflow_assignments (
    id VARCHAR(64) PRIMARY KEY,
    workflow_id VARCHAR(64) NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    role VARCHAR(64) NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wf_assign_workflow ON workflow_assignments(workflow_id);

-- 6. WorkflowHistory Table: Immutable historical record of every transition
CREATE TABLE IF NOT EXISTS workflow_history (
    id VARCHAR(64) PRIMARY KEY,
    workflow_id VARCHAR(64) NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    from_status VARCHAR(64) NOT NULL,
    to_status VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    role VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    comments TEXT
);

CREATE INDEX IF NOT EXISTS idx_wf_history_workflow ON workflow_history(workflow_id);

-- 7. WorkflowNotifications Table: In-app alerts and real-time banner tracking
CREATE TABLE IF NOT EXISTS workflow_notifications (
    id VARCHAR(64) PRIMARY KEY,
    workflow_id VARCHAR(64) NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    recipient_role VARCHAR(64) NOT NULL,
    recipient_user_id VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_wf_notif_recipient ON workflow_notifications(recipient_role, read);

-- 8. WorkflowEscalations Table: SLA breach records and executive escalation tracking
CREATE TABLE IF NOT EXISTS workflow_escalations (
    id VARCHAR(64) PRIMARY KEY,
    workflow_id VARCHAR(64) NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    stage VARCHAR(64) NOT NULL,
    breached_sla_days INTEGER NOT NULL,
    escalated_to_roles VARCHAR(255) NOT NULL, -- JSON array of escalated roles (CEO, Admin)
    reason TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_wf_esc_workflow ON workflow_escalations(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_esc_resolved ON workflow_escalations(resolved);
