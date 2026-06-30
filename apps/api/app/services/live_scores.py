"""Live score integration with API-Football.

Fetches the FIFA World Cup 2026 fixtures that are currently live and caches the result
in memory for 3 minutes to stay within the free-tier rate limit (100 req/day).

Correlation is done by comparing kickoff_at timestamps (within a 5-minute tolerance)
since our match keys ("M01", "R32-1") are not API-Football fixture IDs.

When a match disappears from the live feed (it ended), we serve the last-known score
with an inferred final phase so the UI can show "Encerrado" instead of "Ao Vivo".
The ended_at timestamp is recorded the first time we infer a finished phase, so the
router can keep the card visible for exactly 1 hour after the match ended.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, replace
from datetime import datetime, timedelta, timezone

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

_CACHE_TTL = timedelta(minutes=3)
_FETCH_TIMEOUT = 10.0
_KICKOFF_TOLERANCE_S = 300  # 5 minutes
_API_BASE = "https://v3.football.api-sports.io"

# Maps the last seen in-play phase to the most likely final phase when a fixture
# disappears from the live feed.
_INFER_FINAL_PHASE: dict[str, str] = {
    "1H": "FT",
    "HT": "FT",
    "2H": "FT",
    "ET": "AET",
    "BT": "AET",  # break time between ET halves
    "P":  "PEN",
}

_ENCERRADO_WINDOW = timedelta(hours=1)

_cache: list[dict] | None = None
_cache_fetched_at: datetime | None = None
_fetch_lock = asyncio.Lock()

# Keyed by the API-Football fixture date string; survives cache refreshes so we can
# serve the last known score after a match drops off the live feed.
_last_known: dict[str, LiveScore] = {}  # type: ignore[name-defined]  # forward ref resolved below

# Records the first moment we inferred a finished phase for a fixture.
# Keyed by the API-Football fixture date string.
_ended_at: dict[str, datetime] = {}


@dataclass
class LiveScore:
    home_score: int | None
    away_score: int | None
    elapsed: int | None
    phase: str | None
    penalty_home: int | None
    penalty_away: int | None


# Re-assign now that the class is defined.
_last_known: dict[str, LiveScore] = {}


def _is_stale() -> bool:
    if _cache_fetched_at is None:
        return True
    return datetime.now(timezone.utc) - _cache_fetched_at >= _CACHE_TTL


def _parse_kickoff(date_str: str) -> datetime | None:
    try:
        dt = datetime.fromisoformat(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _build_score(fx: dict) -> LiveScore:
    goals = fx.get("goals", {})
    status = fx.get("fixture", {}).get("status", {})
    penalty = fx.get("score", {}).get("penalty", {})
    return LiveScore(
        home_score=goals.get("home"),
        away_score=goals.get("away"),
        elapsed=status.get("elapsed"),
        phase=status.get("short"),
        penalty_home=penalty.get("home"),
        penalty_away=penalty.get("away"),
    )


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _fetch_live_fixtures() -> list[dict]:
    settings = get_settings()
    if not settings.api_football_key:
        return []
    headers = {"x-apisports-key": settings.api_football_key}
    params = {
        "live": "all",
        "league": str(settings.api_football_league_id),
    }
    async with httpx.AsyncClient(timeout=_FETCH_TIMEOUT) as client:
        resp = await client.get(f"{_API_BASE}/fixtures", headers=headers, params=params)
        resp.raise_for_status()
        return resp.json().get("response", [])


async def _ensure_fresh() -> list[dict]:
    global _cache, _cache_fetched_at
    if not _is_stale():
        return _cache or []
    async with _fetch_lock:
        if not _is_stale():
            return _cache or []
        try:
            fixtures = await _fetch_live_fixtures()
            for fx in fixtures:
                date_str = fx.get("fixture", {}).get("date", "")
                if date_str:
                    _last_known[date_str] = _build_score(fx)
            _cache = fixtures
        except Exception:
            logger.warning("live_scores: failed to fetch from API-Football", exc_info=True)
            if _cache is None:
                _cache = []
        _cache_fetched_at = _utcnow()
    return _cache or []


def ended_within_window(kickoff: datetime) -> bool:
    """True if we know this match ended and it was within the last hour."""
    if kickoff.tzinfo is None:
        kickoff = kickoff.replace(tzinfo=timezone.utc)
    now = _utcnow()
    for date_str, ended in _ended_at.items():
        api_ko = _parse_kickoff(date_str)
        if api_ko and abs((kickoff - api_ko).total_seconds()) <= _KICKOFF_TOLERANCE_S:
            return now - ended <= _ENCERRADO_WINDOW
    return False


async def get_live_scores(kickoffs: dict[str, datetime]) -> dict[str, LiveScore]:
    """Return live score data keyed by our match key for any fixture whose kickoff matches.

    kickoffs: maps our match key -> kickoff_at (UTC-aware datetime)
    """
    fixtures = await _ensure_fresh()
    now = _utcnow()

    result: dict[str, LiveScore] = {}
    for key, our_kickoff in kickoffs.items():
        if our_kickoff.tzinfo is None:
            our_kickoff = our_kickoff.replace(tzinfo=timezone.utc)

        # 1. Try the current live feed first.
        for fx in fixtures:
            api_kickoff = _parse_kickoff(fx.get("fixture", {}).get("date", ""))
            if api_kickoff is None:
                continue
            if abs((our_kickoff - api_kickoff).total_seconds()) <= _KICKOFF_TOLERANCE_S:
                result[key] = _build_score(fx)
                break

        # 2. Not live anymore — fall back to last known score with inferred final phase.
        if key not in result:
            for date_str, last in _last_known.items():
                api_kickoff = _parse_kickoff(date_str)
                if api_kickoff is None:
                    continue
                if abs((our_kickoff - api_kickoff).total_seconds()) <= _KICKOFF_TOLERANCE_S:
                    inferred = _INFER_FINAL_PHASE.get(last.phase or "", last.phase)
                    result[key] = replace(last, phase=inferred)
                    # Record the first moment we detect this match as finished.
                    if date_str not in _ended_at:
                        _ended_at[date_str] = now
                    break

    return result
