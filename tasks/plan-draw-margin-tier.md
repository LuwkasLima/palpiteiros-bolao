# Plan: Draw predictions earn Margin tier instead of Outcome

**Goal:** When a user correctly predicts a draw and the actual result is also a draw, any
prediction with L1 ≥ 4 currently earns Outcome (2 pts). This plan changes that floor to
Margin (3 pts), making the draw tier ladder Exact / Near / Margin instead of
Exact / Near / Outcome.

**Why:** Draws are harder to call than wins (three possible outcomes). Correct draw
predictions that fall outside Near should still earn more than a correct win/loss prediction
with a wrong margin — the current Outcome tier conflates both cases.

**Trade-off accepted:** Once past the Near tier (L1 ≥ 4), all correct draw predictions earn
the same Margin points regardless of how far off the specific goals are. A predicted 5×5 vs
actual 0×0 scores the same as 2×2 vs 0×0. There is no incentive to guess draw goals
accurately beyond the Near threshold.

**Scope:** Backend only. No API, contract, or UI changes needed.

---

## Checklist

### Implementation
- [ ] `apps/api/app/services/scoring.py` — in `base_points()` V2 path, change draw fallback:
  ```python
  # before
  return POINTS_NEAR if total_error == 2 else POINTS_OUTCOME
  # after
  return POINTS_NEAR if total_error == 2 else POINTS_MARGIN
  ```
- [ ] `apps/api/app/services/scoring.py` — update module docstring V2 section to reflect
  the three-tier draw ladder (Exact / Near / Margin)

### Tests
- [ ] `apps/api/tests/test_scoring.py` — rename `test_base_points_outcome_draws_when_far`
  to `test_base_points_margin_draws_when_far` and update assertions:
  ```python
  assert scoring.base_points(0, 0, 2, 2) == scoring.POINTS_MARGIN
  assert scoring.base_points(3, 3, 1, 1) == scoring.POINTS_MARGIN
  ```
- [ ] Run full test suite — confirm all pass

### Verification
- [ ] Spot-check: predict 1×1, actual 1×1 → Exact (5) ✓
- [ ] Spot-check: predict 0×0, actual 1×1 → Near (4, L1=2) ✓
- [ ] Spot-check: predict 2×2, actual 0×0 → Margin (3, L1=4) ← changed
- [ ] Spot-check: predict 3×3, actual 0×0 → Margin (3, L1=6) ← changed
- [ ] Spot-check: predict 2×1, actual 0×0 → 0 (wrong outcome, unchanged) ✓
