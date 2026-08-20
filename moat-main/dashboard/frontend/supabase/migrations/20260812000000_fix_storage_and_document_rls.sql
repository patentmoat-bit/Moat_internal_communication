-- ==============================================================================
-- POST-F03 REMEDIATION: STORAGE & DOCUMENT RLS FIXES
-- Fixes vulnerabilities found in storage buckets and legacy document policies.
-- ==============================================================================

-- ==============================================================================
-- 1. FIX COPYRIGHTS STORAGE BUCKET (Critical #2)
-- Drop additive legacy policies that granted unrestricted authenticated access
-- ==============================================================================
DROP POLICY IF EXISTS "Enable read access for authenticated users on copyrights bucket" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert access for authenticated users on copyrights buck" ON storage.objects;
DROP POLICY IF EXISTS "Enable update access for authenticated users on copyrights buck" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete access for authenticated users on copyrights buck" ON storage.objects;

-- Note: The F-03 migration created "Copyrights Storage Read/Insert/Update/Delete" 
-- which already correctly restricts to `owner = auth.uid()`. 
-- To follow the preferred model strictly (authorizing against the parent copyright),
-- we could recreate them, but `owner = auth.uid()` is already secure for storage objects
-- if the backend ensures it on upload. Since the prompt suggests:
-- "SELECT: only the owner/authorized copyright user may access the file."
-- We will replace the F-03 policies with ones that check the parent copyright.

DROP POLICY IF EXISTS "Copyrights Storage Read" ON storage.objects;
DROP POLICY IF EXISTS "Copyrights Storage Insert" ON storage.objects;
DROP POLICY IF EXISTS "Copyrights Storage Update" ON storage.objects;
DROP POLICY IF EXISTS "Copyrights Storage Delete" ON storage.objects;

CREATE POLICY "Copyrights Storage Read" ON storage.objects FOR SELECT
USING (
  bucket_id = 'copyrights' 
  AND auth.role() = 'authenticated' 
  AND EXISTS (
    SELECT 1 FROM public.copyright_documents cd
    JOIN public.copyrights c ON c.id = cd.copyright_id
    WHERE cd.storage_path = storage.objects.name
    AND (c.user_id = auth.uid() OR c.assigned_to = auth.uid() OR c.reviewer_id = auth.uid())
  )
);

CREATE POLICY "Copyrights Storage Insert" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'copyrights' 
  AND auth.role() = 'authenticated' 
  AND owner = auth.uid()
);

CREATE POLICY "Copyrights Storage Update" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'copyrights' 
  AND auth.role() = 'authenticated' 
  AND owner = auth.uid()
);

CREATE POLICY "Copyrights Storage Delete" ON storage.objects FOR DELETE
USING (
  bucket_id = 'copyrights' 
  AND auth.role() = 'authenticated' 
  AND owner = auth.uid()
);


-- ==============================================================================
-- 2. FIX PATENT IMAGES STORAGE BUCKET (Critical #3)
-- Drop unrestricted authenticated access policies
-- ==============================================================================
DROP POLICY IF EXISTS "Auth View Access patent_images" ON storage.objects;
DROP POLICY IF EXISTS "Auth Insert Access patent_images" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update Access patent_images" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete Access patent_images" ON storage.objects;

CREATE POLICY "Patent Images Storage Read" ON storage.objects FOR SELECT
USING (
  bucket_id = 'patent_images' 
  AND auth.role() = 'authenticated'
  AND (
    owner = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.patent_documents pd
      LEFT JOIN public.project_members pm ON pm.project_id = pd.project_id::text
      WHERE storage.objects.name LIKE '%' || pd.id::text || '%'
      AND (pd.created_by = auth.uid() OR pm.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Patent Images Storage Insert" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'patent_images' 
  AND auth.role() = 'authenticated' 
  AND owner = auth.uid()
);

CREATE POLICY "Patent Images Storage Update" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'patent_images' 
  AND auth.role() = 'authenticated' 
  AND owner = auth.uid()
);

CREATE POLICY "Patent Images Storage Delete" ON storage.objects FOR DELETE
USING (
  bucket_id = 'patent_images' 
  AND auth.role() = 'authenticated' 
  AND owner = auth.uid()
);


-- ==============================================================================
-- 3. FIX PATENT DOCUMENT BOLA (High #4)
-- Drop overly broad organization modification policies
-- ==============================================================================
DROP POLICY IF EXISTS "patent_documents_org_insert" ON public.patent_documents;
DROP POLICY IF EXISTS "patent_documents_org_update" ON public.patent_documents;
DROP POLICY IF EXISTS "patent_documents_org_delete" ON public.patent_documents;

-- We leave "patent_documents_org_access" FOR SELECT intact, as it is a read-only 
-- organization visibility feature, which is generally acceptable for enterprise B2B SaaS.

-- For safety, ensure the remaining update policy has strict WITH CHECK to prevent tenant hopping
-- Note: patent_documents_update_policy (from F-03) already has a WITH CHECK clause matching its USING clause.


-- ==============================================================================
-- 4. FIX TRADEMARK HISTORY INSERT (Low #5)
-- Require admin or editor for inserting history
-- ==============================================================================
DROP POLICY IF EXISTS "trademark_history_insert_policy" ON public.trademark_history;

CREATE POLICY "trademark_history_insert_policy" ON public.trademark_history FOR INSERT
WITH CHECK (
  trademark_id IN (
    SELECT id FROM public.trademarks 
    WHERE created_by = auth.uid() 
       OR project_id::text IN (
         SELECT project_id FROM public.project_members 
         WHERE user_id = auth.uid() 
           AND role IN ('admin', 'editor')
       )
  )
  OR EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
      AND role IN ('Admin', 'CEO', 'Super Admin', 'Patent Analyst')
  )
);
