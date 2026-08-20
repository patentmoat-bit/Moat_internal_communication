-- Phase 6: PFS Report Versioning
-- Maintains version history for generated Patent Filing Strategy reports

CREATE TABLE IF NOT EXISTS public.pfs_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.inventions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(64) NOT NULL DEFAULT 'Draft', -- Draft, Submitted, Reviewed, Approved, Archived
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure we can fetch the latest version quickly
CREATE INDEX IF NOT EXISTS idx_pfs_reports_project ON public.pfs_reports(project_id, version DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_pfs_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_pfs_reports_timestamp ON public.pfs_reports;
CREATE TRIGGER update_pfs_reports_timestamp
    BEFORE UPDATE ON public.pfs_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_pfs_reports_updated_at();

-- RLS Policies
ALTER TABLE public.pfs_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pfs reports" 
    ON public.pfs_reports FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert pfs reports" 
    ON public.pfs_reports FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update pfs reports" 
    ON public.pfs_reports FOR UPDATE 
    USING (auth.role() = 'authenticated');

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pfs_reports;
