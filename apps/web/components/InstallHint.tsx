"use client";

import { useEffect, useState } from "react";

// Prompts installation: uses the native beforeinstallprompt on Android/Chrome, and shows
// a manual "Add to Home Screen" hint on iOS Safari (which has no such event).
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

const DISMISS_KEY = "bolao-install-dismissed";

export function InstallHint() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS-only Safari property
      window.navigator.standalone === true;
    if (standalone) return;

    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setIsIos(ios);
    if (ios) {
      setShow(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-2xl p-3">
      <div className="card flex items-center gap-3 p-3 shadow-lg">
        <span className="text-2xl">📲</span>
        <div className="flex-1 text-sm">
          {isIos ? (
            <>
              Instale o app: toque em <b>Compartilhar</b> e depois{" "}
              <b>Adicionar à Tela de Início</b>.
            </>
          ) : (
            <>Instale o Social dos Palpiteiros na tela inicial para acesso rápido.</>
          )}
        </div>
        {!isIos && deferred && (
          <button
            className="btn px-3 py-1.5 text-sm"
            onClick={async () => {
              await deferred.prompt();
              dismiss();
            }}
          >
            Instalar
          </button>
        )}
        <button className="text-[var(--muted)]" onClick={dismiss} aria-label="Fechar">
          ✕
        </button>
      </div>
    </div>
  );
}
