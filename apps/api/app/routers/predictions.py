"""Predictions: list mine for a pool, and create/update one per match.

Writes are rejected once a match locks (at kickoff). Predictions are scoped to a pool, so
the same user can predict differently across pools they belong to.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.deps import CurrentUser
from app.models import Match, Prediction, Stage, utcnow
from app.schemas import PredictionIn, PredictionOut
from app.serializers import is_match_locked
from app.services.access import load_member_pool, parse_object_id

router = APIRouter(prefix="/pools/{pool_id}/predictions", tags=["predictions"])


def _to_out(pred: Prediction) -> PredictionOut:
    return PredictionOut(
        match_id=str(pred.match_id),
        home_score=pred.home_score,
        away_score=pred.away_score,
        advancing_team_id=str(pred.advancing_team_id) if pred.advancing_team_id else None,
        updated_at=pred.updated_at,
    )


@router.get("", response_model=list[PredictionOut])
async def my_predictions(pool_id: str, user: CurrentUser) -> list[PredictionOut]:
    pool = await load_member_pool(pool_id, user)
    preds = await Prediction.find(
        Prediction.pool_id == pool.id, Prediction.user_id == user.id
    ).to_list()
    return [_to_out(p) for p in preds]


@router.put("/{match_id}", response_model=PredictionOut)
async def upsert_prediction(
    pool_id: str, match_id: str, payload: PredictionIn, user: CurrentUser
) -> PredictionOut:
    pool = await load_member_pool(pool_id, user)

    match = await Match.get(parse_object_id(match_id, not_found="Match not found"))
    if match is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Match not found")
    if is_match_locked(match):
        raise HTTPException(status.HTTP_409_CONFLICT, "This match is locked")

    advancing_id = None
    if payload.advancing_team_id:
        if match.stage is Stage.GROUP:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Group matches have no advancing pick"
            )
        advancing_id = parse_object_id(
            payload.advancing_team_id, not_found="Unknown advancing team"
        )

    pred = await Prediction.find_one(
        Prediction.pool_id == pool.id,
        Prediction.user_id == user.id,
        Prediction.match_id == match.id,
    )
    if pred is None:
        pred = Prediction(
            pool_id=pool.id,
            user_id=user.id,
            match_id=match.id,
            home_score=payload.home_score,
            away_score=payload.away_score,
            advancing_team_id=advancing_id,
        )
    else:
        pred.home_score = payload.home_score
        pred.away_score = payload.away_score
        pred.advancing_team_id = advancing_id
        pred.updated_at = utcnow()
    await pred.save()
    return _to_out(pred)
