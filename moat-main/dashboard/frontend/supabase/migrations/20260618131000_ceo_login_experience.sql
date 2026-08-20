-- =================================================================
-- MOAT PATENT INTELLIGENCE PLATFORM — CEO LOGIN EXPERIENCE
-- Supabase Auth profile table, role constraints, triggers, and RLS
-- =================================================================

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'Patent Analyst',
  department text,
  company text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login timestamptz
);

alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check check (
    role in (
      'Admin',
      'CEO',
      'CTO',
      'CIO',
      'Chief IP Officer',
      'Patent Analyst',
      'Inventor',
      'Business Development'
    )
  );

create index if not exists users_role_idx on public.users(role);
create index if not exists users_company_idx on public.users(company);

alter table public.users enable row level security;

create or replace function public.current_user_is_admin()
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
      and role = 'Admin'
  );
$$;

create or replace function public.current_request_is_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
$$;

-- Profile sync from Supabase Auth signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email, role, department, company, created_at, updated_at)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'Patent Analyst'),
    nullif(new.raw_user_meta_data->>'department', ''),
    nullif(new.raw_user_meta_data->>'company', ''),
    now(),
    now()
  )
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    role = excluded.role,
    department = excluded.department,
    company = excluded.company,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_users on auth.users;
create trigger on_auth_user_created_users
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create or replace function public.prevent_user_security_field_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_request_is_service_role() or public.current_user_is_admin() then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.email is distinct from old.email
    or new.role is distinct from old.role then
    raise exception 'Only administrators can change user identity or role fields.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_user_security_field_changes on public.users;
create trigger prevent_user_security_field_changes
  before update on public.users
  for each row execute function public.prevent_user_security_field_changes();

-- RLS policies: users can see/update themselves; admins can manage profiles.
drop policy if exists "Allow authenticated users to read users profiles" on public.users;
drop policy if exists "Allow users to update their own profile" on public.users;
drop policy if exists "Users can read own profile" on public.users;
drop policy if exists "Admins can read all user profiles" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Admins can manage user profiles" on public.users;
drop policy if exists "Users can insert own profile" on public.users;

create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Admins can read all user profiles"
  on public.users for select
  using (public.current_user_is_admin());

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can manage user profiles"
  on public.users for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());
