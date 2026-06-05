# Bolão — FIFA World Cup 2026

A free, for-fun sweepstakes ("bolão") for the 2026 World Cup. Create a pool, invite
friends with a link, predict exact scores for every match, and climb a leaderboard whose
scoring is designed to stay competitive to the very end (later rounds are worth more).

> Entertainment only — no money involved.

## Stack

- **Web:** Next.js (App Router, TypeScript, Tailwind) — installable PWA.
- **API:** FastAPI + Beanie (MongoDB ODM).
- **DB:** MongoDB. **Mail:** Mailpit (local magic-link capture).
- Monorepo: `apps/web`, `apps/api`, `packages/contracts`.

## Prerequisites

- Node 20+ and `pnpm` (via `corepack enable`)
- Python 3.12+ and [`uv`](https://docs.astral.sh/uv/)
- A container runtime: `podman` + `podman-compose` (or Docker)

## Quick start

```bash
cp .env.example .env                 # adjust secrets if you like
cp apps/web/.env.local.example apps/web/.env.local

pnpm install                         # web deps
(cd apps/api && uv sync)             # api deps

pnpm db:up                           # MongoDB + Mailpit (podman-compose)
pnpm api:seed                        # load the 2026 schedule
pnpm api:dev                         # FastAPI on :8000
pnpm web:dev                         # Next.js on :3000
```

Open http://localhost:3000. Magic-link emails land in Mailpit at http://localhost:8025.

## Docs

- [Architecture](docs/architecture.md)
- [Data model](docs/data-model.md)
- [Integrations](docs/integrations.md)
