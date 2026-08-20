BEGIN;

-- Drop the restrictive foreign key constraint that references auth.users
-- Since this application uses a custom public.users table, the auth.users FK 
-- causes inserts to fail whenever a valid userId is provided.
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;

-- Optionally, add FK to public.users if it's strictly maintained
-- But given the possibility of SYSTEM events or deleted users, it's safer
-- to just let it be an unconstrained UUID column that joins dynamically.
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
    
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_actor_id_fkey 
    FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;

COMMIT;
