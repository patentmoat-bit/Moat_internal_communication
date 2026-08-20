-- ==========================================
-- PHASE 2: PERSISTENT SEARCH HISTORY MODEL
-- ==========================================

-- 1. SEARCH HISTORY
CREATE TABLE IF NOT EXISTS public.search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    search_mode VARCHAR(64) NOT NULL,
    query_text TEXT,
    filters_json JSONB DEFAULT '{}'::jsonb,
    search_fingerprint TEXT NOT NULL,
    result_count INTEGER DEFAULT 0,
    result_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_run_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_time ON public.search_history(user_id, last_run_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_fingerprint ON public.search_history(user_id, search_fingerprint);

-- Strict RLS for search_history
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own search history"
    ON public.search_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own search history"
    ON public.search_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own search history"
    ON public.search_history FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own search history"
    ON public.search_history FOR DELETE
    USING (auth.uid() = user_id);

-- 2. SAVED QUERIES
CREATE TABLE IF NOT EXISTS public.saved_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    search_history_id UUID REFERENCES public.search_history(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    query_text TEXT,
    filters_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_queries_user_time ON public.saved_queries(user_id, updated_at DESC);

-- Strict RLS for saved_queries
ALTER TABLE public.saved_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own saved queries"
    ON public.saved_queries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own saved queries"
    ON public.saved_queries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own saved queries"
    ON public.saved_queries FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own saved queries"
    ON public.saved_queries FOR DELETE
    USING (auth.uid() = user_id);

-- 3. RESEARCH PROJECT SEARCHES
CREATE TABLE IF NOT EXISTS public.research_project_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    research_project_id UUID NOT NULL REFERENCES public.moat_ideas(id) ON DELETE CASCADE,
    search_history_id UUID NOT NULL REFERENCES public.search_history(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(research_project_id, search_history_id)
);

CREATE INDEX IF NOT EXISTS idx_rps_project_time ON public.research_project_searches(research_project_id, created_at DESC);

-- Strict RLS for research_project_searches
ALTER TABLE public.research_project_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view project searches if they own the project search record"
    ON public.research_project_searches FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert project searches if they own the record"
    ON public.research_project_searches FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own project searches"
    ON public.research_project_searches FOR DELETE
    USING (auth.uid() = user_id);
