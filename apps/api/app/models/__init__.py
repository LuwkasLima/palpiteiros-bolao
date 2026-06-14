"""Beanie document models (MongoDB collections).

Indexes — including TTL and compound-unique indexes — are declared per model in its
inner ``Settings`` class. Beanie creates them on startup via ``init_beanie`` (see
``app.db``), so there is no separate migration tool.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum

import pymongo
from beanie import Document, PydanticObjectId
from pydantic import BaseModel, EmailStr, Field
from pymongo import IndexModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# --- Enums --------------------------------------------------------------------


class Stage(StrEnum):
    GROUP = "group"
    R32 = "r32"
    R16 = "r16"
    QF = "qf"
    SF = "sf"
    THIRD = "third"
    FINAL = "final"


class MatchStatus(StrEnum):
    SCHEDULED = "scheduled"
    LOCKED = "locked"
    FINAL = "final"


class MemberRole(StrEnum):
    CREATOR = "creator"
    MEMBER = "member"


# --- Auth & users -------------------------------------------------------------


class User(Document):
    email: EmailStr
    display_name: str
    is_admin: bool = False
    onboarding_done: bool | None = None  # None = user predates this field, treat as True
    created_at: datetime = Field(default_factory=utcnow)
    last_seen_at: datetime | None = None

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("email", pymongo.ASCENDING)], unique=True),
            IndexModel([("last_seen_at", pymongo.ASCENDING)]),
        ]


class MagicLink(Document):
    email: EmailStr
    token_hash: str
    expires_at: datetime
    consumed_at: datetime | None = None
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "magic_links"
        indexes = [
            IndexModel([("token_hash", pymongo.ASCENDING)], unique=True),
            # TTL: drop documents once expired.
            IndexModel([("expires_at", pymongo.ASCENDING)], expireAfterSeconds=0),
        ]


class Session(Document):
    token_hash: str
    user_id: PydanticObjectId
    expires_at: datetime
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "sessions"
        indexes = [
            IndexModel([("token_hash", pymongo.ASCENDING)], unique=True),
            IndexModel([("expires_at", pymongo.ASCENDING)], expireAfterSeconds=0),
        ]


# --- Tournament ---------------------------------------------------------------


class Team(Document):
    name: str
    code: str  # 3-letter code, e.g. "BRA"
    group_label: str | None = None  # "A".."L"; None for placeholders
    flag_emoji: str = ""

    class Settings:
        name = "teams"
        indexes = [IndexModel([("code", pymongo.ASCENDING)], unique=True)]


class Match(Document):
    # Stable external key used by the seed (e.g. "M01", "R32-1") for idempotent upserts.
    key: str
    stage: Stage
    round_weight: int
    group_label: str | None = None
    slot_label: str | None = None  # e.g. "Winner Group A" for not-yet-known knockout teams

    home_team_id: PydanticObjectId | None = None
    away_team_id: PydanticObjectId | None = None

    kickoff_at: datetime
    status: MatchStatus = MatchStatus.SCHEDULED

    home_score: int | None = None
    away_score: int | None = None
    advancing_team_id: PydanticObjectId | None = None

    class Settings:
        name = "matches"
        indexes = [
            IndexModel([("key", pymongo.ASCENDING)], unique=True),
            IndexModel([("kickoff_at", pymongo.ASCENDING)]),
            IndexModel([("stage", pymongo.ASCENDING)]),
        ]


# --- Pools --------------------------------------------------------------------


class Member(BaseModel):
    """Embedded membership inside a Pool."""

    user_id: PydanticObjectId
    display_name: str
    role: MemberRole = MemberRole.MEMBER
    joined_at: datetime = Field(default_factory=utcnow)


class Pool(Document):
    name: str
    creator_id: PydanticObjectId
    invite_code: str
    created_at: datetime = Field(default_factory=utcnow)
    members: list[Member] = Field(default_factory=list)
    deleted_at: datetime | None = None

    class Settings:
        name = "pools"
        indexes = [
            IndexModel([("invite_code", pymongo.ASCENDING)], unique=True),
            IndexModel([("members.user_id", pymongo.ASCENDING)]),
        ]

    def has_member(self, user_id: PydanticObjectId) -> bool:
        return any(m.user_id == user_id for m in self.members)


# --- Predictions --------------------------------------------------------------


class Prediction(Document):
    pool_id: PydanticObjectId
    user_id: PydanticObjectId
    match_id: PydanticObjectId
    home_score: int
    away_score: int
    advancing_team_id: PydanticObjectId | None = None
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "predictions"
        indexes = [
            IndexModel(
                [
                    ("pool_id", pymongo.ASCENDING),
                    ("user_id", pymongo.ASCENDING),
                    ("match_id", pymongo.ASCENDING),
                ],
                unique=True,
            ),
            IndexModel([("pool_id", pymongo.ASCENDING), ("match_id", pymongo.ASCENDING)]),
        ]


# Every Document subclass, for init_beanie.
ALL_DOCUMENTS = [User, MagicLink, Session, Team, Match, Pool, Prediction]
