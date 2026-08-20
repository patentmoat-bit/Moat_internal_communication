# MOAT F-03 / BFLA SECURITY RETEST REPORT

### 1. Executive Result
**Result:** **FAIL**
The high-severity vulnerabilities F-03 (Broken RLS / BOLA) and F-04 (Broken Function-Level Authorization) remain largely exploitable. While a previous remediation attempt updated the Storage buckets to `private: false` and applied a frontend Next.js API patch for `/api/copyrights`, the underlying database RLS policies and majority of API routes still completely bypass tenant isolation.

### 2. RLS Audit
| Table | RLS Enabled? | SELECT Policy | INSERT Policy | UPDATE / DELETE Policy | Owner Field | Can Forge? | Risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `copyrights` | Yes | `USING (true)` | `WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL)` | `USING (true)` | `user_id` | **YES** | **CRITICAL** |
| `copyright_documents` | Yes | `USING (true)` | `WITH CHECK (auth.uid() = uploaded_by OR auth.uid() IS NOT NULL)` | `USING (true)` | `uploaded_by` | **YES** | **CRITICAL** |
| `patent_projects` | Yes | `USING (auth.role() = 'authenticated')` | `WITH CHECK (auth.role() = 'authenticated')` | `USING (auth.role() = 'authenticated')` | `created_by` | **YES** | **CRITICAL** |
| `patent_documents` | Yes | `EXISTS (... role IN ('Patent Analyst', 'Design Team'))` | `WITH CHECK (created_by = auth.uid())` | Checks project role | `created_by` | No | HIGH |
| `inventions` | Yes | `EXISTS (... role IN ('CEO'))` + Owner | `WITH CHECK (user_id = auth.uid())` | Checks project role | `user_id` | No | HIGH |

*Note: The database fails to enforce strict ownership. Roles like 'Patent Analyst' are granted global read access, breaking tenant isolation.*

### 3. BOLA Testing
* **User A → INSERT record (user_id = User B):** ALLOWED (via `copyrights` RLS). **FAIL**
* **User A → Update User B record:** ALLOWED (via `copyrights` and `patent_projects` RLS). **FAIL**
* **User A → DELETE User B record:** ALLOWED (via `copyrights` and `patent_projects` RLS). **FAIL**

### 4. BFLA Testing
* Multiple Next.js API routes (e.g., `/api/ceo/projects`, `/api/ceo/notifications`) use `createAdminClient()`, which utilizes the `SUPABASE_SERVICE_ROLE_KEY`.
* This completely bypasses all RLS checks at the API layer, meaning any authenticated user calling these endpoints has Super Admin access. **FAIL**

### 5. Storage Testing
* **Public/Private Bucket:** Both `patent_documents` and `copyrights` buckets have been successfully converted to PRIVATE. **PASS**
* **Anonymous Access:** DENIED (Due to buckets being private). **PASS**
* **Cross-User Authenticated Access:** ALLOWED. The RLS policies on `storage.objects` use `USING (bucket_id = 'patent_documents' AND auth.role() = 'authenticated')`. Any logged-in user can download any other user's file if they know the path. **FAIL**
* **Signed URLs:** Not implemented or enforced across the board. The system still leaks storage paths that can be directly queried via PostgREST. **FAIL**

### 6. Role Consistency
* There is a structural disconnect between `public.users.role` (a string field) and the relational `public.users.role_id → roles.role_name`.
* `api/ceo/projects` hardcodes `user_id` to `8b9caff9-b91e-43c0-854c-58cdd8ede223` and derives the role purely from the JWT `authUser?.role` string without verifying against the database.
* The DB trigger `prevent_role_self_modification` relies on `public.users.role`, causing potential desync with `role_id`.

### 7. API Authorization
* `/api/copyrights`: Hardened in a previous step to use `createClient()` and `.eq("user_id", user.id)`. **PASS (API Layer)**
* `/api/ceo/projects`: Uses `createAdminClient()`. Bypasses RLS. Returns all records globally. **FAIL**
* `/api/users/*`: Uses `createAdminClient()`. Exposes user management. **FAIL**
* `/api/notifications/*`: Uses `createAdminClient()`. Exposes all notifications. **FAIL**

### 8. Original PoC Regression
| Attack Scenario | Before | Current Result | Status |
| :--- | :--- | :--- | :--- |
| 1. Cross-user SELECT | Allowed | ALLOWED (via direct REST & vulnerable APIs) | **FAIL** |
| 2. Cross-user INSERT | Allowed | ALLOWED (via `copyrights` RLS) | **FAIL** |
| 3. Forged user_id | Allowed | ALLOWED (via `copyrights` RLS `auth.uid() IS NOT NULL`) | **FAIL** |
| 4. Cross-user UPDATE | Allowed | ALLOWED (via `copyrights` RLS) | **FAIL** |
| 5. Cross-user DELETE | Allowed | ALLOWED (via `copyrights` RLS) | **FAIL** |
| 6. Cross-user document access | Allowed | ALLOWED (via `storage.objects` authenticated policy) | **FAIL** |
| 7. Direct Storage access | Allowed | ALLOWED (if authenticated) | **FAIL** |
| 8. Anonymous document access | Allowed | **DENIED** (Buckets set to private) | **FIXED** |
| 9. Cross-user document_versions | Allowed | ALLOWED (via Global Role RLS leak) | **FAIL** |
| 10. Cross-user trademark access | Allowed | ALLOWED (via Global Role RLS leak) | **FAIL** |
| 11. Cross-user copyright access | Allowed | ALLOWED (via `USING (true)`) | **FAIL** |

### 9. Critical Findings
1. **Direct PostgREST Access:** The Supabase database remains fully vulnerable to direct REST API queries. Any user can use their JWT to query `https://.../rest/v1/copyrights` and bypass the `/api/copyrights` frontend fixes.
2. **Service Role Abuse:** Next.js APIs extensively utilize the `SUPABASE_SERVICE_ROLE_KEY`, effectively rendering the application a privilege escalation proxy.
3. **Storage Object RLS:** The storage objects allow global read access to anyone with the `authenticated` role, completely negating the benefit of setting the buckets to private.

### 10. Final Security Decision
**NOT FIXED**
