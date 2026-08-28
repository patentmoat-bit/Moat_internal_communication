-- src/services/auth/UserService.ts has always read/written public.users.encrypted_totp_secret
-- and last_mfa_verified_at, but neither column exists in any tracked migration or the live
-- schema. In their absence the code silently falls back to writing the TOTP secret to a local
-- JSON file on the server filesystem (mfa_fallback.json) and resetting lockout counters into an
-- in-memory global — both broken across server restarts / multiple instances. This migration
-- adds the missing columns so MFA state persists in the database as the code always intended.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS encrypted_totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS last_mfa_verified_at TIMESTAMPTZ;
