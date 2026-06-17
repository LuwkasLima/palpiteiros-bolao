"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { WhatsNewModal } from "@/components/WhatsNewModal";

export default function PerfilPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) setName(user.display_name);
  }, [user]);

  if (loading || !user) {
    return <p className="mt-10 text-center text-[var(--muted)]">Carregando…</p>;
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === user!.display_name) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateProfile(trimmed);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Meu Perfil</h1>
        <p className="text-sm text-[var(--muted)]">{user.email}</p>
      </div>

      <form onSubmit={saveName} className="card flex flex-col gap-3 p-4">
        <h2 className="font-bold">Nome</h2>
        <input
          className="input"
          placeholder="Seu nome"
          value={name}
          onChange={(e) => { setName(e.target.value); setSaved(false); }}
          required
          minLength={1}
          maxLength={60}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && <p className="text-sm text-green-400">Nome atualizado!</p>}
        <button
          className="btn"
          disabled={saving || !name.trim() || name.trim() === user.display_name}
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </form>

      <div className="card divide-y divide-[var(--border)]">
        <button
          onClick={() => setShowWhatsNew(true)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-[var(--surface-2)]"
        >
          <span>O que há de novo</span>
          <span className="text-[var(--muted)]">›</span>
        </button>
        <Link
          href="/regras"
          className="flex items-center justify-between px-4 py-3 text-sm hover:bg-[var(--surface-2)]"
        >
          <span>Regras de pontuação</span>
          <span className="text-[var(--muted)]">›</span>
        </Link>
        {user.is_admin && (
          <Link
            href="/admin"
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-[var(--surface-2)]"
          >
            <span>Painel de admin</span>
            <span className="text-[var(--muted)]">›</span>
          </Link>
        )}
      </div>

      <button
        onClick={() => { signOut(); router.replace("/login"); }}
        className="btn-ghost py-3 text-red-400 hover:text-red-300"
      >
        Sair
      </button>

      <WhatsNewModal isOpen={showWhatsNew} onClose={() => setShowWhatsNew(false)} />
    </div>
  );
}
