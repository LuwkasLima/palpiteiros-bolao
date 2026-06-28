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
  const [showFab, setShowFab] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowFab(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
        className={`fixed bottom-24 left-1/2 z-20 -translate-x-1/2 flex items-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--background)]/90 px-5 py-3 text-sm font-semibold text-[var(--text)] shadow-lg backdrop-blur transition-opacity duration-200 active:opacity-75 ${showFab ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
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
  const [advancingId, setAdvancingId] = useState<string | null>(pred?.advancing_team_id ?? null);
  const [state, setState] = useState<SaveState>("idle");

  const isKnockout = match.stage !== "group";
  const teamsKnown = match.home_team_id !== null && match.away_team_id !== null;

  const homeShort = sideShortLabel(match.home_team_id, tmap, match.slot_label ?? "A definir");
  const awayShort = sideShortLabel(match.away_team_id, tmap, match.slot_label ?? "A definir");
  const homeName = sideName(match.home_team_id, tmap);
  const awayName = sideName(match.away_team_id, tmap);

  async function save() {
    if (match.is_locked) return;
    if (home === "" || away === "") return;
    const h = Number(home);
    const a = Number(away);
    if (h === pred?.home_score && a === pred?.away_score && advancingId === pred?.advancing_team_id) return;
    setState("saving");
    try {
      const saved = await api.savePrediction(poolId, match.id, {
        home_score: h,
        away_score: a,
        advancing_team_id: isKnockout ? advancingId : undefined,
      });
      onSaved(saved);
      setState("saved");
      setTimeout(() => setState("idle"), 1200);
    } catch {
      setState("error");
    }
  }

  async function saveAdvancing(id: string | null) {
    if (match.is_locked) return;
    setAdvancingId(id);
    if (home === "" || away === "") return;
    setState("saving");
    try {
      const saved = await api.savePrediction(poolId, match.id, {
        home_score: Number(home),
        away_score: Number(away),
        advancing_team_id: id,
      });
      onSaved(saved);
      setState("saved");
      setTimeout(() => setState("idle"), 1200);
    } catch {
      setState("error");
    }
  }

  const final = match.status === "final";
  const pts = final ? (pred ? matchPoints(pred, match) : 0) : null;

  const advancingLabel =
    advancingId === match.home_team_id
      ? homeShort
      : advancingId === match.away_team_id
        ? awayShort
        : null;

  const advancingCorrect =
    pred?.advancing_team_id != null &&
    match.advancing_team_id != null &&
    pred.advancing_team_id === match.advancing_team_id;

  const scoreInputs = (
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
  );

  const statusContent = final ? (
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
  );

  return (
    <div className="p-3">
      {isKnockout ? (
        /* Knockout layout: 4-col grid — picker | divider | score | status */
        <div className="grid grid-cols-[1fr_1px_auto_auto] items-center gap-y-1">
          {/* Label row */}
          {teamsKnown
            ? <span className="pr-4 text-xs text-[var(--muted)]">Avança</span>
            : <div />}
          <div className="row-span-2 self-stretch bg-[var(--border)]" />
          <span className="pl-4 text-xs text-[var(--muted)]">Placar</span>
          <div className="w-20" />

          {/* Content row */}
          {teamsKnown ? (
            final ? (
              <span className={`pr-4 text-sm font-medium ${advancingCorrect ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                {advancingLabel ?? "—"}{pred?.advancing_team_id != null ? (advancingCorrect ? " ✓" : " ✗") : ""}
              </span>
            ) : match.is_locked ? (
              <span className="pr-4 text-sm font-medium">{advancingLabel ?? "—"}</span>
            ) : (
              <div className="flex gap-2 pr-4">
                {([
                  { id: match.home_team_id!, label: homeShort },
                  { id: match.away_team_id!, label: awayShort },
                ] as { id: string; label: string }[]).map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => saveAdvancing(advancingId === id ? null : id)}
                    className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      advancingId === id
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--muted)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )
          ) : <div />}
          <div className="pl-4">{scoreInputs}</div>
          <div className="w-20 text-right text-xs leading-tight">{statusContent}</div>
        </div>
      ) : (
        /* Group layout: original flanking design */
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-right text-sm font-medium">{homeShort}</div>
            {scoreInputs}
            <div className="flex-1 text-left text-sm font-medium">{awayShort}</div>
            <div className="shrink-0 whitespace-nowrap text-right text-xs leading-tight">{statusContent}</div>
          </div>
          {(homeName || awayName) && (
            <div className="mt-0.5 flex justify-between text-xs text-[var(--muted)]">
              <span>{homeName}</span>
              <span>{awayName}</span>
            </div>
          )}
        </>
      )}

      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
        <span className="shrink-0">{stageBadge(match.stage, match.group_label)}</span>
        {venueInfo && <span className="min-w-0 truncate text-right">{venueInfo.stadium} · {venueInfo.city}</span>}
      </div>
    </div>
  );
}
