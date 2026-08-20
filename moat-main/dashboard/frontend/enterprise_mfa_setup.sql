-- Enterprise MFA Database Schema Update
-- Applies to Supabase

-- Extend the existing Users table according to enterprise requirements
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS encrypted_totp_secret TEXT,
ADD COLUMN IF NOT EXISTS mfa_enrolled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failed_mfa_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS backup_codes JSONB,
ADD COLUMN IF NOT EXISTS last_mfa_verified_at TIMESTAMPTZ;

-- Create security_audit table if it does not exist
CREATE TABLE IF NOT EXISTS public.security_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    action VARCHAR(255) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying audit logs by user
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON public.security_audit(user_id);
