-- notification_templates and notification_rules exist live with NO row level
-- security at all (found during this session's security audit). All app
-- access to these already goes through the admin (service-role) client with
-- an app-level admin check, so this is defense-in-depth rather than the
-- primary control — but per the security review, every table should have
-- RLS enabled. Read-only for authenticated users (these aren't secret, just
-- config); writes stay funneled through the already admin-gated API routes,
-- which bypass RLS via the service-role client regardless.
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read notification templates" ON public.notification_templates;
CREATE POLICY "Authenticated users can read notification templates"
  ON public.notification_templates FOR SELECT
  USING (auth.role() = 'authenticated');

ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read notification rules" ON public.notification_rules;
CREATE POLICY "Authenticated users can read notification rules"
  ON public.notification_rules FOR SELECT
  USING (auth.role() = 'authenticated');

-- Same treatment for their sibling config tables, found to also have no RLS.
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read notification recipients" ON public.notification_recipients;
CREATE POLICY "Authenticated users can read notification recipients"
  ON public.notification_recipients FOR SELECT
  USING (auth.role() = 'authenticated');

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read email templates" ON public.email_templates;
CREATE POLICY "Authenticated users can read email templates"
  ON public.email_templates FOR SELECT
  USING (auth.role() = 'authenticated');

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read feature flags" ON public.feature_flags;
CREATE POLICY "Authenticated users can read feature flags"
  ON public.feature_flags FOR SELECT
  USING (auth.role() = 'authenticated');

ALTER TABLE public.application_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read application settings" ON public.application_settings;
CREATE POLICY "Authenticated users can read application settings"
  ON public.application_settings FOR SELECT
  USING (auth.role() = 'authenticated');
