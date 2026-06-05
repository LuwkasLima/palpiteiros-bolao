# Integrations

## Current (MVP)

- **SMTP (Mailpit in dev):** the API sends magic-link emails via SMTP. Locally this points at
  Mailpit (`localhost:1025`, UI at `:8025`). In prod, swap `SMTP_*` env vars for a real
  provider. All email goes through `app/services/email.py`.

## Deferred

- **Football data API (fixtures + live/final scores).** MVP ships a static seeded 2026
  schedule and admins enter results by hand. A future `apps/worker` will sync fixtures and
  scores on a schedule, then trigger the same scoring recompute the admin endpoint uses.
  Candidate providers: API-Football, football-data.org. Keep result-ingestion behind a
  service interface so the manual admin path and the API path share one code path.
- **LLM insights** (match previews, banter, summaries) — a separate service boundary.
- **Push notifications** — once the PWA is installed, Web Push can alert users before kickoff
  and when results post.
