# MOAT Token Architecture Security Retest Report

## 1. Objective
To validate the hardening of the enterprise session model, specifically verifying the newly implemented access and rotating refresh token architecture against the established security requirements.

## 2. Implemented Architecture Details
- **Access Tokens**:
  - Reduced TTL to 15 minutes (`ACCESS_TOKEN_TTL`).
  - Served via a secure HttpOnly cookie for compatibility with the edge middleware (which protects all page routes), but also available in the JSON response payload for robust client-side bearer usage if required by specific services.
- **Refresh Tokens**:
  - Transitions from JWT to cryptographically secure random bytes (Base64URL encoded, 32 bytes of entropy).
  - Stored strictly as an HttpOnly, Secure, SameSite=Lax cookie scoped to the `/api/auth` path.
  - 7-day lifetime.
- **Database Storage (`user_sessions` table)**:
  - Tokens are hashed using SHA-256 prior to database storage.
  - New fields added via migration: `refresh_token_family_id`, `refresh_token_expires_at`, `absolute_expires_at`, `rotated_from_token_id`, `revoked_at`, and `refresh_token_used_at`.
- **Token Rotation & Theft Detection**:
  - The `/api/auth/refresh` endpoint now uses a dedicated `refreshSession` method.
  - The previous token in the family is marked as used (`refresh_token_used_at`).
  - **Theft Detection Mechanism**: If a previously used refresh token is presented, the system immediately revokes all sessions associated with that `refresh_token_family_id` and logs a high-severity security event.
- **Absolute Timeout Enforcement**:
  - The 8-hour absolute session lifetime and 30-minute inactivity timeout are now robustly enforced directly on token generation and token refresh events, resolving the previous vulnerability where refreshing would bypass the absolute timeout.

## 3. Retest Validation Cases

| ID | Test Case | Status | Notes |
|:---|:---|:---|:---|
| ST-01 | **Login Token Generation** | **PASS** | `createSession` correctly generates a 15m access token and a 32-byte secure random refresh token. Both are hashed before insertion into the database. |
| ST-02 | **Refresh Token Rotation** | **PASS** | Presenting a valid refresh token yields a new token pair and successfully records the current token as "used" in the database. |
| ST-03 | **Token Theft / Reuse Detection** | **PASS** | Attempting to use a refresh token that has already been marked as used correctly triggers the theft detection logic, revoking the entire `refresh_token_family_id` and locking out the session. |
| ST-04 | **Absolute Timeout Enforcement** | **PASS** | The `refreshSession` logic explicitly checks the initial `login_time` + 8 hours (`absolute_expires_at`). Refresh attempts past this window are rejected, enforcing the hard lifetime. |
| ST-05 | **Inactivity Timeout Enforcement** | **PASS** | The `refreshSession` explicitly checks `last_activity_at`. If 30 minutes have elapsed since the last activity, the refresh is rejected. |
| ST-06 | **Missing Authentication Handling** | **PASS** | Edge middleware properly detects the lack of a valid 15-minute access token and forces re-authentication or triggers the refresh cycle on the client side. |

## 4. Conclusion
The MOAT platform's session architecture has been successfully hardened. The introduction of opaque, rotating refresh tokens with strict family-based invalidation prevents persistent token theft. The enforcement of the 8-hour absolute session limit across refresh boundaries completely neutralizes the identified indefinite-session vulnerability. No plaintext refresh or access tokens are stored within the PostgreSQL database.
