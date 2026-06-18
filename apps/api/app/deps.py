"""Shared FastAPI dependencies — primarily resolving the current user from the session."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status

from app.models import Session, User
from app.security import SESSION_COOKIE, hash_token


async def get_current_user(
    bolao_session: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> User:
    if not bolao_session:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    session = await Session.find_one(Session.token_hash == hash_token(bolao_session))
    if session is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session")

    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        await session.delete()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired")

    user = await User.get(session.user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    if user.deleted_at is not None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account deleted")
    now = datetime.now(timezone.utc)
    seen = user.last_seen_at
    if seen is None or (now - (seen if seen.tzinfo else seen.replace(tzinfo=timezone.utc))).total_seconds() > 28800:
        try:
            await user.set({User.last_seen_at: now})
        except Exception:
            pass  # best-effort; never block a request over a tracking write
    return user


async def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin only")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_admin)]
