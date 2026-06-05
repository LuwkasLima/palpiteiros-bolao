import type { MatchOut, Stage, TeamOut } from "@bolao/contracts";

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
  return new Date(iso).toLocaleString("pt-BR", {
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
