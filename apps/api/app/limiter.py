"""Shared rate-limiter instance.

Defined here to avoid circular imports between main.py (which attaches the limiter to app
state) and the routers that use the @limiter.limit() decorator.

Key function reads X-Forwarded-For first so the limit applies to the real client IP behind
Vercel's proxy layer, not the proxy's egress address.
"""

from __future__ import annotations

from fastapi import Request
from slowapi import Limiter


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=_client_ip)
