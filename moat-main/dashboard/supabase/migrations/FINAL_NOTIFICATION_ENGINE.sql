-- ── Notification Rule Engine Tables ────────────────────────────────────────

-- 1. Notification Templates
DROP TABLE IF EXISTS public.notification_templates CASCADE;
CREATE TABLE public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Notification Rules
DROP TABLE IF EXISTS public.notification_rules CASCADE;
CREATE TABLE public.notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(100) NOT NULL,
    template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
    priority VARCHAR(50) DEFAULT 'Normal',
    status VARCHAR(50) DEFAULT 'Active', -- Active, Disabled
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Notification Recipients
DROP TABLE IF EXISTS public.notification_recipients CASCADE;
CREATE TABLE public.notification_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES public.notification_rules(id) ON DELETE CASCADE,
    recipient_type VARCHAR(50) NOT NULL, -- 'ROLE', 'PROJECT_FIELD', 'SPECIFIC_USER'
    recipient_value VARCHAR(255) NOT NULL, -- e.g., 'CEO', 'assigned_to', 'user_id'
    routing_type VARCHAR(10) NOT NULL, -- 'TO', 'CC', 'BCC'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Notification Conditions
DROP TABLE IF EXISTS public.notification_conditions CASCADE;
CREATE TABLE public.notification_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES public.notification_rules(id) ON DELETE CASCADE,
    field VARCHAR(100) NOT NULL, -- e.g., 'department', 'priority', 'status'
    operator VARCHAR(50) NOT NULL, -- 'EQUALS', 'CONTAINS', 'GREATER_THAN', etc.
    value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Email Logs
DROP TABLE IF EXISTS public.email_logs CASCADE;
CREATE TABLE public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES public.notification_rules(id) ON DELETE SET NULL,
    event_type VARCHAR(100),
    subject VARCHAR(255),
    recipients JSONB, -- { to: [], cc: [], bcc: [] }
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Sent, Failed
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
);

-- REFRESH CACHE
NOTIFY pgrst, 'reload schema';
