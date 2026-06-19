"""World Cup news aggregation from external RSS feeds.

Fetches and normalizes RSS from the three preferred Brazilian sources (ESPN Brasil, Globo
Esporte, Trivela), keeps only World Cup-relevant items, and upserts them into the
``NewsItem`` collection. Reads lazily refresh the store when it goes stale, so there is no
need for a separate scheduler/worker (the API runs on a serverless runtime).

Parsing and filtering are pure functions (``parse_feed``, ``matches_world_cup``) so they can
be unit-tested without network or database access.
"""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass, replace
from datetime import datetime, timedelta, timezone

import feedparser
import httpx
from pymongo import UpdateOne

from app.models import NewsItem, NewsSource, utcnow

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class FeedSource:
    source: NewsSource
    url: str


# Confirmed working feeds (see release/2026-06-19 planning). ESPN's feed has no images;
# the others expose them via media:content. ESPN requires browser-like request headers.
FEEDS: list[FeedSource] = [
    FeedSource(NewsSource.ESPN, "https://www.espn.com.br/rss"),
    FeedSource(NewsSource.GE, "https://ge.globo.com/rss/ge/futebol/"),
    FeedSource(NewsSource.TRIVELA, "https://trivela.com.br/feed/"),
]

# These are general football feeds, so we keep only World Cup-relevant items.
_WC_PATTERN = re.compile(
    r"copa do mundo|mundial|sele[cç][aã]o|world cup|fifa|\b2026\b",
    re.IGNORECASE,
)

# Browser-like headers — ESPN's CDN serves an empty bot-challenge to plain clients.
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 "
        "(KHTML, like Gecko) Version/17.4 Safari/605.1.15"
    ),
    "Accept": "application/rss+xml,application/xml,text/xml,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
}

_REFRESH_TTL = timedelta(hours=1)
_FETCH_TIMEOUT = 15.0
_MAX_SUMMARY = 280

# Prevents an in-process refresh stampede when several requests arrive while the store is stale.
_refresh_lock = asyncio.Lock()


@dataclass(frozen=True)
class ParsedItem:
    source: NewsSource
    title: str
    link: str
    summary: str
    image_url: str | None
    published_at: datetime


def matches_world_cup(*texts: str) -> bool:
    return any(_WC_PATTERN.search(t or "") for t in texts)


def _clean_summary(raw: str) -> str:
    text = re.sub(r"<[^>]+>", "", raw or "")  # strip HTML (ge embeds an <img> in description)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:_MAX_SUMMARY].rstrip()


def _extract_image(entry: feedparser.FeedParserDict) -> str | None:
    for media in entry.get("media_content", []) or []:
        if media.get("url"):
            return media["url"]
    for thumb in entry.get("media_thumbnail", []) or []:
        if thumb.get("url"):
            return thumb["url"]
    for enc in entry.get("enclosures", []) or []:
        if (enc.get("type") or "").startswith("image") and enc.get("href"):
            return enc["href"]
    # Fallback: first <img> inside the summary/content (some ge items only have this).
    for field in (entry.get("summary"), *(c.get("value", "") for c in entry.get("content", []))):
        m = re.search(r'<img[^>]+src="([^"]+)"', field or "")
        if m:
            return m.group(1)
    return None


def _published_at(entry: feedparser.FeedParserDict) -> datetime:
    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if parsed:
        # feedparser normalizes to UTC in *_parsed.
        return datetime(*parsed[:6], tzinfo=timezone.utc)
    return utcnow()


def parse_feed(source: NewsSource, content: str | bytes) -> list[ParsedItem]:
    """Parse raw RSS/Atom into normalized, World Cup-filtered items. Pure (no I/O)."""
    feed = feedparser.parse(content)
    items: list[ParsedItem] = []
    for entry in feed.entries:
        title = (entry.get("title") or "").strip()
        link = (entry.get("link") or "").strip()
        if not title or not link:
            continue
        summary = _clean_summary(entry.get("summary", ""))
        if not matches_world_cup(title, summary):
            continue
        items.append(
            ParsedItem(
                source=source,
                title=title,
                link=link,
                summary=summary,
                image_url=_extract_image(entry),
                published_at=_published_at(entry),
            )
        )
    return items


_OG_IMAGE_RE = re.compile(
    r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']'
    r'|<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
)
_OG_FETCH_TIMEOUT = 5.0


async def _fetch_og_image(client: httpx.AsyncClient, url: str) -> str | None:
    try:
        resp = await client.get(url, timeout=_OG_FETCH_TIMEOUT)
        resp.raise_for_status()
        m = _OG_IMAGE_RE.search(resp.text)
        return (m.group(1) or m.group(2)) if m else None
    except Exception:
        return None


async def _fetch_source(client: httpx.AsyncClient, src: FeedSource) -> list[ParsedItem]:
    try:
        resp = await client.get(src.url)
        resp.raise_for_status()
        items = parse_feed(src.source, resp.content)
        # ESPN's feed carries no images; backfill from each article's OG tag.
        if src.source == NewsSource.ESPN and items:
            og_images = await asyncio.gather(*(_fetch_og_image(client, it.link) for it in items))
            items = [replace(it, image_url=og) if og else it for it, og in zip(items, og_images)]
        return items
    except Exception:  # one bad feed must not blank the whole page
        logger.warning("news: failed to fetch %s (%s)", src.source, src.url, exc_info=True)
        return []


async def _is_stale() -> bool:
    newest = await NewsItem.find_all().sort(-NewsItem.fetched_at).limit(1).to_list()
    if not newest:
        return True
    fetched = newest[0].fetched_at
    if fetched.tzinfo is None:  # Mongo round-trips naive UTC
        fetched = fetched.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - fetched >= _REFRESH_TTL


async def _upsert(items: list[ParsedItem]) -> None:
    if not items:
        return
    now = utcnow()
    ops = [
        UpdateOne(
            {"link": it.link},
            {
                "$set": {
                    "source": it.source.value,
                    "title": it.title,
                    "summary": it.summary,
                    "image_url": it.image_url,
                    "published_at": it.published_at,
                    "fetched_at": now,  # bumped every refresh so staleness tracks last sync
                }
            },
            upsert=True,
        )
        for it in items
    ]
    await NewsItem.get_pymongo_collection().bulk_write(ops, ordered=False)


async def refresh_if_stale() -> None:
    """Fetch all feeds and upsert items when the store is older than the refresh TTL.

    Best-effort: never raises into the request path, so a feed outage degrades gracefully.
    """
    if not await _is_stale():
        return
    async with _refresh_lock:
        if not await _is_stale():  # another request refreshed while we waited
            return
        async with httpx.AsyncClient(headers=_HEADERS, timeout=_FETCH_TIMEOUT, follow_redirects=True) as client:
            results = await asyncio.gather(*(_fetch_source(client, s) for s in FEEDS))
        items = [it for batch in results for it in batch]
        await _upsert(items)


_PER_SOURCE_LIMIT = 5


async def list_news(day_start: datetime | None = None) -> list[NewsItem]:
    """5 latest items per source (15 total), newest first overall.

    When ``day_start`` is given, only items published on or after it are returned.
    """
    await refresh_if_stale()

    async def _fetch_source_items(source: NewsSource) -> list[NewsItem]:
        q = NewsItem.find(NewsItem.source == source)
        if day_start:
            q = q.find(NewsItem.published_at >= day_start)
        return await q.sort(-NewsItem.published_at).limit(_PER_SOURCE_LIMIT).to_list()

    results = await asyncio.gather(*(_fetch_source_items(src) for src in NewsSource))
    items = [it for batch in results for it in batch]
    items.sort(key=lambda it: it.published_at, reverse=True)
    return items
