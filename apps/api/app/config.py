"""Application settings, loaded from environment / .env."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Loads the repo-root .env (two levels up from apps/api) when present.
    model_config = SettingsConfigDict(
        env_file=("../../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "bolao"

    # Auth / sessions
    session_secret: str = "dev-only-change-me"
    session_ttl_hours: int = 720
    magic_link_ttl_minutes: int = 15
    admin_emails: str = ""

    # Email (SMTP)
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = "Bolao 2026 <no-reply@bolao.local>"
    smtp_tls: bool = False

    # URLs
    web_base_url: str = "http://localhost:3000"
    api_base_url: str = "http://localhost:8000"

    # When true, make Python's SSL use the OS trust store (truststore) instead of certifi.
    # Needed on networks that do TLS interception with a corporate root CA (the SDK/httpx
    # otherwise rejects the intercepted cert). Default off so prod TLS is unchanged.
    use_system_trust_store: bool = False

    # LLM narratives (weekly wrap-ups)
    anthropic_api_key: str = ""
    narrative_model: str = "claude-haiku-4-5"

    @property
    def admin_email_set(self) -> set[str]:
        return {e.strip().lower() for e in self.admin_emails.split(",") if e.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
