"""Pools: create, join via invite code, list mine, view detail and leaderboard.

Membership is stored as an embedded ``members`` array on the Pool (bounded to a friend
group), so pool + members is a single read.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pymongo
from fastapi import APIRouter, HTTPException, Query, status
from pymongo.errors import DuplicateKeyError

from app.config import get_settings
from app.deps import CurrentUser
from app.models import Match, MatchStatus, Member, MemberRole, Pool, Prediction, User, utcnow
from app.services.access import load_member_pool
from app.schemas import (
    LeaderboardOut,
    MemberOut,
    PoolCreateIn,
    PoolJoinIn,
    PoolOut,
    PoolSummaryOut,
)
from app.security import new_invite_code
from app.services.leaderboard import compute_leaderboard

router = APIRouter(prefix="/pools", tags=["pools"])


def _invite_url(invite_code: str) -> str:
    return f"{get_settings().web_base_url}/join/{invite_code}"


async def _today_match_ids(window_end: datetime | None = None) -> list:
    now = utcnow()
    cutoff = window_end or (datetime(now.year, now.month, now.day, tzinfo=timezone.utc) + timedelta(days=1))
    matches = await Match.find(
        Match.kickoff_at > now,
        Match.kickoff_at < cutoff,
        Match.status == MatchStatus.SCHEDULED,
        {"home_team_id": {"$ne": None}},
    ).to_list()
    return [m.id for m in matches]


async def _has_pending_today(pool_id, user_id, window_end: datetime | None = None) -> bool:
    match_ids = await _today_match_ids(window_end)
    if not match_ids:
        return False
    predicted = await Prediction.find({
        "pool_id": pool_id,
        "user_id": user_id,
        "match_id": {"$in": match_ids},
    }).count()
    return predicted < len(match_ids)


def _to_pool_out(pool: Pool, user: User, has_pending_today: bool = False) -> PoolOut:
    return PoolOut(
        id=str(pool.id),
        name=pool.name,
        invite_code=pool.invite_code,
        invite_url=_invite_url(pool.invite_code),
        creator_id=str(pool.creator_id),
        members=[
            MemberOut(
                user_id=str(m.user_id),
                display_name=m.display_name,
                role=m.role,
                joined_at=m.joined_at,
            )
            for m in pool.members
        ],
        is_creator=pool.creator_id == user.id,
        has_pending_today=has_pending_today,
    )


@router.post("", response_model=PoolOut, status_code=status.HTTP_201_CREATED)
async def create_pool(payload: PoolCreateIn, user: CurrentUser) -> PoolOut:
    creator = Member(user_id=user.id, display_name=user.display_name, role=MemberRole.CREATOR)
    # Retry on the rare invite-code collision.
    for _ in range(5):
        pool = Pool(
            name=payload.name.strip(),
            creator_id=user.id,
            invite_code=new_invite_code(),
            members=[creator],
        )
        try:
            await pool.insert()
            return _to_pool_out(pool, user, await _has_pending_today(pool.id, user.id))
        except DuplicateKeyError:
            continue
    raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not generate invite code")


@router.post("/join", response_model=PoolOut)
async def join_pool(payload: PoolJoinIn, user: CurrentUser) -> PoolOut:
    code = payload.invite_code.strip().upper()
    pool = await Pool.find_one(Pool.invite_code == code, Pool.deleted_at == None)  # noqa: E711
    if pool is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invalid invite code")

    if not pool.has_member(user.id):
        # Atomic add guarded by user_id, so double-joins can't duplicate a member.
        await Pool.get_pymongo_collection().update_one(
            {"_id": pool.id, "members.user_id": {"$ne": user.id}},
            {
                "$push": {
                    "members": {
                        "user_id": user.id,
                        "display_name": user.display_name,
                        "role": MemberRole.MEMBER.value,
                        "joined_at": utcnow(),
                    }
                }
            },
        )
        pool = await Pool.get(pool.id)
    return _to_pool_out(pool, user, await _has_pending_today(pool.id, user.id))


@router.get("", response_model=list[PoolSummaryOut])
async def my_pools(user: CurrentUser, window_end: datetime | None = Query(None)) -> list[PoolSummaryOut]:
    pools = (
        await Pool.find({"members.user_id": user.id}, Pool.deleted_at == None)  # noqa: E711
        .sort([("created_at", pymongo.DESCENDING)])
        .to_list()
    )

    # Batch: 2 extra queries total regardless of pool count.
    match_ids = await _today_match_ids(window_end)
    preds_by_pool: dict = {}
    if match_ids and pools:
        preds = await Prediction.find({
            "user_id": user.id,
            "pool_id": {"$in": [p.id for p in pools]},
            "match_id": {"$in": match_ids},
        }).to_list()
        for pred in preds:
            preds_by_pool.setdefault(pred.pool_id, set()).add(pred.match_id)

    return [
        PoolSummaryOut(
            id=str(p.id),
            name=p.name,
            invite_code=p.invite_code,
            member_count=len(p.members),
            is_creator=p.creator_id == user.id,
            has_pending_today=bool(match_ids) and len(preds_by_pool.get(p.id, set())) < len(match_ids),
        )
        for p in pools
    ]


@router.get("/{pool_id}", response_model=PoolOut)
async def pool_detail(pool_id: str, user: CurrentUser, window_end: datetime | None = Query(None)) -> PoolOut:
    pool = await load_member_pool(pool_id, user)
    return _to_pool_out(pool, user, await _has_pending_today(pool.id, user.id, window_end))


@router.delete("/{pool_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pool(pool_id: str, user: CurrentUser) -> None:
    pool = await load_member_pool(pool_id, user)
    if pool.creator_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the creator can delete this pool")
    await pool.set({Pool.deleted_at: utcnow()})


@router.get("/{pool_id}/leaderboard", response_model=LeaderboardOut)
async def pool_leaderboard(pool_id: str, user: CurrentUser) -> LeaderboardOut:
    pool = await load_member_pool(pool_id, user)
    rows = await compute_leaderboard(pool)
    return LeaderboardOut(pool_id=str(pool.id), rows=rows)
