"use client";

import { useEffect, useState } from "react";
import type { AdminStatsOut } from "@bolao/contracts";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { STAGE_ORDER, stageLabel } from "@/lib/format";

export default function AdminStatsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStatsOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.is_admin) return;
    api
      .stats()
      .then(setStats)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar."));
  }, [user]);

  if (error) return <p className="mt-4 text-center text-red-400">{error}</p>;
  if (!stats) return <p className="mt-4 text-center text-[var(--muted)]">Carregando…</p>;

  const totalMatches =
    stats.match_counts.scheduled + stats.match_counts.locked + stats.match_counts.final;

  return (
    <>
      <h1 className="text-2xl font-extrabold">Admin · Dashboard</h1>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Usuários" value={stats.total_users} />
        <StatCard label="Bolões" value={stats.total_pools} />
        <StatCard label="Palpites" value={stats.total_predictions} />
        <StatCard label="Partidas finais" value={stats.match_counts.final} sub={`de ${totalMatches}`} />
      </div>

      {/* Users breakdown */}
      <section>
        <h2 className="mb-3 font-bold text-[var(--accent-2)]">Usuários</h2>
        <div className="card flex flex-col gap-2 p-4">
          <Row label="Cadastrados" value={stats.total_users} />
          <Row label="Onboarding completo" value={stats.onboarded_users} />
          <Row label="Ativos (últimos 7 dias)" value={stats.active_users} />
        </div>
      </section>

      {/* Pools breakdown */}
      <section>
        <h2 className="mb-3 font-bold text-[var(--accent-2)]">Bolões</h2>
        <div className="card flex flex-col gap-2 p-4">
          <Row label="Total de bolões" value={stats.total_pools} />
          <Row label="Média de membros" value={stats.avg_pool_size.toFixed(1)} />
        </div>
      </section>

      {/* Matches breakdown */}
      <section>
        <h2 className="mb-3 font-bold text-[var(--accent-2)]">Partidas</h2>
        <div className="card flex flex-col gap-2 p-4">
          <Row label="Agendadas" value={stats.match_counts.scheduled} />
          <Row label="Bloqueadas" value={stats.match_counts.locked} />
          <Row label="Finalizadas" value={stats.match_counts.final} />
        </div>
      </section>

      {/* Predictions by stage */}
      <section>
        <h2 className="mb-3 font-bold text-[var(--accent-2)]">Palpites por fase</h2>
        <div className="card flex flex-col gap-2 p-4">
          {STAGE_ORDER.filter((s) => stats.predictions_by_stage[s] !== undefined).map((s) => (
            <Row key={s} label={stageLabel(s)} value={stats.predictions_by_stage[s]} />
          ))}
          {Object.keys(stats.predictions_by_stage).length === 0 && (
            <p className="text-sm text-[var(--muted)]">Nenhum palpite registrado ainda.</p>
          )}
        </div>
      </section>
    </>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-1 p-4 text-center">
      <span className="text-3xl font-extrabold">{value}</span>
      {sub && <span className="text-xs text-[var(--muted)]">{sub}</span>}
      <span className="text-xs text-[var(--muted)]">{label}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
