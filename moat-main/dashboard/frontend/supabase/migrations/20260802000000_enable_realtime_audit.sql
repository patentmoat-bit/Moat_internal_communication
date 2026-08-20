-- Enable Realtime for admin dashboard monitoring tables
BEGIN;

-- Try to add tables to the publication. If they are already in the publication, 
-- this will throw a warning but we can ignore it by catching or just letting it run 
-- if we use DO block. Let's use a DO block to prevent errors if already added.

DO $$
BEGIN
    -- audit_logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'audit_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
    END IF;

    -- users
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'users'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
    END IF;

    -- roles
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'roles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.roles;
    END IF;
END $$;

COMMIT;
