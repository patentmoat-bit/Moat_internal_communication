DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_change_required') THEN
        ALTER TABLE public.users ADD COLUMN password_change_required BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='failed_login_attempts') THEN
        ALTER TABLE public.users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='failed_mfa_attempts') THEN
        ALTER TABLE public.users ADD COLUMN failed_mfa_attempts INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='locked_until') THEN
        ALTER TABLE public.users ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mfa_enrolled_at') THEN
        ALTER TABLE public.users ADD COLUMN mfa_enrolled_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mfa_enabled') THEN
        ALTER TABLE public.users ADD COLUMN mfa_enabled BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='account_status') THEN
        ALTER TABLE public.users ADD COLUMN account_status VARCHAR(50) DEFAULT 'ACTIVE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_failed_login') THEN
        ALTER TABLE public.users ADD COLUMN last_failed_login TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
