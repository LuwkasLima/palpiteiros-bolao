"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PoolSummaryOut } from "@bolao/contracts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pools, setPools] = useState<PoolSummaryOut[] | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && !user.onboarding_done) router.replace("/onboarding");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Meus Bolões</h1>
        <p className="text-sm text-[var(--muted)]">Seus grupos de palpites.</p>
      </div>

      <section className="flex flex-col gap-3">
        {pools === null ? (
          <p className="text-[var(--muted)]">Carregando bolões…</p>
        ) : pools.length === 0 ? (
          <div className="card p-5 flex flex-col gap-3">
            <p className="text-sm text-[var(--muted)]">Você ainda não está em nenhum bolão.</p>
            <Link href="/novo-bolao" className="btn text-center">
              Criar ou entrar em um bolão
            </Link>
          </div>
        ) : (
          pools.map((p) => (
            <Link
              key={p.id}
              href={`/pools/${p.id}`}
              className="card flex items-center justify-between p-4 hover:border-[var(--accent-2)]"
            >
              <div>
                <div className="font-bold">{p.name}</div>
                <div className="text-xs text-[var(--muted)]">
                  {p.member_count} participante{p.member_count === 1 ? "" : "s"}
                  {p.is_creator && " · você criou"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {p.has_pending_today && (
                  <span
                    className="text-lg font-bold text-[var(--accent)]"
                    title="Você ainda tem palpites pendentes nos jogos de hoje"
                  >
                    !
                  </span>
                )}
                <span className="chip">{p.invite_code}</span>
              </div>
            </Link>
          ))
        )}
      </section>

      {pools && pools.length > 0 && (
        <Link href="/novo-bolao" className="btn-ghost text-center py-3 rounded-xl border border-[var(--border)]">
          + Criar ou entrar em outro bolão
        </Link>
      )}
    </div>
  );
}
