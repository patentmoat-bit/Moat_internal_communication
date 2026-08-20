-- ============================================================
-- Workflow History Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workflow_history (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(64)  NOT NULL, -- 'invention', 'trademark'
    resource_id   UUID         NOT NULL,
    old_status    VARCHAR(64),
    new_status    VARCHAR(64)  NOT NULL,
    changed_by    VARCHAR(255),
    metadata      JSONB        DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_history_resource ON public.workflow_history(resource_id);

ALTER TABLE public.workflow_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view workflow history" ON public.workflow_history FOR SELECT USING (true);

-- ============================================================
-- Audit Logs Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action       VARCHAR(255) NOT NULL,
    performed_by VARCHAR(255) NOT NULL,
    details      JSONB        DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON public.audit_logs(performed_by);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their audit logs" ON public.audit_logs FOR SELECT USING (performed_by = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================================
-- Emails Table (Queue / Sent logs)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.emails (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject    VARCHAR(255) NOT NULL,
    body       TEXT         NOT NULL,
    sender     VARCHAR(255) NOT NULL,
    recipient  VARCHAR(255) NOT NULL,
    status     VARCHAR(64)  NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view emails" ON public.emails FOR SELECT USING (true);

-- ============================================================
-- Update Notifications Table (RLS)
-- ============================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (receiver = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (receiver = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================================
-- Realtime Replication
-- ============================================================
-- Drop publication if exists, then recreate or alter to add tables.
-- The standard way in Supabase is adding to supabase_realtime publication
begin;
  -- remove the supabase_realtime publication
  drop publication if exists supabase_realtime;

  -- re-create the supabase_realtime publication with no tables
  create publication supabase_realtime;
commit;

-- add tables to the publication
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.audit_logs;
alter publication supabase_realtime add table public.inventions;
alter publication supabase_realtime add table public.workflow_history;
