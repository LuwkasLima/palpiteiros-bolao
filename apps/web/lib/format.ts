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

export function groupKickoffSort(a: MatchOut, b: MatchOut): number {
  return new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime();
}

function _outcome(home: number, away: number) {
  return home > away ? "home" : away > home ? "away" : "draw";
}

function _basePoints(ph: number, pa: number, ah: number, aa: number): number {
  if (ph === ah && pa === aa) return 5;
  if (_outcome(ph, pa) !== _outcome(ah, aa)) return 0;
  if (_outcome(ah, aa) === "draw") return 2;
  if (ph - pa === ah - aa) return 3;
  return 2;
}

export function matchPoints(pred: PredictionOut, match: MatchOut): number {
  if (match.status !== "final" || match.home_score == null || match.away_score == null) return 0;
  let pts = _basePoints(pred.home_score, pred.away_score, match.home_score, match.away_score) * match.round_weight;
  if (pts > 0) {
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
