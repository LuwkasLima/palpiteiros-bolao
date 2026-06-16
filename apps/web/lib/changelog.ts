export const LATEST_VERSION = "2026-06-16";

export interface ChangelogEntry {
  version: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2026-06-16",
    title: "Palpiteiro Profeta & Corneteiro da Semana",
    items: [
      "Novo destaque semanal no Leaderboard: veja quem acertou mais e quem errou mais na semana.",
      "O Palpiteiro Profeta é quem fez mais pontos nos jogos da semana.",
      "O Corneteiro é quem amargou a pior semana — mas isso faz parte do jogo!",
    ],
  },
];
