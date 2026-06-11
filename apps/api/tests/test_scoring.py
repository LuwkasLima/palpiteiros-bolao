"""Unit tests for the scoring rules (pure — no database needed)."""

from __future__ import annotations

from types import SimpleNamespace

from beanie import PydanticObjectId

from app.models import MatchStatus, Stage
from app.services import scoring


def test_base_points_exact():
    assert scoring.base_points(2, 1, 2, 1) == scoring.POINTS_EXACT


def test_base_points_correct_margin_non_draw():
    # Predict home win by 1, actual home win by 1 (different scoreline) -> margin tier.
    assert scoring.base_points(2, 1, 3, 2) == scoring.POINTS_MARGIN


def test_base_points_correct_outcome_only():
    # Home win predicted (margin 2) and actual home win (margin 1) — right outcome, wrong margin.
    assert scoring.base_points(2, 0, 1, 0) == scoring.POINTS_OUTCOME


def test_base_points_non_exact_draw_is_outcome_only():
    # All draws share margin 0, so a non-exact draw is only the outcome tier, not margin.
    assert scoring.base_points(1, 1, 2, 2) == scoring.POINTS_OUTCOME


def test_base_points_wrong_outcome():
    assert scoring.base_points(2, 1, 0, 1) == 0


# points_for only reads attributes, so lightweight stand-ins keep these tests DB-free.
def _match(stage: Stage, home: int, away: int, advancing: PydanticObjectId | None = None):
    return SimpleNamespace(
        stage=stage,
        status=MatchStatus.FINAL,
        home_score=home,
        away_score=away,
        advancing_team_id=advancing,
    )


def _pred(home: int, away: int, advancing: PydanticObjectId | None = None):
    return SimpleNamespace(
        home_score=home,
        away_score=away,
        advancing_team_id=advancing,
    )


def test_points_for_applies_round_weight():
    # Exact prediction in a group game vs the final: final is worth far more.
    # Use a no-zero scoreline so the clean-sheet bonus doesn't mix in.
    group = scoring.points_for(_pred(2, 1), _match(Stage.GROUP, 2, 1))
    final = scoring.points_for(_pred(2, 1), _match(Stage.FINAL, 2, 1))
    assert group == scoring.POINTS_EXACT * 1
    assert final == scoring.POINTS_EXACT * 13
    assert final > group


def test_points_for_not_final_is_zero():
    m = _match(Stage.GROUP, 1, 0)
    m.status = MatchStatus.SCHEDULED
    assert scoring.points_for(_pred(1, 0), m) == 0


def test_points_for_advancing_bonus_knockout():
    team = PydanticObjectId()
    weight = scoring.round_weight(Stage.QF)
    m = _match(Stage.QF, 2, 1, advancing=team)
    # Correct exact score + correct advancing pick.
    pts = scoring.points_for(_pred(2, 1, advancing=team), m)
    assert pts == scoring.POINTS_EXACT * weight + scoring.ADVANCE_BONUS * weight


def test_points_for_advancing_bonus_only_when_correct():
    m = _match(Stage.QF, 2, 1, advancing=PydanticObjectId())
    pts = scoring.points_for(_pred(2, 1, advancing=PydanticObjectId()), m)
    assert pts == scoring.POINTS_EXACT * scoring.round_weight(Stage.QF)


def test_clean_sheet_both_sides():
    # Predicting 0-0, actual 0-0 — exact base + 2 clean-sheet bonuses.
    weight = scoring.round_weight(Stage.GROUP)
    pts = scoring.points_for(_pred(0, 0), _match(Stage.GROUP, 0, 0))
    expected = scoring.POINTS_EXACT * weight + 2 * scoring.POINTS_CLEAN_SHEET * weight
    assert pts == expected


def test_clean_sheet_away_only():
    # Predict 1-0, actual 2-0 — correct outcome but different margin, plus away clean sheet.
    weight = scoring.round_weight(Stage.GROUP)
    pts = scoring.points_for(_pred(1, 0), _match(Stage.GROUP, 2, 0))
    expected = scoring.POINTS_OUTCOME * weight + 1 * scoring.POINTS_CLEAN_SHEET * weight
    assert pts == expected


def test_clean_sheet_no_bonus_on_wrong_outcome():
    # Predicted 0-1 (away win), actual 1-0 (home win) — wrong outcome, no bonus despite 0s.
    pts = scoring.points_for(_pred(0, 1), _match(Stage.GROUP, 1, 0))
    assert pts == 0


def test_clean_sheet_scales_with_round_weight():
    # Same prediction earns more clean-sheet bonus points in the final than in the group stage.
    group_pts = scoring.points_for(_pred(1, 0), _match(Stage.GROUP, 1, 0))
    final_pts = scoring.points_for(_pred(1, 0), _match(Stage.FINAL, 1, 0))
    # Both earn 1 clean-sheet hit; final weight (13) > group weight (1).
    assert final_pts > group_pts


def test_late_round_can_overturn_group_lead():
    # A trails B by 20 points from the group stage. One exact-final prediction (65 pts)
    # is enough for A to overtake — the race stays alive to the end.
    final = _match(Stage.FINAL, 3, 1)
    a_gain = scoring.points_for(_pred(3, 1), final)  # exact
    b_gain = scoring.points_for(_pred(0, 0), final)  # wrong outcome -> 0
    assert a_gain - b_gain > 20
