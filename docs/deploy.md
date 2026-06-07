# Deploy — all on Vercel, free

Runbook for putting Bolão online at $0: **two Vercel projects** from this one repo (`web`
Next.js + `api` FastAPI), MongoDB **Atlas M0**, and **Resend** for magic-link email. The web
proxies `/api/*` to the API via a Next.js rewrite, so the browser stays same-origin and the
`SameSite=Lax` session cookie keeps working.

```
Browser ─https─▶ web.vercel.app ──(Next rewrite /api/*)──▶ api.vercel.app ──▶ Atlas M0
                                                                  └─ magic links ─▶ Resend SMTP
```

## 1. MongoDB Atlas (free)

1. Create a free **M0** cluster.
2. **Database Access** → add a user (save the password).
3. **Network Access** → allow `0.0.0.0/0` (Vercel egress IPs are dynamic).
4. Copy the `mongodb+srv://USER:PASS@.../` connection string → this is `MONGODB_URI`.

## 2. Resend (free)

1. Sign up; add + verify a sending domain (or use the onboarding sender to start).
2. Create an API key.
3. SMTP settings: host `smtp.resend.com`, port `587`, user `resend`, password = the API key.

## 3. Vercel project `api` (FastAPI)

New Project → import this repo → **Root Directory: `apps/api`**, Framework Preset: **Other**.
(`apps/api/vercel.json` routes all paths to the `api/index.py` ASGI function; the Python
builder installs `apps/api/requirements.txt`. Ensure the project uses Python 3.12.)

Environment variables:

| Var | Value |
| --- | --- |
| `MONGODB_URI` | Atlas `mongodb+srv://…` |
| `MONGODB_DB` | `bolao` |
| `SESSION_SECRET` | output of `openssl rand -hex 32` |
| `ADMIN_EMAILS` | `lucas.m.s.lima+claude@gmail.com` |
| `WEB_BASE_URL` | `https://<web>.vercel.app` *(fill after step 5)* |
| `API_BASE_URL` | `https://<api>.vercel.app` *(this project's URL; drives the Secure cookie flag)* |
| `SMTP_HOST` | `smtp.resend.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USERNAME` | `resend` |
| `SMTP_PASSWORD` | `<Resend API key>` |
| `SMTP_FROM` | `Bolão 2026 <no-reply@yourdomain>` |
| `SMTP_TLS` | `true` |

Deploy → note the URL (e.g. `https://bolao-api.vercel.app`).

## 4. Seed Atlas once (from your machine)

```bash
cd apps/api
MONGODB_URI="mongodb+srv://…" MONGODB_DB=bolao uv run python -m app.seed
```

## 5. Vercel project `web` (Next.js)

New Project → same repo → **Root Directory: `apps/web`** (Vercel auto-detects Next.js + the
pnpm workspace).

Environment variables:

| Var | Value |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `/api` |
| `API_ORIGIN` | the `api` project URL from step 3 |

Deploy → note the URL (e.g. `https://bolao.vercel.app`).

## 6. Back-fill URLs (two-pass)

Set `WEB_BASE_URL` (and confirm `API_BASE_URL`) on the **`api`** project to the real URLs from
steps 3 & 5, then redeploy `api`. This is needed because each side references the other's final
URL (email links, cookie Secure flag).

## 7. Verify

- `https://<web>.vercel.app/api/health` → `{"status":"ok"}` (rewrite + function + DB init OK).
- Open the web URL → request a magic link → it arrives via Resend → click → logged in.
- Create a pool, submit a prediction, reload → it persists.
- As the admin email, open `/admin`, post a result → leaderboard updates.
- DevTools → Application → Cookies: `bolao_session` on the **web** origin, `Secure`,
  `HttpOnly`, `SameSite=Lax`.

## Notes & limits

- Cold starts ~1–2s after idle; Atlas M0 may auto-pause when long-idle. Fine at friends scale.
- Vercel Hobby is non-commercial. Resend free ≈ 100 emails/day.
- Custom domain later: add it to the `web` project (one CNAME); no code changes (URLs are
  env-driven). If cold starts ever annoy, move the `api` project to an always-on container
  (~$5/mo) — no web changes needed.
