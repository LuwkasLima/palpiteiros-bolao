"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { WhatsNewModal } from "@/components/WhatsNewModal";
import { SectionHeader } from "@/components/SectionHeader";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

export default function PerfilPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) setName(user.display_name);
  }, [user]);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const w = window as typeof window & { __pwa_prompt?: BeforeInstallPromptEvent | null };
    if (w.__pwa_prompt) { setInstallPrompt(w.__pwa_prompt); return; }

    if (/iphone|ipad|ipod/i.test(window.navigator.userAgent)) { setIsIos(true); return; }

    const onPrompt = (e: Event) => { e.preventDefault(); setInstallPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (loading || !user) {
    return <p className="mt-10 text-center text-[var(--muted)]">Carregando…</p>;
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteAccount();
      await signOut();
      router.replace("/login");
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Erro ao excluir conta.");
      setDeleting(false);
    }
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
        {(installPrompt || isIos) && (
          <>
            <button
              onClick={async () => {
                if (isIos) {
                  setShowIosHint((v) => !v);
                } else if (installPrompt) {
                  await installPrompt.prompt();
                  setInstallPrompt(null);
                }
              }}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-[var(--surface-2)]"
            >
              <span>Baixar app</span>
              <span className="text-[var(--muted)]">›</span>
            </button>
            {showIosHint && (
              <p className="px-4 pb-3 text-xs text-[var(--muted)]">
                Toque em <b>Compartilhar</b> e depois <b>Adicionar à Tela de Início</b>.
              </p>
            )}
          </>
        )}
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

      <SectionHeader>Zona de perigo</SectionHeader>
      <div className="rounded-xl border border-red-900/40 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Excluir conta</p>
          <p className="text-xs text-[var(--muted)]">Remove sua conta e te retira de todos os bolões permanentemente.</p>
        </div>
        <button
          className="shrink-0 rounded-lg border border-red-700/60 px-3 py-1.5 text-sm text-red-400 hover:border-red-500 hover:text-red-300 transition-colors"
          onClick={() => setShowDeleteConfirm(true)}
        >
          Excluir
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card flex w-full max-w-sm flex-col gap-4 p-6">
            <h2 className="text-lg font-bold">Excluir conta?</h2>
            <p className="text-sm text-[var(--muted)]">
              Esta ação é permanente. Você será removido de todos os bolões e não poderá mais acessar o app com este e-mail.
            </p>
            {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                className="btn flex-1 bg-red-600 hover:bg-red-500"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? "Excluindo…" : "Sim, excluir"}
              </button>
              <button
                className="btn-ghost flex-1"
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                disabled={deleting}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <WhatsNewModal isOpen={showWhatsNew} onClose={() => setShowWhatsNew(false)} />
    </div>
  );
}
