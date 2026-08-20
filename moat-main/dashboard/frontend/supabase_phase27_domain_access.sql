-- ==============================================================================
-- MOAT ENTERPRISE PHASE 27: DOMAIN-BASED IDENTITY ACCESS CONTROL
-- ==============================================================================

-- 1. ORGANIZATIONS TABLE
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ORGANIZATION DOMAINS TABLE
CREATE TABLE IF NOT EXISTS public.organization_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL UNIQUE,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id)
);

-- Lowercase constraint for domain
CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_domains_domain_lower ON public.organization_domains(LOWER(domain));

-- 3. UPDATE USERS TABLE WITH ORGANIZATION ID
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 4. RLS POLICIES FOR ORGANIZATIONS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizations_admin_all" ON public.organizations 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'super_admin'))
);

CREATE POLICY "organizations_user_read" ON public.organizations 
FOR SELECT USING (
  id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
);

-- 5. RLS POLICIES FOR ORGANIZATION DOMAINS
ALTER TABLE public.organization_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_domains_admin_all" ON public.organization_domains 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Admin', 'super_admin'))
);

-- Allow authenticated users to read their own org's domains (optional but good for consistency)
CREATE POLICY "org_domains_user_read" ON public.organization_domains 
FOR SELECT USING (
  organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
);

-- 6. SEED INITIAL ORGANIZATIONS & DOMAINS
DO $$
DECLARE
    rez_id UUID;
    pin_id UUID;
    kyu_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE name = 'Rezliyens') THEN
        INSERT INTO public.organizations (name, is_enabled) VALUES ('Rezliyens', true) RETURNING id INTO rez_id;
        INSERT INTO public.organization_domains (organization_id, domain, is_enabled) VALUES (rez_id, 'rezliyens.com', true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE name = 'Pinochle') THEN
        INSERT INTO public.organizations (name, is_enabled) VALUES ('Pinochle', true) RETURNING id INTO pin_id;
        INSERT INTO public.organization_domains (organization_id, domain, is_enabled) VALUES (pin_id, 'pinochle.ai', true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE name = 'Kyureeus') THEN
        INSERT INTO public.organizations (name, is_enabled) VALUES ('Kyureeus', true) RETURNING id INTO kyu_id;
        INSERT INTO public.organization_domains (organization_id, domain, is_enabled) VALUES (kyu_id, 'kyureeus.com', true);
    END IF;
END $$;
