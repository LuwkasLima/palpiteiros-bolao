export const LATEST_VERSION = "2026-06-16";

export interface ChangelogEntry {
  version: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2026-06-16",
    title: "Novidades no Leaderboard",
    items: [
      "A classificação agora mostra o detalhamento dos seus palpites: 🎯 placar exato, ↔ margem certa e ✓ resultado certo.",
      "Novo destaque semanal: veja quem foi o Profeta da Semana e quem levou o título de Corneteiro.",
      "O app agora exibe um resumo do que mudou a cada atualização — é isso que você está lendo agora.",
    ],
  },
];
