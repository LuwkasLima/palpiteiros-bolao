"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export function TopBar() {
  const { user, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-extrabold">
          <span className="text-xl">⚽</span>
          <span>
            Social dos <span className="text-[var(--accent)]">Palpiteiros</span>
          </span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {user?.is_admin && (
            <Link href="/admin" className="text-[var(--muted)] hover:text-[var(--text)]">
              Admin
            </Link>
          )}
          {user ? (
            <button
              onClick={signOut}
              className="text-[var(--muted)] hover:text-[var(--text)]"
            >
              Sair
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
