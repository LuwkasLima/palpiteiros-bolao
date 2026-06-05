"""Seed the database with the 2026 World Cup schedule.

Idempotent: teams are upserted by ``code`` and matches by ``key``, so it is safe to re-run.
Group fixtures are generated as a round-robin per group; the knockout rounds are created as
placeholders (teams TBD) carrying the escalating round weights from ``scoring``.

Run with: ``pnpm api:seed``  (or ``uv run python -m app.seed``)
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.db import close_db, init_db
from app.models import Match, MatchStatus, Stage, Team
from app.services.scoring import round_weight

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "wc2026_schedule.json"

# Round-robin pairings (by team index) for a group of four — 3 matchdays, 6 matches.
ROUND_ROBIN = [
    [(0, 1), (2, 3)],
    [(0, 2), (3, 1)],
    [(0, 3), (1, 2)],
]

GROUP_START = datetime(2026, 6, 11, 16, 0, tzinfo=timezone.utc)


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
    for name, value in fields.items():
        setattr(match, name, value)
    await match.save()


async def _seed_group_stage(groups: dict[str, list[dict]], teams: dict[str, Team]) -> None:
    weight = round_weight(Stage.GROUP)
    match_index = 0
    for group_label, entries in groups.items():
        codes = [e["code"] for e in entries]
        for matchday, pairs in enumerate(ROUND_ROBIN):
            for home_i, away_i in pairs:
                # 4 kickoffs per day across the group-stage window.
                kickoff = GROUP_START + timedelta(
                    days=match_index // 4, hours=(match_index % 4) * 3
                )
                key = f"G-{group_label}-{matchday + 1}-{codes[home_i]}{codes[away_i]}"
                await _upsert_match(
                    key,
                    stage=Stage.GROUP,
                    round_weight=weight,
                    group_label=group_label,
                    home_team_id=teams[codes[home_i]].id,
                    away_team_id=teams[codes[away_i]].id,
                    kickoff_at=kickoff,
                    slot_label=None,
                )
                match_index += 1


async def _seed_knockout() -> None:
    # (stage, number of matches, first kickoff date, human label)
    rounds = [
        (Stage.R32, 16, datetime(2026, 6, 29, 16, 0, tzinfo=timezone.utc), "Round of 32"),
        (Stage.R16, 8, datetime(2026, 7, 4, 16, 0, tzinfo=timezone.utc), "Round of 16"),
        (Stage.QF, 4, datetime(2026, 7, 9, 16, 0, tzinfo=timezone.utc), "Quarter-final"),
        (Stage.SF, 2, datetime(2026, 7, 14, 19, 0, tzinfo=timezone.utc), "Semi-final"),
        (Stage.THIRD, 1, datetime(2026, 7, 18, 19, 0, tzinfo=timezone.utc), "Third place"),
        (Stage.FINAL, 1, datetime(2026, 7, 19, 19, 0, tzinfo=timezone.utc), "Final"),
    ]
    for stage, count, start, label in rounds:
        weight = round_weight(stage)
        for i in range(count):
            kickoff = start + timedelta(days=i // 2, hours=(i % 2) * 4)
            slot = label if count == 1 else f"{label} — Match {i + 1}"
            await _upsert_match(
                f"{stage.value.upper()}-{i + 1}",
                stage=stage,
                round_weight=weight,
                group_label=None,
                home_team_id=None,
                away_team_id=None,
                kickoff_at=kickoff,
                slot_label=slot,
            )


async def seed() -> None:
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    groups = data["groups"]

    await init_db()
    try:
        teams = await _upsert_teams(groups)
        await _seed_group_stage(groups, teams)
        await _seed_knockout()
        total = await Match.find_all().count()
        print(f"Seeded {len(teams)} teams and {total} matches.")
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(seed())
