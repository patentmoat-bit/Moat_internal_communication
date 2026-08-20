-- Drop existing role check constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Recreate constraint with new roles
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
  role = ANY (ARRAY[
    'Admin'::text, 
    'CEO'::text, 
    'CTO'::text, 
    'CIO'::text, 
    'Chief IP Officer'::text, 
    'Patent Analyst'::text, 
    'Inventor'::text, 
    'Business Development'::text, 
    'Finance Manager'::text, 
    'Patent Drafter'::text, 
    'Designer'::text, 
    'Trademark Analyst'::text, 
    'Design Team'::text,
    'Super Admin'::text
  ])
);

-- Insert into roles table safely
INSERT INTO public.roles (id, role_name, description, is_system_role)
SELECT gen_random_uuid(), 'Finance Manager', 'Manages finance workflow and payments', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE role_name = 'Finance Manager');

INSERT INTO public.roles (id, role_name, description, is_system_role)
SELECT gen_random_uuid(), 'Patent Drafter', 'Drafts patent documents and coordinates with design', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE role_name = 'Patent Drafter');
