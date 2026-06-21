"""Leaderboard computation for a pool.

Computed on read: load the pool's predictions and the finished matches, then sum points
per user via the scoring rules. Pools are friend-sized, so this is cheap; if it ever gets
hot we can cache a ``standings`` array on the Pool and refresh it on result entry.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from beanie import PydanticObjectId

from app.models import Match, MatchStatus, Pool, Prediction
from app.schemas import LeaderboardRowOut, WeeklyHeroOut, WeeklyTitleCountOut, WeeklyTitlesOut
from app.services.scoring import POINTS_EXACT, POINTS_MARGIN, POINTS_NEAR, base_points, points_for


async def compute_leaderboard(pool: Pool) -> list[LeaderboardRowOut]:
    final_matches: dict[PydanticObjectId, Match] = {
        m.id: m async for m in Match.find(Match.status == MatchStatus.FINAL)
    }

    # Seed a row per member so everyone shows up, even with zero predictions.
    points: dict[PydanticObjectId, int] = {}
    exact: dict[PydanticObjectId, int] = {}
    near: dict[PydanticObjectId, int] = {}
    margin: dict[PydanticObjectId, int] = {}
    outcome: dict[PydanticObjectId, int] = {}
    made: dict[PydanticObjectId, int] = {}
    names: dict[PydanticObjectId, str] = {}
    for member in pool.members:
        points[member.user_id] = 0
        exact[member.user_id] = 0
        near[member.user_id] = 0
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
        elif bp == POINTS_NEAR:
            near[pred.user_id] += 1
        elif bp == POINTS_MARGIN:
            margin[pred.user_id] += 1
        elif bp > 0:
            outcome[pred.user_id] += 1

    rows = [
        LeaderboardRowOut(
            user_id=str(uid),
            display_name=names[uid],
            points=points[uid],
            exact_count=exact[uid],
            near_count=near[uid],
            margin_count=margin[uid],
            outcome_count=outcome[uid],
            predictions_made=made[uid],
        )
        for uid in points
    ]
    rows.sort(key=lambda r: (-r.points, -r.exact_count, -r.near_count, -r.margin_count, -r.outcome_count, r.display_name.lower()))
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


_HOST_TZ_OFFSET = timedelta(hours=5)  # CDT (UTC-5): host timezone for Copa 2026 North America


def _week_start_for(dt: datetime) -> datetime:
    """Return the Sun 00:00 CDT that begins the week containing dt (stored as naive UTC).

    Kickoff times are stored as naive UTC. Copa 2026 is hosted in North America, so the
    "day" of a game follows CDT (UTC-5). Without this shift, early-morning UTC Sunday
    matches (e.g. 00:00–04:00 UTC) that are Saturday night CDT would spill into the
    next week and create spurious title buckets.
    """
    dt_cdt = dt - _HOST_TZ_OFFSET
    offset = (dt_cdt.weekday() + 1) % 7  # Mon=0…Sun=6 → Sun offset=0, Mon=1…
    sunday = dt_cdt - timedelta(days=offset)
    return sunday.replace(hour=0, minute=0, second=0, microsecond=0)


async def compute_weekly_titles(pool: Pool) -> WeeklyTitlesOut:
    total_members = len(pool.members)
    names: dict[PydanticObjectId, str] = {m.user_id: m.display_name for m in pool.members}

    # Load all finished matches once.
    final_matches: dict[PydanticObjectId, Match] = {
        m.id: m async for m in Match.find(Match.status == MatchStatus.FINAL)
    }

    # Accumulate per-(week, user) points and exact counts in a single pass.
    week_points: dict[datetime, dict[PydanticObjectId, int]] = {}
    week_exact: dict[datetime, dict[PydanticObjectId, int]] = {}

    async for pred in Prediction.find(Prediction.pool_id == pool.id):
        if pred.user_id not in names:
            continue
        match = final_matches.get(pred.match_id)
        if match is None:
            continue
        week = _week_start_for(match.kickoff_at)
        week_points.setdefault(week, {uid: 0 for uid in names})
        week_exact.setdefault(week, {uid: 0 for uid in names})
        week_points[week][pred.user_id] += points_for(pred, match)
        bp = base_points(pred.home_score, pred.away_score, match.home_score, match.away_score, match.kickoff_at)
        if bp == POINTS_EXACT:
            week_exact[week][pred.user_id] += 1

    # Award titles week by week.
    profeta: dict[PydanticObjectId, int] = {uid: 0 for uid in names}
    profissional: dict[PydanticObjectId, int] = {uid: 0 for uid in names}
    botequeiro: dict[PydanticObjectId, int] = {uid: 0 for uid in names}
    corneteiro: dict[PydanticObjectId, int] = {uid: 0 for uid in names}
    weeks_counted = 0

    for w in sorted(week_points):
        scores = week_points[w]
        if all(pts == 0 for pts in scores.values()):
            continue  # no matches resolved this week
        weeks_counted += 1

        exact_w = week_exact.get(w, {})
        ranked = sorted(scores.keys(), key=lambda uid: (-scores[uid], -exact_w.get(uid, 0), names[uid].lower()))

        profeta[ranked[0]] += 1
        if len(ranked) >= 2:
            profissional[ranked[1]] += 1
        if len(ranked) >= 3:
            botequeiro[ranked[2]] += 1
        if total_members > 3:
            corneteiro[ranked[-1]] += 1

    rows = [
        WeeklyTitleCountOut(
            user_id=str(uid),
            display_name=names[uid],
            profeta_count=profeta[uid],
            profissional_count=profissional[uid],
            botequeiro_count=botequeiro[uid],
            corneteiro_count=corneteiro[uid],
        )
        for uid in names
    ]
    rows.sort(key=lambda r: (-r.profeta_count, -r.profissional_count, -r.botequeiro_count, r.display_name.lower()))

    return WeeklyTitlesOut(pool_id=str(pool.id), weeks_counted=weeks_counted, rows=rows)
