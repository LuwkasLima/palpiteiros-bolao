"""FastAPI application entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import close_db, ensure_db
from app.routers import admin, auth, matches, news, pools, predictions


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs on a normal long-lived server (local dev / container). On Vercel's serverless
    # runtime this may not fire, so the middleware below is the safety net.
    await ensure_db()
    yield
    await close_db()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Social dos Palpiteiros API", version="0.1.0", lifespan=lifespan)

    @app.middleware("http")
    async def _ensure_db(request: Request, call_next):
        # Guarantees Beanie is initialized even when lifespan didn't run (serverless).
        await ensure_db()
        return await call_next(request)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.web_base_url],
        allow_credentials=True,  # required so the session cookie is sent
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(matches.router)
    app.include_router(news.router)
    app.include_router(pools.router)
    app.include_router(predictions.router)
    app.include_router(admin.router)

    @app.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
