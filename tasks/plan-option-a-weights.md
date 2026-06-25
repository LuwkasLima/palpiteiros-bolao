# Plan: Option A — Flatter round weight curve

**Goal:** Reduce the late-round scoring amplification by flattening the `ROUND_WEIGHT` curve,
targeting `release/2026-06-28`. Only QF, SF, Third, and Final change — rounds that have
not started yet — so there is zero retroactive impact on existing scores.

**New curve:**

| Round  | Current | New |
|--------|---------|-----|
| GROUP  | ×1      | ×1  |
| R32    | ×2      | ×2  |
| R16    | ×3      | ×3  |
| QF     | ×5      | ×4  |
| SF     | ×8      | ×5  |
| THIRD  | ×13     | ×6  |
| FINAL  | ×13     | ×6  |

**Key finding:** `round_weight` is stored on each match document in MongoDB AND derived
from `ROUND_WEIGHT` in `scoring.py`. The server-side leaderboard uses `scoring.py`
(authoritative). The serializer currently reads the stored field, so the API response
would diverge from actual scoring after this change. Fix: derive `round_weight` in the
serializer from `scoring.round_weight(match.stage)` — making `scoring.py` the single
source of truth for both leaderboard and frontend.

**Assumptions:**
- "Flatter" curve as defined above (QF=4, SF=5, Third=6, Final=6)
- No retroactive weight change for GROUP/R32/R16 (unchanged values)
- Frontend computes points client-side using `match.round_weight` from API — fixing the
  serializer is sufficient; no DB migration needed

**Risks:**
- If `seed.py` or any worker re-inserts matches, the stored `round_weight` will be stale
  but the serializer will override it correctly. Low risk.
- Tests that assert on specific weighted point values must be updated.

---

## Checklist

### Setup
- [x] Create branch `release/2026-06-28` off `main`

### Implementation
- [x] `apps/api/app/services/scoring.py` — update `ROUND_WEIGHT` (QF=4, SF=5, THIRD=6, FINAL=6)
- [x] `apps/api/app/serializers.py` — replace `match.round_weight` with `scoring.round_weight(match.stage)` in `match_to_out`

### Tests
- [x] `apps/api/tests/test_scoring.py` — update `test_points_for_applies_round_weight` (Final now ×6, not ×13)
- [x] `apps/api/tests/test_scoring.py` — update `test_late_round_can_overturn_group_lead` (swing assertion uses Final ×6)
- [x] Run full test suite — 21/21 passed

### Changelog & notifications
- [x] `apps/web/lib/changelog.ts` — added entry, bumped `LATEST_VERSION` to `2026-06-28`
- [x] `apps/web/lib/notifications.ts` — added `release-2026-06-28` notification entry

### Verification
- [x] Spot-checked all weights via `scoring.round_weight()` — correct values confirmed
- [x] Serializer now derives `round_weight` from `scoring.py` — single source of truth
- [x] GROUP/R32/R16 weights unchanged (×1/×2/×3)

---

## Results

All 5 files changed. 21 tests green. No retroactive impact: only QF, SF, Third, and Final
weights changed — rounds that had not yet started at implementation time.

Serializer fix included: `round_weight` in the API response is now always derived from
`scoring.py`, eliminating the previous dual-source inconsistency.
