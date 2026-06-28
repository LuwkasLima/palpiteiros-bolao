"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MatchOut, TeamOut } from "@bolao/contracts";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatKickoff, formatMatchDay, groupKickoffSort, matchDayKey, sideLabel, sideShortLabel, stageBadge, teamMap } from "@/lib/format";

export default function AdminPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchOut[] | null>(null);
  const [teams, setTeams] = useState<TeamOut[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.is_admin) return;
    Promise.all([api.matches(), api.teams()])
      .then(([m, t]) => {
        setMatches(m);
        setTeams(t);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar."));
  }, [user]);

  const tmap = useMemo(() => teamMap(teams), [teams]);
  const today = useMemo(() => new Date().toLocaleDateString("en-CA"), []);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const byDay = useMemo(() => {
    const groups: Record<string, MatchOut[]> = {};
    (matches ?? []).forEach((m) => (groups[matchDayKey(m.kickoff_at)] ??= []).push(m));
    Object.values(groups).forEach((l) => l.sort(groupKickoffSort));
    return groups;
  }, [matches]);
  const dayKeys = useMemo(() => Object.keys(byDay).sort(), [byDay]);

  useEffect(() => {
    if (!dayKeys.length) return;
    const el = sectionRefs.current[today];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [dayKeys, today]);

  if (error) return <p className="mt-10 text-center text-red-400">{error}</p>;
  if (!matches) return <p className="mt-10 text-center text-[var(--muted)]">Carregando…</p>;

  function update(saved: MatchOut) {
    setMatches((prev) => prev!.map((m) => (m.id === saved.id ? saved : m)));
  }

  return (
    <>
      <h1 className="text-2xl font-extrabold">Admin · Resultados</h1>
      <p className="text-sm text-[var(--muted)]">
        Informe o placar do tempo normal (90 min). Nos mata-matas, escolha quem avança.
      </p>

      {dayKeys.map((day) => {
        const isToday = day === today;
        return (
          <section key={day} ref={(el) => { sectionRefs.current[day] = el; }} className="scroll-mt-16">
            <h2 className={`mb-2 font-bold ${isToday ? "text-[var(--accent)]" : "text-[var(--accent-2)]"}`}>
              {formatMatchDay(day)}
            </h2>
            <div className={`card divide-y divide-[var(--border)]${isToday ? " ring-1 ring-[var(--accent)]" : ""}`}>
              {byDay[day].map((m) => (
                <ResultRow key={m.id} match={m} tmap={tmap} onSaved={update} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

function ResultRow({
  match,
  tmap,
  onSaved,
}: {
  match: MatchOut;
  tmap: ReturnType<typeof teamMap>;
  onSaved: (m: MatchOut) => void;
}) {
  const [home, setHome] = useState(match.home_score !== null ? String(match.home_score) : "");
  const [away, setAway] = useState(match.away_score !== null ? String(match.away_score) : "");
  const [advancing, setAdvancing] = useState(match.advancing_team_id ?? "");
  const [penaltyHome, setPenaltyHome] = useState(match.penalty_home_score !== null ? String(match.penalty_home_score) : "");
  const [penaltyAway, setPenaltyAway] = useState(match.penalty_away_score !== null ? String(match.penalty_away_score) : "");
  const [penaltyOpen, setPenaltyOpen] = useState(match.penalty_home_score !== null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isKnockout = match.stage !== "group";
  const hasTeams = !!match.home_team_id && !!match.away_team_id;

  const penaltyScores = penaltyHome !== "" && penaltyAway !== ""
    ? { penalty_home_score: Number(penaltyHome), penalty_away_score: Number(penaltyAway) }
    : { penalty_home_score: null, penalty_away_score: null };

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const saved = await api.setResult(match.id, {
        home_score: Number(home),
        away_score: Number(away),
        advancing_team_id: isKnockout ? advancing || null : null,
        ...(isKnockout ? penaltyScores : {}),
      });
      onSaved(saved);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    setErr(null);
    try {
      const saved = await api.clearResult(match.id);
      onSaved(saved);
      setHome("");
      setAway("");
      setAdvancing("");
      setPenaltyHome("");
      setPenaltyAway("");
      setPenaltyOpen(false);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erro ao limpar.");
    } finally {
      setBusy(false);
    }
  }

  const homeShort = sideShortLabel(match.home_team_id, tmap, match.slot_label ?? "A definir");
  const awayShort = sideShortLabel(match.away_team_id, tmap, match.slot_label ?? "A definir");

  const scoreInputs = (
    <div className="flex items-center gap-1">
      <input
        className="score-input"
        inputMode="numeric"
        value={home}
        onChange={(e) => setHome(e.target.value.replace(/\D/g, "").slice(0, 2))}
      />
      <span className="text-[var(--muted)]">×</span>
      <input
        className="score-input"
        inputMode="numeric"
        value={away}
        onChange={(e) => setAway(e.target.value.replace(/\D/g, "").slice(0, 2))}
      />
    </div>
  );

  return (
    <div className="p-3">
      {isKnockout ? (
        <div className="grid grid-cols-[1fr_1px_auto] items-center gap-y-1">
          {/* Label row */}
          {hasTeams ? <span className="pr-4 text-xs text-[var(--muted)]">Avança</span> : <div />}
          <div className="row-span-2 self-stretch bg-[var(--border)]" />
          <span className="pl-4 text-xs text-[var(--muted)]">Placar</span>

          {/* Content row */}
          {hasTeams ? (
            <div className="flex gap-2 pr-4">
              {([
                { id: match.home_team_id!, label: homeShort },
                { id: match.away_team_id!, label: awayShort },
              ] as { id: string; label: string }[]).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setAdvancing(advancing === id ? "" : id)}
                  className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    advancing === id
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--muted)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : <div />}
          <div className="pl-4">{scoreInputs}</div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 text-right text-sm font-medium">
            {sideLabel(match.home_team_id, tmap, match.slot_label ?? "A definir")}
          </div>
          {scoreInputs}
          <div className="flex-1 text-left text-sm font-medium">
            {sideLabel(match.away_team_id, tmap, "A definir")}
          </div>
        </div>
      )}

      {match.status === "final" && match.home_score !== null && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="text-[var(--muted)]">Salvo:</span>
          <span className="chip font-semibold">{match.home_score} × {match.away_score}</span>
          {match.penalty_home_score !== null && (
            <>
              <span className="text-[var(--muted)]">Pênaltis:</span>
              <span className="chip font-semibold">{match.penalty_home_score} × {match.penalty_away_score}</span>
            </>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <span>{formatKickoff(match.kickoff_at)}</span>
          <span>{stageBadge(match.stage, match.group_label)}</span>
        </div>
        <div className="flex items-center gap-2">
          {match.status === "final" && <span className="chip">final</span>}
          {match.status === "final" && (
            <button
              className="btn-ghost px-3 py-1.5 text-sm text-red-400"
              disabled={busy}
              onClick={clear}
            >
              Limpar
            </button>
          )}
          <button
            className="btn px-3 py-1.5 text-sm"
            disabled={busy || home === "" || away === "" || (isKnockout && hasTeams && !advancing)}
            onClick={save}
          >
            {busy ? "…" : "Salvar"}
          </button>
        </div>
      </div>
      {isKnockout && (
        <div className={`mt-2 -mx-3 border-y border-[var(--border)] transition-colors ${penaltyOpen ? "bg-[var(--accent)]/8" : ""}`}>
          <button
            className="flex w-full items-center justify-between px-3 py-2.5 text-xs text-[var(--muted)]"
            onClick={() => {
              if (match.status === "final" && match.penalty_home_score !== null) return;
              setPenaltyOpen((o) => !o);
            }}
          >
            <span className={penaltyOpen ? "font-medium text-[var(--accent)]" : ""}>Pênaltis</span>
            {!(match.status === "final" && match.penalty_home_score !== null) && (
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="none"
                className={`transition-transform duration-200 ${penaltyOpen ? "rotate-180" : ""}`}
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          {penaltyOpen && (
            <div className="flex items-center justify-center gap-2 pb-2.5">
              <input
                className="score-input"
                inputMode="numeric"
                placeholder="—"
                value={penaltyHome}
                onChange={(e) => setPenaltyHome(e.target.value.replace(/\D/g, "").slice(0, 2))}
              />
              <span className="text-[var(--muted)]">×</span>
              <input
                className="score-input"
                inputMode="numeric"
                placeholder="—"
                value={penaltyAway}
                onChange={(e) => setPenaltyAway(e.target.value.replace(/\D/g, "").slice(0, 2))}
              />
            </div>
          )}
        </div>
      )}

      {err && <p className="mt-1 text-right text-xs text-red-400">{err}</p>}
    </div>
  );
}
