"""Scoring rules — the single source of truth for how points are awarded.

Design goal: keep the competition alive to the end. Base points reward how close a
prediction is (exact > correct margin > correct outcome). An *escalating round weight*
multiplies those points so later knockout rounds are worth far more than group games — a
group-stage leader can never coast, and trailing players can always catch up.

All tunable constants live here. Knockout matches are scored on the 90-minute regulation
score; a separate "advancing team" pick earns a small bonus so the bracket stays meaningful
even when the score is missed.
"""

from __future__ import annotations

from app.models import Match, MatchStatus, Prediction, Stage

# Base points (before the round-weight multiplier).
POINTS_EXACT = 5  # exact scoreline
POINTS_MARGIN = 3  # correct winner AND correct goal margin (non-draws), but not exact
POINTS_OUTCOME = 2  # correct outcome only (incl. any non-exact draw)
ADVANCE_BONUS = 2  # knockout only: correct "who advances" pick
POINTS_CLEAN_SHEET = 1  # per side: predicted 0 goals and the team actually scored 0

# Escalating per-round weight — the anti-runaway mechanic.
ROUND_WEIGHT: dict[Stage, int] = {
    Stage.GROUP: 1,
    Stage.R32: 2,
    Stage.R16: 3,
    Stage.QF: 5,
    Stage.SF: 8,
    Stage.THIRD: 13,
    Stage.FINAL: 13,
}


def round_weight(stage: Stage) -> int:
    return ROUND_WEIGHT[stage]


def _outcome(home: int, away: int) -> str:
    if home > away:
        return "home"
    if home < away:
        return "away"
    return "draw"


def _clean_sheet_hits(pred_home: int, pred_away: int, act_home: int, act_away: int) -> int:
    """Number of sides where the player correctly predicted a clean sheet (0 or 1 or 2)."""
    return (pred_home == 0 and act_home == 0) + (pred_away == 0 and act_away == 0)


def base_points(pred_home: int, pred_away: int, act_home: int, act_away: int) -> int:
    """Points for a single prediction vs an actual scoreline, before round weighting."""
    if pred_home == act_home and pred_away == act_away:
        return POINTS_EXACT

    pred_out = _outcome(pred_home, pred_away)
    act_out = _outcome(act_home, act_away)
    if pred_out != act_out:
        return 0

    # Same outcome, not exact.
    if act_out == "draw":
        # Any non-exact draw is "outcome only" — goal margin is trivially 0 for all draws.
        return POINTS_OUTCOME
    if (pred_home - pred_away) == (act_home - act_away):
        return POINTS_MARGIN
    return POINTS_OUTCOME


def points_for(prediction: Prediction, match: Match) -> int:
    """Total points a prediction earns for a finished match (0 if not yet final)."""
    if match.status != MatchStatus.FINAL or match.home_score is None or match.away_score is None:
        return 0

    weight = round_weight(match.stage)
    points = base_points(
        prediction.home_score,
        prediction.away_score,
        match.home_score,
        match.away_score,
    ) * weight

    if points > 0:
        points += _clean_sheet_hits(
            prediction.home_score,
            prediction.away_score,
            match.home_score,
            match.away_score,
        ) * weight

    if (
        match.stage is not Stage.GROUP
        and prediction.advancing_team_id is not None
        and match.advancing_team_id is not None
        and prediction.advancing_team_id == match.advancing_team_id
    ):
        points += ADVANCE_BONUS * weight

    return points
