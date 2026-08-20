-- ==============================================================================
-- MOAT Patent Intelligence Platform: Phase 6 CSRF & CORS Security Schema
-- ==============================================================================
-- Stores immutable audit logs for CORS policy enforcement, unknown origin blocks,
-- OPTIONS preflight failures, and CSRF token verification anomalies.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS csrf_cors_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(45) NOT NULL,
    origin VARCHAR(255) NOT NULL,
    referer VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    http_method VARCHAR(16) NOT NULL,
    violation_type VARCHAR(64) NOT NULL,
    details TEXT NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    user_id VARCHAR(64) NOT NULL DEFAULT 'anonymous'
);

CREATE INDEX IF NOT EXISTS idx_csrf_audit_violation ON csrf_cors_audit_logs(violation_type, severity);
CREATE INDEX IF NOT EXISTS idx_csrf_audit_ip ON csrf_cors_audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_csrf_audit_timestamp ON csrf_cors_audit_logs(timestamp);

-- Optional persistent storage table for active CSRF tokens in multi-instance clusters
CREATE TABLE IF NOT EXISTS active_csrf_tokens (
    token VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csrf_tokens_user ON active_csrf_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_expires ON active_csrf_tokens(expires_at);
