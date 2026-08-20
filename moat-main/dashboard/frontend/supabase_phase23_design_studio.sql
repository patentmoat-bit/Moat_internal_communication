-- Phase 23: Design Team Dashboard Architecture
-- Dedicated tracking for design tasks, illustrations, and kanban statuses

-- 1. Design Tasks
CREATE TABLE IF NOT EXISTS public.design_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.patent_documents(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    priority VARCHAR(50) DEFAULT 'Medium',
    status VARCHAR(100) DEFAULT 'Assigned', -- Assigned, In Progress, Waiting for Clarification, Ready for Review, Completed
    due_date TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Design Assignments (Mapping users to specific documents if needed outside of a specific task)
CREATE TABLE IF NOT EXISTS public.design_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.patent_documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(100) DEFAULT 'Designer',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Design Comments
CREATE TABLE IF NOT EXISTS public.design_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.design_tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    comment_text TEXT NOT NULL,
    mentions JSONB, -- Array of user IDs mentioned
    attachments JSONB, -- Array of file URLs attached
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Design Assets (Images, illustrations, raw files uploaded via the Image Editor)
CREATE TABLE IF NOT EXISTS public.design_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.design_tasks(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.patent_documents(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    asset_type VARCHAR(100), -- E.g., 'Drawing', 'Infographic', 'Flowchart', 'Raw Image'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Design Download Logs
CREATE TABLE IF NOT EXISTS public.design_download_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.patent_documents(id) ON DELETE CASCADE,
    version_id UUID REFERENCES public.document_versions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Design Notifications
CREATE TABLE IF NOT EXISTS public.design_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.design_tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(100), -- 'Assignment', 'Comment', 'Deadline', 'StatusChange'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update trigger for updated_at on design_tasks
CREATE OR REPLACE FUNCTION update_design_tasks_modtime()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_design_tasks_modtime ON public.design_tasks;
CREATE TRIGGER update_design_tasks_modtime
BEFORE UPDATE ON public.design_tasks
FOR EACH ROW
EXECUTE PROCEDURE update_design_tasks_modtime();

-- RLS Policies
ALTER TABLE public.design_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_download_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to design_tasks" ON public.design_tasks FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access to design_assignments" ON public.design_assignments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access to design_comments" ON public.design_comments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access to design_assets" ON public.design_assets FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access to design_download_logs" ON public.design_download_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated access to design_notifications" ON public.design_notifications FOR ALL TO authenticated USING (true);
