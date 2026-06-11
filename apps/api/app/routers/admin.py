"""Admin-only endpoints: enter final results.

Setting a result marks the match ``final``; leaderboards are computed on read, so they
reflect the new result immediately. Admin access is gated by the email allowlist (see
``deps.require_admin`` / ``ADMIN_EMAILS``).
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.deps import AdminUser
from app.models import Match, MatchStatus, Stage
from app.schemas import MatchOut, ResultIn
from app.serializers import match_to_out
from app.services.access import parse_object_id

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/matches/{match_id}/result", response_model=MatchOut)
async def set_result(match_id: str, payload: ResultIn, _: AdminUser) -> MatchOut:
    match = await Match.get(parse_object_id(match_id, not_found="Match not found"))
    if match is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Match not found")

    advancing_id = None
    if match.stage is not Stage.GROUP:
        if not payload.advancing_team_id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Knockout results need an advancing team"
            )
        advancing_id = parse_object_id(
            payload.advancing_team_id, not_found="Unknown advancing team"
        )
        if advancing_id not in (match.home_team_id, match.away_team_id):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Advancing team must be one of the two playing"
            )

    match.home_score = payload.home_score
    match.away_score = payload.away_score
    match.advancing_team_id = advancing_id
    match.status = MatchStatus.FINAL
    await match.save()
    return match_to_out(match)


@router.delete("/matches/{match_id}/result", response_model=MatchOut)
async def clear_result(match_id: str, _: AdminUser) -> MatchOut:
    match = await Match.get(parse_object_id(match_id, not_found="Match not found"))
    if match is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Match not found")
    if match.status is not MatchStatus.FINAL:
        raise HTTPException(status.HTTP_409_CONFLICT, "Match result is not final")

    now = datetime.now(timezone.utc)
    kickoff = match.kickoff_at if match.kickoff_at.tzinfo else match.kickoff_at.replace(tzinfo=timezone.utc)
    match.status = MatchStatus.LOCKED if kickoff <= now else MatchStatus.SCHEDULED
    match.home_score = None
    match.away_score = None
    match.advancing_team_id = None
    await match.save()
    return match_to_out(match)
