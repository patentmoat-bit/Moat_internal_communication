-- MFA lockout (checkMfaLockout/incrementMfaFailure/resetMfaLockout in
-- lockoutService.ts) has only ever tracked state in an in-memory global,
-- which never persists across a server restart or multiple instances. This
-- adds real columns so lockout state is durable, plus a lockout-cycle counter
-- to support escalating a repeatedly-failing account to a full suspension.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS mfa_locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mfa_lockout_count INTEGER NOT NULL DEFAULT 0;
