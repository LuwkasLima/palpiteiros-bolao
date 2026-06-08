"""Vercel serverless entry for the FastAPI app.

Vercel serves files under `<root>/api` as functions; the Python runtime serves the ASGI
`app` exposed here. `apps/api/vercel.json` rewrites every path to this function, so FastAPI
does its own routing (`/auth/...`, `/pools/...`, etc.).
"""

import os
import sys

# Make the `app` package (apps/api/app) importable regardless of Vercel's CWD.
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.main import app  # noqa: E402  (ASGI app Vercel serves)

__all__ = ["app"]
