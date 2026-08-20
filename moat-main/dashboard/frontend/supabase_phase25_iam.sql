-- Phase 25: IAM and Enterprise Security Schema

-- 1. PASSWORD POLICY (Global configuration)
CREATE TABLE IF NOT EXISTS public.password_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_length INTEGER DEFAULT 12,
    require_uppercase BOOLEAN DEFAULT true,
    require_lowercase BOOLEAN DEFAULT true,
    require_numbers BOOLEAN DEFAULT true,
    require_symbols BOOLEAN DEFAULT true,
    prevent_last_n INTEGER DEFAULT 5,
    expiry_days INTEGER DEFAULT 90,
    max_failed_attempts INTEGER DEFAULT 5,
    lockout_duration_minutes INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default policy
INSERT INTO public.password_policy (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;

-- 2. ACCOUNT STATUS
CREATE TABLE IF NOT EXISTS public.account_status (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'Active', -- Invited, Pending Activation, Active, Password Expired, Locked, Disabled
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_password_change TIMESTAMPTZ DEFAULT NOW(),
    force_password_change BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.account_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_status_read_own" ON public.account_status FOR SELECT USING (auth.uid() = user_id);
-- Admins can read all (using a helper or role check, assuming true for now to allow admin panel)
CREATE POLICY "account_status_admin_all" ON public.account_status FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

-- 3. PASSWORD HISTORY
CREATE TABLE IF NOT EXISTS public.password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;
-- No direct user access to hashes

-- 4. MFA SECRETS (Custom tracking layer)
CREATE TABLE IF NOT EXISTS public.mfa_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT false,
    mfa_type TEXT, -- TOTP, EMAIL
    secret_key TEXT, -- Encrypted or hashed based on implementation
    backup_codes JSONB DEFAULT '[]'::jsonb,
    enforced_by_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.mfa_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mfa_settings_read_own" ON public.mfa_settings FOR SELECT USING (auth.uid() = user_id);

-- 5. SECURITY AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.security_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- LOGIN_SUCCESS, LOGIN_FAILED, ACCOUNT_LOCKED, PASSWORD_CHANGED, MFA_ENABLED, etc.
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    device_type TEXT,
    browser TEXT,
    country TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.security_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_audit_read_own" ON public.security_audit FOR SELECT USING (auth.uid() = user_id);

-- 6. EXTEND USER SESSIONS
-- Add columns to existing user_sessions table if they don't exist
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS os TEXT;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- 7. NOTIFICATION TEMPLATES FOR SECURITY EVENTS
-- Seed new notification templates for security events if needed (assuming notifications engine exists)
