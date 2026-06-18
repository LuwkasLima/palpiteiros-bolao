// Typed client wrapper — the ONLY place the web app talks to the API. Types come from
// @bolao/contracts (generated from the API's OpenAPI schema). Everything sends the session
// cookie via `credentials: "include"`.
import type {
  AdminStatsOut,
  LeaderboardOut,
  MatchOut,
  MatchTodayOut,
  NewsItemOut,
  NextMatchTodayOut,
  PoolOut,
  PoolSummaryOut,
  PredictionIn,
  PredictionOut,
  ResultIn,
  RevealedPredictionsOut,
  TeamOut,
  UserOut,
  WeeklyHeroOut,
} from "@bolao/contracts";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

function localDayEnd(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function localDayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

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
  requestLink: (email: string) =>
    request<{ message: string }>("/auth/request-link", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  verify: (token: string) =>
    request<UserOut>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),
  deleteAccount: () => request<void>("/auth/me", { method: "DELETE" }),
  me: () => request<UserOut>("/auth/me"),
  updateProfile: (displayName: string) =>
    request<UserOut>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify({ display_name: displayName }),
    }),
  markChangelogSeen: (version: string) =>
    request<UserOut>("/auth/me/changelog-seen", {
      method: "POST",
      body: JSON.stringify({ version }),
    }),

  // Tournament
  teams: () => request<TeamOut[]>("/teams"),
  matches: (stage?: string) =>
    request<MatchOut[]>(`/matches${stage ? `?stage=${stage}` : ""}`),
  nextMatchesToday: () => request<NextMatchTodayOut[]>(`/matches/next-today?window_end=${encodeURIComponent(localDayEnd())}`),
  inProgressMatches: () => request<NextMatchTodayOut[]>("/matches/in-progress"),
  matchesToday: (dayStart: string, dayEnd: string) =>
    request<MatchTodayOut[]>(`/matches/today?day_start=${encodeURIComponent(dayStart)}&day_end=${encodeURIComponent(dayEnd)}`),

  // News — only the current local day's items.
  news: (limit = 40) =>
    request<NewsItemOut[]>(`/news?day_start=${encodeURIComponent(localDayStart())}&limit=${limit}`),

  // Pools
  myPools: () => request<PoolSummaryOut[]>(`/pools?window_end=${encodeURIComponent(localDayEnd())}`),
  createPool: (name: string) =>
    request<PoolOut>("/pools", { method: "POST", body: JSON.stringify({ name }) }),
  joinPool: (inviteCode: string) =>
    request<PoolOut>("/pools/join", {
      method: "POST",
      body: JSON.stringify({ invite_code: inviteCode }),
    }),
  pool: (id: string) => request<PoolOut>(`/pools/${id}?window_end=${encodeURIComponent(localDayEnd())}`),
  deletePool: (id: string) => request<void>(`/pools/${id}`, { method: "DELETE" }),
  leavePool: (id: string) => request<void>(`/pools/${id}/leave`, { method: "DELETE" }),
  leaderboard: (id: string) => request<LeaderboardOut>(`/pools/${id}/leaderboard`),
  weeklyHero: (id: string, weekStart: string, weekEnd: string) =>
    request<WeeklyHeroOut>(
      `/pools/${id}/leaderboard/weekly-hero?week_start=${encodeURIComponent(weekStart)}&week_end=${encodeURIComponent(weekEnd)}`,
    ),

  // Predictions
  myPredictions: (poolId: string) =>
    request<PredictionOut[]>(`/pools/${poolId}/predictions`),
  revealedPredictions: (poolId: string) =>
    request<RevealedPredictionsOut>(`/pools/${poolId}/predictions/revealed`),
  savePrediction: (poolId: string, matchId: string, body: PredictionIn) =>
    request<PredictionOut>(`/pools/${poolId}/predictions/${matchId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  // Admin
  stats: () => request<AdminStatsOut>("/admin/stats"),
  setResult: (matchId: string, body: ResultIn) =>
    request<MatchOut>(`/admin/matches/${matchId}/result`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  clearResult: (matchId: string) =>
    request<MatchOut>(`/admin/matches/${matchId}/result`, { method: "DELETE" }),
};
