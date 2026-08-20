-- Phase 22: Patent Document Review & Approval Workflow
-- Centralized storage and tracking for the end-to-end patent drafting lifecycle.

-- 1. Patent Documents Master Table
CREATE TABLE IF NOT EXISTS public.patent_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    domain_id VARCHAR(255),
    status VARCHAR(100) DEFAULT 'Draft Created',
    current_version_id UUID,
    assigned_to VARCHAR(100) DEFAULT 'Patent Analyst',
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Document Versions (Tracks every upload)
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.patent_documents(id) ON DELETE CASCADE,
    version_number VARCHAR(50) NOT NULL, -- e.g., '1.0', '1.1'
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Workflow Status History (Audit trail for state changes)
CREATE TABLE IF NOT EXISTS public.workflow_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.patent_documents(id) ON DELETE CASCADE,
    previous_status VARCHAR(100),
    new_status VARCHAR(100) NOT NULL,
    changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Review Comments
CREATE TABLE IF NOT EXISTS public.review_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.patent_documents(id) ON DELETE CASCADE,
    version_id UUID REFERENCES public.document_versions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    role VARCHAR(100),
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_patent_documents_modtime()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_patent_documents_modtime ON public.patent_documents;
CREATE TRIGGER update_patent_documents_modtime
BEFORE UPDATE ON public.patent_documents
FOR EACH ROW
EXECUTE PROCEDURE update_patent_documents_modtime();

-- Enable Row Level Security (Bypassed by admin client for backend processing, but good practice)
ALTER TABLE public.patent_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to patent_documents" ON public.patent_documents FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access to document_versions" ON public.document_versions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access to workflow_status_history" ON public.workflow_status_history FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access to review_comments" ON public.review_comments FOR ALL TO authenticated USING (true);
