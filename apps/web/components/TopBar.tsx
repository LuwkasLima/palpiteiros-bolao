"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { LATEST_VERSION } from "@/lib/changelog";
import { NOTIFICATIONS } from "@/lib/notifications";
import { WhatsNewModal } from "./WhatsNewModal";

const DISMISSED_KEY = "bolao-dismissed-notifications";

function MailIcon({ dot }: { dot?: boolean }) {
  return (
    <span className="relative">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <rect x="2" y="5" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 8l9 6 9-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {dot && (
        <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--background)]" />
      )}
    </span>
  );
}

export function TopBar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(DISMISSED_KEY);
      if (!raw) return new Set();
      const stored = new Set(JSON.parse(raw) as string[]);
      const valid = new Set(NOTIFICATIONS.map((n) => n.id));
      return new Set([...stored].filter((id) => valid.has(id)));
    } catch {
      return new Set();
    }
  });
  const close = () => setOpen(false);

  const hasUnseenChangelog = !!user && user.last_viewed_changelog_version !== LATEST_VERSION;

  useEffect(() => {
    if (hasUnseenChangelog) setShowWhatsNew(true);
  }, [hasUnseenChangelog]);

  const visible = NOTIFICATIONS.filter((n) => !dismissed.has(n.id));
  const hasUnread = visible.length > 0;

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set([...prev, id]);
      try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-extrabold">
            <span className="text-xl">⚽</span>
            <span>
              Social dos <span className="text-[var(--accent)]">Palpiteiros</span>
            </span>
          </Link>
          {user && (
            <button
              onClick={() => setOpen(true)}
              className="-mr-1 p-2 text-[var(--muted)] active:text-[var(--text)]"
              aria-label="Abrir notificações"
            >
              <MailIcon dot={hasUnread} />
            </button>
          )}
        </div>
      </header>

      <WhatsNewModal isOpen={showWhatsNew} onClose={() => setShowWhatsNew(false)} />

      {/* Alerts panel — full screen */}
      <div
        className={`fixed inset-0 z-30 flex flex-col bg-[var(--background)] transition-transform duration-200 ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-bold">Notificações</h2>
          <button
            onClick={close}
            className="p-2 text-[var(--muted)] active:text-[var(--text)]"
            aria-label="Fechar"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path d="M1 1l16 16M17 1L1 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
          {visible.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm font-medium text-[var(--muted)]">Nenhuma notificação</p>
              <p className="text-xs text-[var(--muted)] opacity-70">Em breve você receberá alertas sobre jogos e bolões aqui.</p>
            </div>
          ) : (
            visible.map((n) => (
              <div key={n.id} className="card flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-[var(--muted)]">{n.time}</span>
                    <button
                      onClick={() => dismiss(n.id)}
                      className="text-[var(--muted)] hover:text-[var(--text)]"
                      aria-label="Dispensar notificação"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                        <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-[var(--muted)]">{n.body}</p>
                {n.cta && (
                  <button
                    onClick={() => { close(); setShowWhatsNew(true); }}
                    className="self-start text-sm font-medium text-[var(--accent)] underline underline-offset-2"
                  >
                    {n.cta.label}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
