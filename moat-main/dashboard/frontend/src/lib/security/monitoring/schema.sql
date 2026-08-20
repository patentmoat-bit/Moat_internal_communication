-- ==============================================================================
-- MOAT ENTERPRISE PHASE 8: SECURITY MONITORING & ADMIN SECURITY DASHBOARD
-- Relational Table Schema for Telemetry, Audit Trails, Alerts, and Health
-- ==============================================================================

-- 1. SecurityEvents Table
CREATE TABLE IF NOT EXISTS "SecurityEvents" (
  event_id VARCHAR(128) PRIMARY KEY,
  category VARCHAR(64) NOT NULL,
  event_type VARCHAR(128) NOT NULL,
  severity VARCHAR(32) NOT NULL DEFAULT 'Info',
  user_id VARCHAR(128),
  email VARCHAR(255),
  ip_address VARCHAR(64) NOT NULL,
  user_agent TEXT,
  endpoint VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'INFO',
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_secevent_cat_sev ON "SecurityEvents"(category, severity);
CREATE INDEX IF NOT EXISTS idx_secevent_created ON "SecurityEvents"(created_at);

-- 2. SecurityAlerts Table
CREATE TABLE IF NOT EXISTS "SecurityAlerts" (
  alert_id VARCHAR(128) PRIMARY KEY,
  alert_type VARCHAR(128) NOT NULL,
  severity VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  source VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_secalert_status_sev ON "SecurityAlerts"(status, severity);

-- 3. LoginHistory Table
CREATE TABLE IF NOT EXISTS "LoginHistory" (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128),
  email VARCHAR(255),
  login_type VARCHAR(64) NOT NULL, -- CREDENTIAL, MFA, OAUTH, NEW_DEVICE, NEW_BROWSER
  status VARCHAR(32) NOT NULL,
  ip_address VARCHAR(64) NOT NULL,
  user_agent TEXT,
  device_type VARCHAR(64),
  browser VARCHAR(64),
  location VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_user_created ON "LoginHistory"(user_id, created_at);

-- 4. ApiLogs Table
CREATE TABLE IF NOT EXISTS "ApiLogs" (
  log_id VARCHAR(128) PRIMARY KEY,
  request_id VARCHAR(128),
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(16) NOT NULL,
  status_code INT NOT NULL,
  response_time_ms INT NOT NULL DEFAULT 0,
  ip_address VARCHAR(64),
  user_id VARCHAR(128),
  error_type VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apilog_status_created ON "ApiLogs"(status_code, created_at);

-- 5. WorkflowLogs Table
CREATE TABLE IF NOT EXISTS "WorkflowLogs" (
  log_id VARCHAR(128) PRIMARY KEY,
  workflow_id VARCHAR(128) NOT NULL,
  transition_name VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL, -- SUCCESS, ERROR, INVALID_TRANSITION, REVISION_REQUESTED
  user_id VARCHAR(128),
  processing_time_ms INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wflog_wf_created ON "WorkflowLogs"(workflow_id, created_at);

-- 6. AuditLogs Table
CREATE TABLE IF NOT EXISTS "AuditLogs" (
  audit_id VARCHAR(128) PRIMARY KEY,
  event_type VARCHAR(128) NOT NULL,
  user_id VARCHAR(128),
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(128) NOT NULL,
  resource_id VARCHAR(128),
  changes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON "AuditLogs"(resource_type, resource_id);

-- 7. SystemHealth Table
CREATE TABLE IF NOT EXISTS "SystemHealth" (
  health_id VARCHAR(128) PRIMARY KEY,
  component VARCHAR(128) NOT NULL, -- DATABASE, STORAGE, REALTIME, AUTH, VERCEL, API_GATEWAY
  status VARCHAR(32) NOT NULL, -- HEALTHY, DEGRADED, OUTAGE
  latency_ms INT DEFAULT 0,
  active_connections INT DEFAULT 0,
  memory_usage_mb NUMERIC(10, 2) DEFAULT 0,
  cpu_usage_pct NUMERIC(5, 2) DEFAULT 0,
  details JSONB DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_health_comp_checked ON "SystemHealth"(component, checked_at);

-- 8. EmailLogs Table
CREATE TABLE IF NOT EXISTS "EmailLogs" (
  log_id VARCHAR(128) PRIMARY KEY,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL, -- SENT, FAILED, QUEUED
  provider_status VARCHAR(64) DEFAULT 'MS_GRAPH_HEALTHY',
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_emaillog_status_sent ON "EmailLogs"(status, sent_at);
