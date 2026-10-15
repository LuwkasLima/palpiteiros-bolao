# Architecture

Monorepo with two apps and a shared contracts package. There is no `apps/worker` — the API
runs on Vercel's serverless runtime, which has no persistent process to host a scheduler, so
async-feeling work (news, live scores, LLM narratives) is done with a **lazy refresh-on-read**
pattern instead: each read checks whether its data is stale and refreshes it in-process before
responding. See [integrations.md](integrations.md) for the three integrations built this way.

```
apps/web        Next.js (App Router, TS, Tailwind). UI only — installable PWA
                (manifest + service worker in apps/web/public).
                Talks to the API exclusively through a typed client built on @bolao/contracts.
apps/api        FastAPI + Beanie (MongoDB ODM). Owns auth, persistence, scoring, and the
                news/live-score/LLM integrations.
packages/contracts  TS types generated from the API's OpenAPI schema (openapi-typescript).
```

## Layering rules

- The web app contains **no business logic** other than one documented exception:
  `apps/web/lib/format.ts` (`matchPoints`) duplicates the scoring algorithm client-side to show
  a predicted point value instantly, before the server confirms it. Everything else renders
  state and calls typed client wrappers (`apps/web/lib/api.ts`); all authoritative rules
  (scoring, locking, auth) live in the API.
- The API is organized as: `routers/` (HTTP) → `services/` (business logic) → `models/`
  (Beanie documents). Routers: `auth`, `matches`, `news`, `pools`, `predictions`, `admin`.
  Controllers stay thin; logic lives in services.
- Shared request/response shapes flow one way: FastAPI is the source of truth; we regenerate
  `packages/contracts` from its OpenAPI schema. No hand-maintained duplicate types.

## Auth

Passwordless magic link. `POST /auth/request-link` emails a one-time token (captured by
Mailpit locally). `POST /auth/verify` consumes it, creates a `Session`, and sets an
httpOnly cookie. Sessions are server-side documents with a TTL index, so logout/revocation
is a delete. `DELETE /auth/me` soft-deletes the user (`deleted_at`) and purges them from pools.

## Persistence

MongoDB via Beanie. Documents declare their own indexes (incl. TTL and compound-unique
indexes); Beanie creates them on startup, so there is no migration tool. Nine collections
total, including two that back the integrations below (`NewsItem`, `Narrative`). See
[data-model.md](data-model.md).

## Scoring

A single pure module (`app/services/scoring.py`) holds all constants and the
`points_for(prediction, match)` function — the single source of truth for points. An
escalating per-round weight multiplier (group=1, R32=2, R16=3, QF=4, SF=5, third=6, final=6)
keeps the race competitive to the final. There's a versioned rule split at a fixed cutover
timestamp (`SCORING_V2_SINCE`): older matches use a 3-tier exact/margin/outcome system with a
clean-sheet bonus, newer matches use a 4-tier exact/near/margin/outcome system plus
knockout-specific rules (an "advancing team" bonus, and penalty-shootout scoring). Full rule
details live in [scoring.md](scoring.md) — kept in sync with the code, not duplicated here.
Leaderboards (plus weekly "profeta"/"corneteiro" hero and title awards, see
`services/leaderboard.py`) are computed on read, with room to cache later.

## Admin

`/admin/stats` exposes platform-wide counts (users, pools, predictions by stage, etc.) for an
internal dashboard. Results are entered manually: `POST /admin/matches/{id}/result` sets the
final score (and advancing team / penalty score for knockout matches); `DELETE` reverts it.
There is no automated result-ingestion pipeline — this is intentionally the only mutation path,
per the note in [integrations.md](integrations.md).

## Deferred

- **Push notifications** — once the PWA is installed, Web Push could alert users before
  kickoff and when results post. Not implemented: no VAPID/web-push code exists yet.
