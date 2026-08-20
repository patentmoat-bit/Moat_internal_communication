-- ============================================================
-- MOAT Workflow Engine V2 — Enhanced Schema Migration
-- Run this against your Supabase instance to add new columns/tables
-- ============================================================

-- ── Enhanced emails table with TO/CC arrays ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS to_recipients JSONB DEFAULT '[]';
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS cc_recipients JSONB DEFAULT '[]';
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS event_type VARCHAR(64);
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS project_id UUID;

-- ── Enhanced audit_logs with workflow context ──────────────────────────────
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_status VARCHAR(64);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_status VARCHAR(64);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_role VARCHAR(64);

-- ── Project assignment columns on inventions table ─────────────────────────
ALTER TABLE public.inventions ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE public.inventions ADD COLUMN IF NOT EXISTS designer_id UUID;
ALTER TABLE public.inventions ADD COLUMN IF NOT EXISTS ceo_id UUID;
ALTER TABLE public.inventions ADD COLUMN IF NOT EXISTS patent_number VARCHAR(64);
ALTER TABLE public.inventions ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- ── Email Templates table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(64) UNIQUE NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Renewals table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.renewals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    patent_number VARCHAR(64),
    due_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) DEFAULT 'pending',
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_emails_event_type ON public.emails(event_type);
CREATE INDEX IF NOT EXISTS idx_emails_project_id ON public.emails(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON public.audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_new_status ON public.audit_logs(new_status);
CREATE INDEX IF NOT EXISTS idx_inventions_assigned_to ON public.inventions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_inventions_designer_id ON public.inventions(designer_id);
CREATE INDEX IF NOT EXISTS idx_inventions_status ON public.inventions(status);
CREATE INDEX IF NOT EXISTS idx_renewals_project_id ON public.renewals(project_id);
CREATE INDEX IF NOT EXISTS idx_renewals_due_date ON public.renewals(due_date);

-- ── RLS Policies ───────────────────────────────────────────────────────────
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_templates' AND policyname = 'email_templates_read') THEN
    CREATE POLICY "email_templates_read" ON public.email_templates FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_templates' AND policyname = 'email_templates_admin_write') THEN
    CREATE POLICY "email_templates_admin_write" ON public.email_templates FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE public.renewals ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'renewals' AND policyname = 'renewals_read') THEN
    CREATE POLICY "renewals_read" ON public.renewals FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'renewals' AND policyname = 'renewals_write') THEN
    CREATE POLICY "renewals_write" ON public.renewals FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Update Audit Logs RLS to allow service role inserts ────────────────────
-- The service role bypasses RLS, but we need a permissive insert policy for
-- the event bus which uses the service role key.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'audit_logs_insert_all') THEN
    CREATE POLICY "audit_logs_insert_all" ON public.audit_logs FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- ── Realtime ───────────────────────────────────────────────────────────────
-- Only add if not already in publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'renewals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.renewals;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'emails'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.emails;
  END IF;
END $$;

-- ── Seed Default Email Templates ───────────────────────────────────────────
INSERT INTO public.email_templates (event_type, subject_template, body_template) VALUES
  ('project_created', 'New Patent Project Assigned — {{project_title}}', 'A new patent project has been assigned to you.'),
  ('project_assigned', 'Project Assignment — {{project_title}}', 'You have been assigned to a patent project.'),
  ('research_started', 'Research Started — {{project_title}}', 'Research has begun on the project.'),
  ('document_uploaded', 'Document Uploaded — {{project_title}}', 'A new document has been uploaded.'),
  ('design_requested', 'Design Work Required — {{project_title}}', 'Design work has been requested.'),
  ('design_started', 'Design Work Started — {{project_title}}', 'Design work has started.'),
  ('design_completed', 'Design Completed — {{project_title}}', 'Design work has been completed.'),
  ('report_submitted', 'Report Submitted — {{project_title}}', 'A report has been submitted for review.'),
  ('ceo_approved', 'Project Approved — {{project_title}}', 'The project has been approved.'),
  ('ceo_rejected', 'Revision Required — {{project_title}}', 'The project requires revision.'),
  ('revision_required', 'Revision Required — {{project_title}}', 'The project has been sent back for revision.'),
  ('revision_completed', 'Revision Completed — {{project_title}}', 'Revisions have been completed.'),
  ('filing_started', 'Filing Started — {{project_title}}', 'The filing process has started.'),
  ('filed', 'Patent Filed — {{project_title}}', 'The patent has been filed successfully.'),
  ('renewal_reminder', 'Renewal Reminder — {{project_title}}', 'Patent renewal is approaching.'),
  ('project_completed', 'Project Completed — {{project_title}}', 'The project has been completed.')
ON CONFLICT (event_type) DO NOTHING;
-- ── Notification Rule Engine Tables ────────────────────────────────────────

-- 1. Notification Templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Notification Rules
CREATE TABLE IF NOT EXISTS public.notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(100) NOT NULL,
    template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
    priority VARCHAR(50) DEFAULT 'Normal',
    status VARCHAR(50) DEFAULT 'Active', -- Active, Disabled
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Notification Recipients
CREATE TABLE IF NOT EXISTS public.notification_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES public.notification_rules(id) ON DELETE CASCADE,
    recipient_type VARCHAR(50) NOT NULL, -- 'ROLE', 'PROJECT_FIELD', 'SPECIFIC_USER'
    recipient_value VARCHAR(255) NOT NULL, -- e.g., 'CEO', 'assigned_to', 'user_id'
    routing_type VARCHAR(10) NOT NULL, -- 'TO', 'CC', 'BCC'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Notification Conditions
CREATE TABLE IF NOT EXISTS public.notification_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES public.notification_rules(id) ON DELETE CASCADE,
    field VARCHAR(100) NOT NULL, -- e.g., 'department', 'priority', 'status'
    operator VARCHAR(50) NOT NULL, -- 'EQUALS', 'CONTAINS', 'GREATER_THAN', etc.
    value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Email Logs
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES public.notification_rules(id) ON DELETE SET NULL,
    event_type VARCHAR(100),
    subject VARCHAR(255),
    recipients JSONB, -- { to: [], cc: [], bcc: [] }
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Sent, Failed
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
);
