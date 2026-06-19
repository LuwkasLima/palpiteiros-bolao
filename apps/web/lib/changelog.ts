export const LATEST_VERSION = "2026-06-19";

export interface ChangelogEntry {
  version: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2026-06-19",
    title: "Notícias da Copa",
    items: [
      "Nova aba Notícias com as notícias do dia da Copa do Mundo, reunidas de ESPN, GE e Trivela.",
      "Toque em qualquer notícia para ler a matéria completa na fonte original.",
    ],
  },
  {
    version: "2026-06-18",
    title: "Nova pontuação na segunda rodada — 4 níveis",
    items: [
      "Novo nível 'quase exato' (4 pts): um lado exato, o outro errado por 1 gol. Em empates, vale 4 pts se errar por 1 gol em cada lado.",
      "O nível de 3 pts agora premia quem acertou a diferença de gols — você torce pelo placar até o apito final.",
      "O bônus de goleiro em branco foi removido. Prever 0 gols já é recompensado pela proximidade do placar.",
    ],
  },
  {
    version: "2026-06-17",
    title: "Nova navegação e palpites ao vivo",
    items: [
      "Nova barra de navegação com acesso rápido a Bolões, Jogos de hoje, Notícias e Perfil.",
      "Veja os palpites de todos os membros do bolão enquanto o jogo acontece — e os pontos de cada um ao final.",
      "A página de Jogos mostra as partidas do dia separadas por em andamento, próximas e finalizadas.",
    ],
  },
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
