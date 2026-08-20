-- Phase 1 Authentication Schema Update

-- 1. ROLES TABLE (Reference table)
create table if not exists roles (
  id text primary key,
  description text,
  created_at timestamptz default now()
);

-- Seed initial roles
insert into roles (id, description) values
  ('CEO', 'Executive Innovation Intelligence'),
  ('CTO', 'Engineering Signal Intelligence'),
  ('CIO', 'Enterprise Innovation Intelligence'),
  ('Chief IP Officer', 'Prior Art and Filing Intelligence'),
  ('Inventor', 'Research-to-Patent Intelligence'),
  ('Business Development', 'Feature and Competitive Product Intelligence'),
  ('Patent Analyst', 'Search, Landscape, and Evidence Intelligence'),
  ('Admin', 'Enterprise Control Plane')
on conflict (id) do nothing;

alter table roles enable row level security;
create policy "Roles are readable by all authenticated users"
  on roles for select using (auth.role() = 'authenticated');

-- 2. LOGIN HISTORY TABLE
create table if not exists login_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  ip_address text,
  user_agent text,
  status text default 'success',
  created_at timestamptz default now()
);

alter table login_history enable row level security;
-- Users can read their own login history
create policy "login_history_own_read"
  on login_history for select using (auth.uid() = user_id);
-- Insert policy for anon/authenticated or service role
create policy "login_history_insert"
  on login_history for insert with check (auth.uid() = user_id);

-- 3. USER SESSIONS TABLE
create table if not exists user_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  access_token text,
  refresh_token text,
  user_agent text,
  ip_address text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_sessions enable row level security;
create policy "user_sessions_own_read"
  on user_sessions for select using (auth.uid() = user_id);
create policy "user_sessions_own_delete"
  on user_sessions for delete using (auth.uid() = user_id);
create policy "user_sessions_insert"
  on user_sessions for insert with check (auth.uid() = user_id);
create policy "user_sessions_update"
  on user_sessions for update using (auth.uid() = user_id);
