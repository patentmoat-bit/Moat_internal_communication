-- Phase 27: Copyrights Module Schema

-- 1. Create copyrights table
CREATE TABLE IF NOT EXISTS public.copyrights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id), -- The original creator
    product_name TEXT NOT NULL,
    description TEXT,
    copyright_type TEXT,
    owner TEXT,
    project TEXT, -- Or project_id if linking directly to a projects table
    status TEXT DEFAULT 'drafting', -- drafting, in_progress, review, approved, filed, registered, completed, rejected, expired
    filing_date DATE,
    registration_date DATE,
    registration_number TEXT,
    expiry_date DATE,
    assigned_to UUID REFERENCES auth.users(id),
    reviewer_id UUID REFERENCES auth.users(id),
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create copyright_documents table (with versioning)
CREATE TABLE IF NOT EXISTS public.copyright_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    copyright_id UUID REFERENCES public.copyrights(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    storage_path TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    notes TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.copyrights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copyright_documents ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for copyrights
CREATE POLICY "Enable read access for authenticated users on copyrights"
    ON public.copyrights FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users on copyrights"
    ON public.copyrights FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for authenticated users on copyrights"
    ON public.copyrights FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Enable delete for authenticated users on copyrights"
    ON public.copyrights FOR DELETE
    TO authenticated
    USING (true);

-- 5. Create RLS Policies for copyright_documents
CREATE POLICY "Enable read access for authenticated users on copyright_documents"
    ON public.copyright_documents FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users on copyright_documents"
    ON public.copyright_documents FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = uploaded_by OR auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for authenticated users on copyright_documents"
    ON public.copyright_documents FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Enable delete for authenticated users on copyright_documents"
    ON public.copyright_documents FOR DELETE
    TO authenticated
    USING (true);

-- 6. Setup Storage Bucket for Copyrights
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'copyrights', 
    'copyrights', 
    false, 
    52428800, -- 50MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- 7. Storage Policies for copyrights bucket
CREATE POLICY "Enable read access for authenticated users on copyrights bucket"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'copyrights');

CREATE POLICY "Enable insert access for authenticated users on copyrights bucket"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'copyrights');

CREATE POLICY "Enable update access for authenticated users on copyrights bucket"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'copyrights');

CREATE POLICY "Enable delete access for authenticated users on copyrights bucket"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'copyrights');

-- Trigger to update 'updated_at' on copyrights
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_copyrights_modtime
    BEFORE UPDATE ON public.copyrights
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
