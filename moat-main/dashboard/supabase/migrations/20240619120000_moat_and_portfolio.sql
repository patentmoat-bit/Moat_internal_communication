-- Supabase Schema for Portfolio Patents and MOAT Ideas

-- 1. Portfolio Patents Table
CREATE TABLE IF NOT EXISTS public.portfolio_patents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patent_number VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(1024) NOT NULL,
    abstract TEXT,
    claims JSONB,
    inventors JSONB,
    assignee VARCHAR(512),
    filing_date DATE,
    publication_date DATE,
    status VARCHAR(64),
    cpc_classifications JSONB,
    ipc_classifications JSONB,
    citations JSONB,
    patent_metadata JSONB, -- stores Technology, Department, Country, etc.
    estimated_value NUMERIC,
    region VARCHAR(120),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for searching and filtering
CREATE INDEX IF NOT EXISTS idx_portfolio_patents_status ON public.portfolio_patents(status);
CREATE INDEX IF NOT EXISTS idx_portfolio_patents_filing_date ON public.portfolio_patents(filing_date);


-- 2. MOAT Ideas Table
CREATE TABLE IF NOT EXISTS public.moat_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(120),
    status VARCHAR(64) DEFAULT 'draft' NOT NULL,
    priority VARCHAR(64) DEFAULT 'medium' NOT NULL,
    starred BOOLEAN DEFAULT false NOT NULL,
    novelty_score INTEGER DEFAULT 0 NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb NOT NULL,
    notes TEXT,
    content JSONB, -- The rich text content representation
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for moat_ideas
ALTER TABLE public.moat_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ideas" ON public.moat_ideas
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own ideas" ON public.moat_ideas
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own ideas" ON public.moat_ideas
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own ideas" ON public.moat_ideas
    FOR DELETE USING (auth.uid() = created_by);


-- 3. MOAT Idea Versions (Invention Memory)
CREATE TABLE IF NOT EXISTS public.moat_idea_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idea_id UUID REFERENCES public.moat_ideas(id) ON DELETE CASCADE NOT NULL,
    content JSONB NOT NULL,
    commit_message VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for moat_idea_versions
ALTER TABLE public.moat_idea_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own idea versions" ON public.moat_idea_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.moat_ideas
            WHERE moat_ideas.id = moat_idea_versions.idea_id
            AND moat_ideas.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert versions for their own ideas" ON public.moat_idea_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.moat_ideas
            WHERE moat_ideas.id = moat_idea_versions.idea_id
            AND moat_ideas.created_by = auth.uid()
        )
    );

-- 4. Storage Bucket for MOAT Assets
INSERT INTO storage.buckets (id, name, public) VALUES ('moat_assets', 'moat_assets', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Users can access their own assets" ON storage.objects
    FOR ALL USING (bucket_id = 'moat_assets' AND auth.uid()::text = (storage.foldername(name))[1]);
