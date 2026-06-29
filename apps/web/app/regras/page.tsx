"use client";

import { useEffect, useState } from "react";

type Tab = "v1" | "v2" | "ko";

export default function RegrasPage() {
  const [tab, setTab] = useState<Tab>("ko");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#mata-mata") {
      setTab("ko");
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Como funciona a pontuação</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Cada palpite vale pontos de acordo com o quão certo você chegou — e os jogos do mata-mata valem muito mais.
        </p>
      </div>

      <nav className="flex gap-1">
        <button className={`btn px-4 py-2 text-sm ${tab === "v1" ? "" : "btn-ghost"}`} onClick={() => setTab("v1")}>
          Rodada 1
        </button>
        <button className={`btn px-4 py-2 text-sm ${tab === "v2" ? "" : "btn-ghost"}`} onClick={() => setTab("v2")}>
          Rodada 2
        </button>
        <button className={`btn px-4 py-2 text-sm ${tab === "ko" ? "" : "btn-ghost"}`} onClick={() => setTab("ko")}>
          Mata-mata
        </button>
      </nav>

      {tab !== "ko" && (
        <>
          <section>
            <h2 className="mb-3 font-bold text-[var(--accent-2)]">Palpite de placar</h2>
            <div className="card divide-y divide-[var(--border)]">
              <TierRow label="Placar exato" pts={5} pred="3 × 1" actual="3 × 1" note="Acertou o placar na mosca" highlight />
              {tab === "v2" && (
                <TierRow label="Quase exato" pts={4} pred="4 × 1" actual="3 × 1" note="Um lado exato, o outro errado por 1 gol" />
              )}
              <TierRow label="Diferença certa" pts={3} pred="2 × 0" actual="3 × 1" note="Mesma diferença de gols, placar diferente" />
              <TierRow label="Só o resultado" pts={2} pred="1 × 0" actual="3 × 1" note="Acertou quem ganhou, errou a diferença" />
              <TierRow label="Errou" pts={0} pred="1 × 3" actual="3 × 1" note="Resultado errado" muted />
            </div>
            {tab === "v2" ? (
              <p className="mt-2 text-xs text-[var(--muted)]">
                Empates: valem 4 pts se o erro for de exatamente 1 gol por lado (ex: 0×0 previsto, 1×1 real). Erro maior vale 2 pts.
              </p>
            ) : (
              <p className="mt-2 text-xs text-[var(--muted)]">
                Empates nunca chegam ao nível de "diferença certa" — qualquer empate com placar diferente vale 2 pts.
              </p>
            )}
            <p className="mt-2 text-xs text-[var(--muted)]">
              Na fase de grupos cada jogo vale ×1. Os multiplicadores entram no{" "}
              <button onClick={() => setTab("ko")} className="font-medium text-[var(--accent)] underline underline-offset-2">
                mata-mata
              </button>.
            </p>
          </section>

          {tab === "v1" && (
            <section>
              <h2 className="mb-3 font-bold text-[var(--accent-2)]">Bônus: goleiro em branco</h2>
              <div className="card p-4">
                <p className="text-sm text-[var(--muted)]">
                  Previu 0 gols para um lado e o time realmente não marcou? Vale +1 × multiplicador por lado. Soma em cima do nível de placar acertado.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <ExamplePill pred="0 × 0" actual="0 × 0" note="+2 pts (dois lados)" />
                  <ExamplePill pred="0 × 1" actual="0 × 2" note="+1 pt (lado esquerdo)" />
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {tab === "ko" && <KoContent />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Knockout tab — self-contained
// ---------------------------------------------------------------------------

function KoContent() {
  return (
    <>
      {/* Three independent components */}
      <section>
        <h2 className="mb-3 font-bold text-[var(--accent-2)]">Três palpites por jogo</h2>
        <p className="mb-3 text-sm text-[var(--muted)]">
          No mata-mata, cada partida tem três componentes avaliados de forma completamente independente. Acertar um não depende de acertar os outros.
        </p>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="card p-3">
            <p className="text-sm font-bold">Placar</p>
            <p className="mt-1 text-[var(--muted)]">base × mult</p>
          </div>
          <div className="card p-3">
            <p className="text-sm font-bold">Classificado</p>
            <p className="mt-1 text-[var(--muted)]">+2 × mult</p>
          </div>
          <div className="card p-3">
            <p className="text-sm font-bold">Pênaltis</p>
            <p className="mt-1 text-[var(--muted)]">bônus fixo</p>
          </div>
        </div>
      </section>

      {/* Score tiers — knockout-specific */}
      <section>
        <h2 className="mb-3 font-bold text-[var(--accent-2)]">Placar</h2>
        <div className="card divide-y divide-[var(--border)]">
          <KoTierRow
            label="Placar exato"
            pts={5}
            examples={[
              { pred: "2 × 1", actual: "2 × 1", note: "acertou os dois lados na mosca" },
            ]}
            highlight
          />
          <KoTierRow
            label="Quase exato"
            pts={4}
            examples={[
              { pred: "4 × 1", actual: "3 × 1", note: "um lado errado por 1 gol, resultado certo" },
              { pred: "0 × 0", actual: "1 × 1", note: "empate certo, 1 gol de diferença por lado" },
            ]}
          />
          <KoTierRow
            label="Diferença certa"
            pts={3}
            examples={[
              { pred: "2 × 0", actual: "3 × 1", note: "mesma margem, resultado certo" },
              { pred: "1 × 2", actual: "2 × 1", note: "invertido — mesmos números, lados trocados" },
            ]}
          />
          <KoTierRow
            label="Só o resultado"
            pts={2}
            examples={[
              { pred: "1 × 0", actual: "3 × 0", note: "acertou quem ganhou, margem diferente" },
              { pred: "2 × 2", actual: "2 × 1", note: "empate próximo, resultado errado" },
              { pred: "0 × 1", actual: "2 × 1", note: "resultado errado, mesma margem de 1 gol" },
            ]}
          />
          <KoTierRow
            label="Errou"
            pts={0}
            examples={[
              { pred: "0 × 3", actual: "2 × 1", note: "resultado e margem errados" },
            ]}
            muted
          />
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Empates com resultado certo: valem 4 pts com erro de 1 gol por lado (ex: 0×0 previsto, 1×1 real). Erro maior vale 3 pts.
        </p>

        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <p className="text-sm font-semibold">Resultado errado ainda pode valer pontos</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            No mata-mata, o placar e o classificado são avaliados de forma independente. Errar o vencedor
            não zera o palpite de placar — você ainda ganha pontos pela proximidade do placar, só que menos
            do que quem acertou o resultado.
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Quem acerta o resultado <strong className="text-[var(--text)]">sempre pontua mais</strong> pelo
            placar do que quem errou na mesma situação. A diferença fica no bônus do classificado.
          </p>
        </div>
      </section>

      {/* Advancing team */}
      <section>
        <h2 className="mb-3 font-bold text-[var(--accent-2)]">Classificado</h2>
        <div className="card p-4">
          <p className="text-sm text-[var(--muted)]">
            Em paralelo ao placar, você palpita qual time avança para a próxima fase. Os dois palpites são
            completamente independentes — acertar o classificado não exige acertar o placar, e vice-versa.
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Acertar o classificado vale <strong className="text-[var(--text)]">+2 × multiplicador da fase</strong>:
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {[
              { fase: "16-avos", pts: 4 },
              { fase: "Oitavas", pts: 6 },
              { fase: "Quartas", pts: 8 },
              { fase: "Semifinal", pts: 10 },
              { fase: "3º lugar", pts: 12 },
              { fase: "Final", pts: 12 },
            ].map(({ fase, pts }) => (
              <div key={fase} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <span className="text-[var(--muted)]">{fase}</span>
                <span className="font-bold text-[var(--accent)]">+{pts} pts</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Errou o placar completamente mas acertou quem avançou? O bônus cai inteiro mesmo assim.
          </p>
        </div>
      </section>

      {/* Penalties */}
      <section>
        <h2 className="mb-3 font-bold text-[var(--accent-2)]">Pênaltis</h2>
        <p className="mb-3 text-sm text-[var(--muted)]">
          Quando o jogo vai para a disputa de pênaltis, você pode palpitar o placar das cobranças
          (ex: <span className="chip text-xs">5 × 4</span>). É o terceiro componente independente —
          com pontuação própria e <strong className="text-[var(--text)]">sem multiplicador de fase</strong>.
        </p>
        <div className="card divide-y divide-[var(--border)]">
          <TierRow label="Placar exato" pts={5} pred="5 × 4" actual="5 × 4" note="Acertou os dois lados na mosca" highlight />
          <TierRow label="Errou" pts={0} pred="5 × 3" actual="5 × 4" note="Qualquer erro" muted />
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Pênaltis são a maior roleta do futebol — o bônus é fixo justamente para que um chute certo não vire o ranking de cabeça pra baixo.
        </p>
      </section>

      {/* Round weights */}
      <section>
        <h2 className="mb-3 font-bold text-[var(--accent-2)]">Multiplicador por fase</h2>
        <div className="card divide-y divide-[var(--border)]">
          {[
            { fase: "Fase de grupos", mult: "×1" },
            { fase: "16-avos (Round of 32)", mult: "×2" },
            { fase: "Oitavas de final", mult: "×3" },
            { fase: "Quartas de final", mult: "×4" },
            { fase: "Semifinal", mult: "×5" },
            { fase: "3º lugar / Final", mult: "×6" },
          ].map(({ fase, mult }) => (
            <div key={fase} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{fase}</span>
              <span className="font-bold text-[var(--accent)]">{mult}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          O multiplicador incide sobre o placar e o bônus do classificado. O bônus de pênaltis é sempre fixo.
        </p>
      </section>

      {/* All scenarios table */}
      <section>
        <h2 className="mb-3 font-bold text-[var(--accent-2)]">Todos os cenários</h2>
        <p className="mb-3 text-sm text-[var(--muted)]">
          Exemplo fixo: resultado <span className="chip text-xs">2 × 1</span> (mandante vence).
          Pontos antes do multiplicador de fase.
        </p>
        <div className="card divide-y divide-[var(--border)] text-sm">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2 text-xs font-semibold text-[var(--muted)]">
            <span>Palpite</span>
            <span className="text-right">Placar</span>
            <span className="text-right">Classificado</span>
            <span className="text-right">Total</span>
          </div>
          {[
            { pred: "2 × 1", adv: "Mand.", score: 5, advance: 2, note: "Exato + classificado certo" },
            { pred: "3 × 1", adv: "Mand.", score: 4, advance: 2, note: "Quase exato + classificado certo" },
            { pred: "2 × 0", adv: "Mand.", score: 4, advance: 2, note: "Quase exato + classificado certo" },
            { pred: "3 × 2", adv: "Mand.", score: 3, advance: 2, note: "Diferença certa + classificado certo" },
            { pred: "3 × 0", adv: "Mand.", score: 2, advance: 2, note: "Só o resultado + classificado certo" },
            { pred: "1 × 1", adv: "Mand.", score: 2, advance: 2, note: "Empate próximo (L1=1), classificado certo" },
            { pred: "2 × 2", adv: "Mand.", score: 2, advance: 2, note: "Empate próximo (L1=1), classificado certo" },
            { pred: "1 × 2", adv: "Visit.", score: 3, advance: 0, note: "Invertido — classificado errado" },
            { pred: "1 × 1", adv: "Visit.", score: 2, advance: 0, note: "Empate próximo, classificado errado" },
            { pred: "0 × 1", adv: "Visit.", score: 2, advance: 0, note: "Resultado errado, mesma margem" },
            { pred: "2 × 3", adv: "Visit.", score: 2, advance: 0, note: "Resultado errado, mesma margem" },
            { pred: "0 × 3", adv: "Visit.", score: 0, advance: 0, note: "Errou resultado e margem" },
          ].map(({ pred, adv, score, advance, note }) => (
            <div key={pred + adv} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 px-4 py-2.5">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <ScoreChip label={pred} dim />
                  <span className="text-xs text-[var(--muted)]">→ {adv} avança</span>
                </div>
                <span className="text-xs text-[var(--muted)]">{note}</span>
              </div>
              <span className="text-right font-semibold" style={{ color: score === 0 ? "var(--muted)" : "var(--text)" }}>
                {score > 0 ? `+${score}` : "—"}
              </span>
              <span className="text-right font-semibold" style={{ color: advance === 0 ? "var(--muted)" : "var(--accent)" }}>
                {advance > 0 ? `+${advance}` : "—"}
              </span>
              <span className="text-right font-extrabold" style={{ color: score + advance === 0 ? "var(--muted)" : "var(--accent)" }}>
                {score + advance > 0 ? `${score + advance} pts` : "0"}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Multiplique tudo pelo multiplicador da fase. Pênaltis (+5 pts fixos) não entram nesta tabela.
        </p>
      </section>

      {/* Worked examples */}
      <section>
        <h2 className="mb-3 font-bold text-[var(--accent-2)]">Exemplos</h2>
        <div className="flex flex-col gap-3">
          <FullKoExample
            fase="Quartas de final"
            mult="×4"
            score={{ pred: "2 × 1", actual: "2 × 1", tier: "Placar exato", pts: "20 pts" }}
            adv={{ correct: true, pts: "+8 pts" }}
            total="28 pts"
          />
          <FullKoExample
            fase="Oitavas de final"
            mult="×3"
            score={{ pred: "2 × 1", actual: "1 × 2", tier: "Invertido (diferença certa)", pts: "9 pts" }}
            adv={{ correct: false, pts: "0 pts" }}
            total="9 pts"
            note="Os gols entraram certos mas nos lados trocados — vale Diferença certa (3 pts × 3). Errou o classificado, então sem bônus."
          />
          <FullKoExample
            fase="Quartas de final"
            mult="×4"
            score={{ pred: "1 × 0", actual: "0 × 3", tier: "Errou", pts: "0 pts" }}
            adv={{ correct: true, pts: "+8 pts" }}
            total="8 pts"
            note="Placar totalmente errado, mas acertou quem passou. Os palpites são independentes — o bônus do classificado não depende do placar."
          />
          <FullKoExample
            fase="Semifinal"
            mult="×5"
            score={{ pred: "1 × 1", actual: "1 × 1", tier: "Placar exato", pts: "25 pts" }}
            adv={{ correct: true, pts: "+10 pts" }}
            pen={{ pred: "5 × 4", actual: "5 × 4", tier: "Exato (fixo)", pts: "+5 pts" }}
            total="40 pts"
          />
        </div>
      </section>

      {/* Max possible */}
      <section className="card p-4">
        <p className="text-sm font-semibold text-[var(--accent-2)]">Máximo possível por jogo</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Placar exato (5) + classificado certo (2) = <strong className="text-[var(--text)]">7 pts × multiplicador</strong>
        </p>
        <div className="mt-3 divide-y divide-[var(--border)]">
          {[
            { fase: "Fase de grupos", formula: "5 × 1", total: 5 },
            { fase: "16-avos", formula: "7 × 2", total: 14 },
            { fase: "Oitavas", formula: "7 × 3", total: 21 },
            { fase: "Quartas", formula: "7 × 4", total: 28 },
            { fase: "Semifinal", formula: "7 × 5", total: 35 },
            { fase: "3º lugar / Final", formula: "7 × 6", total: 42 },
          ].map(({ fase, formula, total }) => (
            <div key={fase} className="flex items-center justify-between py-2 text-sm">
              <span className="text-[var(--muted)]">{fase}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted)]">{formula} =</span>
                <span className="font-bold text-[var(--accent)]">{total} pts</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Jogos que forem a pênaltis: +5 pts extras se acertar o placar das cobranças.
        </p>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function KoTierRow({
  label,
  pts,
  examples,
  highlight,
  muted,
}: {
  label: string;
  pts: number;
  examples: { pred: string; actual: string; note: string }[];
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div
          className="w-8 shrink-0 text-center text-lg font-extrabold"
          style={{ color: muted ? "var(--muted)" : highlight ? "var(--accent)" : "var(--text)" }}
        >
          {pts}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{label}</p>
          <div className="mt-1.5 flex flex-col gap-1">
            {examples.map((ex, i) => (
              <div key={i} className="flex flex-wrap items-center gap-1 text-xs text-[var(--muted)]">
                <ScoreChip label={ex.pred} dim />
                <span>→</span>
                <ScoreChip label={ex.actual} />
                <span>— {ex.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FullKoExample({
  fase,
  mult,
  score,
  adv,
  pen,
  total,
  note,
}: {
  fase: string;
  mult: string;
  score: { pred: string; actual: string; tier: string; pts: string };
  adv: { correct: boolean; pts: string };
  pen?: { pred: string; actual: string; tier: string; pts: string };
  total: string;
  note?: string;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
        <span className="text-xs font-semibold text-[var(--accent-2)]">{fase}</span>
        <span className="text-xs font-bold text-[var(--accent)]">{mult}</span>
      </div>
      <div className="divide-y divide-[var(--border)]">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-24 shrink-0 text-xs text-[var(--muted)]">Placar</span>
          <div className="flex flex-1 flex-wrap items-center gap-1 text-xs">
            <ScoreChip label={score.pred} dim />
            <span className="text-[var(--muted)]">→</span>
            <ScoreChip label={score.actual} />
            <span className="text-[var(--muted)]">· {score.tier}</span>
          </div>
          <span className="shrink-0 text-sm font-bold">{score.pts}</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-24 shrink-0 text-xs text-[var(--muted)]">Classificado</span>
          <span className={`flex-1 text-xs ${adv.correct ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
            {adv.correct ? "Acertou" : "Errou"}
          </span>
          <span className={`shrink-0 text-sm font-bold ${adv.correct ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
            {adv.pts}
          </span>
        </div>
        {pen && (
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-24 shrink-0 text-xs text-[var(--muted)]">Pênaltis</span>
            <div className="flex flex-1 flex-wrap items-center gap-1 text-xs">
              <ScoreChip label={pen.pred} dim />
              <span className="text-[var(--muted)]">→</span>
              <ScoreChip label={pen.actual} />
              <span className="text-[var(--muted)]">· {pen.tier}</span>
            </div>
            <span className="shrink-0 text-sm font-bold">{pen.pts}</span>
          </div>
        )}
        <div className="flex items-center justify-between bg-[var(--surface-2)] px-4 py-2.5">
          <span className="text-xs font-semibold text-[var(--muted)]">Total</span>
          <span className="font-extrabold text-[var(--accent)]">{total}</span>
        </div>
      </div>
      {note && <p className="px-4 pb-3 pt-2 text-xs text-[var(--muted)]">{note}</p>}
    </div>
  );
}

function TierRow({
  label,
  pts,
  pred,
  actual,
  note,
  highlight,
  muted,
}: {
  label: string;
  pts: number;
  pred: string;
  actual: string;
  note: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div
        className="w-8 shrink-0 text-center text-lg font-extrabold"
        style={{ color: muted ? "var(--muted)" : highlight ? "var(--accent)" : "var(--text)" }}
      >
        {pts}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-[var(--muted)]">{note}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-xs">
        <ScoreChip label={pred} dim />
        <span className="text-[var(--muted)]">→</span>
        <ScoreChip label={actual} />
      </div>
    </div>
  );
}

function ScoreChip({ label, dim }: { label: string; dim?: boolean }) {
  return (
    <span className="chip" style={dim ? { opacity: 0.6 } : undefined}>
      {label}
    </span>
  );
}

function ExamplePill({ pred, actual, note }: { pred: string; actual?: string; note: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1">
      {pred && <span className="chip">{pred}</span>}
      {actual && (
        <>
          <span className="text-[var(--muted)]">→</span>
          <span className="chip">{actual}</span>
        </>
      )}
      <span className="text-[var(--muted)]">{note}</span>
    </div>
  );
}
