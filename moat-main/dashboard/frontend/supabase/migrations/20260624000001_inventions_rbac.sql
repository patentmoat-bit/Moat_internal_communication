-- ============================================================================
-- MOAT — PHASE 18 SECURITY & BACKEND SYNCHRONIZATION (INVENTIONS)
-- Formalizes Inventions schema, enforces RLS policies, and enables logs.
-- ============================================================================

-- Drop the restrictive policies from Phase 1
drop policy if exists "inventions_own" on public.inventions;
drop policy if exists "invention_documents_own" on public.invention_documents;

-- Admin: ALL
create policy "Admin has full access to inventions"
  on public.inventions for all
  using (public.current_user_is_admin());

create policy "Admin has full access to invention_documents"
  on public.invention_documents for all
  using (public.current_user_is_admin());

-- Analyst: Read, Insert, Update. NO DELETE.
create policy "Patent Analysts can manage inventions but not delete"
  on public.inventions for all
  using (public.current_user_is_analyst())
  with check (public.current_user_is_analyst() and current_setting('request.method', true) != 'DELETE');

create policy "Patent Analysts can manage invention_documents but not delete"
  on public.invention_documents for all
  using (public.current_user_is_analyst())
  with check (public.current_user_is_analyst() and current_setting('request.method', true) != 'DELETE');

-- CEO: Read, Update (for approvals).
create policy "CEO can review inventions"
  on public.inventions for select
  using (public.current_user_is_ceo());

create policy "CEO can update inventions"
  on public.inventions for update
  using (public.current_user_is_ceo())
  with check (public.current_user_is_ceo());

create policy "CEO can review invention_documents"
  on public.invention_documents for select
  using (public.current_user_is_ceo());

-- 4. Audit & Activity Logs Trigger
-- Automatically log when an invention is created, updated, or deleted.

create or replace function public.log_invention_activity()
returns trigger
language plpgsql
security definer
as $$
declare
  action_text text;
  actor_id uuid := auth.uid();
begin
  if TG_OP = 'INSERT' then
    insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, message)
    values (actor_id, actor_id, 'project', new.id, 'CREATE', 'Created new project: ' || new.title);
    
    insert into public.audit_logs (user_id, actor_id, event_type, entity_type, entity_id, after_data)
    values (actor_id, actor_id, 'CREATE', 'project', new.id, row_to_json(new));
    
  elsif TG_OP = 'UPDATE' then
    insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, message)
    values (actor_id, actor_id, 'UPDATE', new.id, 'Updated project: ' || new.title || ' status to ' || new.status);
    
    insert into public.audit_logs (user_id, actor_id, event_type, entity_type, entity_id, before_data, after_data)
    values (actor_id, actor_id, 'UPDATE', 'project', new.id, row_to_json(old), row_to_json(new));
    
  elsif TG_OP = 'DELETE' then
    insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, message)
    values (actor_id, actor_id, 'DELETE', old.id, 'Deleted project: ' || old.title);
    
    insert into public.audit_logs (user_id, actor_id, event_type, entity_type, entity_id, before_data)
    values (actor_id, actor_id, 'DELETE', 'project', old.id, row_to_json(old));
  end if;

  if TG_OP = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

drop trigger if exists on_invention_change on public.inventions;
create trigger on_invention_change
  after insert or update or delete on public.inventions
  for each row execute function public.log_invention_activity();
