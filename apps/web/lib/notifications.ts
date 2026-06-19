export interface AppNotification {
  id: string;
  title: string;
  body: string;
  cta?: { label: string };
  time: string;
}

// Add a new entry here whenever changelog.ts gets a new release entry.
// id must be "release-{version}" so it can be keyed to the changelog.
export const NOTIFICATIONS: AppNotification[] = [
  {
    id: "release-2026-06-20",
    title: "🆕 Palpites dos participantes",
    body: "Toque no nome de qualquer participante na classificação para ver o histórico de palpites e pontos dele.",
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
