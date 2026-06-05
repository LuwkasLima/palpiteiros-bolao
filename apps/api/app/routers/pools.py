"""Pools: create, join via invite code, list mine, view detail and leaderboard.

Membership is stored as an embedded ``members`` array on the Pool (bounded to a friend
group), so pool + members is a single read.
"""

from __future__ import annotations

import pymongo
from fastapi import APIRouter, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.config import get_settings
from app.deps import CurrentUser
from app.models import Member, MemberRole, Pool, User, utcnow
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


def _to_pool_out(pool: Pool, user: User) -> PoolOut:
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
            return _to_pool_out(pool, user)
        except DuplicateKeyError:
            continue
    raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not generate invite code")


@router.post("/join", response_model=PoolOut)
async def join_pool(payload: PoolJoinIn, user: CurrentUser) -> PoolOut:
    code = payload.invite_code.strip().upper()
    pool = await Pool.find_one(Pool.invite_code == code)
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
    return _to_pool_out(pool, user)


@router.get("", response_model=list[PoolSummaryOut])
async def my_pools(user: CurrentUser) -> list[PoolSummaryOut]:
    pools = (
        await Pool.find({"members.user_id": user.id})
        .sort([("created_at", pymongo.DESCENDING)])
        .to_list()
    )
    return [
        PoolSummaryOut(
            id=str(p.id),
            name=p.name,
            invite_code=p.invite_code,
            member_count=len(p.members),
            is_creator=p.creator_id == user.id,
        )
        for p in pools
    ]


@router.get("/{pool_id}", response_model=PoolOut)
async def pool_detail(pool_id: str, user: CurrentUser) -> PoolOut:
    pool = await load_member_pool(pool_id, user)
    return _to_pool_out(pool, user)


@router.get("/{pool_id}/leaderboard", response_model=LeaderboardOut)
async def pool_leaderboard(pool_id: str, user: CurrentUser) -> LeaderboardOut:
    pool = await load_member_pool(pool_id, user)
    rows = await compute_leaderboard(pool)
    return LeaderboardOut(pool_id=str(pool.id), rows=rows)
