"""Weekly "resenha" — an LLM wrap-up layered on top of the factual profeta/corneteiro stats.

Lazy-generated on read and cached per ``(pool_id, kind, period_key)`` in the ``Narrative``
collection (same pattern as ``news.py`` — no worker needed). Prompt building and hashing are
pure functions so they're unit-testable without network or DB. Generation never raises into
the request path; on any failure the caller falls back to the raw hero card.
"""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime

from app.config import get_settings
from app.models import Narrative, Pool, utcnow
from app.schemas import WeeklyHeroOut
from app.services.llm import generate_text

logger = logging.getLogger(__name__)

KIND_WEEKLY = "weekly"

_SYSTEM_PROMPT = (
    "Você é o narrador bem-humorado de um bolão de amigos da Copa do Mundo. "
    "Escreva uma resenha curta (2 a 3 frases, no máximo 60 palavras) em português do Brasil "
    "sobre a semana do bolão. Exalte o profeta (quem mais pontuou) e zoe levemente o "
    "corneteiro (quem menos pontuou) — provocação de amigo, leve e divertida, nunca ofensiva "
    "nem ataque pessoal. Use o tom de resenha de futebol brasileira. Não invente números nem "
    "nomes além dos fornecidos. Responda apenas com a resenha, sem títulos nem aspas."
)


def period_key(week_start: datetime) -> str:
    """ISO-week key, e.g. ``2026-W25`` — stable identifier for the cached narrative."""
    iso = week_start.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def build_weekly_prompt(hero: WeeklyHeroOut) -> tuple[str, str]:
    """Build the (system, user) prompt for a weekly wrap-up. Pure — no I/O."""
    user = (
        f"Semana {hero.week_label}.\n"
        f"Profeta da semana: {hero.profeta_name} com {hero.profeta_points} pontos.\n"
        f"Corneteiro da semana: {hero.corneteiro_name} com {hero.corneteiro_points} pontos.\n"
        "Escreva a resenha da semana."
    )
    return _SYSTEM_PROMPT, user


def inputs_hash(hero: WeeklyHeroOut, model: str) -> str:
    """Hash the inputs that, if changed, should regenerate the narrative."""
    raw = "|".join(
        str(part)
        for part in (
            hero.week_label,
            hero.profeta_name,
            hero.profeta_points,
            hero.corneteiro_name,
            hero.corneteiro_points,
            model,
        )
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def get_weekly_narrative(pool: Pool, hero: WeeklyHeroOut, week_start: datetime) -> str | None:
    """Return the cached weekly resenha, generating it on a miss. ``None`` when unavailable."""
    if not hero.has_data:
        return None

    settings = get_settings()
    model = settings.narrative_model
    key = period_key(week_start)
    digest = inputs_hash(hero, model)

    existing = await Narrative.find_one(
        Narrative.pool_id == pool.id,
        Narrative.kind == KIND_WEEKLY,
        Narrative.period_key == key,
    )
    if existing is not None and existing.inputs_hash == digest:
        return existing.body

    system, user = build_weekly_prompt(hero)
    body = await generate_text(system, user)
    if body is None:
        return None  # caller falls back to the raw hero card

    if existing is None:
        await Narrative(
            pool_id=pool.id, kind=KIND_WEEKLY, period_key=key,
            body=body, inputs_hash=digest, model=model,
        ).insert()
    else:
        existing.body, existing.inputs_hash, existing.model, existing.created_at = (
            body, digest, model, utcnow(),
        )
        await existing.save()
    return body
