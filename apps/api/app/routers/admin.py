"""Admin-only endpoints: enter final results and view platform stats.

Setting a result marks the match ``final``; leaderboards are computed on read, so they
reflect the new result immediately. Admin access is gated by the email allowlist (see
``deps.require_admin`` / ``ADMIN_EMAILS``).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from beanie.operators import Or
from fastapi import APIRouter, HTTPException, status

from app.deps import AdminUser
from app.models import Match, MatchStatus, Pool, Prediction, Stage, User
from app.schemas import AdminStatsOut, MatchOut, MatchStatusCountsOut, ResultIn
from app.serializers import match_to_out
from app.services.access import parse_object_id

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStatsOut)
async def get_stats(_: AdminUser) -> AdminStatsOut:
    total_users = await User.count()

    onboarded_users = await User.find(
        Or(User.onboarding_done == True, User.onboarding_done == None)  # noqa: E711,E712
    ).count()

    since = datetime.now(timezone.utc) - timedelta(days=7)
    active_users = await User.find(User.last_seen_at >= since).count()

    total_pools = await Pool.count()

    avg_result = await Pool.aggregate(
        [{"$group": {"_id": None, "avg": {"$avg": {"$size": "$members"}}}}]
    ).to_list()
    avg_pool_size = round(avg_result[0]["avg"], 1) if avg_result else 0.0

    total_predictions = await Prediction.count()

    stage_pipeline = [
        {
            "$lookup": {
                "from": "matches",
                "localField": "match_id",
                "foreignField": "_id",
                "as": "match",
            }
        },
        {"$unwind": "$match"},
        {"$group": {"_id": "$match.stage", "count": {"$sum": 1}}},
    ]
    stage_results = await Prediction.aggregate(stage_pipeline).to_list()
    predictions_by_stage = {r["_id"]: r["count"] for r in stage_results}

    match_counts = MatchStatusCountsOut(
        scheduled=await Match.find(Match.status == MatchStatus.SCHEDULED).count(),
        locked=await Match.find(Match.status == MatchStatus.LOCKED).count(),
        final=await Match.find(Match.status == MatchStatus.FINAL).count(),
    )

    return AdminStatsOut(
        total_users=total_users,
        onboarded_users=onboarded_users,
        active_users=active_users,
        total_pools=total_pools,
        avg_pool_size=avg_pool_size,
        total_predictions=total_predictions,
        predictions_by_stage=predictions_by_stage,
        match_counts=match_counts,
    )


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
