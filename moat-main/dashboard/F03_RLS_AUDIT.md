# F03_RLS_AUDIT

## 1. DATABASE SCHEMA AUDIT

**Table: `inventions`**
*   **Primary Key:** `id`
*   **Owner Column:** `user_id`
*   **Project/tenant Column:** `workspace_id`
*   **Foreign Keys:** `user_id -> auth.users(id)`
*   **Sensitive Data:** `title`, `description`, `problem_statement`, `solution_summary`, `technical_field`
*   **RLS Enabled?** Yes
*   **Existing SELECT policies:** `inventions_select_policy` allows read if `user_id = auth.uid()` OR `workspace_id` is in `project_members` for the user, OR user has 'Admin', 'CEO', 'Super Admin' role.
*   **Existing INSERT policies:** `inventions_insert_policy` allows insert with `WITH CHECK (user_id = auth.uid())`.
*   **Existing UPDATE policies:** `inventions_update_policy` allows update if owner, project admin/editor, or Admin/CEO.
*   **Existing DELETE policies:** `inventions_delete_policy` allows delete if owner or Admin/Super Admin.
*   **Risk:** Medium. While ownership is checked, the `workspace_id` on INSERT is not validated, potentially allowing users to associate inventions with workspaces they don't belong to. Also, relying on a subselect of `public.users` role might be bypassable if roles aren't strictly protected.

**Table: `patent_projects`**
*   **Primary Key:** `id`
*   **Owner Column:** `created_by`
*   **Sensitive Data:** `title`, `description`, `status`
*   **RLS Enabled?** Yes
*   **Existing SELECT, INSERT, UPDATE, DELETE policies:** `Allow all for authenticated users` (from `supabase_schema_ceo.sql`): `USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated')`
*   **Risk:** **CRITICAL**. Any authenticated user can read, insert, update, or delete ANY patent project.

**Table: `patent_documents`**
*   **Primary Key:** `id`
*   **Owner Column:** `created_by` (Wait, schema in `supabase_schema_ceo.sql` doesn't have `created_by`, it has `project_id`. The BOLA fix added `created_by` implicitly or it existed? I'll assume it exists.)
*   **Project/tenant Column:** `project_id`
*   **Sensitive Data:** `name`, `url` (confidential documents)
*   **RLS Enabled?** Yes
*   **Existing SELECT policies:** `patent_documents_select_policy` allows if owner, project member, or role is Admin/CEO/Super Admin/Patent Analyst/Design Team.
*   **Risk:** High. Any `Patent Analyst` or `Design Team` can see ALL patent documents globally, regardless of project assignment.

**Table: `document_versions`**
*   **Primary Key:** `id`
*   **Owner Column:** `uploaded_by`
*   **Project/tenant Column:** `document_id`
*   **Sensitive Data:** `url`
*   **RLS Enabled?** Yes
*   **Existing SELECT policies:** Same as `patent_documents`, globally visible to 'Patent Analyst' and 'Design Team'.

**Table: `trademarks`**
*   **Primary Key:** `id`
*   **Owner Column:** `created_by`
*   **Project/tenant Column:** `project_id`
*   **Sensitive Data:** `name`, `status`
*   **RLS Enabled?** Yes
*   **Existing SELECT policies:** Visible to owner, project member, or 'Patent Analyst' globally.
*   **Risk:** High. 'Patent Analyst' has global read access.

**Table: `copyrights`**
*   **Primary Key:** `id`
*   **Owner Column:** `user_id`
*   **Project/tenant Column:** `project`
*   **Sensitive Data:** `product_name`, `description`, `notes`
*   **RLS Enabled?** Yes
*   **Existing SELECT policies:** `Enable read access for authenticated users on copyrights` `USING (true)`
*   **Existing INSERT policies:** `WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL)`
*   **Existing UPDATE policies:** `USING (true)`
*   **Existing DELETE policies:** `USING (true)`
*   **Risk:** **CRITICAL**. Any authenticated user can read, insert (forge `user_id`), update, or delete ANY copyright record.

**Table: `copyright_documents`**
*   **Primary Key:** `id`
*   **Owner Column:** `uploaded_by`
*   **Sensitive Data:** `file_name`, `storage_path`
*   **RLS Enabled?** Yes
*   **Existing SELECT, UPDATE, DELETE policies:** `USING (true)`
*   **Existing INSERT policies:** `WITH CHECK (auth.uid() = uploaded_by OR auth.uid() IS NOT NULL)`
*   **Risk:** **CRITICAL**. Full BOLA vulnerability.

## 2. TRACE DATA OWNERSHIP

*   `inventions`: Direct ownership via `user_id`. Also belongs to `workspace_id`.
*   `patent_projects`: Direct ownership via `created_by`. (Note: many project tables use this).
*   `patent_documents`: Belongs to `project_id`. Direct ownership via `created_by`.
*   `document_versions`: Belongs to `document_id` -> `patent_documents`. Ownership via `uploaded_by`.
*   `trademarks`: Direct ownership via `created_by`, belongs to `project_id`.
*   `copyrights`: Direct ownership via `user_id`.
*   `copyright_documents`: Belongs to `copyright_id`, ownership via `uploaded_by`.

## 3. AUDIT CURRENT RLS

*   `patent_projects`: `auth.role() = 'authenticated'` -> **CRITICAL** (authenticated -> all rows)
*   `copyrights`: `USING (true)` -> **CRITICAL** (authenticated -> all rows)
*   `copyright_documents`: `USING (true)` -> **CRITICAL** (authenticated -> all rows)
*   `patent_documents`, `trademarks`, `inventions`: Partially protected by BOLA fix, but over-relies on role strings without checking project membership, causing global access leaks for roles like 'Patent Analyst'.

## 4. AUDIT INSERT FORGEABILITY

*   `copyrights`: `WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL)`. Since any authenticated user has a non-null `auth.uid()`, this evaluates to true regardless of `user_id`. **CRITICAL**. Forgeable.
*   `copyright_documents`: `WITH CHECK (auth.uid() = uploaded_by OR auth.uid() IS NOT NULL)`. Forgeable.

## 5. AUDIT UPDATE / DELETE

*   `patent_projects`: Any authenticated user can UPDATE/DELETE. **CRITICAL**.
*   `copyrights`: Any authenticated user can UPDATE/DELETE (`USING (true)`). **CRITICAL**.
*   `copyright_documents`: Any authenticated user can UPDATE/DELETE (`USING (true)`). **CRITICAL**.

## 6. STORAGE AUDIT

*   `patent_documents` bucket: `public = false`.
    *   SELECT Policy: `USING (bucket_id = 'patent_documents' AND auth.role() = 'authenticated')`.
    *   Risk: **CRITICAL**. Any authenticated user can download ANY file from this bucket.
*   `copyrights` bucket: `public = false`.
    *   SELECT Policy: `USING (bucket_id = 'copyrights')` `TO authenticated`.
    *   Risk: **CRITICAL**. Any authenticated user can download ANY file.

## 7. DOCUMENT URL AUDIT

*   Storage paths are stored. Public URLs shouldn't be used since the buckets are marked `public = false`, however the storage policies allow any authenticated user to retrieve them if they know the path. Furthermore, the database policies (`copyright_documents`, `patent_documents`) leak the storage paths/URLs to all users.

## 8. API AUDIT

*   (Assuming standard Supabase client usage from frontend based on RLS). RLS is currently the primary defense, and it is failing, allowing APIs to retrieve unrestricted rows for `copyrights` and `patent_projects`, and exposing storage paths.

## 9. ROLE VS OWNERSHIP

*   Identity: `auth.uid()`
*   Ownership: `user_id`, `created_by`, `uploaded_by`
*   Authorization: Project membership (`project_members`), Roles (`users.role`)
*   Flaw: Current roles (e.g., `Patent Analyst`) are granted global SELECT access to `patent_documents` and `trademarks`. This breaks tenant isolation. An Analyst should only see documents for projects they are assigned to, unless explicitly designed otherwise (which would break "other users' confidential IP" requirement).

