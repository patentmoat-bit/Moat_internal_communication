-- ============================================================================
-- Security remediation: overly permissive RLS policies + tables missing RLS
-- ============================================================================
-- Context / important caveat for reviewers:
--
-- The CREATE TABLE statements for several tables touched below (ceo_feedback,
-- ceo_feedback_versions, email_templates, renewals, search_sessions, reports,
-- report_versions, project_reports, "SecurityEvents", feedback,
-- notification_recipients, notification_conditions, email_logs) do NOT appear
-- anywhere in this linked migration history (frontend/supabase/migrations).
-- They only appear in:
--   - moat-main/dashboard/supabase/migrations (unlinked/orphaned directory,
--     intentionally left untouched per instructions), and/or
--   - frontend/src/lib/security/monitoring/schema.sql (a standalone schema
--     file applied out-of-band, outside the CLI migration flow, for the
--     "SecurityEvents" family of tables).
-- Application code under frontend/src actively queries most of these tables
-- by name, so they are presumed to exist in the real target database even
-- though this migration history never created them. Every block below is
-- therefore guarded with a to_regclass() existence check so this migration
-- is a safe no-op for any table that turns out not to exist in a given
-- environment. A human should separately reconcile the migration history
-- (e.g. `supabase db pull` / rebaseline) so future migrations don't have to
-- guess at schema provenance like this one does.
--
-- Tables intentionally NOT touched here:
--   - public.trademarks, public.trademark_history: already remediated with
--     owner/project_members-scoped policies by 20260610170500,
--     20260801000000_fix_bola_rls.sql, 20260810000001_fix_f03_customer_rls.sql
--     and 20260812000000_fix_storage_and_document_rls.sql. No permissive
--     policy remains active on either table.
--   - public.alerts: the audit-worthy "alerts" table named in the security
--     review is a DIFFERENT, orphaned-directory-only table (title/status/
--     assigned_to columns). The live "public.alerts" table defined in this
--     migration history (20260610170500_phase_database_upgrades.sql) is an
--     unrelated saved-search-alert table that already has owner-scoped RLS
--     (user_id = auth.uid()) applied by 20260810000001_fix_f03_customer_rls.sql.
--     Touching it here would be a no-op at best; flagging for human review in
--     case the orphaned table is ever consolidated into this one.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ceo_feedback / ceo_feedback_versions
-- ----------------------------------------------------------------------------
-- `created_by` on both tables is a free-text VARCHAR (observed values: literal
-- 'CEO', or a client-supplied string) -- NOT a UUID that can be compared to
-- auth.uid(). True per-row ownership can't be enforced with this schema, so
-- this is scoped to the existing Admin/CEO/Patent Analyst role model already
-- used for the closely related `trademarks` table (see
-- 20260624000000_security_and_sync.sql). NEEDS HUMAN REVIEW: confirm CEO
-- feedback should be visible to all Patent Analysts and not just its author.
DO $$
BEGIN
  IF to_regclass('public.ceo_feedback') IS NOT NULL THEN
    ALTER TABLE public.ceo_feedback ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Enable all operations for authenticated users on ceo_feedback" ON public.ceo_feedback;
    DROP POLICY IF EXISTS "ceo_feedback_role_access" ON public.ceo_feedback;
    CREATE POLICY "ceo_feedback_role_access" ON public.ceo_feedback FOR ALL
      USING (
        public.current_user_is_admin()
        OR public.current_user_is_ceo()
        OR public.current_user_is_analyst()
      )
      WITH CHECK (
        public.current_user_is_admin()
        OR public.current_user_is_ceo()
        OR public.current_user_is_analyst()
      );
  END IF;

  IF to_regclass('public.ceo_feedback_versions') IS NOT NULL THEN
    ALTER TABLE public.ceo_feedback_versions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Enable all operations for authenticated users on ceo_feedback_versions" ON public.ceo_feedback_versions;
    DROP POLICY IF EXISTS "ceo_feedback_versions_role_access" ON public.ceo_feedback_versions;
    CREATE POLICY "ceo_feedback_versions_role_access" ON public.ceo_feedback_versions FOR ALL
      USING (
        public.current_user_is_admin()
        OR public.current_user_is_ceo()
        OR public.current_user_is_analyst()
      )
      WITH CHECK (
        public.current_user_is_admin()
        OR public.current_user_is_ceo()
        OR public.current_user_is_analyst()
      );
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. email_templates
-- ----------------------------------------------------------------------------
-- Shared reference data (transactional email copy keyed by event_type), no
-- per-row owner. Read is safe for any authenticated user; write must be
-- admin-only (previously FOR ALL USING(true) WITH CHECK(true)).
DO $$
BEGIN
  IF to_regclass('public.email_templates') IS NOT NULL THEN
    ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "email_templates_read" ON public.email_templates;
    DROP POLICY IF EXISTS "email_templates_admin_write" ON public.email_templates;
    DROP POLICY IF EXISTS "email_templates_select" ON public.email_templates;
    DROP POLICY IF EXISTS "email_templates_insert" ON public.email_templates;
    DROP POLICY IF EXISTS "email_templates_update" ON public.email_templates;
    DROP POLICY IF EXISTS "email_templates_delete" ON public.email_templates;

    CREATE POLICY "email_templates_select" ON public.email_templates FOR SELECT
      USING (auth.role() = 'authenticated');
    CREATE POLICY "email_templates_insert" ON public.email_templates FOR INSERT
      WITH CHECK (public.current_user_is_admin());
    CREATE POLICY "email_templates_update" ON public.email_templates FOR UPDATE
      USING (public.current_user_is_admin())
      WITH CHECK (public.current_user_is_admin());
    CREATE POLICY "email_templates_delete" ON public.email_templates FOR DELETE
      USING (public.current_user_is_admin());
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. renewals
-- ----------------------------------------------------------------------------
-- project_id (UUID) maps to the same "project" concept as public.inventions.
-- Scoped the same way as trademarks: project owner, a project_members entry,
-- or admin.
DO $$
BEGIN
  IF to_regclass('public.renewals') IS NOT NULL THEN
    ALTER TABLE public.renewals ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "renewals_read" ON public.renewals;
    DROP POLICY IF EXISTS "renewals_write" ON public.renewals;
    DROP POLICY IF EXISTS "renewals_select" ON public.renewals;
    DROP POLICY IF EXISTS "renewals_modify" ON public.renewals;

    CREATE POLICY "renewals_select" ON public.renewals FOR SELECT
      USING (
        public.current_user_is_admin()
        OR EXISTS (
          SELECT 1 FROM public.inventions i
          WHERE i.id = renewals.project_id
            AND (
              i.user_id = auth.uid()
              OR i.id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
            )
        )
      );
    CREATE POLICY "renewals_modify" ON public.renewals FOR ALL
      USING (
        public.current_user_is_admin()
        OR EXISTS (
          SELECT 1 FROM public.inventions i
          WHERE i.id = renewals.project_id
            AND (
              i.user_id = auth.uid()
              OR i.id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
            )
        )
      )
      WITH CHECK (
        public.current_user_is_admin()
        OR EXISTS (
          SELECT 1 FROM public.inventions i
          WHERE i.id = renewals.project_id
            AND (
              i.user_id = auth.uid()
              OR i.id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
            )
        )
      );
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. search_sessions, reports, report_versions, project_reports
-- ----------------------------------------------------------------------------
-- All four are part of the PFS reporting pipeline and hang off
-- public.inventions(id) via project_id (search_sessions/reports/
-- project_reports) or indirectly via reports.id (report_versions). Scoped by:
-- the individual who ran the search / generated the report, the project
-- owner, project_members, or admin.
DO $$
BEGIN
  IF to_regclass('public.search_sessions') IS NOT NULL THEN
    ALTER TABLE public.search_sessions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view search sessions" ON public.search_sessions;
    DROP POLICY IF EXISTS "Users can manage search sessions" ON public.search_sessions;
    DROP POLICY IF EXISTS "search_sessions_access" ON public.search_sessions;

    CREATE POLICY "search_sessions_access" ON public.search_sessions FOR ALL
      USING (
        public.current_user_is_admin()
        OR executed_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.inventions i
          WHERE i.id = search_sessions.project_id
            AND (
              i.user_id = auth.uid()
              OR i.id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
            )
        )
      )
      WITH CHECK (
        public.current_user_is_admin()
        OR executed_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.inventions i
          WHERE i.id = search_sessions.project_id
            AND (
              i.user_id = auth.uid()
              OR i.id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
            )
        )
      );
  END IF;

  IF to_regclass('public.reports') IS NOT NULL THEN
    ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view reports" ON public.reports;
    DROP POLICY IF EXISTS "Users can manage reports" ON public.reports;
    DROP POLICY IF EXISTS "reports_access" ON public.reports;

    CREATE POLICY "reports_access" ON public.reports FOR ALL
      USING (
        public.current_user_is_admin()
        OR generated_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.inventions i
          WHERE i.id = reports.project_id
            AND (
              i.user_id = auth.uid()
              OR i.id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
            )
        )
      )
      WITH CHECK (
        public.current_user_is_admin()
        OR generated_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.inventions i
          WHERE i.id = reports.project_id
            AND (
              i.user_id = auth.uid()
              OR i.id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
            )
        )
      );
  END IF;

  IF to_regclass('public.report_versions') IS NOT NULL THEN
    ALTER TABLE public.report_versions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view report versions" ON public.report_versions;
    DROP POLICY IF EXISTS "Users can manage report versions" ON public.report_versions;
    DROP POLICY IF EXISTS "report_versions_access" ON public.report_versions;

    CREATE POLICY "report_versions_access" ON public.report_versions FOR ALL
      USING (
        public.current_user_is_admin()
        OR created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.reports r
          JOIN public.inventions i ON i.id = r.project_id
          WHERE r.id = report_versions.report_id
            AND (
              r.generated_by = auth.uid()
              OR i.user_id = auth.uid()
              OR i.id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
            )
        )
      )
      WITH CHECK (
        public.current_user_is_admin()
        OR created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.reports r
          JOIN public.inventions i ON i.id = r.project_id
          WHERE r.id = report_versions.report_id
            AND (
              r.generated_by = auth.uid()
              OR i.user_id = auth.uid()
              OR i.id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
            )
        )
      );
  END IF;

  IF to_regclass('public.project_reports') IS NOT NULL THEN
    ALTER TABLE public.project_reports ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view project reports" ON public.project_reports;
    DROP POLICY IF EXISTS "Users can manage project reports" ON public.project_reports;
    DROP POLICY IF EXISTS "project_reports_access" ON public.project_reports;

    CREATE POLICY "project_reports_access" ON public.project_reports FOR ALL
      USING (
        public.current_user_is_admin()
        OR EXISTS (
          SELECT 1 FROM public.inventions i
          WHERE i.id = project_reports.project_id
            AND (
              i.user_id = auth.uid()
              OR i.id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
            )
        )
      )
      WITH CHECK (
        public.current_user_is_admin()
        OR EXISTS (
          SELECT 1 FROM public.inventions i
          WHERE i.id = project_reports.project_id
            AND (
              i.user_id = auth.uid()
              OR i.id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
            )
        )
      );
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. "SecurityEvents" -- RLS was never enabled at all. Contains login IPs,
--    emails, and failure reasons; admin-only read, no policy for
--    insert/update/delete so only the service role (which bypasses RLS) can
--    write, matching how the app's monitoring service persists events today.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public."SecurityEvents"') IS NOT NULL THEN
    ALTER TABLE public."SecurityEvents" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "security_events_admin_read" ON public."SecurityEvents";
    CREATE POLICY "security_events_admin_read" ON public."SecurityEvents" FOR SELECT
      USING (public.current_user_is_admin());
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. feedback -- RLS was never enabled. Same free-text `created_by` shape as
--    ceo_feedback (not a UUID), so per-row ownership can't be enforced.
--    Defaulting to admin-only read/write via the deny-by-default pattern
--    (backend writes through the service role, which bypasses RLS).
--    NEEDS HUMAN REVIEW: confirm this shouldn't instead be readable by all
--    authenticated staff (it may be a general internal feedback board rather
--    than an admin-only resource).
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.feedback') IS NOT NULL THEN
    ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "feedback_admin_read" ON public.feedback;
    CREATE POLICY "feedback_admin_read" ON public.feedback FOR SELECT
      USING (public.current_user_is_admin());
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7. notification_recipients, notification_conditions, email_logs -- RLS was
--    never enabled. These describe internal notification-routing rules and
--    email delivery logs (which can contain recipient addresses); no
--    per-user owner. Admin-only read, deny-by-default write (backend/event
--    bus writes through the service role, which bypasses RLS).
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.notification_recipients') IS NOT NULL THEN
    ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "notification_recipients_admin_read" ON public.notification_recipients;
    CREATE POLICY "notification_recipients_admin_read" ON public.notification_recipients FOR SELECT
      USING (public.current_user_is_admin());
  END IF;

  IF to_regclass('public.notification_conditions') IS NOT NULL THEN
    ALTER TABLE public.notification_conditions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "notification_conditions_admin_read" ON public.notification_conditions;
    CREATE POLICY "notification_conditions_admin_read" ON public.notification_conditions FOR SELECT
      USING (public.current_user_is_admin());
  END IF;

  IF to_regclass('public.email_logs') IS NOT NULL THEN
    ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "email_logs_admin_read" ON public.email_logs;
    CREATE POLICY "email_logs_admin_read" ON public.email_logs FOR SELECT
      USING (public.current_user_is_admin());
  END IF;
END $$;
