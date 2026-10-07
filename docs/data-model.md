# Data model

MongoDB collections, modeled as Beanie `Document` classes in `apps/api/app/models/__init__.py`.
Indexes (incl. TTL and compound-unique) are declared in each model's `Settings`.

## Collections

### User
`email` (unique), `display_name`, `is_admin`, `onboarding_done` (`None` means the user predates
this field and is treated as done), `last_viewed_changelog_version`, `created_at`,
`last_seen_at` (indexed), `deleted_at` (soft delete; `None` while active).

### MagicLink
`email`, `token_hash`, `expires_at`, `consumed_at`. TTL index on `expires_at` purges expired
links. Single-use: `consumed_at` is set on verify.

### Session
`token_hash` (unique), `user_id`, `expires_at`. TTL index on `expires_at`. The session token
lives in an httpOnly cookie; deleting the doc revokes it.

### Team
`name`, `code` (unique), `group_label`, `flag_emoji`.

### Match
`key` (unique) — a stable external id (e.g. `"M01"`, `"R32-1"`) the seed uses for idempotent
upserts. `stage` (`group|r32|r16|qf|sf|third|final`), `round_weight`, `group_label?`,
`slot_label?` (e.g. `"Winner Group A"` while a knockout slot's team is still unknown),
`home_team_id?`, `away_team_id?`, `kickoff_at`, `status` (`scheduled|locked|final`),
`home_score?`, `away_score?`, `advancing_team_id?`, `penalty_home_score?`,
`penalty_away_score?`. Knockout slots stay null until the bracket resolves. Indexes on
`kickoff_at`, `stage`.

### Pool
`name`, `creator_id`, `invite_code` (unique), `created_at`, `deleted_at` (soft delete), and an
**embedded** `members` array of `Member` (`user_id`, `display_name`, `role` =
`creator|member`, `joined_at`, `bonus_points`). Membership is embedded because a friend pool is
bounded — pool detail + members is one read. Indexed on `members.user_id` for "my pools"
lookups.

### Prediction
`pool_id`, `user_id`, `match_id`, `home_score`, `away_score`, `advancing_team_id?` (knockout
only — which team the user picks to advance), `penalty_home_score?`, `penalty_away_score?`,
`updated_at`. Compound **unique** index `(pool_id, user_id, match_id)`. Secondary index
`(pool_id, match_id)` for scoring sweeps. Writes are rejected once the match's `kickoff_at`
has passed.

### NewsItem
A single article aggregated from an external World Cup RSS feed (`source`:
`espn|ge|trivela`), `title`, `link` (unique dedup key), `summary`, `image_url?`,
`published_at`, `fetched_at`. Upserted by `link` so re-fetching a feed is idempotent. TTL
index on `fetched_at` (7 days) prunes the rolling window. See
[integrations.md](integrations.md).

### Narrative
A cached LLM-generated wrap-up of a pool's results for one period (currently only
`kind = "weekly"`). `pool_id`, `kind`, `period_key` (e.g. `"2026-W25"`), `body`, `inputs_hash`,
`model`, `created_at`. Compound **unique** index `(pool_id, kind, period_key)` — cached per
period so the same week is generated once. `inputs_hash` captures the stats the prose was built
from, so a late-corrected result invalidates the cache and triggers regeneration on the next
read. See [integrations.md](integrations.md).

## Derived data

**Leaderboard** (and the weekly "profeta"/"corneteiro" hero + title awards, see
`services/leaderboard.py`) is computed on read: load a pool's predictions + the relevant final
matches, run `points_for` per prediction, sum per user, sort. If this gets hot, cache a
`standings` array on the Pool and refresh it when a result is posted.

**Narrative**, by contrast, *is* persisted rather than purely derived — it's an LLM output
that's expensive/slow to regenerate, so it's cached in its own collection with an explicit
invalidation key (`inputs_hash`) rather than recomputed on every read.

## Referencing

References are stored as ObjectId values (`PydanticObjectId`). Only `members` is embedded.
No multi-document transactions are needed for the MVP — posting a result rescans just that
match's predictions.
