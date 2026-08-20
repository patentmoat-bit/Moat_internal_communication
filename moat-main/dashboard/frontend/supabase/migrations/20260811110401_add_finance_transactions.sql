CREATE TABLE IF NOT EXISTS public.finance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR NOT NULL,
    project_number VARCHAR,
    project_title VARCHAR,
    ip_type VARCHAR NOT NULL CHECK (ip_type IN ('PATENT', 'TRADEMARK', 'COPYRIGHT')),
    payment_status VARCHAR NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'UNPAID')),
    assigned_finance_manager UUID REFERENCES public.users(id),
    ceo_approval_status VARCHAR,
    ceo_approved_at TIMESTAMPTZ,
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_project_id ON public.finance_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_finance_assigned_manager ON public.finance_transactions(assigned_finance_manager);
CREATE INDEX IF NOT EXISTS idx_finance_status ON public.finance_transactions(payment_status);

ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance Read Access"
ON public.finance_transactions FOR SELECT
USING (
    assigned_finance_manager = auth.uid()
    OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin', 'CEO'))
);

CREATE POLICY "Finance Update Access"
ON public.finance_transactions FOR UPDATE
USING (
    assigned_finance_manager = auth.uid()
    OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
)
WITH CHECK (
    assigned_finance_manager = auth.uid()
    OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin'))
);

CREATE POLICY "Finance Insert Access"
ON public.finance_transactions FOR INSERT
WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Admin', 'Super Admin', 'CEO', 'Patent Analyst'))
);
