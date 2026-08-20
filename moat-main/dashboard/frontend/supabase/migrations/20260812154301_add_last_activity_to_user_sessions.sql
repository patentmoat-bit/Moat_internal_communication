-- Add last_activity_at to user_sessions to support 30-minute inactivity timeouts
ALTER TABLE public.user_sessions
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing rows to have last_activity_at equal to login_time if possible
UPDATE public.user_sessions SET last_activity_at = login_time WHERE last_activity_at IS NULL;
