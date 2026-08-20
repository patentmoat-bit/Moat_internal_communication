-- Phase 20: Authentication Architecture Redesign
-- Completely replacing Supabase Auth with custom RBAC schema

-- 1. Create Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Permissions Table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_name VARCHAR(255) UNIQUE NOT NULL,
    module VARCHAR(255) NOT NULL
);

-- 3. Create RolePermissions Table (Junction)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Create Users Table (or modify if it exists)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL
);

-- Safely drop old Supabase auth foreign key if it exists
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Safely add the new columns needed for Phase 20 Custom Auth
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS password_plain VARCHAR(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS department VARCHAR(255),
    ADD COLUMN IF NOT EXISTS designation VARCHAR(255),
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 5. Create UserSessions Table
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    jwt_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    device VARCHAR(255),
    browser VARCHAR(255),
    ip_address VARCHAR(255),
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logout_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'Active'
);

-- 6. Create AuditLogs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    module VARCHAR(255) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip VARCHAR(255),
    browser VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Initial Data

-- Insert Super Admin Role
INSERT INTO public.roles (id, role_name, description, is_system_role)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Super Admin',
    'Full system access. Cannot be deleted.',
    TRUE
) ON CONFLICT (role_name) DO NOTHING;

-- Insert Other Roles
INSERT INTO public.roles (role_name, description, is_system_role) VALUES 
('CEO', 'Executive access', TRUE),
('Patent Analyst', 'Manages patent portfolios', TRUE),
('Trademark Analyst', 'Manages trademark portfolios', TRUE),
('CTO', 'Technology oversight', TRUE),
('CIO', 'Information oversight', TRUE),
('Legal Counsel', 'Legal access', TRUE),
('R&D Manager', 'Research oversight', TRUE),
('Viewer', 'Read-only access', TRUE)
ON CONFLICT (role_name) DO NOTHING;

-- Insert Super Admin User
-- Password is 'Admin@123!' hashed with bcrypt (cost=10)
-- $2a$10$22n9G1gQ7L31Z58.8j9x7uB7E1t0X1qG9r4u6L4.z7uQ1u3yX1wKq
INSERT INTO public.users (id, name, email, password_hash, role_id, department, designation)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'System Admin',
    'admin@moat.ai',
    '$2b$10$RLd2DLgjWUuLtKc3M33MkeouAcWy4WgisIrrrGy.Wv4qdaDlgSN8G', -- Real bcrypt hash for 'Admin@123!'
    '00000000-0000-0000-0000-000000000001',
    'IT',
    'Super Administrator'
) ON CONFLICT (email) DO UPDATE SET password_hash = '$2b$10$RLd2DLgjWUuLtKc3M33MkeouAcWy4WgisIrrrGy.Wv4qdaDlgSN8G';
