"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!user.is_admin) router.replace("/");
  }, [loading, user, router]);

  if (loading || !user?.is_admin) return null;

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex gap-1">
        <Link
          href="/admin"
          className={`btn px-4 py-2 text-sm ${pathname === "/admin" ? "" : "btn-ghost"}`}
        >
          Resultados
        </Link>
        <Link
          href="/admin/stats"
          className={`btn px-4 py-2 text-sm ${pathname === "/admin/stats" ? "" : "btn-ghost"}`}
        >
          Dashboard
        </Link>
      </nav>
      {children}
    </div>
  );
}
