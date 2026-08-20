-- Phase D: Enterprise Security Hardening for Audit Logs

-- 1. Ensure RLS is enabled
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Prevent ALL Updates and Deletes (Immutability)
-- By not creating any UPDATE or DELETE policies, Supabase default-denies them.
-- However, we can be explicit to prevent even superusers from accidentally modifying logs if RLS is forced.
-- (Note: Postgres superusers bypass RLS, but for standard authenticated users, lack of policy = denied)

-- Remove any existing permissive policies that might violate append-only rules
DROP POLICY IF EXISTS "Allow updates to audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Allow deletes to audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Service role has full access to audit_logs" ON audit_logs;

-- 3. Policy: Allow INSERT only for authenticated users (Service role inherently bypasses)
CREATE POLICY "Allow INSERT for authenticated users" 
ON audit_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 4. Policy: Allow SELECT only for Admins
CREATE POLICY "Allow SELECT for Admins only" 
ON audit_logs 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users
    JOIN roles ON users.role_id = roles.id
    WHERE users.id = auth.uid()
    AND roles.role_name IN ('Admin', 'Super Admin')
  )
);

-- 5. Finalize Immutability Guarantee using a Postgres Trigger
-- This guarantees that even if someone uses the service_role key, they cannot modify or delete logs.
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. UPDATE and DELETE operations are strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_update ON audit_logs;
CREATE TRIGGER trg_prevent_audit_log_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

DROP TRIGGER IF EXISTS trg_prevent_audit_log_delete ON audit_logs;
CREATE TRIGGER trg_prevent_audit_log_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();
