"""Passwordless magic-link auth.

Flow: request-link emails a one-time token → verify consumes it, creates a Session, and
sets an httpOnly cookie. We always return a generic message from request-link so the
endpoint can't be used to probe which emails exist.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Response, status

from app.config import get_settings
from app.deps import CurrentUser
from app.models import MagicLink, Session, User
from app.schemas import MessageOut, RequestLinkIn, UpdateProfileIn, UserOut, VerifyIn
from app.security import SESSION_COOKIE, hash_token, new_token
from app.services.email import send_magic_link

router = APIRouter(prefix="/auth", tags=["auth"])


def _default_display_name(email: str) -> str:
    return email.split("@", 1)[0]


def _user_out(user: User) -> UserOut:
    return UserOut(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        is_admin=user.is_admin,
        onboarding_done=user.onboarding_done if user.onboarding_done is not None else True,
    )


@router.post("/request-link", response_model=MessageOut)
async def request_link(payload: RequestLinkIn) -> MessageOut:
    settings = get_settings()
    email = payload.email.lower()

    token = new_token()
    await MagicLink(
        email=email,
        token_hash=hash_token(token),
        expires_at=datetime.now(timezone.utc)
        + timedelta(minutes=settings.magic_link_ttl_minutes),
    ).insert()

    link = f"{settings.web_base_url}/auth/verify?token={token}"
    send_magic_link(email, link, settings=settings)
    return MessageOut(message="If that email is valid, a sign-in link is on its way.")


@router.post("/verify", response_model=UserOut)
async def verify(payload: VerifyIn, response: Response) -> UserOut:
    settings = get_settings()
    link = await MagicLink.find_one(MagicLink.token_hash == hash_token(payload.token))

    now = datetime.now(timezone.utc)
    if link is None or link.consumed_at is not None:
        raise _invalid()
    expires_at = link.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now:
        raise _invalid()

    link.consumed_at = now
    await link.save()

    email = link.email.lower()
    user = await User.find_one(User.email == email)
    if user is None:
        user = User(
            email=email,
            display_name=_default_display_name(email),
            is_admin=email in settings.admin_email_set,
            onboarding_done=False,
        )
        await user.insert()
    else:
        # Keep admin status in sync with the allowlist on each login.
        desired_admin = email in settings.admin_email_set
        if user.is_admin != desired_admin:
            user.is_admin = desired_admin
            await user.save()

    session_token = new_token()
    await Session(
        token_hash=hash_token(session_token),
        user_id=user.id,
        expires_at=now + timedelta(hours=settings.session_ttl_hours),
    ).insert()

    response.set_cookie(
        key=SESSION_COOKIE,
        value=session_token,
        max_age=settings.session_ttl_hours * 3600,
        httponly=True,
        samesite="lax",
        secure=settings.api_base_url.startswith("https"),
        path="/",
    )
    return _user_out(user)


@router.post("/logout", response_model=MessageOut)
async def logout(
    response: Response,
    bolao_session: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> MessageOut:
    # Revoke server-side too, so the token can't be reused even if it leaked.
    if bolao_session:
        session = await Session.find_one(Session.token_hash == hash_token(bolao_session))
        if session is not None:
            await session.delete()
    response.delete_cookie(SESSION_COOKIE, path="/")
    return MessageOut(message="Signed out.")


@router.patch("/me", response_model=UserOut)
async def update_me(payload: UpdateProfileIn, user: CurrentUser) -> UserOut:
    user.display_name = payload.display_name
    user.onboarding_done = True
    await user.save()
    return _user_out(user)


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser) -> UserOut:
    return _user_out(user)


def _invalid() -> HTTPException:
    return HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired link")
