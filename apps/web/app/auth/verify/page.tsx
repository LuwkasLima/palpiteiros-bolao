"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard React StrictMode double-invoke (token is single-use)
    ran.current = true;

    const token = params.get("token");
    if (!token) {
      setError("Link inválido.");
      return;
    }
    api
      .verify(token)
      .then(async () => {
        await refresh();
        router.replace("/");
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Não foi possível validar o link."),
      );
  }, [params, refresh, router]);

  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      {error ? (
        <div className="card p-6">
          <p className="text-lg font-semibold">⚠️ {error}</p>
          <a className="btn mt-4" href="/login">
            Tentar novamente
          </a>
        </div>
      ) : (
        <p className="text-[var(--muted)]">Validando seu acesso…</p>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<p className="mt-16 text-center text-[var(--muted)]">Carregando…</p>}>
      <VerifyInner />
    </Suspense>
  );
}
