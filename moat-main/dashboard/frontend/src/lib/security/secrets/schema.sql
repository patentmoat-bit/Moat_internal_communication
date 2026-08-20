-- ==============================================================================
-- MOAT Patent Intelligence Platform: Phase 7 Secrets Management Schema
-- ==============================================================================
-- Stores encrypted secret payloads, version history, access history trails,
-- and rotation audit events.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS secret_versions (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    type VARCHAR(64) NOT NULL,
    version INTEGER NOT NULL,
    encrypted_value TEXT NOT NULL,
    iv VARCHAR(32) NOT NULL,
    auth_tag VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('ACTIVE', 'DEPRECATED', 'EXPIRED', 'REVOKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_accessed_at TIMESTAMPTZ,
    CONSTRAINT uq_secret_version UNIQUE (name, version)
);

CREATE INDEX IF NOT EXISTS idx_secret_versions_name_status ON secret_versions(name, status);
CREATE INDEX IF NOT EXISTS idx_secret_versions_expires ON secret_versions(expires_at);

CREATE TABLE IF NOT EXISTS secret_access_history (
    id VARCHAR(64) PRIMARY KEY,
    secret_name VARCHAR(128) NOT NULL,
    version INTEGER NOT NULL,
    accessed_by VARCHAR(128) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action VARCHAR(32) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_secret_access_name ON secret_access_history(secret_name, version);
CREATE INDEX IF NOT EXISTS idx_secret_access_timestamp ON secret_access_history(timestamp);

CREATE TABLE IF NOT EXISTS secret_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(64) NOT NULL,
    secret_name VARCHAR(128) NOT NULL,
    version INTEGER NOT NULL,
    details TEXT NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL'))
);

CREATE INDEX IF NOT EXISTS idx_secret_audit_event ON secret_audit_logs(event_type, severity);
