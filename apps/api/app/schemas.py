"""Request/response models. FastAPI turns these into the OpenAPI schema that
``packages/contracts`` is generated from — so they are the API's public contract.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models import MatchStatus, MemberRole, Stage

# --- Auth ---------------------------------------------------------------------


class RequestLinkIn(BaseModel):
    email: EmailStr


class VerifyIn(BaseModel):
    token: str


class MessageOut(BaseModel):
    message: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    display_name: str
    is_admin: bool
    onboarding_done: bool


class UpdateProfileIn(BaseModel):
    display_name: str = Field(min_length=1, max_length=60)


# --- Teams & matches ----------------------------------------------------------


class TeamOut(BaseModel):
    id: str
    name: str
    code: str
    group_label: str | None
    flag_emoji: str


class MatchOut(BaseModel):
    id: str
    key: str
    stage: Stage
    round_weight: int
    group_label: str | None
    slot_label: str | None
    home_team_id: str | None
    away_team_id: str | None
    kickoff_at: datetime
    status: MatchStatus
    home_score: int | None
    away_score: int | None
    advancing_team_id: str | None
    is_locked: bool


# --- Pools --------------------------------------------------------------------


class PoolCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class PoolJoinIn(BaseModel):
    invite_code: str = Field(min_length=1, max_length=32)


class MemberOut(BaseModel):
    user_id: str
    display_name: str
    role: MemberRole
    joined_at: datetime


class PoolSummaryOut(BaseModel):
    id: str
    name: str
    invite_code: str
    member_count: int
    is_creator: bool


class PoolOut(BaseModel):
    id: str
    name: str
    invite_code: str
    invite_url: str
    creator_id: str
    members: list[MemberOut]
    is_creator: bool


# --- Predictions --------------------------------------------------------------


class PredictionIn(BaseModel):
    home_score: int = Field(ge=0, le=99)
    away_score: int = Field(ge=0, le=99)
    advancing_team_id: str | None = None


class PredictionOut(BaseModel):
    match_id: str
    home_score: int
    away_score: int
    advancing_team_id: str | None
    updated_at: datetime


# --- Revealed predictions -----------------------------------------------------


class PredictionEntryOut(BaseModel):
    user_id: str
    display_name: str
    home_score: int
    away_score: int
    advancing_team_id: str | None
    points: int | None


class MatchRevealedOut(BaseModel):
    match_id: str
    kickoff_at: datetime
    status: MatchStatus
    home_team_name: str | None
    away_team_name: str | None
    home_score: int | None
    away_score: int | None
    entries: list[PredictionEntryOut]


class RevealedPredictionsOut(BaseModel):
    pool_id: str
    matches: list[MatchRevealedOut]


# --- Leaderboard --------------------------------------------------------------


class LeaderboardRowOut(BaseModel):
    user_id: str
    display_name: str
    points: int
    exact_count: int
    predictions_made: int


class LeaderboardOut(BaseModel):
    pool_id: str
    rows: list[LeaderboardRowOut]


# --- Admin --------------------------------------------------------------------


class ResultIn(BaseModel):
    home_score: int = Field(ge=0, le=99)
    away_score: int = Field(ge=0, le=99)
    advancing_team_id: str | None = None


class MatchStatusCountsOut(BaseModel):
    scheduled: int
    locked: int
    final: int


class AdminStatsOut(BaseModel):
    total_users: int
    onboarded_users: int
    active_users: int
    total_pools: int
    avg_pool_size: float
    total_predictions: int
    predictions_by_stage: dict[str, int]
    match_counts: MatchStatusCountsOut
