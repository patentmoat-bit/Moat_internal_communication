# AUTH_SESSION_AUDIT.md

## 1. Current authentication architecture
The MOAT application relies on a custom implementation bridging Supabase and a robust enterprise authentication system.
- Frontend uses `zustand` (`authStore.ts`) for state management and interacts with custom Next.js API endpoints.
- Authentication relies strictly on a custom `public.users` schema rather than Supabase's `auth.users`, leveraging `bcrypt` hashing for password validation in `authenticationService.ts`.
- `SessionService` issues HTTP-only cookies (`custom_access_token` and `custom_refresh_token`).

## 2. Current session lifecycle
- Session lifecycle is tracked through `public.user_sessions`.
- Sessions are created via `SessionService.createSession` and validated via `validateSession`.
- Previous configuration did not strictly invalidate sessions based on time; they only expired if the `user_sessions.status` was updated to 'Inactive' or manually logged out.

## 3. Current token lifecycle
- The access token was configured to expire in 15 minutes (`ACCESS_TOKEN_TTL = "15m"`).
- The refresh token is configured to expire in 7 days.
- Tokens were stored securely in HTTP-only `lax` cookies.

## 4. Current refresh behavior
- `authStore.ts` automatically attempts a token refresh if a protected route/API returns `401 Unauthorized`.
- `POST /api/auth/refresh` validates the refresh token and session against `user_sessions` and issues a new access token and refresh token.

## 5. Current protected-route behavior
- Next.js Edge Middleware (`middleware.ts`) inspects the incoming request and performs a quick lookup against `user_sessions` using the Supabase REST API (bypassing full validation to remain edge-compatible).
- Validated sessions are allowed; others are redirected to `/login`.

## 6. Current API authentication
- APIs are protected using `withSessionValidation` which calls `SessionService.validateSession`.
- `SessionService` strictly enforces that the token hash matches an active record in `user_sessions`.

## 7. Current logout behavior
- `POST /api/auth/logout` sets the `user_sessions` status to `Inactive` and updates the `logout_time`.
- `SessionService.revokeSession` deletes the HTTP-only cookies.

## 8. Security weaknesses
1. **Unenforced Inactivity Timeout:** `SessionService` tracked `last_activity_at` (though the column was missing in the database!), but didn't actually invalidate sessions that sat idle.
2. **Unenforced Absolute Lifetime:** No hard limit on the total session duration. A user could theoretically use refresh tokens indefinitely, resulting in "Login yesterday → reopen browser today → still authenticated".
3. **Middleware Drift:** The Edge Middleware validated `status` and `logout_time` but didn't perform time-based checks on `login_time` or `last_activity_at`, meaning expired sessions were only caught upon the first API request.

## 9. Recommended changes
1. **Extend Access Token TTL:** Increase access token lifetime to a robust 30 minutes.
2. **Enforce 30-minute Inactivity Timeout:** Add `last_activity_at` column to the DB and strictly revoke sessions if `now - last_activity_at > 30m` in `SessionService` and `middleware.ts`.
3. **Enforce 8-hour Absolute Lifetime:** Revoke sessions if `now - login_time > 8h` in both validation layers.
4. **UX Improvements:** Append `?expired=1` to the login redirect so the UI can inform the user why they were logged out.
