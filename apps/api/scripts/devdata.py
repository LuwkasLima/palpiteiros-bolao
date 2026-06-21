"""Populate the local database with dev users and tournament predictions.

Creates 3 bot participants, adds them to every active pool, and fills predictions
for the entire tournament for all pool members (skipping predictions that already
exist, so existing data is never overwritten).

Accuracy profiles ensure a clear Profeta/Corneteiro spread each week:
  Mateus  — always predicts the exact final score          (profeta)
  Ana     — predicts with ±1 noise per side                (middle)
  Pedro   — always predicts the wrong outcome               (corneteiro)

Run from apps/api/: uv run python scripts/devdata.py
"""

from __future__ import annotations

import asyncio
import random
import sys
from datetime import datetime
from pathlib import Path

# Allow `from app.xxx import` regardless of working directory.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pymongo.errors import DuplicateKeyError

from app.db import close_db, init_db
from app.models import (
    Match,
    MatchStatus,
    Member,
    MemberRole,
    Pool,
    Prediction,
    Stage,
    User,
    utcnow,
)

# ── dev participants ──────────────────────────────────────────────────────────

_DEV_USERS = [
    {"email": "mateus@devteam.com", "display_name": "Mateus"},
    {"email": "ana@devteam.com",    "display_name": "Ana"},
    {"email": "pedro@devteam.com",  "display_name": "Pedro"},
]

# accuracy index mirrors _DEV_USERS order
# 0 = profeta (exact), 1 = near, 2 = corneteiro (wrong outcome)
_EXISTING_USER_ACCURACY = 1  # mid-tier for any pre-existing pool members


# ── prediction helpers ────────────────────────────────────────────────────────

def _outcome(h: int, a: int) -> str:
    return "home" if h > a else ("away" if a > h else "draw")


def _predict(match: Match, accuracy: int, rng: random.Random) -> tuple[int, int]:
    """Generate (home, away) prediction for one match per accuracy profile."""
    if match.status == MatchStatus.FINAL and match.home_score is not None:
        h, a = match.home_score, match.away_score

        if accuracy == 0:
            # Profeta: always exact.
            return h, a

        if accuracy == 1:
            # Middle: ±1 noise, but never flips the outcome.
            offsets = [-1, -1, 0, 0, 0, 1, 1]
            ph = max(0, h + rng.choice(offsets))
            pa = max(0, a + rng.choice(offsets))
            if _outcome(ph, pa) != _outcome(h, a):
                ph, pa = h, a  # fall back to exact on accidental flip
            return ph, pa

        # Corneteiro (accuracy == 2): always predict the wrong outcome.
        act = _outcome(h, a)
        if act == "home":
            # actual home win → predict away win
            pa = rng.randint(1, max(2, h))
            ph = rng.randint(0, pa - 1)
        elif act == "away":
            # actual away win → predict home win
            ph = rng.randint(1, max(2, a))
            pa = rng.randint(0, ph - 1)
        else:
            # actual draw → predict a decisive home win
            ph = rng.randint(1, 3)
            pa = 0
        return ph, pa

    # Scheduled / unknown result: realistic random score.
    ph = rng.choices([0, 1, 2, 3], weights=[2, 4, 3, 1])[0]
    pa = rng.choices([0, 1, 2, 3], weights=[2, 4, 3, 1])[0]
    return ph, pa


# ── main logic ────────────────────────────────────────────────────────────────

async def _upsert_dev_users() -> list[User]:
    created: list[User] = []
    for data in _DEV_USERS:
        user = await User.find_one(User.email == data["email"])
        if user is None:
            user = User(email=data["email"], display_name=data["display_name"])
            await user.insert()
            print(f"  + created user: {data['display_name']} ({data['email']})")
        else:
            print(f"  · user exists:  {data['display_name']}")
        created.append(user)
    return created


async def _add_to_pools(dev_users: list[User]) -> list[Pool]:
    pools = await Pool.find(Pool.deleted_at == None).to_list()  # noqa: E711
    if not pools:
        print("  ! no pools found — create a pool in the app first, then re-run.")
        return []

    col = Pool.get_pymongo_collection()
    for pool in pools:
        for user in dev_users:
            if not pool.has_member(user.id):
                await col.update_one(
                    {"_id": pool.id, "members.user_id": {"$ne": user.id}},
                    {"$push": {"members": {
                        "user_id": user.id,
                        "display_name": user.display_name,
                        "role": MemberRole.MEMBER.value,
                        "joined_at": utcnow(),
                    }}},
                )
        # Refresh so has_member is current for later steps.
        pool = await Pool.get(pool.id)
        member_names = [m.display_name for m in pool.members]
        print(f"  · pool '{pool.name}' → members: {', '.join(member_names)}")

    return await Pool.find(Pool.deleted_at == None).to_list()  # noqa: E711


async def _fill_predictions(pools: list[Pool], dev_users: list[User]) -> None:
    dev_ids = {u.id: i for i, u in enumerate(dev_users)}

    # Only predict for matches that have both teams assigned.
    matches = await Match.find(
        Match.home_team_id != None,  # noqa: E711
        Match.away_team_id != None,  # noqa: E711
    ).to_list()

    # Pre-load all existing predictions into a set for fast lookup.
    existing: set[tuple] = set()
    all_preds = await Prediction.find_all().to_list()
    for p in all_preds:
        existing.add((p.pool_id, p.user_id, p.match_id))

    inserted = 0
    for pool in pools:
        for member in pool.members:
            # Pick accuracy: 0/1/2 for dev users, mid-tier for real users.
            accuracy = dev_ids.get(member.user_id, _EXISTING_USER_ACCURACY)
            # Seed rng deterministically per (user, accuracy) so re-runs produce
            # the same predictions and the idempotency check keeps them stable.
            rng = random.Random(f"{member.user_id}-{accuracy}")

            for match in matches:
                key = (pool.id, member.user_id, match.id)
                if key in existing:
                    continue
                h, a = _predict(match, accuracy, rng)
                try:
                    await Prediction(
                        pool_id=pool.id,
                        user_id=member.user_id,
                        match_id=match.id,
                        home_score=h,
                        away_score=a,
                    ).insert()
                    existing.add(key)
                    inserted += 1
                except DuplicateKeyError:
                    existing.add(key)  # already there from a concurrent/prior run

    print(f"  + inserted {inserted} new predictions across {len(pools)} pool(s).")


async def run() -> None:
    await init_db()
    try:
        print("── dev users ──")
        dev_users = await _upsert_dev_users()

        print("── pools ──")
        pools = await _add_to_pools(dev_users)
        if not pools:
            return

        print("── predictions ──")
        await _fill_predictions(pools, dev_users)

        print("done.")
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(run())
