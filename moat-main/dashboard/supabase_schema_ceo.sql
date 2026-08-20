-- =========================================================================
-- Supabase Schema for CEO Module and Feature-Based Architecture
-- =========================================================================

-- 1. Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed initial roles
INSERT INTO public.roles (name, description) VALUES
('CEO', 'Chief Executive Officer'),
('CTO', 'Chief Technology Officer'),
('CIO', 'Chief Information Officer'),
('Analyst', 'Patent/Trademark Analyst'),
('Admin', 'System Administrator')
ON CONFLICT (name) DO NOTHING;

-- 2. Users Profile Extension (integrating with existing users structure)
-- Note: users table already exists, so we just add role relation if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company VARCHAR(100);

-- 3. Patent Projects
CREATE TABLE IF NOT EXISTS public.patent_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft' NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Patent Status History
CREATE TABLE IF NOT EXISTS public.patent_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.patent_projects(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(64) NOT NULL,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Patent Portfolio
CREATE TABLE IF NOT EXISTS public.patent_portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patent_number VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(1024) NOT NULL,
    abstract TEXT,
    assignee VARCHAR(512),
    filing_date DATE,
    status VARCHAR(64),
    estimated_value NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Patent Documents
CREATE TABLE IF NOT EXISTS public.patent_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.patent_projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    file_type VARCHAR(64),
    size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Patent Versions
CREATE TABLE IF NOT EXISTS public.patent_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.patent_documents(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL,
    url TEXT NOT NULL,
    commit_message VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Inventions (already exists, ensuring constraints & extension fields)
CREATE TABLE IF NOT EXISTS public.inventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    problem_statement TEXT,
    solution_summary TEXT,
    technical_field VARCHAR(255),
    status VARCHAR(64) DEFAULT 'draft' NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Invention Memory (Version history of inventions)
CREATE TABLE IF NOT EXISTS public.invention_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invention_id UUID REFERENCES public.inventions(id) ON DELETE CASCADE NOT NULL,
    content JSONB NOT NULL,
    commit_message VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Workspace Documents
CREATE TABLE IF NOT EXISTS public.workspace_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    status VARCHAR(64) DEFAULT 'draft' NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Workspace Files
CREATE TABLE IF NOT EXISTS public.workspace_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.workspace_documents(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    size INTEGER,
    type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Notifications (system & direct alerts)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(64) DEFAULT 'system' NOT NULL,
    priority VARCHAR(32) DEFAULT 'normal' NOT NULL,
    receiver UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Alerts (already exists, ensuring structure)
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    alert_type VARCHAR(64) DEFAULT 'keyword' NOT NULL,
    criteria JSONB DEFAULT '{}'::jsonb,
    frequency VARCHAR(50) DEFAULT 'weekly' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    last_checked_at TIMESTAMP WITH TIME ZONE,
    match_count INTEGER DEFAULT 0 NOT NULL,
    description TEXT,
    delivery_channels JSONB DEFAULT '["in_app"]'::jsonb,
    last_match_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Feedback (CEO & Team comments)
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    body TEXT,
    status VARCHAR(64) DEFAULT 'open' NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. Approvals (for patent/invention/trademark status transitions)
CREATE TABLE IF NOT EXISTS public.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type VARCHAR(100) NOT NULL, -- 'patent', 'invention', 'trademark'
    item_id UUID NOT NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL, -- pending, approved, rejected
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(255) NOT NULL,
    performed_by VARCHAR(255),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. Trademark Projects
CREATE TABLE IF NOT EXISTS public.trademark_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. Word Trademarks
CREATE TABLE IF NOT EXISTS public.word_trademarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.trademark_projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    application_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
    class VARCHAR(100),
    goods_services TEXT,
    country VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 19. Logo Trademarks
CREATE TABLE IF NOT EXISTS public.logo_trademarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.trademark_projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    application_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
    class VARCHAR(100),
    image_url TEXT,
    country VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 20. Trademark Files (attachments for word & logo marks)
CREATE TABLE IF NOT EXISTS public.trademark_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trademark_id UUID NOT NULL, -- references word_trademarks or logo_trademarks
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    size INTEGER,
    type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 21. Emails
CREATE TABLE IF NOT EXISTS public.emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(255) NOT NULL,
    body TEXT,
    sender VARCHAR(255) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status VARCHAR(50) DEFAULT 'sent' NOT NULL
);

-- 22. Activity Logs (already exists, ensuring structure matches)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_id UUID,
    workspace_id UUID,
    entity_type VARCHAR(100),
    entity_id UUID,
    action VARCHAR(255) NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- Enable Row Level Security (RLS) and Create Simple Policies
-- =========================================================================

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patent_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patent_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patent_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patent_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invention_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trademark_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_trademarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logo_trademarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trademark_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- General access policies for authenticated users
CREATE POLICY "Allow select for authenticated users" ON public.roles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.patent_projects FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.patent_status FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.patent_portfolio FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.patent_documents FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.patent_versions FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.invention_memory FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.workspace_documents FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.workspace_files FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.notifications FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.feedback FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.approvals FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.audit_logs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.trademark_projects FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.word_trademarks FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.logo_trademarks FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.trademark_files FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON public.emails FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
