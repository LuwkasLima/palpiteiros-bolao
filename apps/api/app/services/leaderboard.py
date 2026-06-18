"""Leaderboard computation for a pool.

Computed on read: load the pool's predictions and the finished matches, then sum points
per user via the scoring rules. Pools are friend-sized, so this is cheap; if it ever gets
hot we can cache a ``standings`` array on the Pool and refresh it on result entry.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from beanie import PydanticObjectId

from app.models import Match, MatchStatus, Pool, Prediction
from app.schemas import LeaderboardRowOut, WeeklyHeroOut
from app.services.scoring import POINTS_EXACT, POINTS_MARGIN, POINTS_NEAR, base_points, points_for


async def compute_leaderboard(pool: Pool) -> list[LeaderboardRowOut]:
    final_matches: dict[PydanticObjectId, Match] = {
        m.id: m async for m in Match.find(Match.status == MatchStatus.FINAL)
    }

    # Seed a row per member so everyone shows up, even with zero predictions.
    points: dict[PydanticObjectId, int] = {}
    exact: dict[PydanticObjectId, int] = {}
    margin: dict[PydanticObjectId, int] = {}
    outcome: dict[PydanticObjectId, int] = {}
    made: dict[PydanticObjectId, int] = {}
    names: dict[PydanticObjectId, str] = {}
    for member in pool.members:
        points[member.user_id] = 0
        exact[member.user_id] = 0
        margin[member.user_id] = 0
        outcome[member.user_id] = 0
        made[member.user_id] = 0
        names[member.user_id] = member.display_name

    async for pred in Prediction.find(Prediction.pool_id == pool.id):
        if pred.user_id not in points:
            continue  # left the pool but predictions linger
        made[pred.user_id] += 1
        match = final_matches.get(pred.match_id)
        if match is None:
            continue
        pts = points_for(pred, match)
        points[pred.user_id] += pts
        bp = base_points(pred.home_score, pred.away_score, match.home_score, match.away_score, match.kickoff_at)
        if bp == POINTS_EXACT:
            exact[pred.user_id] += 1
        elif bp >= POINTS_MARGIN:  # POINTS_NEAR or POINTS_MARGIN
            margin[pred.user_id] += 1
        elif bp > 0:
            outcome[pred.user_id] += 1

    rows = [
        LeaderboardRowOut(
            user_id=str(uid),
            display_name=names[uid],
            points=points[uid],
            exact_count=exact[uid],
            margin_count=margin[uid],
            outcome_count=outcome[uid],
            predictions_made=made[uid],
        )
        for uid in points
    ]
    rows.sort(key=lambda r: (-r.points, -r.exact_count, r.display_name.lower()))
    return rows


async def compute_weekly_hero(pool: Pool, week_start: datetime, week_end: datetime) -> WeeklyHeroOut:
    # Ensure UTC-aware for comparisons
    if week_start.tzinfo is None:
        week_start = week_start.replace(tzinfo=timezone.utc)
    if week_end.tzinfo is None:
        week_end = week_end.replace(tzinfo=timezone.utc)

    week_end_sat = week_end - timedelta(days=1)  # Saturday (last day of the Sun–Sat window)
    week_label = f"{week_start.strftime('%-d/%m')} – {week_end_sat.strftime('%-d/%m')}"

    final_matches: dict[PydanticObjectId, Match] = {
        m.id: m
        async for m in Match.find(
            Match.status == MatchStatus.FINAL,
            Match.kickoff_at >= week_start,
            Match.kickoff_at < week_end,
        )
    }

    if not final_matches:
        return WeeklyHeroOut(
            pool_id=str(pool.id),
            week_label=week_label,
            profeta_name=None,
            profeta_points=None,
            corneteiro_name=None,
            corneteiro_points=None,
            has_data=False,
        )

    points: dict[PydanticObjectId, int] = {m.user_id: 0 for m in pool.members}
    names: dict[PydanticObjectId, str] = {m.user_id: m.display_name for m in pool.members}

    async for pred in Prediction.find(Prediction.pool_id == pool.id):
        if pred.user_id not in points:
            continue
        match = final_matches.get(pred.match_id)
        if match is None:
            continue
        points[pred.user_id] += points_for(pred, match)

    scored = {uid: pts for uid, pts in points.items() if uid in names}
    if not scored or all(pts == 0 for pts in scored.values()):
        return WeeklyHeroOut(
            pool_id=str(pool.id),
            week_label=week_label,
            profeta_name=None,
            profeta_points=None,
            corneteiro_name=None,
            corneteiro_points=None,
            has_data=False,
        )

    best_uid = max(scored, key=lambda uid: (scored[uid], names[uid].lower()))
    worst_uid = min(scored, key=lambda uid: (scored[uid], names[uid].lower()))

    return WeeklyHeroOut(
        pool_id=str(pool.id),
        week_label=week_label,
        profeta_name=names[best_uid],
        profeta_points=scored[best_uid],
        corneteiro_name=names[worst_uid],
        corneteiro_points=scored[worst_uid],
        has_data=True,
    )
