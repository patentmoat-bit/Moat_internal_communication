-- =================================================================================
-- PHASE 28: MOAT AI HUB SCHEMA
-- =================================================================================

-- 1. AI Hub Sessions (For Rith Agent chats and contextual research)
CREATE TABLE IF NOT EXISTS public.ai_hub_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id UUID, -- Can link to inventions, trademarks, copyrights
    project_type VARCHAR(50), -- 'PATENT', 'TRADEMARK', 'COPYRIGHT'
    context_description TEXT,
    title VARCHAR(255) DEFAULT 'New Research Session',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. AI Hub Searches / Chat History
CREATE TABLE IF NOT EXISTS public.ai_hub_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.ai_hub_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id UUID,
    search_type VARCHAR(50) NOT NULL, -- 'RITH_CHAT', 'PATENTABILITY', 'NOVELTY', 'FTO', 'VALIDITY', 'INVALIDITY', 'LANDSCAPE', 'DESIGN'
    query TEXT,
    input_description TEXT,
    response TEXT,
    sources JSONB DEFAULT '[]'::JSONB,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. AI Hub Key Features (Extracted features)
CREATE TABLE IF NOT EXISTS public.ai_hub_key_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id UUID,
    session_id UUID REFERENCES public.ai_hub_sessions(id) ON DELETE SET NULL,
    search_id UUID REFERENCES public.ai_hub_searches(id) ON DELETE SET NULL,
    feature_text TEXT NOT NULL,
    feature_type VARCHAR(50) DEFAULT 'CORE', -- 'CORE', 'FUNCTIONAL', 'STRUCTURAL', 'OPTIONAL'
    context_source VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. AI Hub Reports
CREATE TABLE IF NOT EXISTS public.ai_hub_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id UUID,
    search_id UUID REFERENCES public.ai_hub_searches(id) ON DELETE SET NULL,
    report_type VARCHAR(50) NOT NULL, -- 'PATENTABILITY', 'NOVELTY', etc.
    title VARCHAR(255) NOT NULL,
    executive_summary TEXT,
    content JSONB NOT NULL DEFAULT '{}'::JSONB,
    status VARCHAR(50) DEFAULT 'DRAFT',
    version INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. AI Hub PFS (Patent Feature Summary)
CREATE TABLE IF NOT EXISTS public.ai_hub_pfs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id UUID,
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::JSONB,
    status VARCHAR(50) DEFAULT 'DRAFT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_hub_sessions_user ON public.ai_hub_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_hub_sessions_project ON public.ai_hub_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_hub_searches_session ON public.ai_hub_searches(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_hub_searches_user ON public.ai_hub_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_hub_features_user ON public.ai_hub_key_features(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_hub_reports_user ON public.ai_hub_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_hub_pfs_user ON public.ai_hub_pfs(user_id);

-- RLS Policies

-- Sessions
ALTER TABLE public.ai_hub_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sessions" ON public.ai_hub_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.ai_hub_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.ai_hub_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.ai_hub_sessions FOR DELETE USING (auth.uid() = user_id);

-- Searches
ALTER TABLE public.ai_hub_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own searches" ON public.ai_hub_searches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own searches" ON public.ai_hub_searches FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Key Features
ALTER TABLE public.ai_hub_key_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own features" ON public.ai_hub_key_features FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own features" ON public.ai_hub_key_features FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own features" ON public.ai_hub_key_features FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own features" ON public.ai_hub_key_features FOR DELETE USING (auth.uid() = user_id);

-- Reports
ALTER TABLE public.ai_hub_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reports" ON public.ai_hub_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports" ON public.ai_hub_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reports" ON public.ai_hub_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reports" ON public.ai_hub_reports FOR DELETE USING (auth.uid() = user_id);

-- PFS
ALTER TABLE public.ai_hub_pfs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own PFS" ON public.ai_hub_pfs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own PFS" ON public.ai_hub_pfs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own PFS" ON public.ai_hub_pfs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own PFS" ON public.ai_hub_pfs FOR DELETE USING (auth.uid() = user_id);
