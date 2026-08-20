-- Phase 21: Centralized CMS Architecture
-- Creating tables for dynamic configurations: Dashboard, Sidebar, Features, Workflows, Application Settings

-- 1. Dashboard Config
CREATE TABLE IF NOT EXISTS public.dashboard_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    dashboard_name VARCHAR(255) NOT NULL,
    widgets JSONB DEFAULT '[]', -- Array of widget config objects
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Sidebar Config
CREATE TABLE IF NOT EXISTS public.sidebar_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label VARCHAR(255) NOT NULL,
    icon VARCHAR(255),
    path VARCHAR(255),
    parent_id UUID REFERENCES public.sidebar_items(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sidebar_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    sidebar_item_id UUID REFERENCES public.sidebar_items(id) ON DELETE CASCADE,
    is_visible BOOLEAN DEFAULT TRUE,
    UNIQUE(role_id, sidebar_item_id)
);

-- 3. Feature Flags
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key VARCHAR(255) UNIQUE NOT NULL,
    feature_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feature_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    feature_id UUID REFERENCES public.feature_flags(id) ON DELETE CASCADE,
    has_access BOOLEAN DEFAULT TRUE,
    UNIQUE(role_id, feature_id)
);

-- 4. Workflow Management
CREATE TABLE IF NOT EXISTS public.workflow_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name VARCHAR(255) UNIQUE NOT NULL,
    module VARCHAR(255) NOT NULL, -- e.g., 'Patent', 'Trademark'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.workflow_master(id) ON DELETE CASCADE,
    step_name VARCHAR(255) NOT NULL,
    step_order INTEGER NOT NULL,
    responsible_role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    status_color VARCHAR(50) DEFAULT '#000000',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Application Settings
CREATE TABLE IF NOT EXISTS public.application_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value JSONB,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Notification Templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key VARCHAR(255) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_content TEXT NOT NULL,
    trigger_event VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Patent SaaS Configuration
CREATE TABLE IF NOT EXISTS public.patent_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.technology_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    module VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 8. Seed Default Features
INSERT INTO public.feature_flags (feature_key, feature_name, description) VALUES
('patent_search', 'Patent Search', 'Global patent search tool'),
('trademark_search', 'Trademark Search', 'Global trademark and logo search tool'),
('ai_assistant', 'AI Assistant', 'AI chatbot and insights'),
('novelty_engine', 'Novelty Engine', 'Patent novelty analysis'),
('patentability_engine', 'Patentability Engine', 'Check patentability'),
('pfs_generator', 'PFS Generator', 'Generate Patent Filing Strategy documents'),
('document_upload', 'Document Upload', 'Allow users to upload files')
ON CONFLICT (feature_key) DO NOTHING;

-- 9. Seed Default App Settings
INSERT INTO public.application_settings (setting_key, setting_value, description) VALUES
('app_name', '"MOAT Platform"', 'Global application name'),
('company_logo', '""', 'URL to the company logo'),
('theme_mode', '"system"', 'Default theme mode (light/dark/system)'),
('primary_color', '"#3b82f6"', 'Brand primary color')
ON CONFLICT (setting_key) DO NOTHING;
