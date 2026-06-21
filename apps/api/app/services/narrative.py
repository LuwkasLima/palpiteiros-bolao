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
    "Você escreve um quadro de dois personagens para um bolão de amigos da Copa do Mundo, "
    "em português do Brasil, no estilo irreverente do futebol brasileiro.\n\n"
    "Personagens:\n"
    "• Narrador — apresenta a semana com entusiasmo e passa a palavra ao Comentarista.\n"
    "• Comentarista — entrega a resenha: exalta o Profeta (quem mais pontuou) e zoa levemente "
    "o Corneteiro (quem menos pontuou) com provocação de amigo, divertida, nunca ofensiva.\n\n"
    "Formato de saída (use exatamente estes rótulos):\n"
    "Narrador: [1 frase de abertura + pergunta ao Comentarista]\n"
    "Comentarista: [2 a 3 frases de resenha]\n\n"
    "Regras:\n"
    "- Máximo 80 palavras no total entre os dois.\n"
    "- Quando destaques da Copa forem fornecidos, o Comentarista deve mencionar ao menos um "
    "jogo ou fato marcante para contextualizar a resenha.\n"
    "- Não invente números, nomes ou fatos além dos fornecidos.\n"
    "- Responda apenas com o diálogo, sem aspas externas nem explicações."
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


def inputs_hash(hero: WeeklyHeroOut, model: str) -> str:
    """Hash the inputs that, if changed, should regenerate the narrative.

    Headlines are intentionally excluded: the resenha is displayed only on Sundays
    and should be generated once per week. News changes intra-day would otherwise
    trigger repeated regenerations. Results (profeta/corneteiro) and model changes
    still invalidate the cache, since those represent meaningful data changes.
    """
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
    week_end = week_start + timedelta(days=7)
    headlines = await _headlines_for_week(week_start, week_end)
    digest = inputs_hash(hero, model)

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
