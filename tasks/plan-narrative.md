# Plan: LLM narrative wrap-ups (daily + weekly)

**Branch:** `release/2026-06-21`

## Goal

Use an LLM to generate Portuguese narrative recaps of pool results — a per-day "resenha do
dia" and a Sunday "resenha da semana" that wraps up the **profeta** (best) and **corneteiro**
(worst) of the week. The narrative is additive color commentary layered on top of the
existing factual `compute_weekly_hero` output, displayed on the pool detail page.

## Key constraints (from existing code)

- **No worker exists.** The established pattern is lazy-refresh-on-read with a Mongo cache and
  a staleness TTL (see `apps/api/app/services/news.py`). Generation must follow this, not cron.
- **Best/worst already computed.** `compute_weekly_hero` in
  `apps/api/app/services/leaderboard.py` returns profeta/corneteiro + points + week label and a
  `has_data` flag. Reuse it; do not recompute standings.
- **Layering:** routers → services → models. Pure, testable functions for prompt building;
  LLM/network behind a service interface. No business logic in routers or web components.
- **Graceful degradation:** an LLM/key failure must never blank the page — fall back to the
  raw hero card, exactly how `news.py` degrades on a feed outage.

## Decisions

- Model: **Claude Haiku 4.5 (`claude-haiku-4-5`)** — short, high-volume flavor text.
- Trigger: **lazy-on-read**, cached per `(pool_id, kind, period_key)`.
- Regeneration: keyed on an `inputs_hash` so a late-corrected result refreshes the prose.
- Tone: light, friendly Brazilian football banter; corneteiro roast stays affectionate
  (real friends, real names) — constrained in the system prompt.
- Scope this release: **weekly wrap-up first** (reuses weekly-hero almost verbatim). Daily
  recap is a fast-follow, not in this plan unless time allows.

## Checklist

### 1. LLM client boundary
- [ ] Add `apps/api/app/services/llm.py`: one async function that takes a system + user prompt,
      returns text. Owns model id, API key (env `ANTHROPIC_API_KEY`), timeout, and one retry.
- [ ] Best-effort contract: returns `None` on any failure/missing key (never raises into the
      request path). Log a warning, mirroring `news._fetch_source`.
- [ ] Confirm the correct current SDK + model id via the `claude-api` skill before coding.

### 2. Data model — narrative cache
- [ ] Add `Narrative` Beanie document in `apps/api/app/models/`: `pool_id`, `kind`
      (`weekly`), `period_key` (e.g. `2026-W25`), `body`, `model`, `inputs_hash`, `created_at`.
- [ ] Unique compound index `(pool_id, kind, period_key)`; register in models `__init__`.

### 3. Narrative service
- [ ] Add `apps/api/app/services/narrative.py`.
- [ ] Pure `build_weekly_prompt(hero, ...)` → system + user strings. No I/O — unit-testable.
- [ ] Pure `inputs_hash(hero)` over the stats that, if changed, should regenerate.
- [ ] `get_weekly_narrative(pool, week_start, week_end)`:
      - skip entirely when `hero.has_data` is `False` (no call, no row).
      - cache hit with matching `inputs_hash` → return stored body.
      - miss/stale → build prompt, call `llm`, upsert, return. On `None` from llm → return
        no narrative (caller falls back to the hero card).

### 4. API surface
- [ ] Extend the existing weekly-hero endpoint/schema (find its router) to include an optional
      `narrative: str | None`, rather than adding a separate round-trip. Keep `WeeklyHeroOut`
      the factual anchor; narrative is an additive field.
- [ ] Regenerate `packages/contracts` from the OpenAPI schema (no hand-edited types).

### 5. Web UI
- [ ] On the pool detail page, render the narrative as a "Resenha da Semana" block above/with
      the existing profeta/corneteiro display. Only when present.
- [ ] No narrative → show today's hero card unchanged (current behavior).

### 6. Changelog + notification (mandatory, user-facing feature)
- [ ] Add entry to top of `CHANGELOG` in `apps/web/lib/changelog.ts`; bump `LATEST_VERSION`
      to `2026-06-21`.
- [ ] Add matching `NOTIFICATIONS` entry in `apps/web/lib/notifications.ts`
      (`id: "release-2026-06-21"`).

## Verification

- [ ] Unit-test the pure functions: `build_weekly_prompt` shape, `inputs_hash` stability and
      change-detection. Add to `apps/api/tests/` (mirror `test_news.py`).
- [ ] Service test with the LLM call mocked: cache hit path, miss-then-store path, `has_data`
      false → no call, llm returns `None` → graceful no-narrative.
- [ ] Run the API test suite; confirm no regression in leaderboard/weekly-hero tests.
- [ ] Manual: post a week's results locally, load the pool page on/after Sunday, confirm the
      resenha renders and that re-loading does not regenerate (cache hit).
- [ ] Manual failure path: unset `ANTHROPIC_API_KEY`, confirm the hero card still renders.

## Risks / open questions

- **Tone safety** of the corneteiro roast — needs explicit system-prompt guardrails; review
  sample outputs before shipping.
- **Cost** is bounded by caching (one call per active pool per week), but verify no
  accidental regeneration loop via `inputs_hash`.
- **First-reader latency**: the lazy generation adds an LLM round-trip for whoever loads the
  page first on Sunday. Acceptable for now; a worker pre-warm is the future fix, out of scope.
- Confirm the exact name/location of the weekly-hero router + schema before step 4.

## Review / results

_(fill in as work completes; delete this file when the feature is merged.)_
