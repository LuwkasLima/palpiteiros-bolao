"""MongoDB connection and Beanie initialization."""

from __future__ import annotations

from beanie import init_beanie
from pymongo import AsyncMongoClient

from app.config import get_settings
from app.models import ALL_DOCUMENTS

_client: AsyncMongoClient | None = None


async def init_db() -> None:
    """Connect to MongoDB and register Beanie documents (creates indexes)."""
    global _client
    settings = get_settings()
    _client = AsyncMongoClient(settings.mongodb_uri)
    await init_beanie(database=_client[settings.mongodb_db], document_models=ALL_DOCUMENTS)


async def close_db() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None
