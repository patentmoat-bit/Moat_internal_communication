# PERPLEXITY_INTEGRATION_AUDIT

## 1. Current Architecture
- The MOAT platform utilizes a Next.js framework with a unified frontend and backend (API Routes).
- Authentication and primary data storage rely on Supabase (accessed securely via server-side clients).
- Audit logging is centrally managed via `AuditLogService`.
- There is a `RepositoryLayer` (`@/lib/repository/RepositoryLayer`) intended for retrieving and storing structured domain data (e.g., patent search records).

## 2. Existing Perplexity Integration
Currently, Perplexity is used in two places:
1. `src/app/api/ai-hub/perplexity/route.ts` - A general AI chat endpoint for the AI Hub.
2. `src/app/api/search/route.ts` - The primary patent search endpoint currently bypasses the `RepositoryLayer` entirely and uses Perplexity to hallucinate/generate mock patent search results. This violates the "Source of Truth" architecture requirement.

## 3. Environment Configuration
- The Perplexity API key (`PERPLEXITY_API_KEY`) is securely configured in `.env.local`. 
- No API keys or access tokens were found in browser-side code or public variables (`NEXT_PUBLIC_`). The `pplx-` token is correctly protected.

## 4. Security Risks
- **Data Source Substitution:** `search/route.ts` is incorrectly relying on Perplexity as the primary data source instead of MOAT's infrastructure.
- **Service Duplication:** Direct `fetch` calls to Perplexity exist in multiple API routes instead of a centralized, reusable service module.
- **Unvalidated Input:** In `search/route.ts`, raw user query strings and filters are directly passed to the LLM without strong bounds or size limits.

## 5. Reusable Modules
- We can use the existing `GlobalExceptionHandler` and `ErrorResponseBuilder` to standardize responses and safely mask internal Perplexity API errors.
- `AuditLogService` is already present for safely logging operations (e.g. `AI_RESEARCH_EXECUTED`).
- Supabase server-side clients are correctly implemented for authentication and authorization.

## 6. Required Changes
1. **Restore Search Source of Truth:** Re-write `src/app/api/search/route.ts` to perform standard MOAT database/repository searches instead of relying on Perplexity.
2. **Centralized Client:** Implement `src/lib/services/perplexity/client.ts` to abstract the API call logic, handle timeouts, and manage errors safely.
3. **Intelligence API Endpoint:** Create a new route `src/app/api/intelligence/patent/route.ts` specifically designed for analyzing an existing real patent record. This endpoint will classify data, construct an enriched structured prompt, and return normalized analytical insights.
4. **Usage Monitoring & Rate Limiting:** Introduce basic limits and proper database logging (avoiding credential storage) for AI operations.

## 7. Files That Will Be Modified
- `src/app/api/search/route.ts` (To restore normal search capabilities)
- `src/app/api/intelligence/patent/route.ts` (To be created)
- `src/lib/services/perplexity/client.ts` (To be created)
- Component files (e.g., patent details UI) that need an "Analyze with AI" button.

## 8. Files That Must NOT Be Modified
- `src/app/api/ai-hub/perplexity/route.ts` (Unless to switch to the centralized client, but its core behavior remains intact).
- `.env` files (Secret is already established).
- Supabase authentication endpoints.
- Base layout files that handle overarching UI and authentication.
