"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MatchOut, PredictionOut, TeamOut } from "@bolao/contracts";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatKickoffTime, formatMatchDay, groupKickoffSort, matchDayKey, matchPoints, sideName, sideShortLabel, stageBadge, teamMap } from "@/lib/format";
import { venue, type Venue } from "@/lib/venues";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function PredictPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: poolId } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [matches, setMatches] = useState<MatchOut[] | null>(null);
  const [teams, setTeams] = useState<TeamOut[]>([]);
  const [preds, setPreds] = useState<Record<string, PredictionOut>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([api.matches(), api.teams(), api.myPredictions(poolId)])
      .then(([m, t, p]) => {
        setMatches(m);
        setTeams(t);
        setPreds(Object.fromEntries(p.map((x) => [x.match_id, x])));
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Não foi possível carregar os jogos."),
      );
  }, [poolId, user]);

  const tmap = useMemo(() => teamMap(teams), [teams]);
  const today = useMemo(() => new Date().toLocaleDateString("en-CA"), []);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const byDay = useMemo(() => {
    const groups: Record<string, MatchOut[]> = {};
    (matches ?? []).forEach((m) => (groups[matchDayKey(m.kickoff_at)] ??= []).push(m));
    Object.values(groups).forEach((list) => list.sort(groupKickoffSort));
    return groups;
  }, [matches]);
  const dayKeys = useMemo(() => Object.keys(byDay).sort(), [byDay]);

  useEffect(() => {
    if (!dayKeys.length) return;
    const el = sectionRefs.current[today];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [dayKeys, today]);

  if (error) return <p className="mt-10 text-center text-red-400">{error}</p>;
  if (!matches) return <p className="mt-10 text-center text-[var(--muted)]">Carregando jogos…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Meus palpites</h1>
        <Link href={`/pools/${poolId}`} className="text-sm text-[var(--muted)] hover:text-[var(--text)]">
          ← Bolão
        </Link>
      </div>

      {dayKeys.map((day) => {
        const isToday = day === today;
        return (
        <section key={day} ref={(el) => { sectionRefs.current[day] = el; }} className="scroll-mt-16">
          <h2 className={`mb-2 font-bold ${isToday ? "text-[var(--accent)]" : "text-[var(--accent-2)]"}`}>{formatMatchDay(day)}</h2>
          <div className={`card divide-y divide-[var(--border)]${isToday ? " ring-1 ring-[var(--accent)]" : ""}`}>
            {byDay[day].map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                tmap={tmap}
                pred={preds[m.id]}
                poolId={poolId}
                venue={venue(m.key)}
                onSaved={(p) => setPreds((prev) => ({ ...prev, [m.id]: p }))}
              />
            ))}
          </div>
        </section>
        );
      })}

      <Link
        href={`/pools/${poolId}`}
        className="fixed bottom-6 right-6 z-20 flex items-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--background)]/90 px-5 py-3 text-sm font-semibold text-[var(--text)] shadow-lg backdrop-blur active:opacity-75"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Bolão
      </Link>
    </div>
  );
}

function MatchRow({
  match,
  tmap,
  pred,
  poolId,
  venue: venueInfo,
  onSaved,
}: {
  match: MatchOut;
  tmap: ReturnType<typeof teamMap>;
  pred?: PredictionOut;
  poolId: string;
  venue?: Venue;
  onSaved: (p: PredictionOut) => void;
}) {
  const [home, setHome] = useState<string>(pred ? String(pred.home_score) : "");
  const [away, setAway] = useState<string>(pred ? String(pred.away_score) : "");
  const [state, setState] = useState<SaveState>("idle");

  const homeShort = sideShortLabel(match.home_team_id, tmap, match.slot_label ?? "A definir");
  const awayShort = sideShortLabel(match.away_team_id, tmap, match.slot_label ?? "A definir");
  const homeName = sideName(match.home_team_id, tmap);
  const awayName = sideName(match.away_team_id, tmap);

  async function save() {
    if (match.is_locked) return;
    if (home === "" || away === "") return;
    const h = Number(home);
    const a = Number(away);
    if (h === pred?.home_score && a === pred?.away_score) return;
    setState("saving");
    try {
      const saved = await api.savePrediction(poolId, match.id, { home_score: h, away_score: a });
      onSaved(saved);
      setState("saved");
      setTimeout(() => setState("idle"), 1200);
    } catch {
      setState("error");
    }
  }

  const final = match.status === "final";
  const pts = final ? (pred ? matchPoints(pred, match) : 0) : null;

  return (
    <div className="p-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 text-right text-sm font-medium">{homeShort}</div>
        <div className="flex items-center gap-1">
          <input
            className="score-input"
            inputMode="numeric"
            value={home}
            disabled={match.is_locked}
            onChange={(e) => setHome(e.target.value.replace(/\D/g, "").slice(0, 2))}
            onBlur={save}
          />
          <span className="text-[var(--muted)]">×</span>
          <input
            className="score-input"
            inputMode="numeric"
            value={away}
            disabled={match.is_locked}
            onChange={(e) => setAway(e.target.value.replace(/\D/g, "").slice(0, 2))}
            onBlur={save}
          />
        </div>
        <div className="flex-1 text-left text-sm font-medium">{awayShort}</div>
        <div className="ml-1 w-20 text-right text-xs leading-tight">
          {final ? (
            <>
              <span className="chip">{match.home_score}×{match.away_score}</span>
              {pts != null && (
                <span className={`mt-1 block font-bold ${pts > 0 ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                  {pts > 0 ? "+" : ""}{pts} pts
                </span>
              )}
            </>
          ) : match.is_locked ? (
            <span className="text-[var(--muted)]">🔒 fechado</span>
          ) : state === "saving" ? (
            <span className="text-[var(--muted)]">salvando…</span>
          ) : state === "saved" ? (
            <span className="text-[var(--accent)]">✓ salvo</span>
          ) : state === "error" ? (
            <span className="text-red-400">erro</span>
          ) : (
            <span className="text-[var(--muted)]">{formatKickoffTime(match.kickoff_at)}</span>
          )}
        </div>
      </div>
      {(homeName || awayName) && (
        <div className="mt-0.5 flex justify-between text-xs text-[var(--muted)]">
          <span>{homeName}</span>
          <span>{awayName}</span>
        </div>
      )}
      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
        <span className="shrink-0">{stageBadge(match.stage, match.group_label)}</span>
        {venueInfo && <span className="min-w-0 truncate text-right">{venueInfo.stadium} · {venueInfo.city}</span>}
      </div>
    </div>
  );
}
