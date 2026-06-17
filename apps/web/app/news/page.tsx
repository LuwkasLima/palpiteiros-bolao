"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function NewsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <p className="mt-10 text-center text-[var(--muted)]">Carregando…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Notícias</h1>
        <p className="text-sm text-[var(--muted)]">Em breve.</p>
      </div>
      <div className="card p-5 text-sm text-[var(--muted)]">
        Esta seção está sendo preparada.
      </div>
    </div>
  );
}
