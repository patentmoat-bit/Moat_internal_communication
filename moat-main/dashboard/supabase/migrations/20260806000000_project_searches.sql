-- Phase 2: Project-Based Search Mapping
-- Ensures every search belongs to a project and prevents duplicate searches of the same type per project.

CREATE TABLE IF NOT EXISTS public.project_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.inventions(id) ON DELETE CASCADE,
    search_type VARCHAR(64) NOT NULL, -- NOVELTY, FTO, LANDSCAPE, VALIDITY, INVALIDITY, DESIGN
    search_status VARCHAR(64) NOT NULL DEFAULT 'IN_PROGRESS', -- IN_PROGRESS, COMPLETED, FAILED
    result_data JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    report_id UUID, -- Will reference reports table if/when bound to a final report
    
    -- Ensure we never duplicate search data per project/type
    UNIQUE(project_id, search_type)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_project_searches_project_id ON public.project_searches(project_id);
CREATE INDEX IF NOT EXISTS idx_project_searches_type ON public.project_searches(search_type);

-- RLS Policies
ALTER TABLE public.project_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project searches" 
    ON public.project_searches FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert project searches" 
    ON public.project_searches FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update project searches" 
    ON public.project_searches FOR UPDATE 
    USING (auth.role() = 'authenticated');

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_searches;
