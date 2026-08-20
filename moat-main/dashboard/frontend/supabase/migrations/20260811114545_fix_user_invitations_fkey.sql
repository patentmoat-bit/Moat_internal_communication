-- Fix foreign key on user_invitations to reference public.users instead of auth.users
ALTER TABLE public.user_invitations
  DROP CONSTRAINT IF EXISTS user_invitations_invited_by_fkey,
  ADD CONSTRAINT user_invitations_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE SET NULL;
