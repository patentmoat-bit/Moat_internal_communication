-- dashboard/supabase/migrations/20260805000000_enterprise_workflow_activity.sql

CREATE TABLE IF NOT EXISTS public.activity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID, 
    module_type VARCHAR(64) NOT NULL, -- PATENT, TRADEMARK, COPYRIGHT, AI_HUB
    entity_type VARCHAR(64) NOT NULL, -- PROJECT, DOCUMENT, REPORT, SEARCH
    entity_id UUID NOT NULL,
    actor_id UUID, 
    actor_role VARCHAR(64),
    action VARCHAR(128) NOT NULL,
    description TEXT,
    previous_state VARCHAR(64),
    new_state VARCHAR(64),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_project_id ON public.activity_events(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_module_type ON public.activity_events(module_type);
CREATE INDEX IF NOT EXISTS idx_activity_events_actor_id ON public.activity_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_created_at ON public.activity_events(created_at);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view activity events" ON public.activity_events FOR SELECT USING (true);
CREATE POLICY "Users can insert activity events" ON public.activity_events FOR INSERT WITH CHECK (true);

-- Workflow Transitions Configuration Table
CREATE TABLE IF NOT EXISTS public.workflow_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_type VARCHAR(64) NOT NULL,
    current_state VARCHAR(64) NOT NULL,
    next_state VARCHAR(64) NOT NULL,
    allowed_roles JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(module_type, current_state, next_state)
);

-- Seed basic transitions
INSERT INTO public.workflow_transitions (module_type, current_state, next_state, allowed_roles) VALUES 
('PATENT', 'Assigned', 'In Progress', '["Admin", "Analyst"]'),
('PATENT', 'In Progress', 'Design Review', '["Admin", "Analyst"]'),
('PATENT', 'Design Review', 'Analyst Review', '["Admin", "Analyst", "Designer"]'),
('PATENT', 'Analyst Review', 'CEO Review', '["Admin", "Analyst"]'),
('PATENT', 'CEO Review', 'Approved', '["Admin", "CEO"]'),
('PATENT', 'CEO Review', 'Revision Required', '["Admin", "CEO"]'),
('PATENT', 'Revision Required', 'In Progress', '["Admin", "Analyst"]'),
('PATENT', 'Approved', 'Filed', '["Admin", "Analyst"]'),
('PATENT', 'Filed', 'Completed', '["Admin", "Analyst"]'),

('TRADEMARK', 'Pending', 'Approved', '["Admin", "CEO"]'),
('TRADEMARK', 'Pending', 'Rejected', '["Admin", "CEO"]'),
('TRADEMARK', 'Pending', 'Renewal', '["Admin", "Analyst"]'),

('COPYRIGHT', 'drafting', 'in_progress', '["Admin", "Analyst"]'),
('COPYRIGHT', 'in_progress', 'review', '["Admin", "Analyst"]'),
('COPYRIGHT', 'review', 'approved', '["Admin", "CEO"]'),
('COPYRIGHT', 'review', 'rejected', '["Admin", "CEO"]'),
('COPYRIGHT', 'approved', 'filed', '["Admin", "Analyst"]'),
('COPYRIGHT', 'filed', 'registered', '["Admin", "Analyst"]'),
('COPYRIGHT', 'registered', 'completed', '["Admin", "Analyst"]')
ON CONFLICT (module_type, current_state, next_state) DO NOTHING;
