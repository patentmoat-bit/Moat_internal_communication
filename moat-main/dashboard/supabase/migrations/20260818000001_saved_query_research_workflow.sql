-- ==========================================
-- PHASE 2 & 3: SAVED QUERY AND RESEARCH PROJECT DATABASE MODEL
-- ==========================================

-- 1. UPGRADE saved_queries TABLE
ALTER TABLE public.saved_queries 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS search_configuration JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS normalized_query TEXT,
ADD COLUMN IF NOT EXISTS search_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Ensure constraints on saved_queries
CREATE INDEX IF NOT EXISTS idx_saved_queries_fingerprint ON public.saved_queries(search_fingerprint);

-- 2. CREATE research_project_saved_queries TABLE (Relationship)
CREATE TABLE IF NOT EXISTS public.research_project_saved_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.moat_ideas(id) ON DELETE CASCADE,
    saved_query_id UUID NOT NULL REFERENCES public.saved_queries(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_executed_at TIMESTAMPTZ,
    execution_status VARCHAR(64) DEFAULT 'IDLE',
    UNIQUE(project_id, saved_query_id)
);

CREATE INDEX IF NOT EXISTS idx_rpsq_project ON public.research_project_saved_queries(project_id);

-- 3. CREATE search_executions TABLE
CREATE TABLE IF NOT EXISTS public.search_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saved_query_id UUID REFERENCES public.saved_queries(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.moat_ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(64) DEFAULT 'COMPLETED',
    result_count INTEGER DEFAULT 0,
    execution_metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_search_executions_user ON public.search_executions(user_id, executed_at DESC);

-- 4. CREATE search_execution_results TABLE (Snapshots)
CREATE TABLE IF NOT EXISTS public.search_execution_results (
    execution_id UUID NOT NULL REFERENCES public.search_executions(id) ON DELETE CASCADE,
    patent_id TEXT NOT NULL,
    rank INTEGER,
    relevance_score NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (execution_id, patent_id)
);

-- ==========================================
-- PHASE 4: STRICT RLS POLICIES
-- ==========================================

-- Enable RLS
ALTER TABLE public.research_project_saved_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_execution_results ENABLE ROW LEVEL SECURITY;

-- research_project_saved_queries policies
CREATE POLICY "Users view own research project queries" ON public.research_project_saved_queries
    FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users insert own research project queries" ON public.research_project_saved_queries
    FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own research project queries" ON public.research_project_saved_queries
    FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users delete own research project queries" ON public.research_project_saved_queries
    FOR DELETE USING (auth.uid() = created_by);

-- search_executions policies
CREATE POLICY "Users view own search executions" ON public.search_executions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own search executions" ON public.search_executions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- search_execution_results policies
CREATE POLICY "Users view results of own executions" ON public.search_execution_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.search_executions 
            WHERE id = search_execution_results.execution_id 
            AND user_id = auth.uid()
        )
    );
CREATE POLICY "Users insert results to own executions" ON public.search_execution_results
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.search_executions 
            WHERE id = search_execution_results.execution_id 
            AND user_id = auth.uid()
        )
    );
