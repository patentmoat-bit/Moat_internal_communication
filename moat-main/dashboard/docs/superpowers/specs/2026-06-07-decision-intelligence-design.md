# PFS — Decision Intelligence Layer

**Date:** 2026-06-07
**Status:** Approved (design), implementation in progress

## Problem

The repo is a feature-sprawling "Patent Intelligence Platform" (Next.js frontend + dormant
7-service FastAPI backend). The actual product goal, per the spec workbook (`Patent
Specification.xlsx`), is **PFS — a decision system, not a search tool**: the user asks a
natural-language question ("Is this novel?", "Find prior art against this claim") and the
platform decides *which kind of analysis* to run and *what technologies* the invention
covers, before any search happens.

Today there is no such entry point. `/api/search` calls Anthropic with a hard-coded
`'dummy'` key (silently broken); the only configured key is **OpenAI**. The app talks to the
Next.js API routes (`NEXT_PUBLIC_API_URL=/api`), not the FastAPI backend.

## Goal

A single **Decision Intelligence** entry experience: query in → decision brief out →
hand-off into the right search.

## Scope (agreed)

- **In:** flagship decision feature in the runnable Next.js app; standardize AI on OpenAI;
  fix the dummy-Anthropic bug; bounded cleanup (remove `scratch.*`, `scratch/`, quoted
  `dashboard/patents/"[id]"` dir, stray logs/tsbuildinfo, dead env refs).
- **Out:** reviving the FastAPI backend; unifying the dual-auth system (Supabase + custom
  JWT left as-is, just not forced on the decision feature); real patent-API integration
  (using OpenAI-generated realistic data).

## Core feature

`POST /api/decision` — `{ query }` →

```
{
  interpreted_invention: string,
  recommended_mode: "novelty" | "prior_art" | "fto" | "patentability" | "invalidity" | "landscape",
  confidence: "high" | "medium" | "low",
  rationale: string,
  alternate_modes: [{ mode, confidence, why }],
  technologies: [{ name, relevance: 0-100, what_it_is }]
}
```

- OpenAI call with strict JSON schema (structured output). Deterministic keyword-heuristic
  fallback (reusing `understanding/analyze` logic) when the key is missing or the call
  fails — never hard-crashes.

## Wiring

- New page `/dashboard/decision` is the primary landing; `/dashboard` redirects to it.
- "Run [mode] search" → `/dashboard/search?q=...&mode=...&concepts=...`.
- `/api/search` switched from broken Anthropic to OpenAI; accepts `mode` + `concepts` to
  bias results; mock fallback retained.
- Shared `lib/openai.ts` (server client) + `lib/llm.ts` (robust JSON helper). Retire
  `anthropic.ts` usage.

## Aesthetic — "Intelligence Console"

Scoped dark theme for the decision experience (not a global rewrite of the 40 existing
pages): near-black canvas, single restrained accent, IBM Plex Mono for data/labels + clean
grotesk for prose, confidence/relevance as segmented bars + chips, evidence/tech in
bordered panels. Command-bar input. Distinct from default shadcn/Tailwind look.

## Testing

- Unit: classifier fallback + JSON-parse robustness.
- Manual: `npm run dev`, hit `/dashboard/decision`, real OpenAI round-trip, hand-off into
  search.

## Failure modes guarded (from spec)

- No hallucinated certainty: confidence is explicit; fallback is labeled.
- Graceful degradation when no API key / network.
