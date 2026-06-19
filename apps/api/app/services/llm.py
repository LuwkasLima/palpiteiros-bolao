"""Thin async wrapper around the Anthropic API — the one place that talks to the LLM.

Best-effort by design: returns ``None`` on a missing key, a missing SDK, or any API error,
so callers degrade gracefully and the request path never raises (mirrors ``news.py``). The
``anthropic`` import is lazy so the app boots even when the package isn't installed.
"""

from __future__ import annotations

import logging

from app.config import get_settings

logger = logging.getLogger(__name__)

# Short flavour text — Haiku is the right cost/latency tier. Haiku does not support the
# ``effort``/adaptive-thinking parameters, so this stays a plain message create.
_MAX_TOKENS = 320


async def generate_text(system: str, user: str) -> str | None:
    """Generate a short completion. Returns ``None`` if the LLM is unavailable."""
    settings = get_settings()
    if not settings.anthropic_api_key:
        return None
    try:
        from anthropic import AsyncAnthropic
    except ImportError:
        logger.warning("llm: anthropic SDK not installed; skipping generation")
        return None

    try:
        client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        message = await client.messages.create(
            model=settings.narrative_model,
            max_tokens=_MAX_TOKENS,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        parts = [block.text for block in message.content if getattr(block, "type", None) == "text"]
        text = "".join(parts).strip()
        return text or None
    except Exception:  # an LLM outage must never blank the page
        logger.warning("llm: generation failed", exc_info=True)
        return None
