"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CHANGELOG, LATEST_VERSION } from "@/lib/changelog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsNewModal({ isOpen, onClose }: Props) {
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const latest = CHANGELOG[0];
  const previous = CHANGELOG.slice(1);

  async function handleClose() {
    setLoading(true);
    try {
      await api.markChangelogSeen(LATEST_VERSION);
      await refresh();
    } finally {
      setLoading(false);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="card flex w-full max-w-md flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
              O que há de novo
            </p>
            <h2 className="mt-1 text-xl font-bold text-[var(--text)]">{latest.title}</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="mt-0.5 shrink-0 p-1 text-[var(--muted)] active:text-[var(--text)]"
            aria-label="Fechar"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path d="M1 1l16 16M17 1L1 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <ul className="flex flex-col gap-2">
          {latest.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[var(--text)]">
              <span className="mt-0.5 shrink-0 text-[var(--accent)]">✦</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {previous.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer list-none text-xs text-[var(--muted)] underline-offset-2 hover:underline">
              Ver versões anteriores
            </summary>
            <div className="mt-3 flex flex-col gap-4">
              {previous.map((entry) => (
                <div key={entry.version}>
                  <p className="text-xs font-semibold text-[var(--muted)]">{entry.title}</p>
                  <ul className="mt-1 flex flex-col gap-1">
                    {entry.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[var(--muted)]">
                        <span className="mt-0.5 shrink-0">✦</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        )}

        <button
          className="btn w-full"
          onClick={handleClose}
          disabled={loading}
        >
          {loading ? "Salvando…" : "Entendi!"}
        </button>
      </div>
    </div>
  );
}
