-- Enterprise Email Notification Rule Engine Schema

-- 1. Notification Templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Notification Rules
CREATE TABLE IF NOT EXISTS public.notification_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE TABLE IF NOT EXISTS public.notification_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES public.notification_rules(id) ON DELETE CASCADE,
    recipient_type VARCHAR(50) NOT NULL, -- 'ROLE', 'PROJECT_FIELD', 'SPECIFIC_USER'
    recipient_value VARCHAR(255) NOT NULL, -- e.g., 'CEO', 'assigned_to', 'user_id'
    routing_type VARCHAR(10) NOT NULL, -- 'TO', 'CC', 'BCC'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Notification Conditions
CREATE TABLE IF NOT EXISTS public.notification_conditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES public.notification_rules(id) ON DELETE CASCADE,
    field VARCHAR(100) NOT NULL, -- e.g., 'department', 'priority', 'status'
    operator VARCHAR(50) NOT NULL, -- 'EQUALS', 'CONTAINS', 'GREATER_THAN', etc.
    value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Email Logs / Queue (Extend existing or create new)
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- RLS Policies
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view
CREATE POLICY "Allow authenticated read access" ON public.notification_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON public.notification_rules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON public.notification_recipients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON public.notification_conditions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read access" ON public.email_logs FOR SELECT USING (auth.role() = 'authenticated');

-- Service role bypasses RLS naturally, so Admin APIs will use service role client.
