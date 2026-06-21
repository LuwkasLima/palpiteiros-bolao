"""MongoDB connection and Beanie initialization."""

from __future__ import annotations

import asyncio

import certifi
from beanie import init_beanie
from pymongo import AsyncMongoClient

from app.config import get_settings
from app.models import ALL_DOCUMENTS

_client: AsyncMongoClient | None = None
_initialized = False
_init_lock = asyncio.Lock()


def _client_kwargs(uri: str) -> dict:
    """TLS options keyed off the URI.

    Atlas (``mongodb+srv://``) and any URI that explicitly opts into TLS needs a CA bundle.
    A plain local ``mongodb://`` connection (the dev container) is non-TLS, and passing
    ``tlsCAFile`` would force a TLS handshake the server can't answer.
    """
    lowered = uri.lower()
    needs_tls = uri.startswith("mongodb+srv://") or "tls=true" in lowered or "ssl=true" in lowered
    return {"tlsCAFile": certifi.where()} if needs_tls else {}


async def init_db() -> None:
    """Connect to MongoDB and register Beanie documents (creates indexes)."""
    global _client
    settings = get_settings()
    _client = AsyncMongoClient(settings.mongodb_uri, **_client_kwargs(settings.mongodb_uri))
    await init_beanie(database=_client[settings.mongodb_db], document_models=ALL_DOCUMENTS)


async def ensure_db() -> None:
    """Initialize the DB once per process (idempotent, concurrency-safe).

    On Vercel's serverless Python runtime the ASGI lifespan ``startup`` is not reliably
    fired, so we can't depend on it to call ``init_db``. This guarded helper lets both the
    lifespan (local dev) and a request middleware (serverless) trigger init exactly once per
    warm instance; the ``AsyncMongoClient`` is a module-level singleton, so connections are
    reused across invocations.
    """
    global _initialized
    if _initialized:
        return
    async with _init_lock:
        if _initialized:
            return
        await init_db()
        _initialized = True


async def close_db() -> None:
    global _client, _initialized
    if _client is not None:
        await _client.close()
        _client = None
    _initialized = False
