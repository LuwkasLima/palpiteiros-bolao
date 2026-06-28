# Plan: Wrong-outcome predictions with correct absolute margin earn Shape points

**Goal:** When a user predicts the wrong winner but the absolute goal difference matches
the actual result, they currently score 0. This plan awards a new `POINTS_SHAPE` tier
(1 pt) in that case, so a player who nailed the "shape" of the match (e.g. predicted 2×1
home and got 1×2 away — same 1-goal margin, wrong team) earns something.

**Motivation:** Makes the game more competitive for less experienced players who may
predict the right margin without knowing which team is stronger. The advance pick (2A) and
the score tiers for correct outcomes remain more valuable — this is a floor, not a reward.

**Definition:** Absolute margin match = `abs(pred_home - pred_away) == abs(act_home - act_away)`.
  - Predict 2×1 (home, +1), actual 1×2 (away, −1): |+1| == |−1| ✓ → Shape (1 pt)
  - Predict 1×0 (home, +1), actual 0×1 (away, −1): |+1| == |−1| ✓ → Shape (1 pt)
  - Predict 2×0 (home, +2), actual 1×2 (away, −1): |+2| ≠ |−1| ✗ → 0 pts

**Draw interactions:** A draw prediction (0 diff) vs an actual win (nonzero diff) never
matches, and vice versa. Draw vs draw is already handled by the correct-outcome path. No
new edge cases introduced for draws.

**Full tier ladder after this change:**
Exact (5) > Near (4) > Margin (3) > Outcome (2) > Shape (1) > Miss (0)

**Scope:** Backend only (`apps/api/app/services/scoring.py` + tests). No API, contract,
or UI changes needed — the points show up automatically in the existing pts display.

**Open question — apply universally or knockout-only?**
The plan implements this rule for all stages. If you prefer to limit it to knockout matches
(where the advancing team is the meaningful outcome), add a stage guard in `points_for()`
instead of `base_points()`. Decide before implementing.

---

## Checklist

### Implementation — `apps/api/app/services/scoring.py`

- [ ] Add constant below the existing tier constants:
  ```python
  POINTS_SHAPE = 1    # correct absolute margin, wrong outcome
  ```

- [ ] In `base_points()` V2 path, replace the early-return `0` for wrong outcomes:
  ```python
  # before
  if pred_out != act_out:
      return 0

  # after
  if pred_out != act_out:
      if abs(pred_home - pred_away) == abs(act_home - act_away):
          return POINTS_SHAPE
      return 0
  ```
  This block sits between the Exact check and the L1 error calculation, so it only fires
  when outcomes differ. Correct-outcome logic is untouched.

- [ ] Apply the same change in `_base_points_v1()` for consistency (V1 matches are final
  already, so this has no live impact but keeps the logic coherent):
  ```python
  if pred_out != act_out:
      if abs(pred_home - pred_away) == abs(act_home - act_away):
          return POINTS_SHAPE
      return 0
  ```

- [ ] Update module docstring to document the new tier and the wrong-outcome condition.

### Tests — `apps/api/tests/test_scoring.py`

- [ ] Update `test_base_points_wrong_outcome` — the 2×1 vs 0×1 case now returns 0
  (diff mismatch), but add the new Shape cases:
  ```python
  # still 0 — diff mismatch
  assert scoring.base_points(2, 1, 0, 1) == 0   # pred diff +1, act diff -1... wait
  ```
  Actually 2×1 (diff +1) vs 0×1 (diff -1): |+1| == |-1| ✓ → this NOW returns POINTS_SHAPE.
  Update the test to expect POINTS_SHAPE, not 0.

- [ ] Add `test_base_points_shape_wrong_outcome`:
  ```python
  def test_base_points_shape_wrong_outcome():
      # Wrong outcome, same absolute margin → POINTS_SHAPE
      assert scoring.base_points(2, 1, 1, 2) == scoring.POINTS_SHAPE  # pred +1, act -1
      assert scoring.base_points(1, 0, 0, 1) == scoring.POINTS_SHAPE  # pred +1, act -1
      assert scoring.base_points(3, 1, 1, 3) == scoring.POINTS_SHAPE  # pred +2, act -2

      # Wrong outcome, different absolute margin → 0
      assert scoring.base_points(2, 0, 0, 1) == 0  # pred +2, act -1
      assert scoring.base_points(3, 0, 1, 2) == 0  # pred +3, act -1

      # Draw prediction vs win result → 0 (diff 0 ≠ nonzero)
      assert scoring.base_points(1, 1, 2, 0) == 0
  ```

- [ ] Run full test suite — confirm all pass

### Verification
- [ ] QF match (×4): predict 2×1 home, actual 1×2 away → 1×4 = 4 pts
- [ ] Confirm existing correct-outcome cases are unaffected (run test suite)
- [ ] Confirm 0×0 draw vs 1×0 win → 0 pts (diff 0 ≠ 1)
