"use client";

import { useEffect } from "react";

// Registers the service worker that makes the app installable and caches the app shell.
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () =>
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore registration failures */
      });
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
