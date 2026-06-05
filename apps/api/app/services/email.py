"""Outbound email via SMTP.

In local dev this points at Mailpit (localhost:1025), so nothing actually leaves the
machine — open http://localhost:8025 to read messages. Swap the SMTP_* env vars for a real
provider in production.
"""

from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.config import Settings, get_settings


def send_email(to: str, subject: str, body: str, settings: Settings | None = None) -> None:
    settings = settings or get_settings()

    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        if settings.smtp_tls:
            smtp.starttls()
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(msg)


def send_magic_link(to: str, link: str, settings: Settings | None = None) -> None:
    body = (
        "Olá!\n\n"
        "Clique no link abaixo para entrar no Bolão da Copa 2026 "
        "(válido por alguns minutos):\n\n"
        f"{link}\n\n"
        "Se você não pediu este acesso, pode ignorar este e-mail.\n"
    )
    send_email(to, "Seu acesso ao Bolão 2026", body, settings=settings)
