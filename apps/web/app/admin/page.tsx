"use client";

import { useEffect, useMemo, useState } from "react";
import type { MatchOut, TeamOut } from "@bolao/contracts";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { STAGE_ORDER, formatKickoff, groupKickoffSort, sideLabel, stageLabel, teamMap } from "@/lib/format";

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
  const byStage = useMemo(() => {
    const groups: Record<string, MatchOut[]> = {};
    (matches ?? []).forEach((m) => (groups[m.stage] ??= []).push(m));
    Object.values(groups).forEach((l) => l.sort(groupKickoffSort));
    return groups;
  }, [matches]);

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

      {STAGE_ORDER.filter((s) => byStage[s]?.length).map((stage) => (
        <section key={stage}>
          <h2 className="mb-2 font-bold text-[var(--accent-2)]">{stageLabel(stage)}</h2>
          <div className="flex flex-col gap-2">
            {byStage[stage].map((m) => (
              <ResultRow key={m.id} match={m} tmap={tmap} onSaved={update} />
            ))}
          </div>
        </section>
      ))}
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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isKnockout = match.stage !== "group";
  const hasTeams = !!match.home_team_id && !!match.away_team_id;

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const saved = await api.setResult(match.id, {
        home_score: Number(home),
        away_score: Number(away),
        advancing_team_id: isKnockout ? advancing || null : null,
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
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erro ao limpar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 text-right text-sm font-medium">
          {sideLabel(match.home_team_id, tmap, match.slot_label ?? "A definir")}
        </div>
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
        <div className="flex-1 text-left text-sm font-medium">
          {sideLabel(match.away_team_id, tmap, "A definir")}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-[var(--muted)]">{formatKickoff(match.kickoff_at)}</span>
        <div className="flex items-center gap-2">
          {isKnockout && hasTeams && (
            <select
              className="input py-1.5 text-xs"
              value={advancing}
              onChange={(e) => setAdvancing(e.target.value)}
            >
              <option value="">Quem avança?</option>
              <option value={match.home_team_id!}>
                {sideLabel(match.home_team_id, tmap, "Casa")}
              </option>
              <option value={match.away_team_id!}>
                {sideLabel(match.away_team_id, tmap, "Fora")}
              </option>
            </select>
          )}
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
            disabled={busy || home === "" || away === "" || (isKnockout && !hasTeams)}
            onClick={save}
          >
            {busy ? "…" : "Salvar"}
          </button>
        </div>
      </div>
      {err && <p className="mt-1 text-right text-xs text-red-400">{err}</p>}
    </div>
  );
}
