"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

function BookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 3h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7h5M7 10h5M7 13h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M8 3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 14l4-4-4-4M17 10H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TopBar() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  const navLinkClass = (href: string) =>
    pathname === href
      ? "flex items-center gap-3 rounded-lg border-l-2 border-[var(--accent)] bg-[var(--surface-2)] px-4 py-3 text-xl text-[var(--accent)] active:opacity-75"
      : "flex items-center gap-3 rounded-lg border-l-2 border-transparent px-4 py-3 text-xl text-[var(--text)] active:bg-[var(--surface-2)]";

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
          <button
            onClick={() => setOpen(true)}
            className="-mr-1 p-2 text-[var(--muted)] active:text-[var(--text)]"
            aria-label="Abrir menu"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
              <rect y="4" width="22" height="2" rx="1" fill="currentColor" />
              <rect y="10" width="22" height="2" rx="1" fill="currentColor" />
              <rect y="16" width="22" height="2" rx="1" fill="currentColor" />
            </svg>
          </button>
        </div>
      </header>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-20 bg-black/50 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={close}
        aria-hidden
      />

      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 z-30 flex h-full w-72 flex-col bg-[var(--surface)] shadow-2xl transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-end px-4 py-4">
          <button
            onClick={close}
            className="p-2 text-[var(--muted)] active:text-[var(--text)]"
            aria-label="Fechar menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path d="M1 1l16 16M17 1L1 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {user && (
          <>
            <div className="px-6 pb-5">
              <p className="text-lg font-semibold text-[var(--text)]">{user.display_name}</p>
              <p className="text-sm text-[var(--muted)]">{user.email}</p>
            </div>
            <div className="mx-4 mb-3 border-t border-[var(--border)]" />
          </>
        )}

        <nav className="flex flex-col gap-2 px-2">
          <Link href="/regras" onClick={close} className={navLinkClass("/regras")}>
            <BookIcon />
            Regras
          </Link>
          {user?.is_admin && (
            <Link href="/admin" onClick={close} className={navLinkClass("/admin")}>
              <GearIcon />
              Admin
            </Link>
          )}
          {user && (
            <>
              <div className="mx-2 my-1 border-t border-[var(--border)]" />
              <button
                onClick={() => { signOut(); close(); }}
                className="flex items-center gap-3 rounded-lg border-l-2 border-transparent px-4 py-3 text-left text-xl text-[var(--muted)] active:bg-[var(--surface-2)] active:text-[var(--text)]"
              >
                <SignOutIcon />
                Sair
              </button>
            </>
          )}
        </nav>
      </div>
    </>
  );
}
