"""Tests for the weekly narrative service.

Pure tests cover prompt building / hashing and the early-return guard. The cache
miss/hit/regenerate path touches Beanie + Mongo and is verified end-to-end against a real
database (mongomock-motor is incompatible with the current Beanie version).
"""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

from beanie import PydanticObjectId

from app.config import get_settings
from app.schemas import WeeklyHeroOut
from app.services import llm
from app.services import narrative as narr

_WEEK_START = datetime(2026, 6, 7, tzinfo=timezone.utc)


def _hero(**overrides) -> WeeklyHeroOut:
    base = dict(
        pool_id="p1",
        week_label="7/06 – 13/06",
        profeta_name="Lucas",
        profeta_points=26,
        corneteiro_name="Diego",
        corneteiro_points=2,
        has_data=True,
    )
    base.update(overrides)
    return WeeklyHeroOut(**base)


# --- pure --------------------------------------------------------------------------------


def test_period_key_is_iso_week():
    # 2026-06-07 (Sunday) closes ISO week 23.
    assert narr.period_key(_WEEK_START) == "2026-W23"


def test_inputs_hash_is_stable_and_change_sensitive():
    h = narr.inputs_hash(_hero(), "m")
    assert h == narr.inputs_hash(_hero(), "m")  # stable
    assert h != narr.inputs_hash(_hero(profeta_points=27), "m")  # result changed
    assert h != narr.inputs_hash(_hero(), "other-model")  # model changed


def test_build_weekly_prompt_includes_names_and_points():
    system, user = narr.build_weekly_prompt(_hero())
    assert "resenha" in system.lower()
    for token in ("Lucas", "26", "Diego", "2", "7/06"):
        assert token in user


# --- behaviour without a DB call ---------------------------------------------------------


async def test_no_data_skips_generation():
    # has_data False returns before any DB or LLM call — no narrative for an empty week.
    pool = SimpleNamespace(id=PydanticObjectId())
    assert await narr.get_weekly_narrative(pool, _hero(has_data=False), _WEEK_START) is None


async def test_generate_text_returns_none_without_key(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    get_settings.cache_clear()
    assert await llm.generate_text("system", "user") is None
    get_settings.cache_clear()
