-- ============================================================================
-- MOAT — PHASE 17 & 18 SECURITY & BACKEND SYNCHRONIZATION
-- Formalizes Trademarks schema, enforces RLS policies, and enables Realtime.
-- ============================================================================

-- 1. Create Trademarks Schema

create table if not exists public.trademarks (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- 'word' or 'logo'
  name text not null,
  application_number text,
  status text not null default 'Pending',
  class text,
  goods_services text,
  country text,
  image_url text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trademark_files (
  id uuid primary key default gen_random_uuid(),
  trademark_id uuid not null references public.trademarks on delete cascade,
  name text not null,
  url text not null,
  size bigint,
  type text,
  created_at timestamptz not null default now()
);

create table if not exists public.trademark_history (
  id uuid primary key default gen_random_uuid(),
  trademark_id uuid not null references public.trademarks on delete cascade,
  action text not null,
  performed_by text not null,
  timestamp timestamptz not null default now()
);

-- Indices
create index if not exists trademarks_type_idx on public.trademarks(type);
create index if not exists trademarks_status_idx on public.trademarks(status);
create index if not exists trademark_files_tid_idx on public.trademark_files(trademark_id);
create index if not exists trademark_history_tid_idx on public.trademark_history(trademark_id);

-- Updated At Trigger
drop trigger if exists set_trademarks_updated_at on public.trademarks;
create trigger set_trademarks_updated_at before update on public.trademarks
  for each row execute function public.set_updated_at();

-- 2. Realtime Publication
-- Add to the `supabase_realtime` publication to enable client-side subscriptions
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.trademarks;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Row Level Security (RLS) & Permissions
-- Assumptions based on roles defined in the users table.

alter table public.trademarks enable row level security;
alter table public.trademark_files enable row level security;
alter table public.trademark_history enable row level security;

-- Drop existing policies if any
drop policy if exists "Admin has full access to trademarks" on public.trademarks;
drop policy if exists "Patent Analysts can read, insert, update trademarks" on public.trademarks;
drop policy if exists "CEO can read and update status" on public.trademarks;
drop policy if exists "Universal read for authenticated" on public.trademarks;

-- Admin: ALL
create policy "Admin has full access to trademarks"
  on public.trademarks for all
  using (public.current_user_is_admin());

-- Analyst: Read, Insert, Update. NO DELETE.
-- We check if the current user role is 'Patent Analyst'
create or replace function public.current_user_is_analyst()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'Patent Analyst'
  );
$$;

create policy "Patent Analysts can manage trademarks but not delete"
  on public.trademarks for all
  using (public.current_user_is_analyst())
  with check (public.current_user_is_analyst() and current_setting('request.method', true) != 'DELETE');

-- CEO: Read, Update (for approvals).
create or replace function public.current_user_is_ceo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'CEO'
  );
$$;

create policy "CEO can review and approve trademarks"
  on public.trademarks for select
  using (public.current_user_is_ceo() or public.current_user_is_admin() or public.current_user_is_analyst());

create policy "CEO can update trademarks"
  on public.trademarks for update
  using (public.current_user_is_ceo())
  with check (public.current_user_is_ceo());

-- Simplified access for trademark_files and trademark_history
create policy "Authenticated users can access trademark files"
  on public.trademark_files for all
  using (auth.role() = 'authenticated');

create policy "Authenticated users can access trademark history"
  on public.trademark_history for all
  using (auth.role() = 'authenticated');

-- 4. Audit & Activity Logs Trigger
-- Automatically log when a trademark is created, updated, or deleted.

create or replace function public.log_trademark_activity()
returns trigger
language plpgsql
security definer
as $$
declare
  action_text text;
  actor_id uuid := auth.uid();
begin
  if TG_OP = 'INSERT' then
    action_text := 'Trademark created';
    insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, message)
    values (actor_id, actor_id, 'trademark', new.id, 'CREATE', 'Created new ' || new.type || ' trademark: ' || new.name);
    
    insert into public.audit_logs (user_id, actor_id, event_type, entity_type, entity_id, after_data)
    values (actor_id, actor_id, 'CREATE', 'trademark', new.id, row_to_json(new));
    
  elsif TG_OP = 'UPDATE' then
    action_text := 'Trademark updated';
    insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, message)
    values (actor_id, actor_id, 'UPDATE', new.id, 'Updated trademark: ' || new.name || ' status to ' || new.status);
    
    insert into public.audit_logs (user_id, actor_id, event_type, entity_type, entity_id, before_data, after_data)
    values (actor_id, actor_id, 'UPDATE', 'trademark', new.id, row_to_json(old), row_to_json(new));
    
  elsif TG_OP = 'DELETE' then
    action_text := 'Trademark deleted';
    insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, message)
    values (actor_id, actor_id, 'DELETE', old.id, 'Deleted trademark: ' || old.name);
    
    insert into public.audit_logs (user_id, actor_id, event_type, entity_type, entity_id, before_data)
    values (actor_id, actor_id, 'DELETE', 'trademark', old.id, row_to_json(old));
  end if;

  if TG_OP = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

drop trigger if exists on_trademark_change on public.trademarks;
create trigger on_trademark_change
  after insert or update or delete on public.trademarks
  for each row execute function public.log_trademark_activity();

