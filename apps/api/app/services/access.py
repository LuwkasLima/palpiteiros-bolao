"""Access-control helpers shared across routers."""

from __future__ import annotations

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.models import Pool, User


def parse_object_id(value: str, *, not_found: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except Exception:
        raise HTTPException(status.HTTP_404_NOT_FOUND, not_found)


async def load_member_pool(pool_id: str, user: User) -> Pool:
    """Load a pool, asserting the user is a member (404 if missing, 403 if not a member)."""
    pool = await Pool.get(parse_object_id(pool_id, not_found="Pool not found"))
    if pool is None or pool.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pool not found")
    if not pool.has_member(user.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not a member of this pool")
    return pool
