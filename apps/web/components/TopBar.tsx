"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { LATEST_VERSION } from "@/lib/changelog";
import { WhatsNewModal } from "./WhatsNewModal";

function WhistleIcon({ dot }: { dot?: boolean }) {
  return (
    <span className="relative">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        {/* single connected silhouette: mouthpiece left + rounded body right */}
        <path
          d="M2 10.5h6V8h9a4 4 0 0 1 0 8H8v-2.5H2a1.5 1.5 0 0 1 0-3Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
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
  const close = () => setOpen(false);

  const hasUnseenChangelog = !!user && user.last_viewed_changelog_version !== LATEST_VERSION;

  useEffect(() => {
    if (hasUnseenChangelog) setShowWhatsNew(true);
  }, [hasUnseenChangelog]);

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
              <WhistleIcon dot={false} />
            </button>
          )}
        </div>
      </header>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-20 bg-black/50 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={close}
        aria-hidden
      />

      <WhatsNewModal isOpen={showWhatsNew} onClose={() => setShowWhatsNew(false)} />

      {/* Alerts panel */}
      <div
        className={`fixed right-0 top-0 z-30 flex h-full w-80 flex-col bg-[var(--surface)] shadow-2xl transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-bold text-lg">Notificações</h2>
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

        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden className="text-[var(--muted)] opacity-40">
            <path d="M20 5a11 11 0 0 1 11 11v6.5l2.5 4.5H6.5L9 22.5V16A11 11 0 0 1 20 5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M16 31a4 4 0 0 0 8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="text-sm font-medium text-[var(--muted)]">Nenhuma notificação</p>
          <p className="text-xs text-[var(--muted)] opacity-70">Em breve você receberá alertas sobre jogos e bolões aqui.</p>
        </div>
      </div>
    </>
  );
}
