"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LeaderboardOut, MatchOut, RevealedPredictionsOut } from "@bolao/contracts";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const STAGE_LABEL: Record<string, string> = {
  group: "Grupos",
  r32: "Rodada de 32",
  r16: "Oitavas",
  qf: "Quartas",
  sf: "Semi",
  third: "3º Lugar",
  final: "Final",
};

const toUtc = (iso: string) => (/Z|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z");

const V2_CUTOFF_MS = new Date("2026-06-18T02:00:00Z").getTime();

// Mirrors the Python scoring service tier logic (scoring.py base_points / _base_points_v1).
function scoreTier(
  predHome: number,
  predAway: number,
  actHome: number | null,
  actAway: number | null,
  isV2: boolean,
): { label: string; color: string } | null {
  if (actHome === null || actAway === null) return null;
  const predOut = predHome > predAway ? "H" : predHome < predAway ? "A" : "D";
  const actOut = actHome > actAway ? "H" : actHome < actAway ? "A" : "D";
  if (predOut !== actOut) return null;
  if (predHome === actHome && predAway === actAway) {
    return { label: "Placar exato", color: "text-yellow-400" };
  }
  if (!isV2) {
    if (actOut !== "D" && predHome - predAway === actHome - actAway) {
      return { label: "Diferença certa", color: "text-blue-400" };
    }
    return { label: "Resultado certo", color: "text-green-400" };
  }
  const totalError = Math.abs(predHome - actHome) + Math.abs(predAway - actAway);
  if (actOut === "D") {
    return totalError === 2
      ? { label: "Quase exato", color: "text-orange-400" }
      : { label: "Resultado certo", color: "text-green-400" };
  }
  if (totalError === 1) return { label: "Quase exato", color: "text-orange-400" };
  if (predHome - predAway === actHome - actAway) {
    return { label: "Diferença certa", color: "text-blue-400" };
  }
  return { label: "Resultado certo", color: "text-green-400" };
}

function rankTitle(rank: number, total: number): { label: string; color: string } | null {
  if (rank === 1) return { label: "Profeta", color: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10" };
  if (rank === 2) return { label: "Profissional", color: "text-slate-300 border-slate-400/40 bg-slate-400/10" };
  if (rank === 3) return { label: "Botequeiro", color: "text-orange-400 border-orange-500/40 bg-orange-500/10" };
  if (rank === total && total > 3) return { label: "Corneteiro", color: "text-red-400 border-red-500/40 bg-red-500/10" };
  return null;
}

export default function MemberPage({
  params,
}: {
  params: Promise<{ id: string; userId: string }>;
}) {
  const { id, userId } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [leaderboard, setLeaderboard] = useState<LeaderboardOut | null>(null);
  const [revealed, setRevealed] = useState<RevealedPredictionsOut | null>(null);
  const [allMatches, setAllMatches] = useState<MatchOut[] | null>(null);
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
    Promise.all([api.leaderboard(id), api.revealedPredictions(id), api.matches()])
      .then(([lb, rv, ms]) => {
        setLeaderboard(lb);
        setRevealed(rv);
        setAllMatches(ms);
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
          setError("Este bolão não existe ou você não tem acesso.");
        } else {
          setError(err instanceof ApiError ? err.message : "Não foi possível carregar os dados.");
        }
      });
  }, [id, user]);

  if (error)
    return (
      <div className="mt-10 flex flex-col items-center gap-4 text-center">
        <p className="text-red-400">{error}</p>
        <Link href={`/pools/${id}`} className="text-sm text-[var(--muted)] hover:text-[var(--text)]">
          ← Bolão
        </Link>
      </div>
    );

  if (!leaderboard || !revealed || !allMatches)
    return <p className="mt-10 text-center text-[var(--muted)]">Carregando…</p>;

  const playerRow = leaderboard.rows.find((r) => r.user_id === userId);
  if (!playerRow)
    return (
      <div className="mt-10 flex flex-col items-center gap-4 text-center">
        <p className="text-[var(--muted)]">Usuário não encontrado neste bolão.</p>
        <Link href={`/pools/${id}`} className="text-sm text-[var(--muted)] hover:text-[var(--text)]">
          ← Bolão
        </Link>
      </div>
    );

  const rank = leaderboard.rows.findIndex((r) => r.user_id === userId) + 1;
  const title = rankTitle(rank, leaderboard.rows.length);
  const matchMeta = new Map(allMatches.map((m) => [m.id, m]));
  const isOwnProfile = user?.id === userId;

  const playerMatches = revealed.matches
    .map((m) => ({
      revealedMatch: m,
      entry: m.entries.find((e) => e.user_id === userId),
      meta: matchMeta.get(m.match_id),
    }))
    .filter(
      (pm): pm is typeof pm & { entry: NonNullable<typeof pm.entry> } =>
        pm.entry != null,
    )
    .sort(
      (a, b) =>
        new Date(toUtc(b.revealedMatch.kickoff_at)).getTime() -
        new Date(toUtc(a.revealedMatch.kickoff_at)).getTime(),
    );

  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-6">
      {/* Top bar — same pattern as predict page */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-extrabold">
            {playerRow.display_name}
            {isOwnProfile && (
              <span className="ml-2 text-sm font-normal text-[var(--muted)]">(você)</span>
            )}
          </h1>
          {title && (
            <span
              className={`self-start rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${title.color}`}
            >
              {title.label}
            </span>
          )}
        </div>
        <Link
          href={`/pools/${id}`}
          className="text-sm text-[var(--muted)] hover:text-[var(--text)]"
        >
          ← Bolão
        </Link>
      </div>

      {/* Rank + Points together on the right */}
      <div className="flex justify-end">
        <div className="text-right">
          <div className="text-3xl font-extrabold text-[var(--accent)]">
            {playerRow.points} pts
          </div>
          <div className="text-sm text-[var(--muted)]">#{rank} na classificação</div>
        </div>
      </div>

      {/* Stats breakdown — 4 tiers */}
      <div className="card flex justify-around py-3 text-center">
        <div>
          <div className="text-lg font-bold">{playerRow.exact_count}</div>
          <div className="text-xs text-[var(--muted)]">🎯 exatos</div>
        </div>
        <div>
          <div className="text-lg font-bold">{playerRow.near_count}</div>
          <div className="text-xs text-[var(--muted)]">✨ quase</div>
        </div>
        <div>
          <div className="text-lg font-bold">{playerRow.margin_count}</div>
          <div className="text-xs text-[var(--muted)]">↔ diferença</div>
        </div>
        <div>
          <div className="text-lg font-bold">{playerRow.outcome_count}</div>
          <div className="text-xs text-[var(--muted)]">✓ resultado</div>
        </div>
      </div>

      {/* Predictions list */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Palpites revelados{playerMatches.length > 0 && ` · ${playerMatches.length} jogos`}
        </h2>
        {playerMatches.length === 0 ? (
          <div className="card p-6 text-center text-[var(--muted)]">
            Ainda não há palpites revelados.
          </div>
        ) : (
          <div className="card divide-y divide-[var(--border)]">
            {playerMatches.map(({ revealedMatch: m, entry, meta }) => {
              const pts = entry.points ?? 0;
              const ptsColor = pts > 0 ? "text-green-400" : "text-[var(--muted)]";
              const stage = meta ? (STAGE_LABEL[meta.stage] ?? meta.stage) : null;
              const weight = meta?.round_weight;
              const isV2 = new Date(toUtc(m.kickoff_at)).getTime() >= V2_CUTOFF_MS;
              const scoringRound = isV2 ? "Rodada 2" : "Rodada 1";
              const tier = scoreTier(
                entry.home_score,
                entry.away_score,
                m.home_score,
                m.away_score,
                isV2,
              );
              const date = new Date(toUtc(m.kickoff_at)).toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "short",
              });
              return (
                <div key={m.match_id} className="flex items-center justify-between p-3.5">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-2)]">
                        {scoringRound}
                      </span>
                      {stage && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                          {stage}
                          {weight && weight > 1 && ` ×${weight}`}
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--muted)]">{date}</span>
                    </div>
                    <div className="text-sm font-semibold">
                      {m.home_team_name ?? "?"} {m.home_score} × {m.away_score}{" "}
                      {m.away_team_name ?? "?"}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      Palpite: {entry.home_score}–{entry.away_score}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-extrabold ${ptsColor}`}>
                      {pts > 0 ? `+${pts}` : "–"}
                    </div>
                    {tier && (
                      <div className={`text-[10px] font-semibold ${tier.color}`}>
                        {tier.label}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FAB — same as predict page */}
      <Link
        href={`/pools/${id}`}
        className={`fixed bottom-24 left-1/2 z-20 -translate-x-1/2 flex items-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--background)]/90 px-5 py-3 text-sm font-semibold text-[var(--text)] shadow-lg backdrop-blur transition-opacity duration-200 active:opacity-75 ${showFab ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Bolão
      </Link>
    </main>
  );
}
