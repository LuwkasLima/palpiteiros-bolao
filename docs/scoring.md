# Scoring System

The single source of truth for scoring logic is `apps/api/app/services/scoring.py`. All constants are tunable there; no other file owns scoring rules.

---

## How a prediction is scored

Every prediction is evaluated against the final regulation scoreline in two steps:

1. **Base points** — how accurate was the scoreline?
2. **Multiplied by the round weight** — later rounds are worth far more.

Optional bonuses are then added on top.

---

## Step 1 — Base points

| Tier | Points | Condition |
|---|---|---|
| Exact | 5 | Correct scoreline |
| Margin | 3 | Correct winner AND correct goal margin, but not exact |
| Outcome | 2 | Correct winner or draw, wrong margin |
| Miss | 0 | Wrong outcome |

**Draws** never reach the Margin tier — all draws share a margin of zero, so any non-exact draw scores Outcome (2 pts).

### Examples

| Prediction | Actual | Tier | Base pts |
|---|---|---|---|
| 2–1 | 2–1 | Exact | 5 |
| 3–1 | 2–0 | Margin (both +2) | 3 |
| 2–0 | 1–0 | Outcome (home win, different margin) | 2 |
| 1–1 | 2–2 | Outcome (non-exact draw) | 2 |
| 1–0 | 0–1 | Miss | 0 |

---

## Step 2 — Round weight multiplier

Base points are multiplied by the weight of the round in which the match is played:

| Round | Weight |
|---|---|
| Group stage | ×1 |
| Round of 32 | ×2 |
| Round of 16 | ×3 |
| Quarter-finals | ×5 |
| Semi-finals | ×8 |
| Third-place play-off | ×13 |
| Final | ×13 |

**Example — same prediction, different rounds:**

> Prediction: 2–1. Actual: 2–1 (Exact, 5 base pts).

| Round | Calculation | Points |
|---|---|---|
| Group stage | 5 × 1 | 5 |
| Quarter-final | 5 × 5 | 25 |
| Final | 5 × 13 | 65 |

This is the anti-runaway mechanic: a group-stage leader can never coast, because trailing players can recover with a strong knockout run.

---

## Bonuses

### Knockout advance bonus

For every match outside the group stage, players also pick which team advances. A correct pick earns `+2 × round_weight` on top of the score points.

The bonus is independent of the scoreline prediction — you can miss the score but still earn the advance bonus, and vice versa.

**Example — Quarter-final (weight ×5):**

| Scoreline pts | Advance bonus | Total |
|---|---|---|
| Exact (5 × 5 = 25) | Correct (+2 × 5 = 10) | 35 |
| Outcome (2 × 5 = 10) | Correct (+10) | 20 |
| Miss (0) | Correct (+10) | 10 |
| Exact (25) | Wrong (0) | 25 |

### Clean-sheet bonus

A player earns `+1 × round_weight` for each side they correctly predicted would score zero goals, provided the outcome of the match was also correct (i.e. base points > 0). Up to two bonuses per match (one per side).

**Examples — Group stage (weight ×1):**

| Prediction | Actual | Base pts | Clean-sheet hits | Total |
|---|---|---|---|---|
| 1–0 | 2–0 | Outcome (2) | 1 (away) | 3 |
| 0–0 | 0–0 | Exact (5) | 2 (both) | 7 |
| 2–1 | 2–1 | Exact (5) | 0 | 5 |
| 0–1 | 1–0 | Miss (0) | 0 (wrong outcome) | 0 |

**Same prediction in the Final (weight ×13):**

> Prediction: 0–0. Actual: 0–0.

`5 × 13 (exact) + 2 × 1 × 13 (two clean sheets) = 65 + 26 = 91 pts`

---

## Maximum points per match

The theoretical maximum for any single match is: `(POINTS_EXACT + 2 × POINTS_CLEAN_SHEET + ADVANCE_BONUS) × round_weight`.

| Round | Max pts |
|---|---|
| Group stage | (5 + 2 + –) × 1 = **7** |
| Quarter-final | (5 + 2 + 2) × 5 = **45** |
| Final | (5 + 2 + 2) × 13 = **117** |

_(Group stage has no advance bonus.)_
