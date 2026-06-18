"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { NewsItemOut, NewsSource } from "@bolao/contracts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { relativeTime } from "@/lib/format";

const SOURCE_LABEL: Record<NewsSource, string> = {
  espn: "ESPN",
  ge: "ge",
  trivela: "Trivela",
};

function SourceBadge({ source }: { source: NewsSource }) {
  return (
    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--accent)]">
      {SOURCE_LABEL[source]}
    </span>
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
      {item.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image_url}
          alt=""
          loading="lazy"
          className="h-20 w-20 shrink-0 rounded-xl object-cover"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="line-clamp-3 text-sm font-semibold leading-snug">{item.title}</h2>
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Notícias</h1>
        <p className="text-sm text-[var(--muted)]">Copa do Mundo, hoje · ESPN, ge e Trivela</p>
      </div>

      {items === null && <p className="text-[var(--muted)]">Carregando…</p>}

      {items !== null && items.length === 0 && (
        <div className="card p-5 text-sm text-[var(--muted)]">
          Nenhuma notícia de hoje ainda.
        </div>
      )}

      {items !== null && items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <NewsCard key={item.link} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
