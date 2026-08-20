-- ==============================================================================
-- MOAT ENTERPRISE PHASE 26: ACCESS REVIEW & PERMISSION MANAGEMENT
-- ==============================================================================

-- 1. USER PERMISSIONS OVERRIDES TABLE
-- This table stores explicit grants or revokes that override the user's role-based permissions.
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- references public.users(id)
    permission VARCHAR(128) NOT NULL,
    action VARCHAR(16) NOT NULL CHECK (action IN ('GRANT', 'REVOKE')),
    granted_by UUID, -- references public.users(id)
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can read all permissions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_permissions' AND policyname = 'user_permissions_admin_read'
    ) THEN
        CREATE POLICY "user_permissions_admin_read" ON public.user_permissions 
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.role_name IN ('Admin', 'Super Admin')
          )
        );
    END IF;
END
$$;

-- Admins can write all permissions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_permissions' AND policyname = 'user_permissions_admin_write'
    ) THEN
        CREATE POLICY "user_permissions_admin_write" ON public.user_permissions 
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.role_name IN ('Admin', 'Super Admin')
          )
        ) WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.role_name IN ('Admin', 'Super Admin')
          )
        );
    END IF;
END
$$;

-- Users can read their own permission overrides
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_permissions' AND policyname = 'user_permissions_own_read'
    ) THEN
        CREATE POLICY "user_permissions_own_read" ON public.user_permissions
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
END
$$;
