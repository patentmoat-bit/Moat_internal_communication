# MOAT Authentication Token Architecture Audit

## Current State

### Token Mechanism
* **Access Token**: JSON Web Token (JWT) with a 30-minute lifetime (`ACCESS_TOKEN_TTL`). Contains claims like `sub`, `email`, `role`, and `jti`.
* **Refresh Token**: JWT with a 7-day lifetime.

### Session Mechanism
* **Storage**: PostgreSQL table `public.user_sessions`.
* **Tracking**: Tracks `login_time`, `logout_time`, `last_activity_at`, and `status`.
* **Token Hashes**: Both `jwt_token` and `refresh_token` are hashed (SHA256) before storage.

### Token Storage
* **Access Token**: Stored as an HttpOnly, Secure, SameSite=Lax cookie (`custom_access_token`).
* **Refresh Token**: Stored as an HttpOnly, Secure, SameSite=Lax cookie (`custom_refresh_token`) specifically scoped to the `/api/auth/refresh` path.

### Middleware Validation
* The Next.js middleware reads the access token cookie or `Authorization` header.
* Validates the JWT signature.
* Performs a database lookup against `user_sessions` via Supabase REST API to verify `status !== 'Inactive'`.
* Checks for 8-hour absolute session timeout and 30-minute inactivity timeout based on `login_time` and `last_activity_at`.

### API Validation
* Most API routes rely on the Edge Middleware for token validation and RBAC checks.
* APIs do not uniformly extract the token and re-validate user/role within the endpoint itself, assuming the middleware has authorized the request.

---

## Security Weaknesses & Target Architecture Gaps

1. **Token Reuse & Lack of Rotation**:
   - The `/api/auth/refresh` endpoint validates the existing session and then calls `sessionService.createSession()`. This creates a *brand new* session row with a new token pair.
   - The original session and refresh token are *never revoked*. This allows a stolen refresh token to be reused indefinitely until the original session's absolute timeout hits.

2. **Absolute Session Bypass**:
   - Because refreshing creates a new session row with a new `login_time`, the 8-hour absolute session limit is bypassed. A user can stay logged in indefinitely by refreshing before the absolute timeout hits.

3. **Access Token Delivery Model**:
   - The prompt dictates that the access token should be "short-lived in memory where architecture requires bearer tokens" and not persisted in localStorage/sessionStorage. Currently, it is stored as an HttpOnly cookie. It needs to be transitioned to be returned in the JSON payload for the client to store in memory, while the refresh token remains an HttpOnly cookie.

4. **Refresh Token Generation**:
   - The refresh token is currently a JWT. It should be a cryptographically secure random string (opaque token) to minimize exposed claims and prevent predictable generation.

5. **Database Model Gaps**:
   - The `user_sessions` table lacks mechanisms for token families (`refresh_token_family_id`) or rotation tracking (`rotated_from_token_id`) required for detecting token theft and reuse.

6. **API-Level Defense-in-Depth**:
   - Individual API routes do not independently verify authorization, putting all reliance on the middleware. This violates the prompt's requirement: "Every protected API must independently enforce authorization."

## Reusable Existing Components
- **RBAC Logic**: `getRequiredRoles` and role mapping functions.
- **Inactivity/Timeout Logic**: The math and limits (30 min / 8 hours) are correct, just misapplied on refresh.
- **SecurityEvents/Audit Logs**: The immutable logging infrastructure is solid and should be utilized for the new token rotation and theft detection events.
- **Middleware Infrastructure**: Content Security Policy (CSP) and routing rules are solid.
