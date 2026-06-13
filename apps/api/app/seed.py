"""Seed the database with the 2026 World Cup schedule.

Idempotent: teams are upserted by ``code`` and matches by ``key``, so it is safe to re-run.
Fixture data lives in ``data/wc2026_schedule.json``: explicit kickoff times for all 72 group
stage matches and the 32 knockout placeholders (teams TBD until the bracket resolves).

Run with: ``pnpm api:seed``  (or ``uv run python -m app.seed``)
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime
from pathlib import Path

from app.db import close_db, init_db
from app.models import Match, MatchStatus, Stage, Team
from app.services.scoring import round_weight

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "wc2026_schedule.json"


async def _upsert_teams(groups: dict[str, list[dict]]) -> dict[str, Team]:
    by_code: dict[str, Team] = {}
    for group_label, teams in groups.items():
        for entry in teams:
            team = await Team.find_one(Team.code == entry["code"])
            if team is None:
                team = Team(
                    code=entry["code"],
                    name=entry["name"],
                    flag_emoji=entry.get("flag_emoji", ""),
                    group_label=group_label,
                )
                await team.insert()
            else:
                team.name = entry["name"]
                team.flag_emoji = entry.get("flag_emoji", "")
                team.group_label = group_label
                await team.save()
            by_code[entry["code"]] = team
    return by_code


async def _upsert_match(key: str, **fields) -> None:
    match = await Match.find_one(Match.key == key)
    if match is None:
        await Match(key=key, **fields).insert()
        return
    # Don't clobber a result that's already been entered.
    if match.status is MatchStatus.FINAL:
        return
    match.status = MatchStatus.SCHEDULED
    for name, value in fields.items():
        setattr(match, name, value)
    await match.save()


async def _seed_group_stage(fixtures: list[dict], teams: dict[str, Team]) -> None:
    weight = round_weight(Stage.GROUP)
    for fix in fixtures:
        await _upsert_match(
            fix["key"],
            stage=Stage.GROUP,
            round_weight=weight,
            group_label=fix["group"],
            home_team_id=teams[fix["home"]].id,
            away_team_id=teams[fix["away"]].id,
            kickoff_at=datetime.fromisoformat(fix["kickoff_utc"]),
            slot_label=None,
        )


async def _seed_knockout(knockout: list[dict]) -> None:
    for fix in knockout:
        stage = Stage(fix["stage"])
        await _upsert_match(
            fix["key"],
            stage=stage,
            round_weight=round_weight(stage),
            group_label=None,
            home_team_id=None,
            away_team_id=None,
            kickoff_at=datetime.fromisoformat(fix["kickoff_utc"]),
            slot_label=fix["slot_label"],
        )


async def seed() -> None:
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))

    await init_db()
    try:
        teams = await _upsert_teams(data["groups"])
        await _seed_group_stage(data["fixtures"], teams)
        await _seed_knockout(data["knockout"])
        total = await Match.find_all().count()
        print(f"Seeded {len(teams)} teams and {total} matches.")
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(seed())
