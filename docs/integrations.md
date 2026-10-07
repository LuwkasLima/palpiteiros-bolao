# Integrations

All three "Current" integrations below share the same pattern: **lazy refresh-on-read**. There
is no `apps/worker` and no scheduler — the API runs on Vercel's serverless runtime, which has
no persistent process to host a cron job. Instead, each service checks whether its cached data
is stale on the relevant request and refreshes it in-process (in-memory cache, or a Mongo doc
for anything worth persisting) before responding. A lock guards against a refresh stampede when
several requests arrive while the cache is stale.

## Current (MVP)

- **SMTP (Mailpit in dev):** the API sends magic-link emails via SMTP. Locally this points at
  Mailpit (`localhost:1025`, UI at `:8025`). In prod, swap `SMTP_*` env vars for a real
  provider (Resend, per [deploy.md](deploy.md)). All email goes through `app/services/email.py`.

- **Live scores (API-Football):** `app/services/live_scores.py` fetches currently-live FIFA
  World Cup 2026 fixtures from API-Football and caches the result in memory for 3 minutes (free
  tier is 100 req/day). Our matches don't carry API-Football fixture ids, so correlation is by
  `kickoff_at` within a 5-minute tolerance. When a fixture drops off the live feed, the service
  infers a final phase and keeps serving the last-known score for 1 hour so the UI can show
  "Encerrado" instead of "Ao Vivo". Configured via `api_football_key` / `api_football_league_id`
  / `api_football_season`; returns nothing if no key is set. Surfaced through
  `GET /matches/in-progress`.

- **World Cup news (RSS):** `app/services/news.py` aggregates and normalizes RSS from three
  Brazilian sources (ESPN Brasil, Globo Esporte, Trivela), filters to World Cup-relevant items,
  and upserts them into the `NewsItem` collection (dedup by `link`). A read refreshes the store
  when it's more than 1 hour stale. Surfaced through `GET /news`.

- **LLM weekly narrative (Anthropic):** `app/services/llm.py` is a thin wrapper around the
  Anthropic API (Claude Haiku, via `anthropic_api_key` / `narrative_model`); it's best-effort —
  returns `None` on any failure (missing key, missing SDK, API error, timeout) so an LLM outage
  never blanks a page. `app/services/narrative.py` builds a "resenha" wrap-up each week
  highlighting the pool's best/worst scorer (profeta/corneteiro), pulling in that week's news
  headlines for flavor, and caches the result in the `Narrative` collection keyed by
  `(pool_id, kind, period_key)` — generated once per pool per week, invalidated only when the
  underlying stats or model change. Surfaced through `GET /pools/{id}/leaderboard/weekly-hero`.

## Deferred

- **Push notifications** — once the PWA is installed, Web Push could alert users before
  kickoff and when results post. Not implemented: no VAPID/web-push code exists in the repo
  yet.
