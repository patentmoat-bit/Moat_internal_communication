-- ==============================================================================
-- MOAT Patent Intelligence Platform: Enterprise API Authorization & Business Logic Schema
-- ==============================================================================
-- Compliant with OWASP Top 10 A01 (Broken Access Control Prevention), OWASP ASVS V4,
-- and Enterprise Zero-Trust Models (Microsoft 365, GitHub Enterprise, AWS IAM).
-- ==============================================================================

-- 1. Project Memberships Table: Enforces project-level IDOR / BOLA defense
CREATE TABLE IF NOT EXISTS project_memberships (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    assigned_role VARCHAR(64) NOT NULL,
    can_read BOOLEAN NOT NULL DEFAULT TRUE,
    can_write BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_prj_members_project ON project_memberships(project_id);
CREATE INDEX IF NOT EXISTS idx_prj_members_user ON project_memberships(user_id);

-- 2. Authorization Audit Logs Table: Immutable forensic record of access and violations
CREATE TABLE IF NOT EXISTS authorization_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id VARCHAR(64) NOT NULL,
    user_role VARCHAR(64) NOT NULL,
    project_id VARCHAR(64),
    target_object_id VARCHAR(64),
    action VARCHAR(64) NOT NULL,
    endpoint VARCHAR(255),
    http_method VARCHAR(16),
    ip_address VARCHAR(64) NOT NULL,
    details TEXT NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'FAILURE', 'CRITICAL'))
);

CREATE INDEX IF NOT EXISTS idx_auth_logs_user ON authorization_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_project ON authorization_audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_action ON authorization_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_auth_logs_severity ON authorization_audit_logs(severity);

-- 3. Workflow State History Table: Immutable audit trail of state transitions
CREATE TABLE IF NOT EXISTS workflow_state_history (
    id VARCHAR(64) PRIMARY KEY,
    object_id VARCHAR(64) NOT NULL,
    project_id VARCHAR(64),
    previous_stage VARCHAR(64) NOT NULL,
    new_stage VARCHAR(64) NOT NULL,
    transitioned_by VARCHAR(64) NOT NULL,
    transitioned_role VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    comment TEXT
);

CREATE INDEX IF NOT EXISTS idx_wf_history_object ON workflow_state_history(object_id);
CREATE INDEX IF NOT EXISTS idx_wf_history_project ON workflow_state_history(project_id);
