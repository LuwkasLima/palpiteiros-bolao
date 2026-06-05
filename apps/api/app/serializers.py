"""Helpers that turn Beanie documents into API response models."""

from __future__ import annotations

from datetime import datetime, timezone

from app.models import Match, MatchStatus
from app.schemas import MatchOut


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def is_match_locked(match: Match, now: datetime | None = None) -> bool:
    """A match locks at kickoff (or once a result is in)."""
    if match.status is not MatchStatus.SCHEDULED:
        return True
    now = now or datetime.now(timezone.utc)
    return _as_utc(match.kickoff_at) <= now


def match_to_out(match: Match, now: datetime | None = None) -> MatchOut:
    return MatchOut(
        id=str(match.id),
        key=match.key,
        stage=match.stage,
        round_weight=match.round_weight,
        group_label=match.group_label,
        slot_label=match.slot_label,
        home_team_id=str(match.home_team_id) if match.home_team_id else None,
        away_team_id=str(match.away_team_id) if match.away_team_id else None,
        kickoff_at=match.kickoff_at,
        status=match.status,
        home_score=match.home_score,
        away_score=match.away_score,
        advancing_team_id=str(match.advancing_team_id) if match.advancing_team_id else None,
        is_locked=is_match_locked(match, now),
    )
