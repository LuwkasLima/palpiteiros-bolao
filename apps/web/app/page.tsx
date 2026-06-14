"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PoolSummaryOut } from "@bolao/contracts";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SectionHeader } from "@/components/SectionHeader";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pools, setPools] = useState<PoolSummaryOut[] | null>(null);
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
        <p className="text-sm text-[var(--muted)]">Seus bolões no Social dos Palpiteiros.</p>
      </div>

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
                    <span className="text-sm font-bold text-[var(--accent)]" title="Você tem palpites pendentes hoje">!</span>
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
