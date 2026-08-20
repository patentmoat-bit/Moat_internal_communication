-- ============================================================================
-- MOAT — SECURITY PATCH: INVITATION SYSTEM
-- Disables public self-registration by enforcing invitations.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role_id UUID,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'))
);

CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON public.user_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON public.user_invitations(status);

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
-- Admin only access
CREATE POLICY "Admins can manage invitations"
ON public.user_invitations
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND (
      EXISTS (
        SELECT 1 FROM public.roles WHERE roles.id = users.role_id AND roles.role_name = 'Admin'
      )
    )
  )
);
