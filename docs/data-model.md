# Data model

MongoDB collections, modeled as Beanie `Document` classes in `apps/api/app/models/`.
Indexes (incl. TTL and compound-unique) are declared in each model's `Settings`.

## Collections

### User
`email` (unique), `display_name`, `is_admin`, `created_at`.

### MagicLink
`email`, `token_hash`, `expires_at`, `consumed_at`. TTL index on `expires_at` purges expired
links. Single-use: `consumed_at` is set on verify.

### Session
`token_hash` (unique), `user_id`, `expires_at`. TTL index on `expires_at`. The session token
lives in an httpOnly cookie; deleting the doc revokes it.

### Team
`name`, `code`, `group_label`, `flag_emoji`.

### Match
`stage` (`group|r32|r16|qf|sf|third|final`), `round_weight`, `group_label?`,
`home_team_id?`, `away_team_id?`, `kickoff_at`, `status` (`scheduled|locked|final`),
`home_score?`, `away_score?`, `advancing_team_id?`. Knockout slots stay null until the
bracket resolves. Indexes on `kickoff_at`, `stage`.

### Pool
`name`, `creator_id`, `invite_code` (unique), `created_at`, and an **embedded** `members`
array of `Member` (`user_id`, `display_name`, `role` = `creator|member`, `joined_at`).
Membership is embedded because a friend pool is bounded — pool detail + members is one read.

### Prediction
`pool_id`, `user_id`, `match_id`, `home_score`, `away_score`, `advancing_team_id?`,
`updated_at`. Compound **unique** index `(pool_id, user_id, match_id)`. Secondary indexes
`(pool_id, user_id)` for "my predictions" and `(pool_id, match_id)` for scoring sweeps.
Writes are rejected once the match's `kickoff_at` has passed.

## Derived data

**Leaderboard** is computed on read: load a pool's predictions + the relevant final matches,
run `points_for` per prediction, sum per user, sort. If this gets hot, cache a `standings`
array on the Pool and refresh it when a result is posted.

## Referencing

References are stored as ObjectId values (`PydanticObjectId`). Only `members` is embedded.
No multi-document transactions are needed for the MVP — posting a result rescans just that
match's predictions.
