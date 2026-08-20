-- F-03 REMEDIATION
-- Strict server-side isolation for F-03

-- 1. patent_projects
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.patent_projects;

CREATE POLICY "patent_projects_select_policy" ON public.patent_projects FOR SELECT
USING (
    created_by = auth.uid()
    OR id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

CREATE POLICY "patent_projects_insert_policy" ON public.patent_projects FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "patent_projects_update_policy" ON public.patent_projects FOR UPDATE
USING (
    created_by = auth.uid()
    OR id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
)
WITH CHECK (
    created_by = auth.uid()
    OR id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

CREATE POLICY "patent_projects_delete_policy" ON public.patent_projects FOR DELETE
USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

-- 2. copyrights
DROP POLICY IF EXISTS "Enable read access for authenticated users on copyrights" ON public.copyrights;
DROP POLICY IF EXISTS "Enable insert for authenticated users on copyrights" ON public.copyrights;
DROP POLICY IF EXISTS "Enable update for authenticated users on copyrights" ON public.copyrights;
DROP POLICY IF EXISTS "Enable delete for authenticated users on copyrights" ON public.copyrights;

CREATE POLICY "copyrights_select_policy" ON public.copyrights FOR SELECT
USING (
    user_id = auth.uid()
    OR assigned_to = auth.uid()
    OR reviewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

CREATE POLICY "copyrights_insert_policy" ON public.copyrights FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "copyrights_update_policy" ON public.copyrights FOR UPDATE
USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
)
WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

CREATE POLICY "copyrights_delete_policy" ON public.copyrights FOR DELETE
USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

-- 3. copyright_documents
DROP POLICY IF EXISTS "Enable read access for authenticated users on copyright_documents" ON public.copyright_documents;
DROP POLICY IF EXISTS "Enable insert for authenticated users on copyright_documents" ON public.copyright_documents;
DROP POLICY IF EXISTS "Enable update for authenticated users on copyright_documents" ON public.copyright_documents;
DROP POLICY IF EXISTS "Enable delete for authenticated users on copyright_documents" ON public.copyright_documents;

CREATE POLICY "copyright_documents_select_policy" ON public.copyright_documents FOR SELECT
USING (
    uploaded_by = auth.uid()
    OR copyright_id IN (
        SELECT id FROM public.copyrights WHERE user_id = auth.uid() OR assigned_to = auth.uid() OR reviewer_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

CREATE POLICY "copyright_documents_insert_policy" ON public.copyright_documents FOR INSERT
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "copyright_documents_update_policy" ON public.copyright_documents FOR UPDATE
USING (
    uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
)
WITH CHECK (
    uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

CREATE POLICY "copyright_documents_delete_policy" ON public.copyright_documents FOR DELETE
USING (
    uploaded_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

-- 4. patent_documents
DROP POLICY IF EXISTS "patent_documents_select_policy" ON public.patent_documents;
DROP POLICY IF EXISTS "patent_documents_update_policy" ON public.patent_documents;

CREATE POLICY "patent_documents_select_policy" ON public.patent_documents FOR SELECT
USING (
    created_by = auth.uid()
    OR project_id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

CREATE POLICY "patent_documents_update_policy" ON public.patent_documents FOR UPDATE
USING (
    created_by = auth.uid()
    OR project_id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
)
WITH CHECK (
    created_by = auth.uid()
    OR project_id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

-- 5. document_versions
DROP POLICY IF EXISTS "document_versions_select_policy" ON public.document_versions;
CREATE POLICY "document_versions_select_policy" ON public.document_versions FOR SELECT
USING (
    uploaded_by = auth.uid()
    OR document_id IN (
        SELECT id FROM public.patent_documents WHERE created_by = auth.uid() OR project_id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

-- 6. trademarks
DROP POLICY IF EXISTS "trademarks_select_policy" ON public.trademarks;
DROP POLICY IF EXISTS "trademarks_update_policy" ON public.trademarks;

CREATE POLICY "trademarks_select_policy" ON public.trademarks FOR SELECT
USING (
    created_by = auth.uid()
    OR project_id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

CREATE POLICY "trademarks_update_policy" ON public.trademarks FOR UPDATE
USING (
    created_by = auth.uid()
    OR project_id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
)
WITH CHECK (
    created_by = auth.uid()
    OR project_id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

-- 7. trademark_history
DROP POLICY IF EXISTS "trademark_history_select_policy" ON public.trademark_history;
DROP POLICY IF EXISTS "trademark_history_insert_policy" ON public.trademark_history;

CREATE POLICY "trademark_history_select_policy" ON public.trademark_history FOR SELECT
USING (
    trademark_id IN (
        SELECT id FROM public.trademarks WHERE created_by = auth.uid() OR project_id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

CREATE POLICY "trademark_history_insert_policy" ON public.trademark_history FOR INSERT
WITH CHECK (
    trademark_id IN (
        SELECT id FROM public.trademarks WHERE created_by = auth.uid() OR project_id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

-- 8. inventions
DROP POLICY IF EXISTS "inventions_select_policy" ON public.inventions;
DROP POLICY IF EXISTS "inventions_update_policy" ON public.inventions;

CREATE POLICY "inventions_select_policy" ON public.inventions FOR SELECT
USING (
    user_id = auth.uid()
    OR workspace_id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

CREATE POLICY "inventions_update_policy" ON public.inventions FOR UPDATE
USING (
    user_id = auth.uid()
    OR workspace_id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
)
WITH CHECK (
    user_id = auth.uid()
    OR workspace_id::text IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

-- 9. Storage policies
-- Make sure bucket is private
UPDATE storage.buckets SET public = false WHERE name IN ('patent_documents', 'copyrights');

-- Patent Documents Storage
DROP POLICY IF EXISTS "Patent Documents Storage Read" ON storage.objects;
DROP POLICY IF EXISTS "Patent Documents Storage Insert" ON storage.objects;
DROP POLICY IF EXISTS "Patent Documents Storage Update" ON storage.objects;
DROP POLICY IF EXISTS "Patent Documents Storage Delete" ON storage.objects;

CREATE POLICY "Patent Documents Storage Read" ON storage.objects FOR SELECT
USING (bucket_id = 'patent_documents' AND auth.role() = 'authenticated' AND (owner = auth.uid() OR auth.uid() IN (
    -- Allow read if user is member of project (via filename convention or backend check. We assume owner=uid is base, backend handles signed URLs for others via service_role).
    -- Wait, if backend uses service_role for signed URL generation, then client DOES NOT need direct storage select access!
    -- Actually, if they only use Signed URLs generated by backend, client doesn't need read access here at all. We can just say owner = auth.uid().
    SELECT id FROM auth.users WHERE id = owner
)));

CREATE POLICY "Patent Documents Storage Insert" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'patent_documents' AND auth.role() = 'authenticated' AND owner = auth.uid());

CREATE POLICY "Patent Documents Storage Update" ON storage.objects FOR UPDATE
USING (bucket_id = 'patent_documents' AND auth.role() = 'authenticated' AND owner = auth.uid());

CREATE POLICY "Patent Documents Storage Delete" ON storage.objects FOR DELETE
USING (bucket_id = 'patent_documents' AND auth.role() = 'authenticated' AND owner = auth.uid());

-- Copyrights Storage
DROP POLICY IF EXISTS "Enable read access for authenticated users on copyrights bucket" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert access for authenticated users on copyrights bucket" ON storage.objects;
DROP POLICY IF EXISTS "Enable update access for authenticated users on copyrights bucket" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete access for authenticated users on copyrights bucket" ON storage.objects;

CREATE POLICY "Copyrights Storage Read" ON storage.objects FOR SELECT
USING (bucket_id = 'copyrights' AND auth.role() = 'authenticated' AND owner = auth.uid());

CREATE POLICY "Copyrights Storage Insert" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'copyrights' AND auth.role() = 'authenticated' AND owner = auth.uid());

CREATE POLICY "Copyrights Storage Update" ON storage.objects FOR UPDATE
USING (bucket_id = 'copyrights' AND auth.role() = 'authenticated' AND owner = auth.uid());

CREATE POLICY "Copyrights Storage Delete" ON storage.objects FOR DELETE
USING (bucket_id = 'copyrights' AND auth.role() = 'authenticated' AND owner = auth.uid());
