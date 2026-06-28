"""Predictions: list mine for a pool, and create/update one per match.

Writes are rejected once a match locks (at kickoff). Predictions are scoped to a pool, so
the same user can predict differently across pools they belong to.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from beanie.operators import In

from app.deps import CurrentUser
from app.models import Match, MatchStatus, Prediction, Stage, Team, utcnow
from app.services.scoring import points_for
from app.schemas import (
    MatchRevealedOut,
    PredictionEntryOut,
    PredictionIn,
    PredictionOut,
    RevealedPredictionsOut,
)
from app.serializers import is_match_locked
from app.services.access import load_member_pool, parse_object_id

router = APIRouter(prefix="/pools/{pool_id}/predictions", tags=["predictions"])


def _to_out(pred: Prediction) -> PredictionOut:
    return PredictionOut(
        match_id=str(pred.match_id),
        home_score=pred.home_score,
        away_score=pred.away_score,
        advancing_team_id=str(pred.advancing_team_id) if pred.advancing_team_id else None,
        penalty_home_score=pred.penalty_home_score,
        penalty_away_score=pred.penalty_away_score,
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

    penalty_set = (payload.penalty_home_score is not None, payload.penalty_away_score is not None)
    if penalty_set[0] != penalty_set[1]:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Penalty scores must be provided together"
        )
    if any(penalty_set) and match.stage is Stage.GROUP:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Group matches have no penalty prediction"
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
            penalty_home_score=payload.penalty_home_score,
            penalty_away_score=payload.penalty_away_score,
        )
    else:
        pred.home_score = payload.home_score
        pred.away_score = payload.away_score
        pred.advancing_team_id = advancing_id
        pred.penalty_home_score = payload.penalty_home_score
        pred.penalty_away_score = payload.penalty_away_score
        pred.updated_at = utcnow()
    await pred.save()
    return _to_out(pred)


@router.get("/revealed", response_model=RevealedPredictionsOut)
async def revealed_predictions(pool_id: str, user: CurrentUser) -> RevealedPredictionsOut:
    pool = await load_member_pool(pool_id, user)

    member_names = {m.user_id: m.display_name for m in pool.members}

    all_preds = await Prediction.find(
        Prediction.pool_id == pool.id,
        In(Prediction.user_id, list(member_names.keys())),
    ).to_list()
    if not all_preds:
        return RevealedPredictionsOut(pool_id=pool_id, matches=[])

    match_ids = list({p.match_id for p in all_preds})
    now = utcnow()
    matches = await Match.find(
        In(Match.id, match_ids),
        Match.kickoff_at <= now,
    ).to_list()

    if not matches:
        return RevealedPredictionsOut(pool_id=pool_id, matches=[])

    team_ids = list(
        {m.home_team_id for m in matches if m.home_team_id}
        | {m.away_team_id for m in matches if m.away_team_id}
    )
    teams = await Team.find(In(Team.id, team_ids)).to_list() if team_ids else []
    team_names = {t.id: t.name for t in teams}

    preds_by_match: dict = {}
    for pred in all_preds:
        preds_by_match.setdefault(pred.match_id, []).append(pred)

    result = []
    for match in sorted(matches, key=lambda m: m.kickoff_at):
        is_final = match.status == MatchStatus.FINAL
        entries = [
            PredictionEntryOut(
                user_id=str(p.user_id),
                display_name=member_names.get(p.user_id, "?"),
                home_score=p.home_score,
                away_score=p.away_score,
                advancing_team_id=str(p.advancing_team_id) if p.advancing_team_id else None,
                penalty_home_score=p.penalty_home_score,
                penalty_away_score=p.penalty_away_score,
                points=points_for(p, match) if is_final else None,
            )
            for p in preds_by_match.get(match.id, [])
        ]
        result.append(
            MatchRevealedOut(
                match_id=str(match.id),
                kickoff_at=match.kickoff_at,
                status=match.status,
                stage=match.stage,
                home_team_id=str(match.home_team_id) if match.home_team_id else None,
                away_team_id=str(match.away_team_id) if match.away_team_id else None,
                home_team_name=team_names.get(match.home_team_id) if match.home_team_id else None,
                away_team_name=team_names.get(match.away_team_id) if match.away_team_id else None,
                home_score=match.home_score,
                away_score=match.away_score,
                advancing_team_id=str(match.advancing_team_id) if match.advancing_team_id else None,
                penalty_home_score=match.penalty_home_score,
                penalty_away_score=match.penalty_away_score,
                entries=entries,
            )
        )

    return RevealedPredictionsOut(pool_id=pool_id, matches=result)
