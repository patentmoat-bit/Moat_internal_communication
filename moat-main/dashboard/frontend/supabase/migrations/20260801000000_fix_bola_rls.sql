-- ============================================================================
-- Fix Broken RLS / BOLA Vulnerability
-- ============================================================================

-- 1. Create missing project_members table
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, user_id)
);
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- project_members policies
DROP POLICY IF EXISTS "project_members_select" ON public.project_members;
CREATE POLICY "project_members_select" ON public.project_members FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'CEO', 'Super Admin'))
    );

-- 2. Inventions RLS
DROP POLICY IF EXISTS "Admin has full access to inventions" ON public.inventions;
DROP POLICY IF EXISTS "Patent Analysts can manage inventions but not delete" ON public.inventions;
DROP POLICY IF EXISTS "CEO can review inventions" ON public.inventions;
DROP POLICY IF EXISTS "CEO can update inventions" ON public.inventions;
DROP POLICY IF EXISTS "CEO can insert inventions" ON public.inventions;
DROP POLICY IF EXISTS "inventions_own" ON public.inventions;
DROP POLICY IF EXISTS "Allow authenticated full access to inventions" ON public.inventions;

-- SELECT policy
CREATE POLICY "inventions_select_policy" ON public.inventions FOR SELECT
    USING (
        user_id = auth.uid()
        OR workspace_id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'CEO', 'Super Admin'))
    );

-- INSERT policy
CREATE POLICY "inventions_insert_policy" ON public.inventions FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
    );

-- UPDATE policy
CREATE POLICY "inventions_update_policy" ON public.inventions FOR UPDATE
    USING (
        user_id = auth.uid()
        OR workspace_id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'CEO', 'Super Admin'))
    )
    WITH CHECK (
        user_id = auth.uid()
        OR workspace_id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'CEO', 'Super Admin'))
    );

-- DELETE policy
CREATE POLICY "inventions_delete_policy" ON public.inventions FOR DELETE
    USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
    );

-- 3. Patent Documents RLS
DROP POLICY IF EXISTS "Allow authenticated full access to patent_documents" ON public.patent_documents;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.patent_documents;
DROP POLICY IF EXISTS "Allow document read access based on project assignment" ON public.patent_documents;
DROP POLICY IF EXISTS "Deny public unauthenticated access" ON public.patent_documents;

CREATE POLICY "patent_documents_select_policy" ON public.patent_documents FOR SELECT
    USING (
        created_by = auth.uid()
        OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'CEO', 'Super Admin', 'Patent Analyst', 'Design Team'))
    );

CREATE POLICY "patent_documents_insert_policy" ON public.patent_documents FOR INSERT
    WITH CHECK (
        created_by = auth.uid()
    );

CREATE POLICY "patent_documents_update_policy" ON public.patent_documents FOR UPDATE
    USING (
        created_by = auth.uid()
        OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'CEO', 'Super Admin', 'Patent Analyst'))
    )
    WITH CHECK (
        created_by = auth.uid()
        OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'CEO', 'Super Admin', 'Patent Analyst'))
    );

CREATE POLICY "patent_documents_delete_policy" ON public.patent_documents FOR DELETE
    USING (
        created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
    );

-- 4. Document Versions RLS
DROP POLICY IF EXISTS "Allow authenticated full access to document_versions" ON public.document_versions;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.document_versions;

CREATE POLICY "document_versions_select_policy" ON public.document_versions FOR SELECT
    USING (
        uploaded_by = auth.uid()
        OR document_id IN (
            SELECT id FROM public.patent_documents WHERE created_by = auth.uid() OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'CEO', 'Super Admin', 'Patent Analyst', 'Design Team'))
    );

CREATE POLICY "document_versions_insert_policy" ON public.document_versions FOR INSERT
    WITH CHECK (
        uploaded_by = auth.uid()
    );

CREATE POLICY "document_versions_update_policy" ON public.document_versions FOR UPDATE
    USING (
        uploaded_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'CEO', 'Super Admin'))
    )
    WITH CHECK (
        uploaded_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'CEO', 'Super Admin'))
    );

CREATE POLICY "document_versions_delete_policy" ON public.document_versions FOR DELETE
    USING (
        uploaded_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
    );

-- 5. Trademarks RLS
ALTER TABLE public.trademarks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.trademarks ADD COLUMN IF NOT EXISTS project_id VARCHAR(255);

DROP POLICY IF EXISTS "Admin has full access to trademarks" ON public.trademarks;
DROP POLICY IF EXISTS "Patent Analysts can manage trademarks but not delete" ON public.trademarks;
DROP POLICY IF EXISTS "CEO can review and approve trademarks" ON public.trademarks;
DROP POLICY IF EXISTS "CEO can update trademarks" ON public.trademarks;
DROP POLICY IF EXISTS "Deny public unauthenticated access" ON public.trademarks;
DROP POLICY IF EXISTS "Allow authenticated trademark read access" ON public.trademarks;
DROP POLICY IF EXISTS "Universal read for authenticated" ON public.trademarks;

CREATE POLICY "trademarks_select_policy" ON public.trademarks FOR SELECT
    USING (
        created_by = auth.uid()
        OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'CEO', 'Super Admin', 'Patent Analyst'))
    );

CREATE POLICY "trademarks_insert_policy" ON public.trademarks FOR INSERT
    WITH CHECK (
        created_by = auth.uid()
    );

CREATE POLICY "trademarks_update_policy" ON public.trademarks FOR UPDATE
    USING (
        created_by = auth.uid()
        OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'CEO', 'Super Admin', 'Patent Analyst'))
    )
    WITH CHECK (
        created_by = auth.uid()
        OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'CEO', 'Super Admin', 'Patent Analyst'))
    );

CREATE POLICY "trademarks_delete_policy" ON public.trademarks FOR DELETE
    USING (
        created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
    );

-- 6. Trademark History RLS
DROP POLICY IF EXISTS "Authenticated users can access trademark history" ON public.trademark_history;

CREATE POLICY "trademark_history_select_policy" ON public.trademark_history FOR SELECT
    USING (
        trademark_id IN (
            SELECT id FROM public.trademarks WHERE created_by = auth.uid() OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'CEO', 'Super Admin', 'Patent Analyst'))
    );

CREATE POLICY "trademark_history_insert_policy" ON public.trademark_history FOR INSERT
    WITH CHECK (
        trademark_id IN (
            SELECT id FROM public.trademarks WHERE created_by = auth.uid() OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'CEO', 'Super Admin', 'Patent Analyst'))
    );

-- 7. Fix Audit Trigger
CREATE OR REPLACE FUNCTION public.log_invention_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  action_text text;
  actor_id uuid := auth.uid();
  new_json jsonb;
  old_json jsonb;
BEGIN
  IF actor_id IS NULL THEN
      RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      new_json := row_to_json(NEW)::jsonb - 'password' - 'service_role_key';
  END IF;
  
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
      old_json := row_to_json(OLD)::jsonb - 'password' - 'service_role_key';
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (user_id, actor_id, entity_type, entity_id, action, message)
    VALUES (actor_id, actor_id, 'project', NEW.id, 'CREATE', 'Created new project: ' || NEW.title);
    
    INSERT INTO public.audit_logs (user_id, actor_id, event_type, entity_type, entity_id, after_data)
    VALUES (actor_id, actor_id, 'CREATE', 'project', NEW.id, new_json);
    
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_logs (user_id, actor_id, entity_type, entity_id, action, message)
    VALUES (actor_id, actor_id, 'UPDATE', NEW.id, 'Updated project status');
    
    INSERT INTO public.audit_logs (user_id, actor_id, event_type, entity_type, entity_id, before_data, after_data)
    VALUES (actor_id, actor_id, 'UPDATE', 'project', NEW.id, old_json, new_json);
    
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_logs (user_id, actor_id, entity_type, entity_id, action, message)
    VALUES (actor_id, actor_id, 'DELETE', OLD.id, 'Deleted project');
    
    INSERT INTO public.audit_logs (user_id, actor_id, event_type, entity_type, entity_id, before_data)
    VALUES (actor_id, actor_id, 'DELETE', 'project', OLD.id, old_json);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_trademark_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  action_text text;
  actor_id uuid := auth.uid();
  new_json jsonb;
  old_json jsonb;
BEGIN
  IF actor_id IS NULL THEN
      RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      new_json := row_to_json(NEW)::jsonb - 'password' - 'service_role_key';
  END IF;
  
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
      old_json := row_to_json(OLD)::jsonb - 'password' - 'service_role_key';
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (user_id, actor_id, entity_type, entity_id, action, message)
    VALUES (actor_id, actor_id, 'trademark', NEW.id, 'CREATE', 'Created new trademark: ' || NEW.name);
    
    INSERT INTO public.audit_logs (user_id, actor_id, event_type, entity_type, entity_id, after_data)
    VALUES (actor_id, actor_id, 'CREATE', 'trademark', NEW.id, new_json);
    
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_logs (user_id, actor_id, entity_type, entity_id, action, message)
    VALUES (actor_id, actor_id, 'UPDATE', NEW.id, 'Updated trademark status');
    
    INSERT INTO public.audit_logs (user_id, actor_id, event_type, entity_type, entity_id, before_data, after_data)
    VALUES (actor_id, actor_id, 'UPDATE', 'trademark', NEW.id, old_json, new_json);
    
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_logs (user_id, actor_id, entity_type, entity_id, action, message)
    VALUES (actor_id, actor_id, 'DELETE', OLD.id, 'Deleted trademark');
    
    INSERT INTO public.audit_logs (user_id, actor_id, event_type, entity_type, entity_id, before_data)
    VALUES (actor_id, actor_id, 'DELETE', 'trademark', OLD.id, old_json);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 8. Users Table Hardening (Role Security)
CREATE OR REPLACE FUNCTION public.prevent_role_self_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('Admin', 'Super Admin')) THEN
        RAISE EXCEPTION 'Users cannot modify their own role';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_role_security ON public.users;
CREATE TRIGGER enforce_role_security
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_role_self_modification();

-- 9. Storage Security
DO $$
BEGIN
    UPDATE storage.buckets SET public = false WHERE name = 'patent_documents';
    
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'patent_documents') THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('patent_documents', 'patent_documents', false);
    END IF;
END $$;

DROP POLICY IF EXISTS "Patent Documents Storage Read" ON storage.objects;
DROP POLICY IF EXISTS "Patent Documents Storage Insert" ON storage.objects;
DROP POLICY IF EXISTS "Patent Documents Storage Update" ON storage.objects;
DROP POLICY IF EXISTS "Patent Documents Storage Delete" ON storage.objects;

CREATE POLICY "Patent Documents Storage Read" ON storage.objects FOR SELECT
    USING (bucket_id = 'patent_documents' AND auth.role() = 'authenticated');

CREATE POLICY "Patent Documents Storage Insert" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'patent_documents' AND auth.role() = 'authenticated' AND owner = auth.uid());

CREATE POLICY "Patent Documents Storage Update" ON storage.objects FOR UPDATE
    USING (bucket_id = 'patent_documents' AND auth.role() = 'authenticated' AND owner = auth.uid());

CREATE POLICY "Patent Documents Storage Delete" ON storage.objects FOR DELETE
    USING (bucket_id = 'patent_documents' AND auth.role() = 'authenticated' AND owner = auth.uid());
