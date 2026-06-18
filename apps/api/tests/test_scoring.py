"""Unit tests for the scoring rules (pure — no database needed)."""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

from beanie import PydanticObjectId

from app.models import MatchStatus, Stage
from app.services import scoring

# Convenience datetimes for cutover tests — anchored to the Uzbekistan vs Colombia match.
# Naive UTC — matches how kickoff_at is stored and retrieved from MongoDB.
_V1_KICKOFF = datetime(2026, 6, 18, 1, 0)   # before UZB-COL → V1 rules
_V2_KICKOFF = datetime(2026, 6, 18, 2, 0)   # UZB-COL kickoff → V2 rules


# ---------------------------------------------------------------------------
# base_points — V2 (default, no kickoff_at)
# ---------------------------------------------------------------------------

def test_base_points_exact():
    assert scoring.base_points(2, 1, 2, 1) == scoring.POINTS_EXACT


def test_base_points_near_wins():
    # L1=1 (one side exact, other off by 1) → POINTS_NEAR for wins.
    assert scoring.base_points(1, 0, 2, 0) == scoring.POINTS_NEAR  # away exact, home -1
    assert scoring.base_points(3, 0, 2, 0) == scoring.POINTS_NEAR  # away exact, home +1
    assert scoring.base_points(2, 1, 2, 0) == scoring.POINTS_NEAR  # home exact, away +1
    assert scoring.base_points(2, 1, 3, 1) == scoring.POINTS_NEAR  # away exact, home +1


def test_base_points_margin_wins():
    # Correct goal difference but L1 > 1 → POINTS_MARGIN for wins.
    assert scoring.base_points(2, 0, 3, 1) == scoring.POINTS_MARGIN  # diff +2 = +2, L1=2
    assert scoring.base_points(4, 2, 3, 1) == scoring.POINTS_MARGIN  # diff +2 = +2, L1=2
    assert scoring.base_points(2, 1, 3, 2) == scoring.POINTS_MARGIN  # diff +1 = +1, L1=2


def test_base_points_outcome_wins():
    # Correct outcome, wrong diff, L1 > 1 → POINTS_OUTCOME.
    assert scoring.base_points(3, 0, 1, 0) == scoring.POINTS_OUTCOME  # diff +3 ≠ +1, L1=2
    assert scoring.base_points(4, 0, 1, 0) == scoring.POINTS_OUTCOME  # diff +4 ≠ +1, L1=3


def test_base_points_near_draws():
    # L1=2 is the minimum non-exact draw error → POINTS_NEAR.
    assert scoring.base_points(0, 0, 1, 1) == scoring.POINTS_NEAR
    assert scoring.base_points(2, 2, 1, 1) == scoring.POINTS_NEAR


def test_base_points_outcome_draws_when_far():
    # L1 > 2 for draws → POINTS_OUTCOME.
    assert scoring.base_points(0, 0, 2, 2) == scoring.POINTS_OUTCOME
    assert scoring.base_points(3, 3, 1, 1) == scoring.POINTS_OUTCOME


def test_base_points_wrong_outcome():
    assert scoring.base_points(2, 1, 0, 1) == 0
    assert scoring.base_points(0, 0, 1, 0) == 0  # draw vs home win


# ---------------------------------------------------------------------------
# points_for — weight, bonuses, status
# ---------------------------------------------------------------------------

# kickoff_at defaults to V2 so existing tests exercise the new rules without extra args.
def _match(stage: Stage, home: int, away: int, advancing: PydanticObjectId | None = None,
           kickoff_at: datetime = _V2_KICKOFF):
    return SimpleNamespace(
        stage=stage,
        status=MatchStatus.FINAL,
        home_score=home,
        away_score=away,
        advancing_team_id=advancing,
        kickoff_at=kickoff_at,
    )


def _pred(home: int, away: int, advancing: PydanticObjectId | None = None):
    return SimpleNamespace(
        home_score=home,
        away_score=away,
        advancing_team_id=advancing,
    )


def test_points_for_applies_round_weight():
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
    pts = scoring.points_for(_pred(2, 1, advancing=team), m)
    assert pts == scoring.POINTS_EXACT * weight + scoring.ADVANCE_BONUS * weight


def test_points_for_advancing_bonus_only_when_correct():
    m = _match(Stage.QF, 2, 1, advancing=PydanticObjectId())
    pts = scoring.points_for(_pred(2, 1, advancing=PydanticObjectId()), m)
    assert pts == scoring.POINTS_EXACT * scoring.round_weight(Stage.QF)


def test_exact_with_zero_scores():
    # 0-0 exact earns POINTS_EXACT — no bonus for zeros in V2.
    weight = scoring.round_weight(Stage.GROUP)
    pts = scoring.points_for(_pred(0, 0), _match(Stage.GROUP, 0, 0))
    assert pts == scoring.POINTS_EXACT * weight


def test_near_with_zero_score():
    # Predict 3-0, actual 2-0: L1=1 → POINTS_NEAR, no extra bonus for the zero.
    weight = scoring.round_weight(Stage.GROUP)
    pts = scoring.points_for(_pred(3, 0), _match(Stage.GROUP, 2, 0))
    assert pts == scoring.POINTS_NEAR * weight


# ---------------------------------------------------------------------------
# V1 rules (pre-cutover)
# ---------------------------------------------------------------------------

def test_v1_base_points_goal_difference_tier():
    # Pre-cutover: same goal difference earns margin tier (old rule).
    assert scoring.base_points(2, 1, 3, 2, _V1_KICKOFF) == scoring.POINTS_MARGIN
    # Pre-cutover: L1=1 earns only outcome tier (no POINTS_NEAR in V1).
    assert scoring.base_points(2, 1, 3, 1, _V1_KICKOFF) == scoring.POINTS_OUTCOME


def test_v1_base_points_non_exact_draw_is_outcome():
    # Pre-cutover: any non-exact draw is outcome only.
    assert scoring.base_points(0, 0, 1, 1, _V1_KICKOFF) == scoring.POINTS_OUTCOME
    assert scoring.base_points(2, 2, 1, 1, _V1_KICKOFF) == scoring.POINTS_OUTCOME


def test_v1_clean_sheet_bonus_applied():
    weight = scoring.round_weight(Stage.GROUP)
    pts = scoring.points_for(_pred(0, 0), _match(Stage.GROUP, 0, 0, kickoff_at=_V1_KICKOFF))
    assert pts == (scoring.POINTS_EXACT + 2) * weight  # exact + 2 clean sheets


def test_v2_no_clean_sheet_bonus():
    weight = scoring.round_weight(Stage.GROUP)
    pts = scoring.points_for(_pred(0, 0), _match(Stage.GROUP, 0, 0, kickoff_at=_V2_KICKOFF))
    assert pts == scoring.POINTS_EXACT * weight


# ---------------------------------------------------------------------------
# Cutover boundary — V1 vs V2 differences
# ---------------------------------------------------------------------------

def test_cutover_near_tier_is_v2_only():
    # L1=1 win: V1 gives OUTCOME (no near tier), V2 gives POINTS_NEAR.
    assert scoring.base_points(2, 1, 3, 1, _V1_KICKOFF) == scoring.POINTS_OUTCOME
    assert scoring.base_points(2, 1, 3, 1, _V2_KICKOFF) == scoring.POINTS_NEAR


def test_cutover_goal_diff_match_earns_margin_in_both():
    # Same goal diff: both V1 and V2 award POINTS_MARGIN.
    assert scoring.base_points(2, 0, 3, 1, _V1_KICKOFF) == scoring.POINTS_MARGIN
    assert scoring.base_points(2, 0, 3, 1, _V2_KICKOFF) == scoring.POINTS_MARGIN


def test_cutover_near_draws_is_v2_only():
    # L1=2 draw (minimum non-exact): V1 gives OUTCOME, V2 gives POINTS_NEAR.
    weight = scoring.round_weight(Stage.GROUP)
    v1 = scoring.points_for(_pred(0, 0), _match(Stage.GROUP, 1, 1, kickoff_at=_V1_KICKOFF))
    v2 = scoring.points_for(_pred(0, 0), _match(Stage.GROUP, 1, 1, kickoff_at=_V2_KICKOFF))
    assert v1 == scoring.POINTS_OUTCOME * weight
    assert v2 == scoring.POINTS_NEAR * weight


def test_late_round_can_overturn_group_lead():
    final = _match(Stage.FINAL, 3, 1)
    a_gain = scoring.points_for(_pred(3, 1), final)   # exact
    b_gain = scoring.points_for(_pred(0, 0), final)   # wrong outcome -> 0
    assert a_gain - b_gain > 20
