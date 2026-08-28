-- Remove public.users.password_plain: an untracked, cleartext-password column with no
-- code reader anywhere in this repo. 7 rows had non-null values; those values were
-- nulled out via the Supabase REST API on 2026-08-27 as an immediate remediation
-- before this migration could be applied. This migration removes the column entirely
-- so it cannot be repopulated by any future out-of-band write.
ALTER TABLE public.users DROP COLUMN IF EXISTS password_plain;
