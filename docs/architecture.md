# Architecture

Monorepo with two apps and a shared contracts package. `apps/worker` is reserved for later
(live-score sync, scheduled jobs) and does not exist yet.

```
apps/web        Next.js (App Router, TS, Tailwind). UI only — installable PWA.
                Talks to the API exclusively through a typed client built on @bolao/contracts.
apps/api        FastAPI + Beanie (MongoDB ODM). Owns auth, persistence, scoring.
packages/contracts  TS types generated from the API's OpenAPI schema (openapi-typescript).
```

## Layering rules

- The web app contains **no business logic**. It renders state and calls typed client
  wrappers (`apps/web/lib/api`). All rules (scoring, locking, auth) live in the API.
- The API is organized as: `routers/` (HTTP) → `services/` (business logic) → `models/`
  (Beanie documents). Controllers stay thin; logic lives in services.
- Shared request/response shapes flow one way: FastAPI is the source of truth; we regenerate
  `packages/contracts` from its OpenAPI schema. No hand-maintained duplicate types.

## Auth

Passwordless magic link. `POST /auth/request-link` emails a one-time token (captured by
Mailpit locally). `POST /auth/verify` consumes it, creates a `Session`, and sets an
httpOnly cookie. Sessions are server-side documents with a TTL index, so logout/revocation
is a delete.

## Persistence

MongoDB via Beanie. Documents declare their own indexes (incl. TTL and compound-unique
indexes); Beanie creates them on startup, so there is no migration tool. See
[data-model.md](data-model.md).

## Scoring

A single pure module (`app/services/scoring.py`) holds all constants and the
`points_for(prediction, match)` function. Base points reward exact/goal-diff/outcome; an
escalating per-round weight multiplier keeps the race competitive to the final. Leaderboards
are computed on read (aggregation), with room to cache later.

## Deferred

- `apps/worker` + a football-data API for live fixtures/results (see
  [integrations.md](integrations.md)).
- LLM insights, per-match statistics, push notifications, confidence tokens.
