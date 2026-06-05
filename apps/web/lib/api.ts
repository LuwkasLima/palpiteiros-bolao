// Typed client wrapper — the ONLY place the web app talks to the API. Types come from
// @bolao/contracts (generated from the API's OpenAPI schema). Everything sends the session
// cookie via `credentials: "include"`.
import type {
  LeaderboardOut,
  MatchOut,
  PoolOut,
  PoolSummaryOut,
  PredictionIn,
  PredictionOut,
  ResultIn,
  TeamOut,
  UserOut,
} from "@bolao/contracts";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  requestLink: (email: string, displayName?: string) =>
    request<{ message: string }>("/auth/request-link", {
      method: "POST",
      body: JSON.stringify({ email, display_name: displayName || null }),
    }),
  verify: (token: string, name?: string) =>
    request<UserOut>(`/auth/verify${name ? `?name=${encodeURIComponent(name)}` : ""}`, {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),
  me: () => request<UserOut>("/auth/me"),

  // Tournament
  teams: () => request<TeamOut[]>("/teams"),
  matches: (stage?: string) =>
    request<MatchOut[]>(`/matches${stage ? `?stage=${stage}` : ""}`),

  // Pools
  myPools: () => request<PoolSummaryOut[]>("/pools"),
  createPool: (name: string) =>
    request<PoolOut>("/pools", { method: "POST", body: JSON.stringify({ name }) }),
  joinPool: (inviteCode: string) =>
    request<PoolOut>("/pools/join", {
      method: "POST",
      body: JSON.stringify({ invite_code: inviteCode }),
    }),
  pool: (id: string) => request<PoolOut>(`/pools/${id}`),
  leaderboard: (id: string) => request<LeaderboardOut>(`/pools/${id}/leaderboard`),

  // Predictions
  myPredictions: (poolId: string) =>
    request<PredictionOut[]>(`/pools/${poolId}/predictions`),
  savePrediction: (poolId: string, matchId: string, body: PredictionIn) =>
    request<PredictionOut>(`/pools/${poolId}/predictions/${matchId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  // Admin
  setResult: (matchId: string, body: ResultIn) =>
    request<MatchOut>(`/admin/matches/${matchId}/result`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
