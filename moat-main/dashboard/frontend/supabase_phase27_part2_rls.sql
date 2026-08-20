-- ==============================================================================
-- MOAT ENTERPRISE PHASE 27 PART 2: STRICT RLS ENFORCEMENT & BOLA PROTECTION
-- ==============================================================================

-- 1. Add organization_id to relevant tables
ALTER TABLE public.patent_documents ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.document_versions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Backfill organization_id for existing records where created_by is present
UPDATE public.patent_documents pd
SET organization_id = u.organization_id
FROM public.users u
WHERE pd.created_by = u.id AND pd.organization_id IS NULL;

-- 2. Drop overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated full access to patent_documents" ON public.patent_documents;
DROP POLICY IF EXISTS "Allow authenticated full access to document_versions" ON public.document_versions;
DROP POLICY IF EXISTS "Allow authenticated full access to workflow_status_history" ON public.workflow_status_history;
DROP POLICY IF EXISTS "Allow authenticated full access to review_comments" ON public.review_comments;

-- 3. Create Strict RLS Policies for patent_documents (BOLA Protection)
-- Allow Admins and CEOs to see everything in their organization
CREATE POLICY "patent_documents_org_access" ON public.patent_documents
FOR SELECT USING (
  organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "patent_documents_org_insert" ON public.patent_documents
FOR INSERT WITH CHECK (
  organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "patent_documents_org_update" ON public.patent_documents
FOR UPDATE USING (
  organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "patent_documents_org_delete" ON public.patent_documents
FOR DELETE USING (
  organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
);

-- 4. Create Strict RLS Policies for document_versions
CREATE POLICY "document_versions_org_access" ON public.document_versions
FOR SELECT USING (
  organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "document_versions_org_insert" ON public.document_versions
FOR INSERT WITH CHECK (
  organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "document_versions_org_update" ON public.document_versions
FOR UPDATE USING (
  organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "document_versions_org_delete" ON public.document_versions
FOR DELETE USING (
  organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
);

-- 5. Storage Security - Update patent_images bucket
UPDATE storage.buckets SET public = false WHERE id = 'patent_images';

DROP POLICY IF EXISTS "Public View Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access" ON storage.objects;

-- Create authenticated access policies for storage
CREATE POLICY "Auth View Access patent_images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'patent_images' AND auth.role() = 'authenticated'
);

CREATE POLICY "Auth Insert Access patent_images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'patent_images' AND auth.role() = 'authenticated'
);

CREATE POLICY "Auth Update Access patent_images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'patent_images' AND auth.role() = 'authenticated'
);

CREATE POLICY "Auth Delete Access patent_images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'patent_images' AND auth.role() = 'authenticated'
);
