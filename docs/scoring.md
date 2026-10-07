# Scoring System

The single source of truth for scoring logic is `apps/api/app/services/scoring.py`. All constants are tunable there; no other file owns scoring rules.

---

## Versioning

Scoring rules changed partway through the group stage. `SCORING_V2_SINCE` is a fixed cutover
timestamp (the kickoff of match #24, Uzbekistan v Colombia); every prediction is scored under
**V1** or **V2** depending on which side of that cutover its match's kickoff falls on. This
means V1 and V2 matches are interleaved within the group stage itself — the split is not "group
vs knockout."

| | V1 (kickoff before cutover) | V2 (kickoff at/after cutover) |
|---|---|---|
| Base tiers | 3: Exact / Margin / Outcome | 4: Exact / Near / Margin / Outcome |
| Clean-sheet bonus | Yes | No |
| Knockout-specific scoring refinements | No | Yes |

Round weight, the advancing-team bonus, and penalty-shootout scoring work the same way in both
versions — only the base-points tiering (and the clean-sheet bonus) differ.

---

## Round weight (every match)

Base points are multiplied by the weight of the round in which the match is played:

| Round | Weight |
|---|---|
| Group stage | ×1 |
| Round of 32 | ×2 |
| Round of 16 | ×3 |
| Quarter-finals | ×4 |
| Semi-finals | ×5 |
| Third-place play-off | ×6 |
| Final | ×6 |

This is the anti-runaway mechanic: a group-stage leader can never coast, because trailing
players can recover with a strong knockout run.

---

## V1 base points

| Tier | Points | Condition |
|---|---|---|
| Exact | 5 | Correct scoreline |
| Margin | 3 | Correct winner AND correct goal margin, but not exact |
| Outcome | 2 | Correct winner or draw, wrong margin |
| Miss | 0 | Wrong outcome |

Draws never reach the Margin tier — any non-exact draw scores Outcome (2 pts).

**Clean-sheet bonus (V1 only):** `+1 × round_weight` for each side correctly predicted to
score zero goals, provided the outcome was also correct (base points > 0). Up to two bonuses
per match (one per side).

| Prediction | Actual | Base pts | Clean-sheet hits | Total (group, ×1) |
|---|---|---|---|---|
| 1–0 | 2–0 | Outcome (2) | 1 (away) | 3 |
| 0–0 | 0–0 | Exact (5) | 2 (both) | 7 |
| 2–1 | 2–1 | Exact (5) | 0 | 5 |
| 0–1 | 1–0 | Miss (0) | 0 (wrong outcome) | 0 |

---

## V2 base points

| Tier | Points | Condition |
|---|---|---|
| Exact | 5 | Correct scoreline |
| Near | 4 | Wrong scoreline, but off by the smallest possible margin: total goal error (L1) = 1 for a win, or exactly 2 for a draw |
| Margin | 3 | Correct goal difference, but not exact or Near |
| Outcome | 2 | Correct winner/draw only |
| Miss | 0 | Wrong outcome |

No clean-sheet bonus in V2.

**Knockout refinements (V2 + knockout only).** Knockout matches additionally track an
*advancing-team pick*, independent of the scoreline, and use it (not the score direction) as
the "outcome" for draws predicted with a pick:

- **Flipped exact** (right numbers, wrong side — e.g. predicting 2–1 when the actual is 1–2)
  scores Margin instead of 0, since the magnitude was right even though the direction wasn't.
- A **wrong-direction** prediction still earns Outcome (capped there) if its total error is 1,
  or if it shares the same absolute goal margin as the actual result — otherwise it's a Miss.
- **Draws beyond Near** score Margin in knockout matches (vs. Outcome in the group stage),
  since knockout draws matter more and group-stage draws intentionally stay ungraded past Near
  to avoid retroactively changing already-scored group matches if this tier is ever tuned.

---

## Advancing-team bonus (knockout only, both versions)

For every match outside the group stage, players also pick which team advances. A correct pick
earns `+2 × round_weight`, independent of the scoreline prediction — you can miss the score but
still earn the bonus, and vice versa.

**Example — Quarter-final (weight ×4):**

| Scoreline pts | Advance bonus | Total |
|---|---|---|
| Exact (5 × 4 = 20) | Correct (+2 × 4 = 8) | 28 |
| Outcome (2 × 4 = 8) | Correct (+8) | 16 |
| Miss (0) | Correct (+8) | 8 |
| Exact (20) | Wrong (0) | 20 |

---

## Penalty shootout scoring (knockout only, when a shootout happens)

A separate penalty-score prediction is scored only when both the prediction and the match
record penalty scores. Two tiers only — penalty scores are too compressed for a Near/Margin
tier, and the advancing-team bonus already rewards knowing the winner:

| Tier | Points | Condition |
|---|---|---|
| Exact | 5 | Correct penalty score (a flipped exact also counts — penalty scores have no directional meaning) |
| Miss | 0 | Anything else |

Multiplied by a separate, smaller weight (`penalty_round_weight` — about half the round weight,
to keep penalties secondary to the regulation score):

| Round | Penalty weight |
|---|---|
| Round of 32 | ×1 |
| Round of 16 | ×1 |
| Quarter-finals | ×2 |
| Semi-finals | ×2 |
| Third-place play-off | ×3 |
| Final | ×3 |

---

## Maximum points per match

**V1 (clean-sheet bonus, no advancing/penalty bonus — group-only in practice):**
`(5 + 2×1) × round_weight = 7 × round_weight`. Group stage: **7**.

**V2 group stage** (no advance/penalty bonus): `5 × round_weight = 5` for group (×1).

**V2 knockout, no shootout:** `(5 + 2) × round_weight`.

| Round | Max pts |
|---|---|
| Round of 32 | 7 × 2 = **14** |
| Round of 16 | 7 × 3 = **21** |
| Quarter-finals | 7 × 4 = **28** |
| Semi-finals | 7 × 5 = **35** |
| Third-place / Final | 7 × 6 = **42** |

**V2 knockout, with a shootout:** add `5 × penalty_round_weight`.

| Round | Max pts (incl. shootout) |
|---|---|
| Round of 32 | 14 + 5×1 = **19** |
| Round of 16 | 21 + 5×1 = **26** |
| Quarter-finals | 28 + 5×2 = **38** |
| Semi-finals | 35 + 5×2 = **45** |
| Third-place / Final | 42 + 5×3 = **57** |
