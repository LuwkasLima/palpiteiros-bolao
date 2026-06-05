"""Leaderboard computation for a pool.

Computed on read: load the pool's predictions and the finished matches, then sum points
per user via the scoring rules. Pools are friend-sized, so this is cheap; if it ever gets
hot we can cache a ``standings`` array on the Pool and refresh it on result entry.
"""

from __future__ import annotations

from beanie import PydanticObjectId

from app.models import Match, MatchStatus, Pool, Prediction
from app.schemas import LeaderboardRowOut
from app.services.scoring import points_for


async def compute_leaderboard(pool: Pool) -> list[LeaderboardRowOut]:
    final_matches: dict[PydanticObjectId, Match] = {
        m.id: m async for m in Match.find(Match.status == MatchStatus.FINAL)
    }

    # Seed a row per member so everyone shows up, even with zero predictions.
    points: dict[PydanticObjectId, int] = {}
    exact: dict[PydanticObjectId, int] = {}
    made: dict[PydanticObjectId, int] = {}
    names: dict[PydanticObjectId, str] = {}
    for member in pool.members:
        points[member.user_id] = 0
        exact[member.user_id] = 0
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
        if pred.home_score == match.home_score and pred.away_score == match.away_score:
            exact[pred.user_id] += 1

    rows = [
        LeaderboardRowOut(
            user_id=str(uid),
            display_name=names[uid],
            points=points[uid],
            exact_count=exact[uid],
            predictions_made=made[uid],
        )
        for uid in points
    ]
    rows.sort(key=lambda r: (-r.points, -r.exact_count, r.display_name.lower()))
    return rows
