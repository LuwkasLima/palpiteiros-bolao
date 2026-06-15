"""Read-only tournament data: teams and the fixture list."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query

from app.models import Match, MatchStatus, Stage, Team
from app.models import utcnow
from app.schemas import MatchOut, NextMatchTodayOut, TeamOut
from app.serializers import match_to_out

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
    next_kickoff = upcoming[0].kickoff_at
    group = [m for m in upcoming if m.kickoff_at == next_kickoff]

    team_ids = {tid for m in group for tid in (m.home_team_id, m.away_team_id) if tid}
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
        for m in group
    ]


_IN_PROGRESS_WINDOW = timedelta(hours=2)


@router.get("/matches/in-progress", response_model=list[NextMatchTodayOut])
async def in_progress_matches() -> list[NextMatchTodayOut]:
    now = utcnow()
    matches = await Match.find(
        Match.kickoff_at <= now,
        Match.kickoff_at > now - _IN_PROGRESS_WINDOW,
        Match.status != MatchStatus.FINAL,
        {"home_team_id": {"$ne": None}},
    ).to_list()

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
        )
        for m in matches
    ]


@router.get("/matches", response_model=list[MatchOut])
async def list_matches(stage: Stage | None = None) -> list[MatchOut]:
    query = Match.find(Match.stage == stage) if stage else Match.find_all()
    matches = await query.to_list()
    matches.sort(key=lambda m: m.kickoff_at)
    return [match_to_out(m) for m in matches]
