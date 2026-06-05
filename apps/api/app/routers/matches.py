"""Read-only tournament data: teams and the fixture list."""

from __future__ import annotations

from fastapi import APIRouter

from app.models import Match, Stage, Team
from app.schemas import MatchOut, TeamOut
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


@router.get("/matches", response_model=list[MatchOut])
async def list_matches(stage: Stage | None = None) -> list[MatchOut]:
    query = Match.find(Match.stage == stage) if stage else Match.find_all()
    matches = await query.to_list()
    matches.sort(key=lambda m: m.kickoff_at)
    return [match_to_out(m) for m in matches]
