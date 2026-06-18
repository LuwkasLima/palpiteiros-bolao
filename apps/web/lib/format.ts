import type { MatchOut, PredictionOut, Stage, TeamOut } from "@bolao/contracts";

export const STAGE_LABEL: Record<string, string> = {
  group: "Fase de grupos",
  r32: "16-avos (Round of 32)",
  r16: "Oitavas",
  qf: "Quartas",
  sf: "Semifinal",
  third: "Disputa de 3º lugar",
  final: "Final",
};

export const STAGE_ORDER: Stage[] = ["group", "r32", "r16", "qf", "sf", "third", "final"];

export function stageLabel(stage: string): string {
  return STAGE_LABEL[stage] ?? stage;
}

export function formatKickoff(iso: string): string {
  // Append Z if the string has no timezone marker so JavaScript parses it as UTC
  // rather than local time (naive strings from the API are always UTC).
  const utc = /Z|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z";
  return new Date(utc).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type TeamMap = Record<string, TeamOut>;

export function teamMap(teams: TeamOut[]): TeamMap {
  return Object.fromEntries(teams.map((t) => [t.id, t]));
}

/** Display label for a match side: team name+flag, or the placeholder slot label. */
export function sideLabel(teamId: string | null, teams: TeamMap, fallback: string): string {
  if (teamId && teams[teamId]) {
    const t = teams[teamId];
    return `${t.flag_emoji} ${t.name}`.trim();
  }
  return fallback;
}

/** Compact label: flag emoji + 3-letter code, or the slot fallback when unresolved. */
export function sideShortLabel(teamId: string | null, teams: TeamMap, fallback: string): string {
  if (teamId && teams[teamId]) {
    const t = teams[teamId];
    return `${t.flag_emoji} ${t.code}`;
  }
  return fallback;
}

/** Full team name without flag, or empty string when the team is not yet resolved. */
export function sideName(teamId: string | null, teams: TeamMap): string {
  return teamId && teams[teamId] ? teams[teamId].name : "";
}

export function groupKickoffSort(a: MatchOut, b: MatchOut): number {
  return new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime();
}

function normalizeUtc(iso: string): string {
  return /Z|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z";
}

/** Returns a YYYY-MM-DD key in the user's local timezone — used to group matches by day. */
export function matchDayKey(iso: string): string {
  return new Date(normalizeUtc(iso)).toLocaleDateString("en-CA");
}

/** Formats only the local time portion of a UTC ISO string (HH:mm in pt-BR). */
export function formatKickoffTime(iso: string): string {
  const utc = /Z|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z";
  return new Date(utc).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Formats a YYYY-MM-DD day key as a human-readable section header in pt-BR. */
export function formatMatchDay(dayKey: string): string {
  // Parse at local noon to avoid any DST/timezone edge on date boundaries.
  const d = new Date(dayKey + "T12:00:00");
  const s = d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const STAGE_BADGE: Record<string, string> = {
  r32: "R32", r16: "Oitavas", qf: "Quartas", sf: "Semifinal", third: "3º lugar", final: "Final",
};

/** Short label for the inline stage chip on each match row. */
export function stageBadge(stage: string, groupLabel: string | null): string {
  if (stage === "group") return groupLabel ? `Grupo ${groupLabel}` : "Fase de grupos";
  return STAGE_BADGE[stage] ?? stage;
}

// Matches from Uzbekistan vs Colombia (G-K-1-UZBCOL) onwards use V2 rules.
const SCORING_V2_SINCE = new Date("2026-06-18T02:00:00Z");

function _outcome(home: number, away: number) {
  return home > away ? "home" : away > home ? "away" : "draw";
}

function _basePointsV1(ph: number, pa: number, ah: number, aa: number): number {
  if (ph === ah && pa === aa) return 5;
  if (_outcome(ph, pa) !== _outcome(ah, aa)) return 0;
  if (_outcome(ah, aa) === "draw") return 2;
  if (ph - pa === ah - aa) return 3;
  return 2;
}

function _basePointsV2(ph: number, pa: number, ah: number, aa: number): number {
  if (ph === ah && pa === aa) return 5;
  if (_outcome(ph, pa) !== _outcome(ah, aa)) return 0;
  const totalError = Math.abs(ph - ah) + Math.abs(pa - aa);
  if (_outcome(ah, aa) === "draw") return totalError === 2 ? 4 : 2;
  if (totalError === 1) return 4;
  if (ph - pa === ah - aa) return 3;
  return 2;
}

export function matchPoints(pred: PredictionOut, match: MatchOut): number {
  if (match.status !== "final" || match.home_score == null || match.away_score == null) return 0;
  const isV2 = new Date(match.kickoff_at) >= SCORING_V2_SINCE;
  const baseFn = isV2 ? _basePointsV2 : _basePointsV1;
  let pts = baseFn(pred.home_score, pred.away_score, match.home_score, match.away_score) * match.round_weight;
  if (!isV2 && pts > 0) {
    const cleanSheetHits =
      (pred.home_score === 0 && match.home_score === 0 ? 1 : 0) +
      (pred.away_score === 0 && match.away_score === 0 ? 1 : 0);
    pts += cleanSheetHits * match.round_weight;
  }
  if (
    match.stage !== "group" &&
    pred.advancing_team_id &&
    match.advancing_team_id &&
    pred.advancing_team_id === match.advancing_team_id
  ) {
    pts += 2 * match.round_weight;
  }
  return pts;
}
