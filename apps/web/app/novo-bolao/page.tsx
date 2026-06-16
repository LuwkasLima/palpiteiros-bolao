"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function NovoBolaoPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

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
        <h1 className="text-2xl font-extrabold">Novo Bolão</h1>
        <p className="text-sm text-[var(--muted)]">Crie um grupo ou entre com o código de um amigo.</p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <form onSubmit={createPool} className="card flex flex-col gap-3 p-4">
        <h2 className="font-bold">Criar um bolão</h2>
        <p className="text-sm text-[var(--muted)]">Você vira o dono e pode convidar quem quiser.</p>
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
        <p className="text-sm text-[var(--muted)]">Peça o código de convite para alguém do grupo.</p>
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
  );
}
