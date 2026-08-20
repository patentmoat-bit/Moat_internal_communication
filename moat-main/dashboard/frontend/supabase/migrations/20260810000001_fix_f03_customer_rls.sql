-- ==============================================================================
-- F-03 REMEDIATION: STRICT MULTI-TENANT ISOLATION
-- ==============================================================================
-- This migration comprehensively enables RLS, drops all dangerous 'USING (true)'
-- bypass policies, and enforces strict tenant boundaries using ownership and 
-- project_members mappings.
-- ==============================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL SENSITIVE TABLES
ALTER TABLE public.inventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patent_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trademarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trademark_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trademark_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copyrights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copyright_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. DROP DANGEROUS PERMISSIVE POLICIES
-- From supabase_schema_ceo.sql
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.patent_documents;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.inventions;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.trademark_files;

-- From supabase_phase22_documents.sql
DROP POLICY IF EXISTS "Allow authenticated full access to patent_documents" ON public.patent_documents;

-- From supabase_phase5_6.sql

-- From supabase_phase23_design_studio.sql

-- From supabase_phase27_copyrights.sql
DROP POLICY IF EXISTS "Enable read access for authenticated users on copyrights" ON public.copyrights;
DROP POLICY IF EXISTS "Enable insert for authenticated users on copyrights" ON public.copyrights;
DROP POLICY IF EXISTS "Enable update for authenticated users on copyrights" ON public.copyrights;
DROP POLICY IF EXISTS "Enable delete for authenticated users on copyrights" ON public.copyrights;
DROP POLICY IF EXISTS "Enable read access for authenticated users on copyright_documents" ON public.copyright_documents;
DROP POLICY IF EXISTS "Enable insert for authenticated users on copyright_documents" ON public.copyright_documents;
DROP POLICY IF EXISTS "Enable update for authenticated users on copyright_documents" ON public.copyright_documents;
DROP POLICY IF EXISTS "Enable delete for authenticated users on copyright_documents" ON public.copyright_documents;

-- From 02_bfla_rbac_policies.sql and others
DROP POLICY IF EXISTS "Allow authenticated trademark read access" ON public.trademarks;
DROP POLICY IF EXISTS "Admin has full access to trademarks" ON public.trademarks;
DROP POLICY IF EXISTS "Patent Analysts can manage trademarks but not delete" ON public.trademarks;
DROP POLICY IF EXISTS "CEO can review and approve trademarks" ON public.trademarks;
DROP POLICY IF EXISTS "CEO can update trademarks" ON public.trademarks;
DROP POLICY IF EXISTS "Universal read for authenticated" ON public.trademarks;
DROP POLICY IF EXISTS "Allow document read access based on project assignment" ON public.patent_documents;
DROP POLICY IF EXISTS "Deny public unauthenticated access" ON public.patent_documents;
DROP POLICY IF EXISTS "Deny public unauthenticated access" ON public.trademarks;
DROP POLICY IF EXISTS "Authenticated users can access trademark files" ON public.trademark_files;
DROP POLICY IF EXISTS "Authenticated users can access trademark history" ON public.trademark_history;

-- Old F03/BOLA policies that should be explicitly replaced to avoid duplication
DROP POLICY IF EXISTS "trademarks_select_policy" ON public.trademarks;
DROP POLICY IF EXISTS "trademarks_insert_policy" ON public.trademarks;
DROP POLICY IF EXISTS "trademarks_update_policy" ON public.trademarks;
DROP POLICY IF EXISTS "trademarks_delete_policy" ON public.trademarks;


-- 3. CREATE STRICT TENANT-AWARE POLICIES

-- ==========================================
-- A. DIRECT OWNERSHIP (user_id / created_by)
-- ==========================================

-- INVENTIONS
CREATE POLICY "inventions_select" ON public.inventions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "inventions_insert" ON public.inventions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "inventions_update" ON public.inventions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "inventions_delete" ON public.inventions FOR DELETE USING (user_id = auth.uid());

-- ALERTS
CREATE POLICY "alerts_select" ON public.alerts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "alerts_insert" ON public.alerts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "alerts_update" ON public.alerts FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "alerts_delete" ON public.alerts FOR DELETE USING (user_id = auth.uid());

-- TRADEMARKS (Table: public.trademarks)
CREATE POLICY "trademarks_select" ON public.trademarks FOR SELECT 
USING (created_by = auth.uid() OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid()));
CREATE POLICY "trademarks_insert" ON public.trademarks FOR INSERT 
WITH CHECK (created_by = auth.uid());
CREATE POLICY "trademarks_update" ON public.trademarks FOR UPDATE 
USING (created_by = auth.uid() OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor')))
WITH CHECK (created_by = auth.uid() OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor')));
CREATE POLICY "trademarks_delete" ON public.trademarks FOR DELETE 
USING (created_by = auth.uid());

-- TRADEMARK FILES
CREATE POLICY "trademark_files_select" ON public.trademark_files FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.trademarks 
  WHERE id = trademark_files.trademark_id AND (created_by = auth.uid() OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid()))
));
CREATE POLICY "trademark_files_insert" ON public.trademark_files FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.trademarks 
  WHERE id = trademark_files.trademark_id AND (created_by = auth.uid() OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor')))
));
CREATE POLICY "trademark_files_update" ON public.trademark_files FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.trademarks 
  WHERE id = trademark_files.trademark_id AND (created_by = auth.uid() OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor')))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.trademarks 
  WHERE id = trademark_files.trademark_id AND (created_by = auth.uid() OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor')))
));
CREATE POLICY "trademark_files_delete" ON public.trademark_files FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.trademarks 
  WHERE id = trademark_files.trademark_id AND (created_by = auth.uid() OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor')))
));

-- COPYRIGHTS
CREATE POLICY "copyrights_select" ON public.copyrights FOR SELECT 
USING (user_id = auth.uid() OR assigned_to = auth.uid() OR reviewer_id = auth.uid());
CREATE POLICY "copyrights_insert" ON public.copyrights FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "copyrights_update" ON public.copyrights FOR UPDATE 
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "copyrights_delete" ON public.copyrights FOR DELETE USING (user_id = auth.uid());

-- ==========================================
-- 4. STORAGE BUCKET ISOLATION
-- ==========================================

-- Ensure the patent_documents and copyrights buckets are strictly private
UPDATE storage.buckets SET public = false WHERE name IN ('patent_documents', 'copyrights');

-- Patent Documents Storage
DROP POLICY IF EXISTS "Patent Documents Storage Read" ON storage.objects;
DROP POLICY IF EXISTS "Patent Documents Storage Insert" ON storage.objects;
DROP POLICY IF EXISTS "Patent Documents Storage Update" ON storage.objects;
DROP POLICY IF EXISTS "Patent Documents Storage Delete" ON storage.objects;

-- The backend manages shared document access via Signed URLs explicitly.
-- Direct client access is strictly limited to the object owner.
CREATE POLICY "Patent Documents Storage Read" ON storage.objects FOR SELECT
USING (bucket_id = 'patent_documents' AND auth.role() = 'authenticated' AND owner = auth.uid());

CREATE POLICY "Patent Documents Storage Insert" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'patent_documents' AND auth.role() = 'authenticated' AND owner = auth.uid());

CREATE POLICY "Patent Documents Storage Update" ON storage.objects FOR UPDATE
USING (bucket_id = 'patent_documents' AND auth.role() = 'authenticated' AND owner = auth.uid());

CREATE POLICY "Patent Documents Storage Delete" ON storage.objects FOR DELETE
USING (bucket_id = 'patent_documents' AND auth.role() = 'authenticated' AND owner = auth.uid());

-- Copyrights Storage
DROP POLICY IF EXISTS "Copyrights Storage Read" ON storage.objects;
DROP POLICY IF EXISTS "Copyrights Storage Insert" ON storage.objects;
DROP POLICY IF EXISTS "Copyrights Storage Update" ON storage.objects;
DROP POLICY IF EXISTS "Copyrights Storage Delete" ON storage.objects;

CREATE POLICY "Copyrights Storage Read" ON storage.objects FOR SELECT
USING (bucket_id = 'copyrights' AND auth.role() = 'authenticated' AND owner = auth.uid());

CREATE POLICY "Copyrights Storage Insert" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'copyrights' AND auth.role() = 'authenticated' AND owner = auth.uid());

CREATE POLICY "Copyrights Storage Update" ON storage.objects FOR UPDATE
USING (bucket_id = 'copyrights' AND auth.role() = 'authenticated' AND owner = auth.uid());

CREATE POLICY "Copyrights Storage Delete" ON storage.objects FOR DELETE
USING (bucket_id = 'copyrights' AND auth.role() = 'authenticated' AND owner = auth.uid());

