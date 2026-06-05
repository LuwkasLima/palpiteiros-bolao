"""Token generation and hashing for magic links and sessions.

Tokens are high-entropy random strings handed to the client (in a magic-link URL or an
httpOnly cookie). Only their SHA-256 hash is stored, so a database leak does not expose
usable tokens.
"""

from __future__ import annotations

import hashlib
import secrets

SESSION_COOKIE = "bolao_session"


def new_token() -> str:
    """A fresh URL-safe random token."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# Unambiguous alphabet (no 0/O/1/I) for human-shareable invite codes.
_INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def new_invite_code(length: int = 8) -> str:
    return "".join(secrets.choice(_INVITE_ALPHABET) for _ in range(length))
