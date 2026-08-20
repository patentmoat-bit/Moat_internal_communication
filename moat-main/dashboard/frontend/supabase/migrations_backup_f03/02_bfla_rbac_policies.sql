-- Enable RLS on sensitive tables
ALTER TABLE public.patent_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trademarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- 1. Trademarks Policy: Only authenticated users can view trademarks
CREATE POLICY "Allow authenticated trademark read access"
ON public.trademarks FOR SELECT
TO authenticated
USING (true);

-- 2. Documents Policy: Restrict document access by project membership
CREATE POLICY "Allow document read access based on project assignment"
ON public.patent_documents FOR SELECT
TO authenticated
USING (
    created_by = auth.uid() OR
    project_id IN (
        SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role_id IN ('CEO', 'Admin', 'super_admin')
    )
);

-- Deny all public unauthenticated access
CREATE POLICY "Deny public unauthenticated access" ON public.patent_documents FOR ALL TO anon USING (false);
CREATE POLICY "Deny public unauthenticated access" ON public.trademarks FOR ALL TO anon USING (false);
