"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LeaderboardOut, PoolOut } from "@bolao/contracts";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function PoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pool, setPool] = useState<PoolOut | null>(null);
  const [board, setBoard] = useState<LeaderboardOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([api.pool(id), api.leaderboard(id)])
      .then(([p, b]) => {
        setPool(p);
        setBoard(b);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Não foi possível carregar o bolão."),
      );
  }, [id, user]);

  if (error) return <p className="mt-10 text-center text-red-400">{error}</p>;
  if (!pool || !board) return <p className="mt-10 text-center text-[var(--muted)]">Carregando…</p>;

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${pool.invite_code}`
      : pool.invite_url;

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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{pool.name}</h1>
          <p className="text-sm text-[var(--muted)]">{pool.members.length} participantes</p>
        </div>
        <Link href={`/pools/${id}/predict`} className="btn">
          <span className="sm:hidden">Palpites</span>
          <span className="hidden sm:inline">Meus palpites</span>
        </Link>
      </div>

      <div className="card flex items-center justify-between gap-3 p-4">
        <div className="text-sm">
          <div className="text-[var(--muted)]">Convide amigos</div>
          <div className="font-mono font-bold">{pool.invite_code}</div>
        </div>
        <button className="btn-ghost text-sm" onClick={share}>
          {copied ? "Copiado!" : "Compartilhar link"}
        </button>
      </div>

      <section>
        <h2 className="mb-2 font-bold">🏆 Classificação</h2>
        <div className="card divide-y divide-[var(--border)]">
          {board.rows.map((row, i) => (
            <div
              key={row.user_id}
              className={`flex items-center justify-between p-3.5 ${
                row.user_id === user?.id ? "bg-[var(--surface-2)]" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-bold text-[var(--muted)]">{i + 1}</span>
                <div>
                  <div className="font-semibold">{row.display_name}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {row.exact_count} placar{row.exact_count === 1 ? "" : "es"} exato
                    {row.exact_count === 1 ? "" : "s"} · {row.predictions_made} palpites
                  </div>
                </div>
              </div>
              <div className="text-lg font-extrabold text-[var(--accent)]">{row.points}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Pontuação cresce nas fases finais — o jogo fica disputado até a última rodada.
        </p>
      </section>
    </div>
  );
}
