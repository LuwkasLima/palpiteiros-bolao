"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.requestLink(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Algo deu errado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-md">
      <h1 className="mb-1 text-2xl font-extrabold">Entrar no Social dos Palpiteiros</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Nao precisa de senha! Enviamos um link mágico para o seu e-mail.
      </p>

      {sent ? (
        <div className="card p-5">
          <p className="font-semibold">📩 Link enviado!</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Verifique o inbox de <b>{email}</b> e clique no link para entrar.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="card flex flex-col gap-4 p-5">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-[var(--muted)]">E-mail</span>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button className="btn" disabled={busy}>
            {busy ? "Enviando…" : "Enviar link mágico"}
          </button>
        </form>
      )}
    </div>
  );
}
