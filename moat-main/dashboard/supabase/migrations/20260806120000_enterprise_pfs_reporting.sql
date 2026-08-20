-- =========================================================================================
-- Phase 1: Enterprise PFS Workflow & Global Report Storage
-- Creates the required architecture for search synchronization and the centralized PFS engine.
-- =========================================================================================

-- 1. Search Sessions Table
-- Logs every individual search execution from the 7 modules before they become final reports.
CREATE TABLE IF NOT EXISTS public.search_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.inventions(id) ON DELETE CASCADE,
    search_type VARCHAR(64) NOT NULL, -- Novelty, FTO, Validity, Invalidity, State_of_Art, Landscape, Design
    executed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    query_payload JSONB DEFAULT '{}'::jsonb,
    result_telemetry JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(64) DEFAULT 'RUNNING' -- RUNNING, COMPLETED, FAILED
);

CREATE INDEX IF NOT EXISTS idx_search_sessions_project ON public.search_sessions(project_id);

-- 2. Reports Table
-- Stores the high-level metadata for generated evidence reports.
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.inventions(id) ON DELETE CASCADE,
    search_type VARCHAR(64) NOT NULL,
    current_version INT DEFAULT 1,
    status VARCHAR(64) DEFAULT 'DRAFT', -- DRAFT, FINAL, REVIEWED, APPROVED
    generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure only one ACTIVE report per search type per project (can have many versions)
    UNIQUE(project_id, search_type)
);

CREATE INDEX IF NOT EXISTS idx_reports_project ON public.reports(project_id);

-- 3. Report Versions Table
-- Stores the actual structured evidence (JSON) and exported file links.
CREATE TABLE IF NOT EXISTS public.report_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    report_json JSONB DEFAULT '{}'::jsonb, -- The structured evidence
    pdf_url TEXT,
    docx_url TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(report_id, version_number)
);

-- 4. Project Reports Mapping Table
-- Serves as the aggregation layer for the PFS Generator
CREATE TABLE IF NOT EXISTS public.project_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.inventions(id) ON DELETE CASCADE,
    pfs_status VARCHAR(64) DEFAULT 'PENDING_EVIDENCE', -- PENDING_EVIDENCE, READY_FOR_GENERATION, GENERATED
    pfs_generated_at TIMESTAMPTZ,
    pfs_report_json JSONB DEFAULT '{}'::jsonb,
    pfs_pdf_url TEXT,
    pfs_docx_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(project_id)
);

-- =========================================================================================
-- Security Policies & RLS
-- =========================================================================================

ALTER TABLE public.search_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view
CREATE POLICY "Users can view search sessions" ON public.search_sessions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can view reports" ON public.reports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can view report versions" ON public.report_versions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can view project reports" ON public.project_reports FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert/update
CREATE POLICY "Users can manage search sessions" ON public.search_sessions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Users can manage reports" ON public.reports FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Users can manage report versions" ON public.report_versions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Users can manage project reports" ON public.project_reports FOR ALL USING (auth.role() = 'authenticated');

-- =========================================================================================
-- Realtime Synchronization
-- =========================================================================================

-- Enable Realtime for the new tables so the Tracker, CEO, and Analyst dashboards update immediately
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'search_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.search_sessions;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'reports') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'report_versions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.report_versions;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'project_reports') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_reports;
  END IF;
END $$;
