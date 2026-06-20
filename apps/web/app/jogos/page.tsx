"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MatchTodayOut } from "@bolao/contracts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SectionHeader } from "@/components/SectionHeader";
import { formatKickoffTime, stageBadge } from "@/lib/format";
import { venue } from "@/lib/venues";

function localDayBounds(): { dayStart: string; dayEnd: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { dayStart: start.toISOString(), dayEnd: end.toISOString() };
}

function MatchRow({ m, showScore }: { m: MatchTodayOut; showScore: boolean }) {
  const v = venue(m.key);
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="min-w-0 flex-1 truncate text-right font-medium">
          {m.home_flag} {m.home_name}
        </span>
        {showScore && m.home_score != null && m.away_score != null ? (
          <span className="shrink-0 font-extrabold tabular-nums text-[var(--accent)]">
            {m.home_score} – {m.away_score}
          </span>
        ) : (
          <span className="shrink-0 text-xs text-[var(--muted)]">×</span>
        )}
        <span className="min-w-0 flex-1 truncate font-medium">
          {m.away_flag} {m.away_name}
        </span>
      </div>
      <div className="mt-1 flex justify-between text-xs text-[var(--muted)]">
        <span>{stageBadge(m.stage, m.group_label)} · {formatKickoffTime(m.kickoff_at)}</span>
        {v && <span>{v.stadium} · {v.city}</span>}
      </div>
    </div>
  );
}

export default function JogosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<MatchTodayOut[] | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const { dayStart, dayEnd } = localDayBounds();
    api.matchesToday(dayStart, dayEnd).then(setMatches).catch(() => setMatches([]));
  }, [user]);

  if (loading || !user) {
    return <p className="mt-10 text-center text-[var(--muted)]">Carregando…</p>;
  }

  const now = new Date();
  const IN_PROGRESS_MS = 2 * 60 * 60 * 1000;

  const inProgress = (matches ?? []).filter((m) => {
    const ko = new Date(m.kickoff_at);
    return m.status !== "final" && ko <= now && now.getTime() - ko.getTime() < IN_PROGRESS_MS;
  });
  const upcoming = (matches ?? []).filter((m) => new Date(m.kickoff_at) > now && m.status !== "final");
  const finished = (matches ?? []).filter((m) => m.status === "final");

  const noMatches = matches !== null && matches.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Jogos de Hoje</h1>
        <p className="text-sm text-[var(--muted)]">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {matches === null && (
        <p className="text-[var(--muted)]">Carregando…</p>
      )}

      {noMatches && (
        <div className="card p-5 text-sm text-[var(--muted)]">
          Nenhum jogo hoje.
        </div>
      )}

      {inProgress.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionHeader>
            Em andamento{inProgress.length > 1 && ` · ${inProgress.length} partidas`}
          </SectionHeader>
          <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-green-500/30 border-l-4 border-l-green-500 bg-[var(--surface-2)]">
            {inProgress.map((m) => (
              <div key={m.id} className="relative">
                <span className="absolute right-4 top-3.5 inline-flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-0.5 text-xs font-bold text-[#04210f]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#04210f]" />
                  Ao Vivo
                </span>
                <MatchRow m={m} showScore={false} />
              </div>
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionHeader>
            {upcoming.length === 1 ? "Próxima partida" : "Ainda hoje"}
          </SectionHeader>
          <div className="card divide-y divide-[var(--border)] border-l-4 [border-left-color:var(--accent)]">
            {upcoming.map((m) => (
              <MatchRow key={m.id} m={m} showScore={false} />
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionHeader>Encerradas</SectionHeader>
          <div className="card divide-y divide-[var(--border)]">
            {finished.map((m) => (
              <MatchRow key={m.id} m={m} showScore={true} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
