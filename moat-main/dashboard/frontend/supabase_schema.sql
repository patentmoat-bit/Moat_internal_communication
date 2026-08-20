-- =================================================================
-- PATENTAI — PHASE 1: COMPLETE DATABASE SCHEMA
-- Run this ENTIRE block in Supabase SQL Editor
-- =================================================================

-- 1. PROFILES TABLE
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text,
  avatar_url text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "profiles_own" on profiles
  using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2. SAVED PATENTS TABLE
create table if not exists saved_patents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  patent_number text not null,
  title text,
  assignee text,
  inventors text[],
  filing_date text,
  publication_date text,
  grant_date text,
  status text default 'Unknown',
  abstract text,
  ipc_codes text[],
  cpc_codes text[],
  jurisdiction text default 'US',
  citations int default 0,
  ai_match_score int,
  relevance_reason text,
  raw_data jsonb,
  created_at timestamptz default now(),
  unique(user_id, patent_number)
);
alter table saved_patents enable row level security;
create policy "patents_own" on saved_patents
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. COLLECTIONS TABLE
create table if not exists collections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  color text default '#7c3aed',
  created_at timestamptz default now()
);
alter table collections enable row level security;
create policy "collections_own" on collections
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. COLLECTION ↔ PATENTS JUNCTION TABLE
create table if not exists collection_patents (
  collection_id uuid references collections on delete cascade,
  patent_id uuid references saved_patents on delete cascade,
  added_at timestamptz default now(),
  primary key (collection_id, patent_id)
);
alter table collection_patents enable row level security;
create policy "collection_patents_own" on collection_patents
  using (
    exists (
      select 1 from collections c
      where c.id = collection_id and c.user_id = auth.uid()
    )
  );

-- 5. RECENT SEARCHES TABLE
create table if not exists recent_searches (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  query text not null,
  search_type text default 'ai',
  options jsonb default '{}',
  results jsonb default '[]',
  result_count int default 0,
  created_at timestamptz default now()
);
alter table recent_searches enable row level security;
create policy "searches_own" on recent_searches
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. WORKSPACES TABLE
create table if not exists workspaces (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  notes text default '',
  created_at timestamptz default now()
);
alter table workspaces enable row level security;
create policy "workspaces_own" on workspaces
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7. REPORTS TABLE
create table if not exists reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text,
  invention_description text,
  report_data jsonb,
  workspace_id uuid references workspaces on delete set null,
  created_at timestamptz default now()
);
alter table reports enable row level security;
create policy "reports_own" on reports
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 8. ALERTS TABLE
create table if not exists alerts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  alert_type text default 'keyword',
  criteria jsonb default '{}',
  frequency text default 'weekly',
  is_active bool default true,
  last_checked_at timestamptz,
  match_count int default 0,
  created_at timestamptz default now()
);
alter table alerts enable row level security;
create policy "alerts_own" on alerts
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
