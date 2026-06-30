"""Read-only tournament data: teams and the fixture list."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query

from app.models import Match, MatchStatus, Stage, Team
from app.models import utcnow
from app.schemas import MatchOut, MatchTodayOut, NextMatchTodayOut, TeamOut
from app.serializers import match_to_out
from app.services.live_scores import ended_within_window, get_live_scores

router = APIRouter(tags=["tournament"])


@router.get("/teams", response_model=list[TeamOut])
async def list_teams() -> list[TeamOut]:
    teams = await Team.find_all().to_list()
    teams.sort(key=lambda t: (t.group_label or "~", t.name))
    return [
        TeamOut(
            id=str(t.id),
            name=t.name,
            code=t.code,
            group_label=t.group_label,
            flag_emoji=t.flag_emoji,
        )
        for t in teams
    ]


@router.get("/matches/next-today", response_model=list[NextMatchTodayOut])
async def next_matches_today(window_end: datetime | None = Query(None)) -> list[NextMatchTodayOut]:
    now = utcnow()
    cutoff = window_end or (datetime(now.year, now.month, now.day, tzinfo=timezone.utc) + timedelta(days=1))

    upcoming = await Match.find(
        Match.kickoff_at > now,
        Match.kickoff_at < cutoff,
        Match.status != MatchStatus.FINAL,
        {"home_team_id": {"$ne": None}},
    ).to_list()

    if not upcoming:
        return []

    upcoming.sort(key=lambda m: m.kickoff_at)

    team_ids = {tid for m in upcoming for tid in (m.home_team_id, m.away_team_id) if tid}
    teams = {t.id: t for t in await Team.find({"_id": {"$in": list(team_ids)}}).to_list()}

    return [
        NextMatchTodayOut(
            id=str(m.id),
            key=m.key,
            kickoff_at=m.kickoff_at,
            home_name=teams[m.home_team_id].name if m.home_team_id and m.home_team_id in teams else None,
            home_flag=teams[m.home_team_id].flag_emoji if m.home_team_id and m.home_team_id in teams else None,
            away_name=teams[m.away_team_id].name if m.away_team_id and m.away_team_id in teams else None,
            away_flag=teams[m.away_team_id].flag_emoji if m.away_team_id and m.away_team_id in teams else None,
            group_label=m.group_label,
            stage=m.stage,
        )
        for m in upcoming
    ]


_IN_PROGRESS_WINDOW = timedelta(hours=3)
# Wider window for the DB query: covers the longest possible match (≈2h40) plus
# the 1-hour "Encerrado" display period. Matches outside _IN_PROGRESS_WINDOW are
# only kept if ended_within_window() confirms they ended in the last hour.
_ENDED_LOOKUP_WINDOW = timedelta(hours=5)


@router.get("/matches/in-progress", response_model=list[NextMatchTodayOut])
async def in_progress_matches() -> list[NextMatchTodayOut]:
    now = utcnow()
    candidates = await Match.find(
        Match.kickoff_at <= now,
        Match.kickoff_at > now - _ENDED_LOOKUP_WINDOW,
        Match.status != MatchStatus.FINAL,
        {"home_team_id": {"$ne": None}},
    ).to_list()

    if not candidates:
        return []

    # Fetch live scores first — this populates ended_at for finished matches.
    kickoffs = {m.key: m.kickoff_at for m in candidates}
    scores = await get_live_scores(kickoffs)

    # Keep matches that are within the normal live window OR ended within the last hour.
    def _include(m: Match) -> bool:
        ko = m.kickoff_at if m.kickoff_at.tzinfo else m.kickoff_at.replace(tzinfo=timezone.utc)
        return now - ko <= _IN_PROGRESS_WINDOW or ended_within_window(ko)

    matches = [m for m in candidates if _include(m)]
    if not matches:
        return []

    matches.sort(key=lambda m: m.kickoff_at)

    team_ids = {tid for m in matches for tid in (m.home_team_id, m.away_team_id) if tid}
    teams = {t.id: t for t in await Team.find({"_id": {"$in": list(team_ids)}}).to_list()}

    return [
        NextMatchTodayOut(
            id=str(m.id),
            key=m.key,
            kickoff_at=m.kickoff_at,
            home_name=teams[m.home_team_id].name if m.home_team_id and m.home_team_id in teams else None,
            home_flag=teams[m.home_team_id].flag_emoji if m.home_team_id and m.home_team_id in teams else None,
            away_name=teams[m.away_team_id].name if m.away_team_id and m.away_team_id in teams else None,
            away_flag=teams[m.away_team_id].flag_emoji if m.away_team_id and m.away_team_id in teams else None,
            group_label=m.group_label,
            stage=m.stage,
            live_home_score=scores[m.key].home_score if m.key in scores else None,
            live_away_score=scores[m.key].away_score if m.key in scores else None,
            live_elapsed=scores[m.key].elapsed if m.key in scores else None,
            live_phase=scores[m.key].phase if m.key in scores else None,
            live_penalty_home=scores[m.key].penalty_home if m.key in scores else None,
            live_penalty_away=scores[m.key].penalty_away if m.key in scores else None,
        )
        for m in matches
    ]


@router.get("/matches/today", response_model=list[MatchTodayOut])
async def matches_today(day_start: datetime, day_end: datetime) -> list[MatchTodayOut]:
    matches = await Match.find(
        Match.kickoff_at >= day_start,
        Match.kickoff_at < day_end,
        {"home_team_id": {"$ne": None}},
    ).to_list()

    if not matches:
        return []

    matches.sort(key=lambda m: m.kickoff_at)

    team_ids = {tid for m in matches for tid in (m.home_team_id, m.away_team_id) if tid}
    teams = {t.id: t for t in await Team.find({"_id": {"$in": list(team_ids)}}).to_list()}

    return [
        MatchTodayOut(
            id=str(m.id),
            key=m.key,
            kickoff_at=m.kickoff_at,
            status=m.status,
            home_name=teams[m.home_team_id].name if m.home_team_id and m.home_team_id in teams else None,
            home_flag=teams[m.home_team_id].flag_emoji if m.home_team_id and m.home_team_id in teams else None,
            away_name=teams[m.away_team_id].name if m.away_team_id and m.away_team_id in teams else None,
            away_flag=teams[m.away_team_id].flag_emoji if m.away_team_id and m.away_team_id in teams else None,
            home_score=m.home_score,
            away_score=m.away_score,
            group_label=m.group_label,
            stage=m.stage,
        )
        for m in matches
    ]


@router.get("/matches", response_model=list[MatchOut])
async def list_matches(stage: Stage | None = None) -> list[MatchOut]:
    query = Match.find(Match.stage == stage) if stage else Match.find_all()
    matches = await query.to_list()
    matches.sort(key=lambda m: m.kickoff_at)
    return [match_to_out(m) for m in matches]
