-- Supabase Auth is now the single source of truth for credentials. Login
-- (authenticationService.ts) calls supabase.auth.signInWithPassword() directly
-- instead of maintaining a separate bcrypt-hashed password_hash column, and
-- password resets/admin-provisioning no longer write to it either. Drop the
-- column so there is no way for a second password store to exist again.
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;
