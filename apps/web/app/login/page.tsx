"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.requestLink(email.trim(), name.trim() || undefined);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Algo deu errado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-md">
      <h1 className="mb-1 text-2xl font-extrabold">Entrar no Bolão</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Sem senha. Enviamos um link mágico para o seu e-mail.
      </p>

      {sent ? (
        <div className="card p-5">
          <p className="font-semibold">📩 Link enviado!</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Verifique <b>{email}</b> e clique no link para entrar. (Em desenvolvimento, ele
            aparece no Mailpit em{" "}
            <a className="text-[var(--accent-2)]" href="http://localhost:8025" target="_blank">
              localhost:8025
            </a>
            .)
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="card flex flex-col gap-4 p-5">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-[var(--muted)]">Seu nome (como aparece no ranking)</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lucas"
            />
          </label>
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
