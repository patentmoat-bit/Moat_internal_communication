-- Migration to support secure rotating refresh tokens
ALTER TABLE public.user_sessions
ADD COLUMN IF NOT EXISTS refresh_token_family_id UUID,
ADD COLUMN IF NOT EXISTS refresh_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS absolute_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rotated_from_token_id TEXT,
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refresh_token_used_at TIMESTAMPTZ;

-- Populate absolute_expires_at for existing sessions (8 hours after login)
UPDATE public.user_sessions 
SET absolute_expires_at = login_time + interval '8 hours'
WHERE absolute_expires_at IS NULL AND login_time IS NOT NULL;

-- Indexes to support fast lookup for refresh tokens and family invalidation
CREATE INDEX IF NOT EXISTS idx_user_sessions_family_id ON public.user_sessions(refresh_token_family_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_expires ON public.user_sessions(refresh_token_expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked_at ON public.user_sessions(revoked_at);
