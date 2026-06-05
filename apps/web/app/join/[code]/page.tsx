"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Remember the invite so we can come back after sign-in.
      sessionStorage.setItem("bolao-pending-invite", code);
      router.replace("/login");
      return;
    }
    if (ran.current) return;
    ran.current = true;
    api
      .joinPool(code.toUpperCase())
      .then((pool) => router.replace(`/pools/${pool.id}`))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Não foi possível entrar no bolão."),
      );
  }, [code, user, loading, router]);

  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      {error ? (
        <div className="card p-6">
          <p className="text-lg font-semibold">⚠️ {error}</p>
          <a className="btn mt-4" href="/">
            Ir para início
          </a>
        </div>
      ) : (
        <p className="text-[var(--muted)]">Entrando no bolão…</p>
      )}
    </div>
  );
}
