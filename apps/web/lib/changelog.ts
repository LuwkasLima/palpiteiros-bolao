export const LATEST_VERSION = "2026-06-28";

export interface ChangelogEntry {
  version: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2026-06-28",
    title: "Mata-mata: placar, classificado e pênaltis são três palpites independentes",
    items: [
      "O placar no mata-mata agora é avaliado pelos números, sem depender de quem venceu. Prever 2×1 com resultado 1×2 conta como placar exato — mesmos gols, lados trocados — e vale 5 × multiplicador da fase.",
      "Novo palpite de pênaltis: quando o jogo vai para as cobranças, você pode prever o placar da disputa. Acertar vale +5 pts fixos, sem multiplicador.",
      "Página de regras reformulada com os três componentes explicados — placar, classificado e pênaltis — com exemplos reais, raciocínio e o máximo possível por fase.",
    ],
  },
  {
    version: "2026-06-20",
    title: "Palpites e títulos dos participantes",
    items: [
      "Toque no nome de qualquer participante na classificação para ver todos os palpites revelados dele.",
      "Veja o placar previsto, o resultado real e os pontos ganhos em cada jogo — incluindo o multiplicador por fase.",
      "Nova seção 'Títulos Semanais': veja quantas vezes cada participante foi 🥇 Profeta, 🥈 Profissional, 🥉 Botequeiro ou 📯 Corneteiro da semana.",
    ],
  },
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
