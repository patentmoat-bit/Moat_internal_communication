-- ============================================================================
-- Fix missing INSERT policy for CEO on inventions table
-- ============================================================================

create policy "CEO can insert inventions"
  on public.inventions for insert
  with check (public.current_user_is_ceo());
