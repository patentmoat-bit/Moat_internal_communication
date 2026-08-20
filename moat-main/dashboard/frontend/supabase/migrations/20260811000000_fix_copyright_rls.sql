-- ============================================================================
-- COPYRIGHT & COPYRIGHT_DOCUMENTS RLS REMEDIATION
-- Drops all dangerous/legacy permissive policies and establishes strict
-- multi-tenant boundaries based directly on resource ownership.
-- ============================================================================

-- 1. Enable RLS
ALTER TABLE public.copyrights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copyright_documents ENABLE ROW LEVEL SECURITY;

-- 2. Drop all discovered legacy/overlapping policies
DROP POLICY IF EXISTS "copyrights_owner_select" ON public.copyrights;
DROP POLICY IF EXISTS "copyrights_owner_update" ON public.copyrights;
DROP POLICY IF EXISTS "copyrights_owner_delete" ON public.copyrights;
DROP POLICY IF EXISTS "copyrights_owner_insert" ON public.copyrights;
DROP POLICY IF EXISTS "copyrights_update" ON public.copyrights;
DROP POLICY IF EXISTS "copyrights_select" ON public.copyrights;
DROP POLICY IF EXISTS "copyrights_insert" ON public.copyrights;
DROP POLICY IF EXISTS "copyrights_delete" ON public.copyrights;

DROP POLICY IF EXISTS "copyright_documents_select" ON public.copyright_documents;
DROP POLICY IF EXISTS "copyright_documents_update" ON public.copyright_documents;
DROP POLICY IF EXISTS "copyright_documents_insert" ON public.copyright_documents;
DROP POLICY IF EXISTS "copyright_documents_delete" ON public.copyright_documents;

-- 3. Strict Copyrights Policies
-- Note: 'project' in copyrights is a TEXT field (name of project), not a project_id mapping to project_members.
-- The explicit ownership relationship is user_id, assigned_to, and reviewer_id.

CREATE POLICY "copyrights_select" ON public.copyrights FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR assigned_to = auth.uid() 
  OR reviewer_id = auth.uid()
);

CREATE POLICY "copyrights_insert" ON public.copyrights FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "copyrights_update" ON public.copyrights FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  OR assigned_to = auth.uid()
) 
WITH CHECK (
  user_id = auth.uid() 
  OR assigned_to = auth.uid()
);

CREATE POLICY "copyrights_delete" ON public.copyrights FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 4. Strict Copyright Documents Policies
-- Inherits authorization from the parent copyright.

CREATE POLICY "copyright_documents_select" ON public.copyright_documents FOR SELECT
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.copyrights c 
    WHERE c.id = copyright_documents.copyright_id 
    AND (c.user_id = auth.uid() OR c.assigned_to = auth.uid() OR c.reviewer_id = auth.uid())
  )
);

CREATE POLICY "copyright_documents_insert" ON public.copyright_documents FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.copyrights c 
    WHERE c.id = copyright_documents.copyright_id 
    AND (c.user_id = auth.uid() OR c.assigned_to = auth.uid())
  )
);

CREATE POLICY "copyright_documents_update" ON public.copyright_documents FOR UPDATE
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.copyrights c 
    WHERE c.id = copyright_documents.copyright_id 
    AND (c.user_id = auth.uid() OR c.assigned_to = auth.uid())
  )
)
WITH CHECK (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.copyrights c 
    WHERE c.id = copyright_documents.copyright_id 
    AND (c.user_id = auth.uid() OR c.assigned_to = auth.uid())
  )
);

CREATE POLICY "copyright_documents_delete" ON public.copyright_documents FOR DELETE
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.copyrights c 
    WHERE c.id = copyright_documents.copyright_id 
    AND (c.user_id = auth.uid())
  )
);
