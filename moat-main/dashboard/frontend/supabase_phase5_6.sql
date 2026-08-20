-- Phase 5 & 6: Invention Workspace and Image Search Storage

-- 1. Create Workspace Documents Table
CREATE TABLE IF NOT EXISTS public.workspace_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB,
  html_content TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Workspace Versions Table
CREATE TABLE IF NOT EXISTS public.workspace_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.workspace_documents(id) ON DELETE CASCADE,
  content JSONB,
  commit_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Workspace Files Table
CREATE TABLE IF NOT EXISTS public.workspace_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.workspace_documents(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.workspace_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;

-- Disable RLS restrictions for easy testing
DROP POLICY IF EXISTS "Anyone can do anything documents" ON public.workspace_documents;
CREATE POLICY "Anyone can do anything documents" ON public.workspace_documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can do anything versions" ON public.workspace_versions;
CREATE POLICY "Anyone can do anything versions" ON public.workspace_versions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can do anything files" ON public.workspace_files;
CREATE POLICY "Anyone can do anything files" ON public.workspace_files FOR ALL USING (true) WITH CHECK (true);

-- 5. Create Supabase Storage Bucket for patent images
INSERT INTO storage.buckets (id, name, public) VALUES ('patent_images', 'patent_images', true) ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for patent_images
DROP POLICY IF EXISTS "Public View Access" ON storage.objects;
CREATE POLICY "Public View Access" ON storage.objects FOR SELECT USING (bucket_id = 'patent_images');

DROP POLICY IF EXISTS "Public Upload Access" ON storage.objects;
CREATE POLICY "Public Upload Access" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'patent_images');
