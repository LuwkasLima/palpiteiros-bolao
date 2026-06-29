export interface AppNotification {
  id: string;
  title: string;
  body: string;
  // Without href, the CTA opens the "What's new" changelog modal.
  // With href, it navigates to that page instead (no popup).
  cta?: { label: string; href?: string };
  time: string;
}

// Add a new entry here whenever changelog.ts gets a new release entry.
// id must be "release-{version}" so it can be keyed to the changelog.
export const NOTIFICATIONS: AppNotification[] = [
  {
    id: "release-2026-06-29",
    title: "🆕 Pontuação do mata-mata reajustada",
    body: "Nós te ouvimos: vencedor certo sempre sai na frente, pênaltis escalados por fase, e todos os cenários nas regras.",
    cta: { label: "Ver o que há de novo →" },
    time: "hoje",
  },
  {
    id: "release-2026-06-28",
    title: "🆕 Mata-mata com nova pontuação",
    body: "Placar, classificado e pênaltis agora valem pontos separados. Prever 2×1 com resultado 1×2 conta como exato pelo placar — mesmos gols, lados trocados.",
    cta: { label: "Ver o que há de novo →" },
    time: "hoje",
  },
  {
    id: "scoring-rationale-2026-06-28",
    title: "📋 Entenda o novo sistema do mata-mata",
    body: "Três palpites por jogo, avaliados de forma independente: o placar pelos números, o classificado por quem avança, e os pênaltis como bônus fixo.",
    cta: { label: "Ver as regras →", href: "/regras#mata-mata" },
    time: "hoje",
  },
  {
    id: "release-2026-06-20",
    title: "🆕 Palpites e títulos dos participantes",
    body: "Toque em qualquer participante para ver os palpites dele e quantas vezes foi Profeta, Profissional, Botequeiro ou Corneteiro da semana.",
    cta: { label: "Ver o que há de novo →" },
    time: "hoje",
  },
  {
    id: "release-2026-06-19",
    title: "🆕 Notícias da Copa",
    body: "Nova aba Notícias reúne as últimas da Copa do Mundo de ESPN, ge e Trivela em um só lugar.",
    cta: { label: "Ver o que há de novo →" },
    time: "hoje",
  },
  {
    id: "release-2026-06-18",
    title: "🆕 Nova pontuação na segunda rodada",
    body: "Novo nível 'quase exato' (4 pts), diferença de gols certa vale 3 pts. Bônus de goleiro em branco removido.",
    cta: { label: "Ver o que há de novo →" },
    time: "ontem",
  },
  {
    id: "release-2026-06-17",
    title: "🆕 Nova navegação e palpites ao vivo",
    body: "Nova barra de navegação, jogos do dia, palpites ao vivo e muito mais.",
    cta: { label: "Ver o que há de novo →" },
    time: "há 2 dias",
  },
];
