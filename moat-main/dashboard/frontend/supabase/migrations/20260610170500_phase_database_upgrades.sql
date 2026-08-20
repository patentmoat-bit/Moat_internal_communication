-- ============================================================================
-- MOAT — DATABASE UPGRADES
-- Adds invention, analysis, prior-art, reporting, landscape, alert, competitor,
-- activity, and audit tables without dropping or renaming existing schema.
-- ============================================================================

create extension if not exists pgcrypto;

-- Shared timestamp helper -----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Policy helper: create an own-record policy only when it does not already exist.
create or replace function public.ensure_owner_policy(target_table text, policy_name text)
returns void
language plpgsql
as $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = target_table
      and policyname = policy_name
  ) then
    execute format(
      'create policy %I on public.%I using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      policy_name,
      target_table
    );
  end if;
end;
$$;

-- Inventions -----------------------------------------------------------------
create table if not exists public.inventions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  workspace_id uuid references public.workspaces on delete set null,
  title text not null,
  description text,
  problem_statement text,
  solution_summary text,
  technical_field text,
  status text not null default 'draft',
  tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.inventions enable row level security;
select public.ensure_owner_policy('inventions', 'inventions_own');
drop trigger if exists set_inventions_updated_at on public.inventions;
create trigger set_inventions_updated_at before update on public.inventions
  for each row execute function public.set_updated_at();

create index if not exists inventions_user_id_idx on public.inventions(user_id);
create index if not exists inventions_workspace_id_idx on public.inventions(workspace_id);
create index if not exists inventions_status_idx on public.inventions(status);
create index if not exists inventions_tags_gin_idx on public.inventions using gin(tags);
create index if not exists inventions_metadata_gin_idx on public.inventions using gin(metadata);

-- Invention documents ---------------------------------------------------------
create table if not exists public.invention_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  invention_id uuid not null references public.inventions on delete cascade,
  document_type text not null default 'attachment',
  file_name text not null,
  file_type text,
  storage_path text,
  content_text text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.invention_documents enable row level security;
select public.ensure_owner_policy('invention_documents', 'invention_documents_own');
drop trigger if exists set_invention_documents_updated_at on public.invention_documents;
create trigger set_invention_documents_updated_at before update on public.invention_documents
  for each row execute function public.set_updated_at();

create index if not exists invention_documents_user_id_idx on public.invention_documents(user_id);
create index if not exists invention_documents_invention_id_idx on public.invention_documents(invention_id);
create index if not exists invention_documents_metadata_gin_idx on public.invention_documents using gin(metadata);

-- Invention analysis ----------------------------------------------------------
create table if not exists public.invention_analysis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  invention_id uuid references public.inventions on delete cascade,
  analysis_type text not null,
  status text not null default 'completed',
  model text,
  score_summary jsonb not null default '{}',
  result jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.invention_analysis enable row level security;
select public.ensure_owner_policy('invention_analysis', 'invention_analysis_own');
drop trigger if exists set_invention_analysis_updated_at on public.invention_analysis;
create trigger set_invention_analysis_updated_at before update on public.invention_analysis
  for each row execute function public.set_updated_at();

create index if not exists invention_analysis_user_id_idx on public.invention_analysis(user_id);
create index if not exists invention_analysis_invention_id_idx on public.invention_analysis(invention_id);
create index if not exists invention_analysis_type_idx on public.invention_analysis(analysis_type);
create index if not exists invention_analysis_result_gin_idx on public.invention_analysis using gin(result);

-- Prior art results -----------------------------------------------------------
create table if not exists public.prior_art_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  invention_id uuid references public.inventions on delete cascade,
  analysis_id uuid references public.invention_analysis on delete set null,
  source text not null default 'unknown',
  source_url text,
  patent_number text,
  title text not null,
  assignee text,
  inventors text[] not null default '{}',
  publication_date text,
  filing_date text,
  jurisdiction text,
  similarity_score int,
  relevance_score int,
  relevance_reason text,
  matched_features jsonb not null default '[]',
  raw_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.prior_art_results enable row level security;
select public.ensure_owner_policy('prior_art_results', 'prior_art_results_own');

create index if not exists prior_art_results_user_id_idx on public.prior_art_results(user_id);
create index if not exists prior_art_results_invention_id_idx on public.prior_art_results(invention_id);
create index if not exists prior_art_results_patent_number_idx on public.prior_art_results(patent_number);
create index if not exists prior_art_results_source_idx on public.prior_art_results(source);
create index if not exists prior_art_results_similarity_idx on public.prior_art_results(similarity_score desc);
create index if not exists prior_art_results_raw_data_gin_idx on public.prior_art_results using gin(raw_data);

-- Novelty reports -------------------------------------------------------------
create table if not exists public.novelty_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  invention_id uuid references public.inventions on delete cascade,
  analysis_id uuid references public.invention_analysis on delete set null,
  title text,
  novelty_score int,
  risk_score int,
  similarity_score int,
  verdict text,
  summary text,
  differentiators jsonb not null default '[]',
  gaps jsonb not null default '[]',
  white_space jsonb not null default '[]',
  report_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.novelty_reports enable row level security;
select public.ensure_owner_policy('novelty_reports', 'novelty_reports_own');
drop trigger if exists set_novelty_reports_updated_at on public.novelty_reports;
create trigger set_novelty_reports_updated_at before update on public.novelty_reports
  for each row execute function public.set_updated_at();

create index if not exists novelty_reports_user_id_idx on public.novelty_reports(user_id);
create index if not exists novelty_reports_invention_id_idx on public.novelty_reports(invention_id);
create index if not exists novelty_reports_score_idx on public.novelty_reports(novelty_score desc);
create index if not exists novelty_reports_data_gin_idx on public.novelty_reports using gin(report_data);

-- Patentability reports -------------------------------------------------------
create table if not exists public.patentability_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  invention_id uuid references public.inventions on delete cascade,
  analysis_id uuid references public.invention_analysis on delete set null,
  title text,
  patentability_score int,
  risk_score int,
  strength_score int,
  commercial_value_score int,
  recommendation text,
  executive_summary text,
  criteria jsonb not null default '[]',
  risk_factors jsonb not null default '[]',
  report_data jsonb not null default '{}',
  attorney_package jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.patentability_reports enable row level security;
select public.ensure_owner_policy('patentability_reports', 'patentability_reports_own');
drop trigger if exists set_patentability_reports_updated_at on public.patentability_reports;
create trigger set_patentability_reports_updated_at before update on public.patentability_reports
  for each row execute function public.set_updated_at();

create index if not exists patentability_reports_user_id_idx on public.patentability_reports(user_id);
create index if not exists patentability_reports_invention_id_idx on public.patentability_reports(invention_id);
create index if not exists patentability_reports_score_idx on public.patentability_reports(patentability_score desc);
create index if not exists patentability_reports_data_gin_idx on public.patentability_reports using gin(report_data);

-- Claim mappings --------------------------------------------------------------
create table if not exists public.claim_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  invention_id uuid references public.inventions on delete cascade,
  novelty_report_id uuid references public.novelty_reports on delete cascade,
  patentability_report_id uuid references public.patentability_reports on delete cascade,
  claim_number int,
  claim_text text not null,
  mapped_feature text,
  prior_art_ref text,
  overlap_score int,
  status text,
  notes text,
  mapping_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.claim_mappings enable row level security;
select public.ensure_owner_policy('claim_mappings', 'claim_mappings_own');

create index if not exists claim_mappings_user_id_idx on public.claim_mappings(user_id);
create index if not exists claim_mappings_invention_id_idx on public.claim_mappings(invention_id);
create index if not exists claim_mappings_status_idx on public.claim_mappings(status);
create index if not exists claim_mappings_data_gin_idx on public.claim_mappings using gin(mapping_data);

-- Technology clusters ---------------------------------------------------------
create table if not exists public.technology_clusters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  invention_id uuid references public.inventions on delete cascade,
  landscape_report_id uuid,
  name text not null,
  description text,
  density_score int,
  novelty_score int,
  maturity text,
  keywords text[] not null default '{}',
  examples jsonb not null default '[]',
  cluster_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.technology_clusters enable row level security;
select public.ensure_owner_policy('technology_clusters', 'technology_clusters_own');

create index if not exists technology_clusters_user_id_idx on public.technology_clusters(user_id);
create index if not exists technology_clusters_invention_id_idx on public.technology_clusters(invention_id);
create index if not exists technology_clusters_keywords_gin_idx on public.technology_clusters using gin(keywords);
create index if not exists technology_clusters_data_gin_idx on public.technology_clusters using gin(cluster_data);

-- Saved searches --------------------------------------------------------------
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  query text not null,
  search_type text not null default 'keyword',
  filters jsonb not null default '{}',
  result_count int not null default 0,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.saved_searches enable row level security;
select public.ensure_owner_policy('saved_searches', 'saved_searches_own');
drop trigger if exists set_saved_searches_updated_at on public.saved_searches;
create trigger set_saved_searches_updated_at before update on public.saved_searches
  for each row execute function public.set_updated_at();

create index if not exists saved_searches_user_id_idx on public.saved_searches(user_id);
create index if not exists saved_searches_search_type_idx on public.saved_searches(search_type);
create index if not exists saved_searches_filters_gin_idx on public.saved_searches using gin(filters);

-- Alerts: table already exists in Phase 1, add new optional columns safely -----
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  alert_type text not null default 'keyword',
  criteria jsonb not null default '{}',
  frequency text not null default 'weekly',
  is_active boolean not null default true,
  last_checked_at timestamptz,
  match_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.alerts add column if not exists description text;
alter table public.alerts add column if not exists delivery_channels text[] not null default '{in_app}';
alter table public.alerts add column if not exists last_match_data jsonb not null default '[]';
alter table public.alerts add column if not exists updated_at timestamptz not null default now();
alter table public.alerts enable row level security;
select public.ensure_owner_policy('alerts', 'alerts_own');
drop trigger if exists set_alerts_updated_at on public.alerts;
create trigger set_alerts_updated_at before update on public.alerts
  for each row execute function public.set_updated_at();

create index if not exists alerts_user_id_idx on public.alerts(user_id);
create index if not exists alerts_active_idx on public.alerts(is_active);
create index if not exists alerts_criteria_gin_idx on public.alerts using gin(criteria);

-- Competitors ----------------------------------------------------------------
create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  domain text,
  website text,
  notes text,
  tags text[] not null default '{}',
  watchlist boolean not null default false,
  patent_count int not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);
alter table public.competitors enable row level security;
select public.ensure_owner_policy('competitors', 'competitors_own');
drop trigger if exists set_competitors_updated_at on public.competitors;
create trigger set_competitors_updated_at before update on public.competitors
  for each row execute function public.set_updated_at();

create index if not exists competitors_user_id_idx on public.competitors(user_id);
create index if not exists competitors_watchlist_idx on public.competitors(watchlist);
create index if not exists competitors_tags_gin_idx on public.competitors using gin(tags);
create index if not exists competitors_metadata_gin_idx on public.competitors using gin(metadata);

-- Landscape reports -----------------------------------------------------------
create table if not exists public.landscape_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  invention_id uuid references public.inventions on delete set null,
  title text not null,
  domain text,
  summary text,
  total_families int,
  filing_trend text,
  top_assignees jsonb not null default '[]',
  clusters jsonb not null default '[]',
  white_space jsonb not null default '[]',
  report_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.landscape_reports enable row level security;
select public.ensure_owner_policy('landscape_reports', 'landscape_reports_own');
drop trigger if exists set_landscape_reports_updated_at on public.landscape_reports;
create trigger set_landscape_reports_updated_at before update on public.landscape_reports
  for each row execute function public.set_updated_at();

create index if not exists landscape_reports_user_id_idx on public.landscape_reports(user_id);
create index if not exists landscape_reports_invention_id_idx on public.landscape_reports(invention_id);
create index if not exists landscape_reports_domain_idx on public.landscape_reports(domain);
create index if not exists landscape_reports_data_gin_idx on public.landscape_reports using gin(report_data);

-- Add FK from technology_clusters after landscape_reports exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'technology_clusters_landscape_report_id_fkey'
  ) then
    alter table public.technology_clusters
      add constraint technology_clusters_landscape_report_id_fkey
      foreign key (landscape_report_id) references public.landscape_reports(id) on delete cascade;
  end if;
end;
$$;

-- Citation graphs -------------------------------------------------------------
create table if not exists public.citation_graphs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  invention_id uuid references public.inventions on delete set null,
  landscape_report_id uuid references public.landscape_reports on delete cascade,
  root_patent_number text,
  nodes jsonb not null default '[]',
  edges jsonb not null default '[]',
  graph_metrics jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.citation_graphs enable row level security;
select public.ensure_owner_policy('citation_graphs', 'citation_graphs_own');

create index if not exists citation_graphs_user_id_idx on public.citation_graphs(user_id);
create index if not exists citation_graphs_invention_id_idx on public.citation_graphs(invention_id);
create index if not exists citation_graphs_landscape_report_id_idx on public.citation_graphs(landscape_report_id);
create index if not exists citation_graphs_root_patent_idx on public.citation_graphs(root_patent_number);
create index if not exists citation_graphs_nodes_gin_idx on public.citation_graphs using gin(nodes);
create index if not exists citation_graphs_edges_gin_idx on public.citation_graphs using gin(edges);

-- Activity logs ---------------------------------------------------------------
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  actor_id uuid references auth.users on delete set null,
  workspace_id uuid references public.workspaces on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  message text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.activity_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'activity_logs' and policyname = 'activity_logs_own'
  ) then
    create policy activity_logs_own on public.activity_logs
      using (auth.uid() = user_id or auth.uid() = actor_id)
      with check (auth.uid() = user_id or auth.uid() = actor_id);
  end if;
end;
$$;

create index if not exists activity_logs_user_id_idx on public.activity_logs(user_id);
create index if not exists activity_logs_actor_id_idx on public.activity_logs(actor_id);
create index if not exists activity_logs_entity_idx on public.activity_logs(entity_type, entity_id);
create index if not exists activity_logs_created_at_idx on public.activity_logs(created_at desc);
create index if not exists activity_logs_metadata_gin_idx on public.activity_logs using gin(metadata);

-- Audit logs -----------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  actor_id uuid references auth.users on delete set null,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  ip_address inet,
  user_agent text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'audit_logs' and policyname = 'audit_logs_own'
  ) then
    create policy audit_logs_own on public.audit_logs
      using (auth.uid() = user_id or auth.uid() = actor_id)
      with check (auth.uid() = user_id or auth.uid() = actor_id);
  end if;
end;
$$;

create index if not exists audit_logs_user_id_idx on public.audit_logs(user_id);
create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id);
create index if not exists audit_logs_event_type_idx on public.audit_logs(event_type);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_metadata_gin_idx on public.audit_logs using gin(metadata);

-- Clean up helper that is only needed during migration execution.
drop function if exists public.ensure_owner_policy(text, text);
