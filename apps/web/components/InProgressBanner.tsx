"use client";

import { useEffect, useRef, useState } from "react";
import type { NextMatchTodayOut } from "@bolao/contracts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SectionHeader } from "@/components/SectionHeader";
import { stageBadge } from "@/lib/format";
import { venue } from "@/lib/venues";

const POLL_INTERVAL_MS = 60_000;

function LiveScore({ m }: { m: NextMatchTodayOut }) {
  if (m.live_home_score != null && m.live_away_score != null) {
    const isPen = m.live_phase === "P" || m.live_phase === "PEN";
    return (
      <span className="shrink-0 font-extrabold tabular-nums text-green-400">
        {isPen && m.live_penalty_home != null && (
          <span className="mr-0.5 text-xs font-normal">({m.live_penalty_home})</span>
        )}
        {m.live_home_score} – {m.live_away_score}
        {isPen && m.live_penalty_away != null && (
          <span className="ml-0.5 text-xs font-normal">({m.live_penalty_away})</span>
        )}
        {!isPen && m.live_elapsed != null && (
          <span className="ml-1 text-xs font-normal text-[var(--muted)]">{m.live_elapsed}&apos;</span>
        )}
      </span>
    );
  }
  return <span className="shrink-0 text-xs text-[var(--muted)]">×</span>;
}

export function InProgressBanner() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<NextMatchTodayOut[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetch = () => {
      api.inProgressMatches().then(setMatches).catch(() => {});
    };

    fetch();
    intervalRef.current = setInterval(fetch, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);

  // Stop polling when no matches are live
  useEffect(() => {
    if (matches.length === 0 && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [matches]);

  if (!user || matches.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <SectionHeader>
        Em andamento{matches.length > 1 && ` · ${matches.length} partidas`}
      </SectionHeader>
      <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-green-500/30 border-l-4 border-l-green-500 bg-[var(--surface-2)]">
        {matches.map((m) => {
          const v = venue(m.key);
          return (
            <div key={m.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-right font-medium">
                  {m.home_flag} {m.home_name}
                </span>
                <LiveScore m={m} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {m.away_flag} {m.away_name}
                </span>
                {["FT", "AET", "PEN"].includes(m.live_phase ?? "") ? (
                  <span className="inline-flex shrink-0 items-center rounded-full bg-[var(--muted)]/20 px-2.5 py-0.5 text-xs font-bold text-[var(--muted)]">
                    Encerrado
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-500 px-2.5 py-0.5 text-xs font-bold text-[#04210f]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#04210f]" />
                    Ao Vivo
                  </span>
                )}
              </div>
              <div className="mt-1 flex justify-between text-xs text-[var(--muted)]">
                <span>{stageBadge(m.stage, m.group_label)}</span>
                {v && <span>{v.stadium} · {v.city}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
