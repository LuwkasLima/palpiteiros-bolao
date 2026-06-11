"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function OnboardingPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user?.onboarding_done) router.replace("/");
  }, [loading, user, router]);

  if (loading || !user) {
    return <p className="mt-10 text-center text-[var(--muted)]">Carregando…</p>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.updateProfile(name.trim());
      await refresh();
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Algo deu errado.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-md">
      <h1 className="mb-1 text-2xl font-extrabold">Bem-vindo ao Social dos Palpiteiros!</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Como você quer aparecer no ranking?
      </p>
      <form onSubmit={submit} className="card flex flex-col gap-4 p-5">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--muted)]">Seu nome</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Escreva Aqui"
            autoFocus
            required
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="btn" disabled={busy || !name.trim()}>
          {busy ? "Salvando…" : "Entrar no bolão"}
        </button>
      </form>
    </div>
  );
}
