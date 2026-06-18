"""World Cup news aggregated from external RSS feeds. Public, read-only."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Query

from app.schemas import NewsItemOut
from app.serializers import news_item_to_out
from app.services import news

router = APIRouter(tags=["news"])


@router.get("/news", response_model=list[NewsItemOut])
async def list_news(
    day_start: datetime | None = Query(None),
    limit: int = Query(40, ge=1, le=100),
) -> list[NewsItemOut]:
    items = await news.list_news(day_start=day_start, limit=limit)
    return [news_item_to_out(it) for it in items]
