"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

function PoolsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <circle cx="11" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 19c0-3.866 3.134-7 7-7h0c3.866 0 7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="17" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M19.5 17c0-2.485-1.567-4.614-3.75-5.438" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="3" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 9h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 3v4M15 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11" cy="14" r="1.5" fill="currentColor" />
    </svg>
  );
}

function NewsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="2" y="4" width="13" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 8h5M6 11h5M6 14h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 7h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <circle cx="11" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 19c0-3.866 3.134-7 7-7h0c3.866 0 7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const TABS = [
  { href: "/", label: "Bolões", Icon: PoolsIcon, matchExact: true },
  { href: "/jogos", label: "Jogos", Icon: CalendarIcon, matchExact: false },
  { href: "/news", label: "Notícias", Icon: NewsIcon, matchExact: false },
  { href: "/perfil", label: "Perfil", Icon: ProfileIcon, matchExact: false },
] as const;

const HIDE_ON = ["/login", "/onboarding", "/auth/verify", "/offline"];

export function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user || HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-10 border-t border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-2xl pb-safe">
        {TABS.map(({ href, label, Icon, matchExact }) => {
          const active = matchExact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
                active ? "text-[var(--accent)]" : "text-[var(--muted)]"
              }`}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
