"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { NextMatchTodayOut, PoolSummaryOut } from "@bolao/contracts";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SectionHeader } from "@/components/SectionHeader";
import { formatKickoffTime, stageBadge } from "@/lib/format";
import { venue } from "@/lib/venues";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pools, setPools] = useState<PoolSummaryOut[] | null>(null);
  const [inProgressMatches, setInProgressMatches] = useState<NextMatchTodayOut[]>([]);
  const [nextMatches, setNextMatches] = useState<NextMatchTodayOut[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && !user.onboarding_done) router.replace("/onboarding");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    // Resume an invite the user opened before signing in.
    const pending = sessionStorage.getItem("bolao-pending-invite");
    if (pending) {
      sessionStorage.removeItem("bolao-pending-invite");
      router.replace(`/join/${pending}`);
      return;
    }
    api.myPools().then(setPools).catch(() => setPools([]));
    api.inProgressMatches().then(setInProgressMatches).catch(() => {});
    api.nextMatchesToday().then(setNextMatches).catch(() => {});
  }, [user, router]);

  if (loading || !user) {
    return <p className="mt-10 text-center text-[var(--muted)]">Carregando…</p>;
  }

  async function createPool(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const pool = await api.createPool(name.trim());
      router.push(`/pools/${pool.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar bolão.");
      setBusy(false);
    }
  }

  async function joinPool(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const pool = await api.joinPool(code.trim().toUpperCase());
      router.push(`/pools/${pool.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Código inválido.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Olá, {user.display_name} 👋</h1>
        <p className="text-sm text-[var(--muted)]">Faça seus palpites, torça com os amigos e veja quem manja mais de futebol.</p>
      </div>

      {inProgressMatches.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionHeader>
            {"Em andamento"}
            {inProgressMatches.length > 1 && ` · ${inProgressMatches.length} partidas`}
          </SectionHeader>
          <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-green-500/30 border-l-4 border-l-green-500 bg-[var(--surface-2)]">
            {inProgressMatches.map((m) => {
              const v = venue(m.key);
              return (
                <div key={m.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate text-right font-medium">
                      {m.home_flag} {m.home_name}
                    </span>
                    <span className="shrink-0 text-xs text-[var(--muted)]">×</span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {m.away_flag} {m.away_name}
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {inProgressMatches.length > 1 && (
                        <span className="chip">{stageBadge(m.stage, m.group_label)}</span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-0.5 text-xs font-bold text-[#04210f]">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#04210f]" />
                        Ao Vivo
                      </span>
                    </div>
                  </div>
                  {v && (
                    <p className="mt-1 text-center text-xs text-[var(--muted)]">
                      {v.stadium} · {v.city}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {nextMatches.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionHeader>
            {nextMatches.length === 1 ? "Próxima partida" : "Partidas de hoje"}
          </SectionHeader>
          <div className="card divide-y divide-[var(--border)] border-l-4 [border-left-color:var(--accent)]">
            {nextMatches.map((m) => {
              const v = venue(m.key);
              return (
                <div key={m.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate text-right font-medium">
                      {m.home_flag} {m.home_name}
                    </span>
                    <span className="shrink-0 text-xs text-[var(--muted)]">×</span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {m.away_flag} {m.away_name}
                    </span>
                    <span className="chip shrink-0">{formatKickoffTime(m.kickoff_at)}</span>
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
      )}

      <section className="flex flex-col gap-2">
        <SectionHeader>Meus bolões</SectionHeader>
        <div className="flex flex-col gap-3">
          {pools === null ? (
            <p className="text-[var(--muted)]">Carregando bolões…</p>
          ) : pools.length === 0 ? (
            <div className="card p-5 text-sm text-[var(--muted)]">
              Você ainda não está em nenhum bolão. Crie um ou entre com um código abaixo.
            </div>
          ) : (
            pools.map((p) => (
              <Link key={p.id} href={`/pools/${p.id}`} className="card flex items-center justify-between p-4 hover:border-[var(--accent-2)]">
                <div>
                  <div className="font-bold">{p.name}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {p.member_count} participante{p.member_count === 1 ? "" : "s"}
                    {p.is_creator && " · você criou"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.has_pending_today && (
                    <span className="text-lg font-bold text-[var(--accent)]" title="Você ainda tem palpites pendentes nos jogos de hoje">!</span>
                  )}
                  <span className="chip">{p.invite_code}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <section className="flex flex-col gap-2">
        <SectionHeader>Novos bolões</SectionHeader>
        <div className="grid gap-4 sm:grid-cols-2">
        <form onSubmit={createPool} className="card flex flex-col gap-3 p-4">
          <h2 className="font-bold">Criar um bolão</h2>
          <input
            className="input"
            placeholder="Nome do bolão"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button className="btn" disabled={busy || !name.trim()}>
            Criar
          </button>
        </form>

        <form onSubmit={joinPool} className="card flex flex-col gap-3 p-4">
          <h2 className="font-bold">Entrar com código</h2>
          <input
            className="input uppercase"
            placeholder="Ex: 2SNALFGL"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <button className="btn-ghost" disabled={busy || !code.trim()}>
            Entrar
          </button>
        </form>
      </div>
      </section>
    </div>
  );
}
