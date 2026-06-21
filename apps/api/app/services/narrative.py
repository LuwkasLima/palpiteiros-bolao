"""Weekly "resenha" — an LLM wrap-up layered on top of the factual profeta/corneteiro stats.

Lazy-generated on read and cached per ``(pool_id, kind, period_key)`` in the ``Narrative``
collection (same pattern as ``news.py`` — no worker needed). Prompt building and hashing are
pure functions so they're unit-testable without network or DB. Generation never raises into
the request path; on any failure the caller falls back to the raw hero card.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
from datetime import datetime, timedelta

from pymongo.errors import DuplicateKeyError

from app.config import get_settings
from app.models import Narrative, NewsItem, NewsSource, Pool, utcnow
from app.schemas import WeeklyHeroOut
from app.services.llm import generate_text

logger = logging.getLogger(__name__)

KIND_WEEKLY = "weekly"
_NEWS_PER_SOURCE = 4  # 4 × 3 sources = up to 12 headlines, ensuring all sources are represented

_SYSTEM_PROMPT = (
    "Você é o narrador bem-humorado de um bolão de amigos da Copa do Mundo. "
    "Escreva uma resenha curta (2 a 3 frases, no máximo 60 palavras) em português do Brasil "
    "sobre a semana do bolão. Exalte o profeta (quem mais pontuou) e zoe levemente o "
    "corneteiro (quem menos pontuou) — provocação de amigo, sarcástica e divertida, nunca ofensiva "
    "nem ataque pessoal. Quando destaques da Copa forem fornecidos, use-os para contextualizar a "
    "resenha — mencione jogos, resultados ou fatos marcantes da semana sempre que enriquecer a "
    "narrativa. Use o tom de resenha de futebol brasileira. Não invente números, nomes ou fatos "
    "além dos fornecidos. Responda apenas com a resenha, sem títulos nem aspas."
)


def period_key(week_start: datetime) -> str:
    """ISO-week key, e.g. ``2026-W25`` — stable identifier for the cached narrative."""
    iso = week_start.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


async def _headlines_for_week(week_start: datetime, week_end: datetime) -> list[str]:
    """Return up to _NEWS_PER_SOURCE titles per source, sorted newest first overall.

    Fetching per-source in parallel guarantees all three feeds (ESPN, GE, Trivela) are
    represented even when one dominates by publication volume that week.
    """
    async def _fetch(source: NewsSource) -> list[NewsItem]:
        return await (
            NewsItem.find(
                NewsItem.source == source,
                NewsItem.published_at >= week_start,
                NewsItem.published_at < week_end,
            )
            .sort(-NewsItem.published_at)
            .limit(_NEWS_PER_SOURCE)
            .to_list()
        )

    batches = await asyncio.gather(*(_fetch(src) for src in NewsSource))
    items = sorted(
        (it for batch in batches for it in batch),
        key=lambda it: it.published_at,
        reverse=True,
    )
    return [it.title for it in items]


def build_weekly_prompt(hero: WeeklyHeroOut, headlines: list[str] | None = None) -> tuple[str, str]:
    """Build the (system, user) prompt for a weekly wrap-up. Pure — no I/O."""
    user = (
        f"Semana {hero.week_label}.\n"
        f"Profeta da semana: {hero.profeta_name} com {hero.profeta_points} pontos.\n"
        f"Corneteiro da semana: {hero.corneteiro_name} com {hero.corneteiro_points} pontos.\n"
    )
    if headlines:
        user += "\nDestaques da semana na Copa:\n"
        user += "".join(f"- {h}\n" for h in headlines)
    user += "Escreva a resenha da semana."
    return _SYSTEM_PROMPT, user


def inputs_hash(hero: WeeklyHeroOut, model: str, headlines: list[str] | None = None) -> str:
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
            "||".join(headlines or []),
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
    week_end = week_start + timedelta(days=7)
    headlines = await _headlines_for_week(week_start, week_end)
    digest = inputs_hash(hero, model, headlines)

    existing = await Narrative.find_one(
        Narrative.pool_id == pool.id,
        Narrative.kind == KIND_WEEKLY,
        Narrative.period_key == key,
    )
    if existing is not None and existing.inputs_hash == digest:
        return existing.body

    system, user = build_weekly_prompt(hero, headlines)
    body = await generate_text(system, user)
    if body is None:
        return None  # caller falls back to the raw hero card

    if existing is None:
        try:
            await Narrative(
                pool_id=pool.id, kind=KIND_WEEKLY, period_key=key,
                body=body, inputs_hash=digest, model=model,
            ).insert()
        except DuplicateKeyError:
            # Another concurrent request beat us to the insert; that's fine.
            pass
    else:
        existing.body, existing.inputs_hash, existing.model = body, digest, model
        await existing.save()
    return body
