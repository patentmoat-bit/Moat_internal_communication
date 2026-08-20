# F03_RLS_REMEDIATION_PLAN

## 1. ARCHITECTURE GOAL
The target authorization architecture enforces strict server-side tenant isolation:
`Authenticated User` -> `Identity Verification` -> `Project / Tenant Authorization` -> `Owner / Role Authorization` -> `RLS Policy` -> `Database Record`

The `service_role` key must never be exposed to the client. Storage buckets must be private. Public URLs for confidential documents must be eliminated and replaced with Short-Lived Signed URLs generated after authorization.

## 2. DATABASE RLS REMEDIATION

### 2.1 Table: `patent_projects`
*   **Current State:** `USING (auth.role() = 'authenticated')`
*   **Action:** DROP existing insecure policies.
*   **New Policies:**
    *   **SELECT:** `created_by = auth.uid()` OR user is in `project_members` for this project OR user is 'Admin'/'Super Admin'.
    *   **INSERT:** `WITH CHECK (created_by = auth.uid())`
    *   **UPDATE:** `created_by = auth.uid()` OR user is in `project_members` with 'admin' or 'editor' role.
    *   **DELETE:** `created_by = auth.uid()` OR user is 'Admin'/'Super Admin'.

### 2.2 Table: `copyrights`
*   **Current State:** `USING (true)`, INSERT forgeable via `auth.uid() IS NOT NULL`.
*   **Action:** DROP all `USING (true)` policies.
*   **New Policies:**
    *   **SELECT:** `user_id = auth.uid()` OR assigned_to = auth.uid() OR reviewer_id = auth.uid() OR Admin role.
    *   **INSERT:** `WITH CHECK (user_id = auth.uid())`
    *   **UPDATE/DELETE:** `user_id = auth.uid()` OR Admin role.

### 2.3 Table: `copyright_documents`
*   **Current State:** `USING (true)`, INSERT forgeable.
*   **Action:** DROP all `USING (true)` policies.
*   **New Policies:**
    *   **SELECT:** `uploaded_by = auth.uid()` OR user has access to parent `copyright_id`.
    *   **INSERT:** `WITH CHECK (uploaded_by = auth.uid())`
    *   **UPDATE/DELETE:** `uploaded_by = auth.uid()` OR Admin.

### 2.4 Tables: `patent_documents`, `document_versions`, `trademarks`, `trademark_history`, `inventions`
*   **Current State:** BOLA fix was applied but granted global read access to roles like 'Patent Analyst' and 'Design Team' bypassing project isolation.
*   **Action:** Remove global role-based read access for operational roles.
*   **New Policies:** Restrict SELECT to `created_by/user_id = auth.uid()` OR `project_id` / `workspace_id` in `project_members` for the user, OR user is strictly 'Admin' or 'Super Admin'. Analysts must only see records for projects they are assigned to via `project_members`.

## 3. STORAGE REMEDIATION

### 3.1 `patent_documents` and `copyrights` Buckets
*   **Current State:** Buckets are private, but RLS policies allow ANY authenticated user to read ANY object.
*   **Action:**
    1. Ensure buckets are strictly `public = false`.
    2. DROP existing insecure `SELECT` policies on `storage.objects`.
    3. **New SELECT Policy:** `owner = auth.uid()` OR through a secure DB function `user_can_access_document(bucket_id, name)` that checks project membership. Alternatively, completely deny client-side `SELECT` and force the client to request a Signed URL from a secure backend API route that validates project authorization before using the `service_role` client to generate the Signed URL. (We will use the API route approach for maximum security as requested).
    4. **New INSERT Policy:** `WITH CHECK (bucket_id IN ('patent_documents', 'copyrights') AND owner = auth.uid())`.
    5. **New UPDATE/DELETE Policy:** `owner = auth.uid()`.

## 4. API & SIGNED URL IMPLEMENTATION

*   Update or create backend API endpoints (e.g., `/api/documents/download`) to generate Signed URLs.
*   The API must:
    1. Verify the user's session token.
    2. Query the database (using RLS as the user, or explicitly checking project membership) to verify the user is authorized to read the document row.
    3. If authorized, use `supabase.storage.from('bucket').createSignedUrl(path, 60)` with the backend `service_role` client to generate a 60-second signed URL.
    4. Return the signed URL to the frontend.

## 5. SECURITY TESTING

*   Run BOLA tests: User A attempts to read/update/delete User B's invention/document/copyright. Verify `403/404` or DB denial.
*   Run Forgeability test: Attempt to insert a copyright with User B's ID. Verify denial.
*   Run Storage test: Attempt to download User B's file via direct storage API call. Verify denial.
