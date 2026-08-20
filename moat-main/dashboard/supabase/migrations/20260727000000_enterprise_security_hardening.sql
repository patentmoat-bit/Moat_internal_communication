-- ─────────────────────────────────────────────────────────────────────────────
-- MOAT — Enterprise Authentication Security Hardening Migration
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Extend the Users table with enterprise security telemetry columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS failed_reset_requests INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS failed_mfa_attempts INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(64) NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE NULL;

-- 2. Create the SecurityEvents table for Layer 7 immutable audit logging
CREATE TABLE IF NOT EXISTS public.SecurityEvents (
    event_id VARCHAR(128) PRIMARY KEY,
    user_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    email VARCHAR(255) NULL,
    ip_address VARCHAR(64) NOT NULL,
    user_agent TEXT NULL,
    endpoint VARCHAR(255) NOT NULL,
    event_type VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('SUCCESS', 'FAILURE', 'WARNING', 'INFO')),
    reason TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexing for rapid telemetry filtering in Admin Security Dashboard
CREATE INDEX IF NOT EXISTS idx_security_events_email ON public.SecurityEvents(email);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON public.SecurityEvents(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.SecurityEvents(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.SecurityEvents(created_at);
