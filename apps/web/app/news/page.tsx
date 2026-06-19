"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { NewsItemOut, NewsSource } from "@bolao/contracts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { relativeTime } from "@/lib/format";

const SOURCE_LABEL: Record<NewsSource, string> = {
  espn: "ESPN",
  ge: "GE",
  trivela: "Trivela",
};

const SOURCES: NewsSource[] = ["espn", "ge", "trivela"];

function SourceBadge({ source }: { source: NewsSource }) {
  return (
    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--accent)]">
      {SOURCE_LABEL[source]}
    </span>
  );
}

function ArticlePlaceholder() {
  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)]">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-[var(--muted)]"
      >
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
        <path d="M18 14h-8" />
        <path d="M15 18h-5" />
        <path d="M10 6h8v4h-8V6Z" />
      </svg>
    </div>
  );
}

function NewsCard({ item }: { item: NewsItemOut }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="card flex gap-3 p-3 transition-colors hover:bg-[var(--surface-2)]"
    >
      {item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image_url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-24 w-24 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <ArticlePlaceholder />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</h2>
        {item.summary && (
          <p className="line-clamp-2 text-xs leading-snug text-[var(--muted)]">{item.summary}</p>
        )}
        <div className="mt-auto flex items-center gap-2 text-xs text-[var(--muted)]">
          <SourceBadge source={item.source} />
          <span>·</span>
          <span>{relativeTime(item.published_at)}</span>
        </div>
      </div>
    </a>
  );
}

export default function NewsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<NewsItemOut[] | null>(null);
  const [activeSource, setActiveSource] = useState<NewsSource | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    api.news().then(setItems).catch(() => setItems([]));
  }, [user]);

  if (loading || !user) {
    return <p className="mt-10 text-center text-[var(--muted)]">Carregando…</p>;
  }

  const filtered = activeSource ? (items ?? []).filter((i) => i.source === activeSource) : (items ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Notícias</h1>
        <p className="text-sm text-[var(--muted)]">Copa do Mundo, hoje · ESPN, GE e Trivela</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveSource(null)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            activeSource === null
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--fg)]"
          }`}
        >
          Todos
        </button>
        {SOURCES.map((src) => (
          <button
            key={src}
            onClick={() => setActiveSource(activeSource === src ? null : src)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
              activeSource === src
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--fg)]"
            }`}
          >
            {SOURCE_LABEL[src]}
          </button>
        ))}
      </div>

      {items === null && <p className="text-[var(--muted)]">Carregando…</p>}

      {items !== null && filtered.length === 0 && (
        <div className="card p-5 text-sm text-[var(--muted)]">
          Nenhuma notícia de hoje ainda.
        </div>
      )}

      {items !== null && filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map((item) => (
            <NewsCard key={item.link} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
