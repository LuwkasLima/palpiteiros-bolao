"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LeaderboardOut, MatchRevealedOut, PoolOut, RevealedPredictionsOut, WeeklyHeroOut, WeeklyTitlesOut } from "@bolao/contracts";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SectionHeader } from "@/components/SectionHeader";
import { InProgressBanner } from "@/components/InProgressBanner";

export default function PoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pool, setPool] = useState<PoolOut | null>(null);
  const [board, setBoard] = useState<LeaderboardOut | null>(null);
  const [revealed, setRevealed] = useState<RevealedPredictionsOut | null>(null);
  const [weeklyHero, setWeeklyHero] = useState<WeeklyHeroOut | null>(null);
  const [weeklyTitles, setWeeklyTitles] = useState<WeeklyTitlesOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { isEndOfWeek, weekStart, weekEnd } = (() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun … 6=Sat (local time)
    const start = new Date(now);
    // On Sunday the current week just started — show the week that just closed
    // (last Sun → yesterday Sat) instead of the empty current week.
    const daysBack = day === 0 ? 7 : day;
    start.setDate(now.getDate() - daysBack);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { isEndOfWeek: day === 0, weekStart: start.toISOString(), weekEnd: end.toISOString() };
  })();
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const base = Promise.all([api.pool(id), api.leaderboard(id), api.revealedPredictions(id)])
      .then(([p, b, r]) => {
        setPool(p);
        setBoard(b);
        setRevealed(r);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setError("Este bolão não existe ou foi excluído.");
        } else {
          setError(err instanceof ApiError ? err.message : "Não foi possível carregar o bolão.");
        }
      });
    if (isEndOfWeek) {
      api.weeklyHero(id, weekStart, weekEnd).then(setWeeklyHero).catch(() => {});
    }
    api.weeklyTitles(id).then(setWeeklyTitles).catch(() => {});
    return () => { void base; };
  }, [id, user, isEndOfWeek]);

  if (error) return (
    <div className="mt-10 flex flex-col items-center gap-4 text-center">
      <p className="text-red-400">{error}</p>
      <Link href="/" className="btn-ghost text-sm">Voltar ao início</Link>
    </div>
  );
  if (!pool || !board) return <p className="mt-10 text-center text-[var(--muted)]">Carregando…</p>;

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${pool.invite_code}`
      : pool.invite_url;

  const now = new Date();
  const today = now.toLocaleDateString("sv");
  const toUtc = (iso: string) => (/Z|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z");
  const todayRevealedMatches =
    revealed?.matches.filter(
      (m) => new Date(toUtc(m.kickoff_at)).toLocaleDateString("sv") === today,
    ) ?? [];
  const liveRevealedMatches = todayRevealedMatches.filter(
    (m) => m.status !== "final" && new Date(toUtc(m.kickoff_at)) <= now,
  );
  const finishedRevealedMatches = todayRevealedMatches.filter(
    (m) => m.status === "final",
  );

  async function handleLeave() {
    setLeaving(true);
    setLeaveError(null);
    try {
      await api.leavePool(id);
      router.refresh();
      router.replace("/");
    } catch (err) {
      setLeaveError(err instanceof ApiError ? err.message : "Não foi possível sair do bolão.");
      setLeaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deletePool(id);
      router.refresh();
      router.replace("/");
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Não foi possível excluir o bolão.");
      setDeleting(false);
    }
  }

  async function share() {
    const data = { title: `Bolão: ${pool!.name}`, text: "Entre no meu bolão no Social dos Palpiteiros!", url: inviteUrl };
    if (navigator.share) {
      await navigator.share(data).catch(() => {});
    } else {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold">{pool.name}</h1>
        <p className="text-sm text-[var(--muted)]">{pool.members.length} participantes</p>
      </div>

      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card flex w-full max-w-sm flex-col gap-4 p-6">
            <h2 className="text-lg font-bold">Sair do bolão?</h2>
            <p className="text-sm text-[var(--muted)]">
              Você perderá acesso ao bolão <strong className="text-[var(--fg)]">{pool.name}</strong>. Seus palpites já registrados serão mantidos.
            </p>
            {leaveError && <p className="text-sm text-red-400">{leaveError}</p>}
            <div className="flex gap-3">
              <button
                className="btn flex-1 bg-red-600 hover:bg-red-500"
                onClick={handleLeave}
                disabled={leaving}
              >
                {leaving ? "Saindo…" : "Sim, sair"}
              </button>
              <button
                className="btn-ghost flex-1"
                onClick={() => { setShowLeaveConfirm(false); setLeaveError(null); }}
                disabled={leaving}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card flex w-full max-w-sm flex-col gap-4 p-6">
            <h2 className="text-lg font-bold">Excluir bolão?</h2>
            <p className="text-sm text-[var(--muted)]">
              Esta ação é permanente. O bolão <strong className="text-[var(--fg)]">{pool.name}</strong> e todos os palpites serão apagados para todos os participantes.
            </p>
            {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                className="btn flex-1 bg-red-600 hover:bg-red-500"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Excluindo…" : "Sim, excluir"}
              </button>
              <button
                className="btn-ghost flex-1"
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                disabled={deleting}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {pool.has_pending_today && (
        <div className="card flex items-center gap-3 p-4 text-sm border-[var(--accent)]">
          <span className="text-2xl font-bold text-[var(--accent)]">!</span>
          <span>Você ainda tem palpites pendentes nos jogos de hoje.</span>
        </div>
      )}

      <div className="card flex items-center justify-between gap-3 p-4">
        <div className="text-sm">
          <div className="text-[var(--muted)]">Convide amigos</div>
          <div className="font-mono font-bold">{pool.invite_code}</div>
        </div>
        <button className="btn-ghost text-sm" onClick={share}>
          {copied ? "Copiado!" : "Convidar"}
        </button>
      </div>

      <Link href={`/pools/${id}/predict`} className="btn text-center">
        Meus palpites
      </Link>

      <InProgressBanner />

      {liveRevealedMatches.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionHeader>Palpites · Ao vivo</SectionHeader>
          <div className="flex flex-col gap-3">
            {liveRevealedMatches.map((match) => (
              <MatchPredictionsCard key={match.match_id} match={match} currentUserId={user?.id} />
            ))}
          </div>
        </section>
      )}

      {finishedRevealedMatches.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionHeader>{finishedRevealedMatches.length > 1 ? "Palpites das partidas" : "Palpites da partida"}</SectionHeader>
          <div className="flex flex-col gap-3">
            {finishedRevealedMatches.map((match) => (
              <MatchPredictionsCard key={match.match_id} match={match} currentUserId={user?.id} />
            ))}
          </div>
        </section>
      )}

      {isEndOfWeek && weeklyHero?.has_data && (
        <section className="flex flex-col gap-2">
          <SectionHeader>⚡ Resenha da Semana {weeklyHero.week_label}</SectionHeader>
          {weeklyHero.narrative && (() => {
            const narradorMatch = weeklyHero.narrative!.match(/Narrador:\s*(.+?)(?=\nComentarista:|$)/s);
            const comentaristaMatch = weeklyHero.narrative!.match(/Comentarista:\s*(.+)/s);
            if (narradorMatch && comentaristaMatch) {
              return (
                <div className="card overflow-hidden">
                  <div className="flex items-start gap-3 p-4 pb-3">
                    <span className="text-xl leading-none mt-0.5">🎙️</span>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Narrador</span>
                      <p className="text-sm italic leading-relaxed text-[var(--muted)]">{narradorMatch[1].trim()}</p>
                    </div>
                  </div>
                  <div className="border-t border-[var(--border)]" />
                  <div className="flex items-start gap-3 p-4 pt-3">
                    <span className="text-xl leading-none mt-0.5">🗣️</span>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">Comentarista</span>
                      <p className="text-sm leading-relaxed">{comentaristaMatch[1].trim()}</p>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <p className="card p-4 text-sm italic leading-relaxed text-[var(--muted)]">
                {weeklyHero.narrative}
              </p>
            );
          })()}
          <div className="grid grid-cols-2 gap-3">
            <div className="card flex flex-col items-center gap-1 p-4 text-center border-yellow-500/30">
              <span className="text-2xl">🔮</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">Profeta da Semana</span>
              <span className="mt-1 font-bold leading-tight">{weeklyHero.profeta_name}</span>
              <span className="text-lg font-extrabold text-[var(--accent)]">{weeklyHero.profeta_points} pts</span>
            </div>
            <div className="card flex flex-col items-center gap-1 p-4 text-center border-red-500/30">
              <span className="text-2xl">📯</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Corneteiro da Semana</span>
              <span className="mt-1 font-bold leading-tight">{weeklyHero.corneteiro_name}</span>
              <span className="text-lg font-extrabold text-[var(--accent)]">{weeklyHero.corneteiro_points} pts</span>
            </div>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <SectionHeader>🏆 Classificação</SectionHeader>
        <div className="card divide-y divide-[var(--border)]">
          {board.rows.map((row, i) => {
            const isLast = i === board.rows.length - 1;
            const title =
              i === 0 ? "Profeta" :
              i === 1 ? "Profissional" :
              i === 2 ? "Botequeiro" :
              (isLast && board.rows.length > 3) ? "Corneteiro" :
              null;
            const titleColor =
              i === 0 ? "text-yellow-400 border-yellow-500/40 bg-yellow-500/10" :
              i === 1 ? "text-slate-300 border-slate-400/40 bg-slate-400/10" :
              i === 2 ? "text-orange-400 border-orange-500/40 bg-orange-500/10" :
              "text-red-400 border-red-500/40 bg-red-500/10";
            return (
              <div
                key={row.user_id}
                className={`flex items-center justify-between p-3.5 ${
                  row.user_id === user?.id ? "bg-[var(--surface-2)]" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold text-[var(--muted)]">{i + 1}</span>
                  <Link href={`/pools/${id}/members/${row.user_id}`} className="hover:opacity-75 transition-opacity">
                    <div className="font-semibold">{row.display_name}</div>
                    <div className="text-xs text-[var(--muted)]">
                      🎯 {row.exact_count} · ✨ {row.near_count} · ↔ {row.margin_count} · ✓ {row.outcome_count}
                    </div>
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  {title && (
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${titleColor}`}>
                      {title}
                    </span>
                  )}
                  <div className="text-lg font-extrabold text-[var(--accent)]">{row.points}</div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          🎯 placar exato · ✨ quase exato · ↔ diferença certa · ✓ resultado certo
        </p>
        <p className="text-xs text-[var(--muted)]">
          Pontuação cresce nas fases finais — o jogo fica disputado até a última rodada.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeader>🏅 Títulos Semanais</SectionHeader>
        {!weeklyTitles || weeklyTitles.weeks_counted === 0 ? (
          <div className="card p-4 text-center text-sm text-[var(--muted)]">
            Ainda não há semanas com dados.
          </div>
        ) : (
          <div className="card divide-y divide-[var(--border)]">
            {weeklyTitles.rows.map((row) => (
              <div key={row.user_id} className={`flex items-center justify-between p-3.5 ${row.user_id === user?.id ? "bg-[var(--surface-2)]" : ""}`}>
                <Link href={`/pools/${id}/members/${row.user_id}`} className="text-sm font-semibold hover:opacity-75 transition-opacity">
                  {row.display_name}
                </Link>
                <div className="flex items-center gap-3 text-center text-sm">
                  <div><span className="font-bold">{row.profeta_count}</span><span className="ml-1 text-[10px] text-[var(--muted)]">🥇</span></div>
                  <div><span className="font-bold">{row.profissional_count}</span><span className="ml-1 text-[10px] text-[var(--muted)]">🥈</span></div>
                  <div><span className="font-bold">{row.botequeiro_count}</span><span className="ml-1 text-[10px] text-[var(--muted)]">🥉</span></div>
                  <div><span className="font-bold">{row.corneteiro_count}</span><span className="ml-1 text-[10px] text-[var(--muted)]">📯</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-[var(--muted)]">🥇 Profeta · 🥈 Profissional · 🥉 Botequeiro · 📯 Corneteiro · contagem por semana</p>
      </section>

      <section className="flex flex-col gap-2 pt-4">
        <SectionHeader>Zona de perigo</SectionHeader>
        {pool.is_creator ? (
          <div className="rounded-xl border border-red-900/40 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Excluir bolão</p>
              <p className="text-xs text-[var(--muted)]">Apaga o bolão e todos os palpites permanentemente.</p>
            </div>
            <button
              className="shrink-0 rounded-lg border border-red-700/60 px-3 py-1.5 text-sm text-red-400 hover:border-red-500 hover:text-red-300 transition-colors"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Excluir
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-red-900/40 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Sair do bolão</p>
              <p className="text-xs text-[var(--muted)]">Você deixará de participar deste bolão.</p>
            </div>
            <button
              className="shrink-0 rounded-lg border border-red-700/60 px-3 py-1.5 text-sm text-red-400 hover:border-red-500 hover:text-red-300 transition-colors"
              onClick={() => setShowLeaveConfirm(true)}
            >
              Sair
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function MatchPredictionsCard({
  match,
  currentUserId,
}: {
  match: MatchRevealedOut;
  currentUserId?: string;
}) {
  const isFinal = match.status === "final";
  const isKnockout = match.stage !== "group";
  const penaltiesPlayed = isKnockout
    && match.penalty_home_score != null
    && match.penalty_away_score != null;
  const homeAdvances = isKnockout && match.advancing_team_id != null
    && match.advancing_team_id === match.home_team_id;
  const awayAdvances = isKnockout && match.advancing_team_id != null
    && match.advancing_team_id === match.away_team_id;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between bg-[var(--surface-2)] px-4 py-2.5">
        <span className={`text-sm font-semibold ${homeAdvances ? "text-green-400" : ""}`}>
          {match.home_team_name ?? "?"}
        </span>
        <div className="flex flex-col items-center">
          {isFinal ? (
            <span className="font-bold text-[var(--accent)]">
              {match.home_score} – {match.away_score}
            </span>
          ) : (
            <span className="text-xs text-[var(--muted)]">em andamento</span>
          )}
          {penaltiesPlayed && (
            <span className="text-sm font-medium text-[var(--muted)]">
              Pênaltis: {match.penalty_home_score}×{match.penalty_away_score}
            </span>
          )}
        </div>
        <span className={`text-sm font-semibold ${awayAdvances ? "text-green-400" : ""}`}>
          {match.away_team_name ?? "?"}
        </span>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {match.entries.length === 0 ? (
          <p className="px-4 py-3 text-sm text-[var(--muted)]">Nenhum palpite registrado.</p>
        ) : (
          match.entries.map((entry) => {
            const predAdvancingName = isKnockout && entry.advancing_team_id != null
              ? (entry.advancing_team_id === match.home_team_id
                  ? match.home_team_name
                  : match.away_team_name)
              : null;
            const predAdvancingCorrect = predAdvancingName != null && match.advancing_team_id != null
              ? entry.advancing_team_id === match.advancing_team_id
              : null;
            const hasPenaltyPred = isKnockout
              && entry.penalty_home_score != null
              && entry.penalty_away_score != null;
            const penaltyExact = hasPenaltyPred && penaltiesPlayed
              && entry.penalty_home_score === match.penalty_home_score
              && entry.penalty_away_score === match.penalty_away_score;

            return (
              <div
                key={entry.user_id}
                className={`flex flex-col gap-0.5 px-4 py-2.5 ${
                  entry.user_id === currentUserId ? "bg-[var(--surface-2)]" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{entry.display_name}</span>
                  {isFinal ? (
                    <span className="text-sm font-bold text-[var(--accent)]">
                      +{entry.points} pts
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-[var(--muted)]">– pts</span>
                  )}
                </div>
                <div className="text-center text-sm font-medium text-[var(--muted)]">
                  ⚽ {entry.home_score}–{entry.away_score}
                  {predAdvancingName != null && (
                    <span className={
                      predAdvancingCorrect === true ? " text-green-400"
                      : predAdvancingCorrect === false ? " text-red-400"
                      : ""
                    }>
                      {" · "}→ {predAdvancingName}
                    </span>
                  )}
                  {hasPenaltyPred && (
                    <span className={penaltyExact ? " text-green-400" : ""}>
                      {" · "}🥅 {entry.penalty_home_score}×{entry.penalty_away_score}
                      {penaltyExact ? " ✓" : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
