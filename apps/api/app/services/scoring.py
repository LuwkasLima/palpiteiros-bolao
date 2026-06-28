"""Scoring rules — the single source of truth for how points are awarded.

Design goal: keep the competition alive to the end. Base points reward how close a
prediction is (exact > near > correct margin > correct outcome). An *escalating round weight*
multiplies those points so later knockout rounds are worth far more than group games — a
group-stage leader can never coast, and trailing players can always catch up.

All tunable constants live here. Knockout matches are scored on the 90-minute regulation
score; a separate "advancing team" pick earns a small bonus so the bracket stays meaningful
even when the score is missed.

Scoring versions
----------------
V1 (kickoff_at < SCORING_V2_SINCE): goal-difference tier + per-side clean-sheet bonus.
  No Near tier; correct draws award Outcome points regardless of goal margin.
V2 (kickoff_at >= SCORING_V2_SINCE): 4-tier L1-distance system, no clean-sheet bonus.
  - Near tier: wins off by exactly 1 total goal (L1=1); draws off by exactly 1 per side (L1=2).
  - Margin tier (wins): correct goal difference but L1 > 1.
  - Margin tier (draws, knockout only): L1 ≥ 4. Group-stage draws beyond Near still earn Outcome.
  - Shape tier (knockout only): wrong outcome but same absolute goal difference → 1 pt.
    E.g. predict 2×1 (home), actual 1×2 (away): |+1|==|-1| → Shape. Group stage always 0.
  - Predicting 0 goals for a side earns no special bonus beyond the base tier.
"""

from __future__ import annotations

from datetime import datetime

from app.models import Match, MatchStatus, Prediction, Stage

# Base points (before the round-weight multiplier).
POINTS_EXACT = 5    # exact scoreline
POINTS_NEAR = 4     # closest possible non-exact (V2 only): L1=1 for wins, L1=2 for draws
POINTS_MARGIN = 3   # correct goal difference, wins only (both V1 and V2)
POINTS_OUTCOME = 2  # correct outcome only
POINTS_SHAPE = 1    # knockout only: wrong outcome but same absolute goal difference
ADVANCE_BONUS = 2   # knockout only: correct "who advances" pick

# Escalating per-round weight — the anti-runaway mechanic.
ROUND_WEIGHT: dict[Stage, int] = {
    Stage.GROUP: 1,
    Stage.R32: 2,
    Stage.R16: 3,
    Stage.QF: 4,
    Stage.SF: 5,
    Stage.THIRD: 6,
    Stage.FINAL: 6,
}

# Matches that kick off at or after Uzbekistan vs Colombia (G-K-1-UZBCOL) use V2 rules.
# Naive UTC — matches how kickoff_at is stored and retrieved from MongoDB.
SCORING_V2_SINCE = datetime(2026, 6, 18, 2, 0)


def round_weight(stage: Stage) -> int:
    return ROUND_WEIGHT[stage]


def _outcome(home: int, away: int) -> str:
    if home > away:
        return "home"
    if home < away:
        return "away"
    return "draw"


# ---------------------------------------------------------------------------
# V1 internals (pre-cutover matches only)
# ---------------------------------------------------------------------------

def _clean_sheet_hits_v1(pred_home: int, pred_away: int, act_home: int, act_away: int) -> int:
    return (pred_home == 0 and act_home == 0) + (pred_away == 0 and act_away == 0)


def _base_points_v1(pred_home: int, pred_away: int, act_home: int, act_away: int) -> int:
    if pred_home == act_home and pred_away == act_away:
        return POINTS_EXACT
    pred_out = _outcome(pred_home, pred_away)
    act_out = _outcome(act_home, act_away)
    if pred_out != act_out:
        return 0
    if act_out == "draw":
        return POINTS_OUTCOME
    if (pred_home - pred_away) == (act_home - act_away):
        return POINTS_MARGIN
    return POINTS_OUTCOME


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def base_points(
    pred_home: int,
    pred_away: int,
    act_home: int,
    act_away: int,
    kickoff_at: datetime | None = None,
    is_knockout: bool = False,
) -> int:
    """Points for a single prediction vs an actual scoreline, before round weighting.

    Pass kickoff_at to get version-correct results; omitting it applies V2 rules.
    Pass is_knockout=True for knockout matches to enable the draw Margin tier (L1 ≥ 4 → 3 pts
    instead of 2 pts). Group-stage draws beyond Near always earn Outcome to avoid retroactive
    changes to already-scored group matches.
    """
    if kickoff_at is not None and kickoff_at < SCORING_V2_SINCE:
        return _base_points_v1(pred_home, pred_away, act_home, act_away)

    # V2: 4-tier system.
    if pred_home == act_home and pred_away == act_away:
        return POINTS_EXACT
    pred_out = _outcome(pred_home, pred_away)
    act_out = _outcome(act_home, act_away)
    if pred_out != act_out:
        if is_knockout and abs(pred_home - pred_away) == abs(act_home - act_away):
            return POINTS_SHAPE
        return 0
    total_error = abs(pred_home - act_home) + abs(pred_away - act_away)
    if act_out == "draw":
        # L1=2 is the minimum non-exact draw error — same "near" concept as L1=1 for wins.
        # Beyond Near: knockout draws earn Margin (draws are harder to call); group stays Outcome.
        if total_error == 2:
            return POINTS_NEAR
        return POINTS_MARGIN if is_knockout else POINTS_OUTCOME
    # Non-draw wins:
    if total_error == 1:
        return POINTS_NEAR
    if (pred_home - pred_away) == (act_home - act_away):
        return POINTS_MARGIN
    return POINTS_OUTCOME


def penalty_base_points(pred_home: int, pred_away: int, act_home: int, act_away: int) -> int:
    """Flat points for a penalty shootout prediction (no round-weight multiplier).

    Tiers: Exact(5) / Margin(3, L1=1) / Miss(0).
    No Near tier — penalty scores are too compressed.
    No Outcome tier — the advancing-team pick already rewards knowing the winner.
    """
    if pred_home == act_home and pred_away == act_away:
        return POINTS_EXACT
    if abs(pred_home - act_home) + abs(pred_away - act_away) == 1:
        return POINTS_MARGIN
    return 0


def points_for(prediction: Prediction, match: Match) -> int:
    """Total points a prediction earns for a finished match (0 if not yet final)."""
    if match.status != MatchStatus.FINAL or match.home_score is None or match.away_score is None:
        return 0

    weight = round_weight(match.stage)
    is_v2 = match.kickoff_at >= SCORING_V2_SINCE

    is_knockout = match.stage is not Stage.GROUP
    points = base_points(
        prediction.home_score,
        prediction.away_score,
        match.home_score,
        match.away_score,
        match.kickoff_at,
        is_knockout=is_knockout,
    ) * weight

    if not is_v2 and points > 0:
        points += _clean_sheet_hits_v1(
            prediction.home_score,
            prediction.away_score,
            match.home_score,
            match.away_score,
        ) * weight

    if (
        is_knockout
        and prediction.advancing_team_id is not None
        and match.advancing_team_id is not None
        and prediction.advancing_team_id == match.advancing_team_id
    ):
        points += ADVANCE_BONUS * weight

    if (
        is_knockout
        and prediction.penalty_home_score is not None
        and prediction.penalty_away_score is not None
        and match.penalty_home_score is not None
        and match.penalty_away_score is not None
    ):
        points += penalty_base_points(
            prediction.penalty_home_score,
            prediction.penalty_away_score,
            match.penalty_home_score,
            match.penalty_away_score,
        )

    return points
