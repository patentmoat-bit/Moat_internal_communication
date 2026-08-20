-- Phase 3: Relaxing RLS for Shared Patent Workspace
-- This script changes RLS on inventions, alerts, and activity_logs
-- to allow all authenticated users in the tenant to read/write.
-- In a real production system, this would be scoped to a workspace_id.

-- 1. Relax Inventions
drop policy if exists "Users can view own inventions" on inventions;
drop policy if exists "Users can insert own inventions" on inventions;
drop policy if exists "Users can update own inventions" on inventions;

create policy "Inventions are shared" on inventions
  for all using (auth.role() = 'authenticated');

-- 2. Relax Alerts
drop policy if exists "Users can view own alerts" on alerts;
drop policy if exists "Users can update own alerts" on alerts;
drop policy if exists "alerts_own" on alerts;

create policy "Alerts are shared" on alerts
  for all using (auth.role() = 'authenticated');

-- 3. Relax Activity Logs
drop policy if exists "Users can view own activity logs" on activity_logs;
drop policy if exists "Users can update own activity logs" on activity_logs;

create policy "Activity logs are shared" on activity_logs
  for all using (auth.role() = 'authenticated');

-- Enable Realtime for these tables
alter publication supabase_realtime add table inventions;
alter publication supabase_realtime add table alerts;
alter publication supabase_realtime add table activity_logs;
